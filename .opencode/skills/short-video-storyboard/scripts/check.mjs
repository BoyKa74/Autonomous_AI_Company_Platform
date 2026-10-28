#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function near(a, b, tolerance = 0.05) {
  return Math.abs(Number(a) - Number(b)) <= tolerance;
}

export function checkStoryboard(storyboard) {
  const errors = [];
  const warnings = [];
  const sb = storyboard ?? {};
  const shots = Array.isArray(sb.shots) ? sb.shots : [];
  const product = String(sb.product ?? "").trim();
  const duration = Number(sb.duration_sec);
  const hookSec = Number(sb.hook_sec);

  if (!product) errors.push("thiếu product");
  if (!Number.isFinite(duration) || duration < 20 || duration > 45) {
    errors.push("duration_sec phải 20–45 giây");
  }
  if (String(sb.aspect_ratio ?? "") !== "9:16") {
    errors.push("aspect_ratio phải là 9:16");
  }
  if (!Number.isFinite(hookSec) || hookSec <= 0 || hookSec > 3) {
    errors.push("hook_sec phải 1–3 giây");
  }
  if (!String(sb.hook ?? "").trim()) errors.push("thiếu hook");

  if (shots.length < 3 || shots.length > 12) {
    errors.push("shots phải từ 3 đến 12 cảnh");
  }

  let previousEnd = 0;
  shots.forEach((shot, index) => {
    const label = `shot ${index + 1}`;
    const start = Number(shot?.start);
    const end = Number(shot?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      errors.push(`${label}: start/end phải là số`);
      return;
    }
    if (start < 0 || end <= start) errors.push(`${label}: end phải > start`);
    const length = end - start;
    if (length < 2 || length > 5) {
      errors.push(`${label}: độ dài ${length.toFixed(1)}s phải 2–5s`);
    }
    if (!near(start, previousEnd)) {
      errors.push(`${label}: start ${start} không nối tiếp end ${previousEnd}`);
    }
    previousEnd = end;
    if (!String(shot?.visual ?? "").trim()) errors.push(`${label}: thiếu visual`);
    if (!String(shot?.voiceover ?? "").trim()) {
      errors.push(`${label}: thiếu voiceover`);
    }
    const screenText = String(shot?.on_screen_text ?? "");
    if (screenText.length > 80) {
      warnings.push(`${label}: on_screen_text dài ${screenText.length} ký tự`);
    }
  });

  if (shots.length > 0 && Number.isFinite(duration) && !near(previousEnd, duration)) {
    errors.push(`tổng timeline ${previousEnd}s không khớp duration ${duration}s`);
  }
  if (shots.length > 0 && !near(Number(shots[0]?.start), 0)) {
    errors.push("shot đầu phải bắt đầu từ 0");
  }

  const allText = shots
    .map((shot) =>
      [shot?.visual, shot?.voiceover, shot?.on_screen_text].filter(Boolean).join(" ")
    )
    .join(" ")
    .toLowerCase();
  if (product && !allText.includes(product.toLowerCase())) {
    errors.push("tên sản phẩm không xuất hiện trong storyboard");
  }

  const disclosure = String(sb.disclosure ?? "");
  if (
    !/(affiliate disclosure|disclosure|liên kết tiếp thị|liên kết affiliate|hoa hồng|commission)/i.test(
      disclosure
    )
  ) {
    errors.push("thiếu affiliate disclosure");
  }

  if (!String(sb.cta ?? "").trim()) errors.push("thiếu CTA");

  const sources = Array.isArray(sb.sources) ? sb.sources.filter(isHttpUrl) : [];
  if (sources.length < 1) errors.push("cần ít nhất 1 nguồn URL");

  const joined = `${disclosure} ${sb.cta ?? ""} ${allText}`;
  if (/\bTODO\b|lorem ipsum|\{\{[^}]+\}\}/i.test(joined)) {
    errors.push("còn placeholder/TODO");
  }
  const risky = joined.match(
    /(chữa bệnh|chữa khỏi|điều trị|giảm cân|cam kết 100%|lợi nhuận đảm bảo|thu nhập đảm bảo|an toàn tuyệt đối)/i
  );
  if (risky) errors.push(`claim rủi ro: "${risky[0]}"`);

  const superlatives = joined.match(
    /(tốt nhất|số 1|number one|best|rẻ nhất|mạnh nhất)/gi
  );
  if (superlatives) {
    warnings.push(
      `claim tuyệt đối cần bằng chứng: ${[
        ...new Set(superlatives.map((s) => s.toLowerCase())),
      ].join(", ")}`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      duration_sec: duration,
      shots: shots.length,
      aspect_ratio: sb.aspect_ratio ?? null,
      product,
    },
  };
}

function main() {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) {
    console.error("Usage: node scripts/check.mjs storyboard.json");
    process.exit(2);
  }
  const storyboard = JSON.parse(readFileSync(file, "utf8"));
  const result = checkStoryboard(storyboard);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
