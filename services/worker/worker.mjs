// VIC Media Worker — chạy trên máy Windows 24/7.
// Nhận job từ Supabase, gọi engine local (ACE-Step / VieNeu-TTS),
// đẩy file kết quả lên Supabase Storage, cập nhật trạng thái job.

import { createClient } from "@supabase/supabase-js";

/* ---------- Cấu hình ---------- */

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[worker] Thiếu biến môi trường ${name}`);
    process.exit(1);
  }
  return value;
}

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SERVICE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const ACESTEP_URL = process.env.ACESTEP_URL || "http://127.0.0.1:8085";
const VIENEU_URL = process.env.VIENEU_URL || "http://127.0.0.1:8000";
const VIENEU_MODEL = process.env.VIENEU_MODEL || "vieneu-v3-turbo";

const BUCKET = process.env.MEDIA_BUCKET || "media";
const POLL_MS = Number(process.env.POLL_MS || 3000);
const MUSIC_TIMEOUT_MS = Number(
  process.env.MUSIC_TIMEOUT_MS || 45 * 60 * 1000
);
const VOICE_TIMEOUT_MS = Number(
  process.env.VOICE_TIMEOUT_MS || 15 * 60 * 1000
);
const STALE_JOB_HOURS = Number(process.env.STALE_JOB_HOURS || 2);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let stopping = false;

/* ---------- Tiện ích HTTP ---------- */

async function fetchJson(url, init, timeoutMs) {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${url} — ${body.slice(0, 300)}`);
  }
  return response.json();
}

async function waitForAcestepJob(id, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (stopping) throw new Error("Worker đang dừng, job sẽ được chạy lại sau");
    const status = await fetchJson(`${ACESTEP_URL}/job?id=${id}`, {}, 30_000);
    if (status.status === "done") return;
    if (status.status === "failed") throw new Error("ACE-Step xử lý thất bại");
    if (status.status === "cancelled") throw new Error("ACE-Step đã huỷ job");
    if (Date.now() > deadline) {
      throw new Error("ACE-Step quá thời gian chờ");
    }
    await sleep(2000);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Tách phần audio đầu tiên từ multipart/mixed của ACE-Step /synth */
function extractAudioPart(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!match) throw new Error("Kết quả ACE-Step thiếu boundary");

  const boundary = Buffer.from(`--${(match[1] || match[2]).trim()}`);
  let index = buffer.indexOf(boundary);

  while (index !== -1) {
    const next = buffer.indexOf(boundary, index + boundary.length);
    if (next === -1) break;

    const part = buffer.subarray(index + boundary.length, next);
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const headers = part.subarray(0, headerEnd).toString("utf8").toLowerCase();
      let body = part.subarray(headerEnd + 4);
      if (
        body.length >= 2 &&
        body[body.length - 2] === 0x0d &&
        body[body.length - 1] === 0x0a
      ) {
        body = body.subarray(0, body.length - 2);
      }
      const typeMatch = /content-type:\s*([^\r\n;]+)/.exec(headers);
      const type = typeMatch?.[1]?.trim() || "";
      if (type.startsWith("audio/")) {
        return { buffer: Buffer.from(body), contentType: type };
      }
    }
    index = next;
  }

  throw new Error("Không tìm thấy phần audio trong kết quả ACE-Step");
}

/* ---------- Engines ---------- */

async function runMusic(job) {
  const params = job.params ?? {};

  const lmRequest = {
    caption: job.prompt,
    lyrics: params.lyrics || "",
    vocal_language:
      params.vocal_language === "instrumental"
        ? ""
        : params.vocal_language || "vi",
    inference_steps: Number(params.inference_steps) || 8,
    output_format: params.output_format || "wav16",
  };
  if (params.vocal_language === "instrumental") {
    lmRequest.lyrics = "[Instrumental]";
  }

  const lmJob = await fetchJson(
    `${ACESTEP_URL}/lm`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(lmRequest),
    },
    MUSIC_TIMEOUT_MS
  );
  await waitForAcestepJob(lmJob.id, MUSIC_TIMEOUT_MS);

  const enriched = await fetchJson(
    `${ACESTEP_URL}/job?id=${lmJob.id}&result=1`,
    {},
    60_000
  );

  const synthJob = await fetchJson(
    `${ACESTEP_URL}/synth`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(enriched),
    },
    MUSIC_TIMEOUT_MS
  );
  await waitForAcestepJob(synthJob.id, MUSIC_TIMEOUT_MS);

  const resultResponse = await fetch(
    `${ACESTEP_URL}/job?id=${synthJob.id}&result=1`,
    { signal: AbortSignal.timeout(120_000) }
  );
  if (!resultResponse.ok) {
    throw new Error(`ACE-Step trả kết quả lỗi HTTP ${resultResponse.status}`);
  }

  const buffer = Buffer.from(await resultResponse.arrayBuffer());
  const contentType =
    resultResponse.headers.get("content-type") || "multipart/mixed";
  const audio = extractAudioPart(buffer, contentType);
  const ext = audio.contentType.includes("mpeg") ? "mp3" : "wav";

  return {
    buffer: audio.buffer,
    contentType: audio.contentType,
    provider: "ace-step",
    ext,
  };
}

async function runVoice(job) {
  const params = job.params ?? {};
  const body = {
    model: VIENEU_MODEL,
    input: job.prompt,
    response_format: "wav",
  };
  if (params.voice) body.voice = params.voice;

  const response = await fetch(`${VIENEU_URL}/v1/audio/speech`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(VOICE_TIMEOUT_MS),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`VieNeu HTTP ${response.status} — ${text.slice(0, 300)}`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "audio/wav",
    provider: "vieneu-tts",
    ext: "wav",
  };
}

/* ---------- Xử lý job ---------- */

async function processJob(job) {
  console.log(`[worker] Nhận job ${job.id} (${job.kind}): ${job.prompt.slice(0, 80)}`);

  let result;
  if (job.kind === "music") {
    result = await runMusic(job);
  } else if (job.kind === "voice") {
    result = await runVoice(job);
  } else {
    throw new Error(
      `Job "${job.kind}" chưa có engine trên máy này (chỉ hỗ trợ music/voice ở giai đoạn 1)`
    );
  }

  const path = `${job.owner_id}/${job.kind}/${job.id}.${result.ext}`;
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, result.buffer, {
      contentType: result.contentType,
      upsert: true,
    });
  if (upload.error) {
    throw new Error(`Upload storage lỗi: ${upload.error.message}`);
  }

  const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { error } = await supabase
    .from("media_jobs")
    .update({
      status: "succeeded",
      provider: result.provider,
      result_path: path,
      result_url: publicUrl.publicUrl,
      error: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  if (error) throw new Error(`Cập nhật job lỗi: ${error.message}`);

  console.log(`[worker] Xong job ${job.id} → ${publicUrl.publicUrl}`);
}

async function failJob(job, error) {
  const message = (error instanceof Error ? error.message : String(error)).slice(
    0,
    900
  );
  console.error(`[worker] Job ${job.id} lỗi: ${message}`);
  await supabase
    .from("media_jobs")
    .update({
      status: "failed",
      error: message,
      finished_at: new Date().toISOString(),
    })
    .eq("id", job.id);
}

/* ---------- Vòng lặp ---------- */

async function requeueStaleJobs() {
  const cutoff = new Date(
    Date.now() - STALE_JOB_HOURS * 60 * 60 * 1000
  ).toISOString();
  const { error } = await supabase
    .from("media_jobs")
    .update({ status: "queued", started_at: null })
    .eq("status", "running")
    .lt("started_at", cutoff);
  if (error) {
    console.error(`[worker] Không dọn được job treo: ${error.message}`);
  }
}

async function main() {
  console.log("[worker] VIC media worker khởi động");
  console.log(`[worker] ACE-Step: ${ACESTEP_URL}`);
  console.log(`[worker] VieNeu-TTS: ${VIENEU_URL}`);

  await requeueStaleJobs();

  while (!stopping) {
    let job = null;
    try {
      const { data, error } = await supabase.rpc("claim_media_jobs", {
        batch_size: 1,
      });
      if (error) throw new Error(error.message);
      job = data?.[0] ?? null;
    } catch (error) {
      console.error(`[worker] Không lấy được job: ${error.message}`);
      await sleep(POLL_MS * 3);
      continue;
    }

    if (!job) {
      await sleep(POLL_MS);
      continue;
    }

    try {
      await processJob(job);
    } catch (error) {
      await failJob(job, error);
    }
  }

  console.log("[worker] Đã dừng");
}

process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

main().catch((error) => {
  console.error("[worker] Lỗi không xử lý được:", error);
  process.exit(1);
});
