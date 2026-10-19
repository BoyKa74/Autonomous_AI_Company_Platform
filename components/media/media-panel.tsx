"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createMediaJob, cancelMediaJob } from "@/app/actions/media";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Alert,
  EmptyState,
  Eyebrow,
  Field,
  Input,
  Panel,
  Select,
  Tag,
  Textarea,
} from "@/components/ui/kit";
import { formatDateTime } from "@/lib/utils";
import type { MediaJob, MediaJobStatus } from "@/types/database";

const STATUS_META: Record<MediaJobStatus, { label: string; color: string }> = {
  queued: { label: "Chờ xử lý", color: "#8b96a7" },
  running: { label: "Đang tạo", color: "#f0a63c" },
  succeeded: { label: "Hoàn tất", color: "#4cc38a" },
  failed: { label: "Lỗi", color: "#ea6a6a" },
  canceled: { label: "Đã huỷ", color: "#626d7e" },
};

const KIND_LABEL: Record<string, string> = {
  music: "Nhạc",
  voice: "Giọng đọc",
  video: "Video",
  image: "Ảnh",
  subtitle: "Phụ đề",
};

export function MediaPanel({
  jobs,
  channels,
}: {
  jobs: MediaJob[];
  channels: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(createMediaJob, initialFormState);
  const [kind, setKind] = useState<"music" | "voice">("music");
  const router = useRouter();

  const hasActive = jobs.some(
    (job) => job.status === "queued" || job.status === "running"
  );

  useEffect(() => {
    if (!hasActive) return;
    const timer = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(timer);
  }, [hasActive, router]);

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Panel
        eyebrow="Hàng đợi media"
        title="Tạo nhạc / giọng đọc"
        bodyClassName="p-5"
      >
        <form action={action} className="space-y-4">
          {state.status === "error" && (
            <Alert tone="error">{state.message}</Alert>
          )}
          {state.status === "success" && (
            <Alert tone="success">{state.message}</Alert>
          )}

          <Field label="Loại" htmlFor="kind">
            <Select
              id="kind"
              name="kind"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as "music" | "voice")
              }
            >
              <option value="music">Nhạc nền / bài hát</option>
              <option value="voice">Giọng đọc tiếng Việt</option>
            </Select>
          </Field>

          <Field
            label={kind === "music" ? "Mô tả bài nhạc" : "Nội dung cần đọc"}
            htmlFor="prompt"
            hint={
              kind === "music"
                ? "VD: nhạc nền chill, guitar mộc, không lời, 60 giây"
                : "VD: Xin chào, đây là bản tin công nghệ hôm nay…"
            }
          >
            <Textarea
              id="prompt"
              name="prompt"
              rows={kind === "music" ? 4 : 6}
              placeholder={
                kind === "music"
                  ? "Mô tả phong cách, nhạc cụ, cảm xúc, thời lượng…"
                  : "Dán kịch bản voice-over vào đây…"
              }
              maxLength={8000}
              required
            />
          </Field>

          {kind === "music" && (
            <>
              <Field label="Ngôn ngữ hát" htmlFor="vocal_language">
                <Select id="vocal_language" name="vocal_language" defaultValue="vi">
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">Tiếng Anh</option>
                  <option value="instrumental">Không lời</option>
                </Select>
              </Field>
              <Field
                label="Lời bài hát (tuỳ chọn)"
                htmlFor="lyrics"
                hint='Để trống để AI tự viết. Nhập "[Instrumental]" nếu không lời.'
              >
                <Textarea
                  id="lyrics"
                  name="lyrics"
                  rows={4}
                  maxLength={8000}
                  placeholder="[Verse 1]…"
                />
              </Field>
            </>
          )}

          {kind === "voice" && (
            <Field
              label="Giọng (tuỳ chọn)"
              htmlFor="voice"
              hint="Để trống dùng giọng mặc định của VieNeu-TTS."
            >
              <Input id="voice" name="voice" maxLength={60} placeholder="VD: nữ miền Nam" />
            </Field>
          )}

          <Field label="Gắn với kênh" htmlFor="channel_id">
            <Select id="channel_id" name="channel_id" defaultValue="">
              <option value="">Không gắn kênh</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </Select>
          </Field>

          <SubmitButton
            className="w-full"
            pendingText="Đang đưa vào hàng đợi…"
          >
            Đưa vào hàng đợi
          </SubmitButton>

          <p className="text-xs text-fog-600">
            Job chạy trên máy Windows 24/7. Máy tắt thì job nằm chờ, không mất.
          </p>
        </form>
      </Panel>

      <Panel
        eyebrow="Gần đây"
        title="Kết quả"
        actions={
          hasActive ? (
            <Tag className="text-signal-500">Đang theo dõi…</Tag>
          ) : undefined
        }
        bodyClassName="p-0"
      >
        {jobs.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="Chưa có job nào"
              description="Tạo bản nhạc hoặc đoạn voice-over đầu tiên ở khung bên trái."
            />
          </div>
        ) : (
          <ul className="divide-y divide-ink-700">
            {jobs.map((job) => {
              const meta = STATUS_META[job.status];
              return (
                <li key={job.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Eyebrow>{KIND_LABEL[job.kind] ?? job.kind}</Eyebrow>
                        <span
                          className="font-mono text-[10.5px] uppercase tracking-wider"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-fog-100">
                        {job.prompt}
                      </p>
                      <p className="mt-0.5 font-mono text-[10.5px] text-fog-600">
                        {formatDateTime(job.created_at)}
                        {job.provider ? ` · ${job.provider}` : ""}
                      </p>
                    </div>

                    {(job.status === "queued" || job.status === "running") && (
                      <form action={cancelMediaJob}>
                        <input type="hidden" name="id" value={job.id} />
                        <SubmitButton
                          size="sm"
                          variant="ghost"
                          pendingText="…"
                        >
                          Huỷ
                        </SubmitButton>
                      </form>
                    )}
                  </div>

                  {job.result_url && (
                    <audio
                      controls
                      preload="none"
                      src={job.result_url}
                      className="h-9 w-full"
                    />
                  )}

                  {job.error && (
                    <p className="rounded border border-bad-400/30 bg-bad-400/10 px-2 py-1.5 text-xs text-bad-400">
                      {job.error}
                    </p>
                  )}

                  {job.status === "running" && (
                    <div className="h-1 w-full overflow-hidden rounded-full bg-ink-700">
                      <div className="h-full w-1/3 animate-pulse rounded-full bg-signal-500" />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
