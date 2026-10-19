"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { saveContent } from "@/app/actions/content";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Alert,
  Field,
  Input,
  Panel,
  Select,
  Textarea,
  buttonStyles,
} from "@/components/ui/kit";
import { CONTENT_KINDS } from "@/lib/constants";
import { CopyIcon, SparkIcon } from "@/components/icons";
import type { ChannelPlatform } from "@/types/database";

type ProviderInfo = {
  name: string;
  label: string;
  configured: boolean;
  model: string;
};

type TaskOption = { value: string; label: string };

type GenerateResponse = {
  text: string;
  provider: string;
  model: string;
};

export function AiStudio({
  channels,
  providers,
  taskOptions,
  defaultChannelId,
}: {
  channels: { id: string; name: string; platform: ChannelPlatform }[];
  providers: ProviderInfo[];
  taskOptions: TaskOption[];
  defaultChannelId?: string;
}) {
  const [task, setTask] = useState(taskOptions[0]?.value ?? "general");
  const [provider, setProvider] = useState("auto");
  const [channelId, setChannelId] = useState(defaultChannelId ?? "");
  const [tone, setTone] = useState("");
  const [prompt, setPrompt] = useState("");
  const [loading, startTransition] = useTransition();
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    setError(null);
    setCopied(false);
    startTransition(async () => {
      try {
        const response = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task,
            prompt,
            tone: tone || undefined,
            channelId: channelId || undefined,
            provider: provider === "auto" ? undefined : provider,
          }),
        });

        const data = (await response.json()) as
          | GenerateResponse
          | { error?: string };

        if (!response.ok) {
          setResult(null);
          setError(
            (data as { error?: string }).error ??
              "Không gọi được AI. Thử lại."
          );
          return;
        }

        setResult(data as GenerateResponse);
      } catch {
        setError("Lỗi kết nối tới máy chủ.");
      }
    });
  }

  const configuredCount = providers.filter((p) => p.configured).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-6">
        <Panel eyebrow="Cấu hình" title="Yêu cầu" bodyClassName="space-y-4 p-5">
          {configuredCount === 0 && (
            <Alert tone="error">
              Chưa có API key AI nào. Thêm key vào .env.local rồi khởi động lại
              server.
            </Alert>
          )}

          <Field label="Loại việc" htmlFor="task">
            <Select
              id="task"
              value={task}
              onChange={(event) => setTask(event.target.value)}
            >
              {taskOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Provider"
            htmlFor="provider"
            hint="Auto sẽ tự chọn và fallback nếu provider lỗi."
          >
            <Select
              id="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
            >
              <option value="auto">Tự động (khuyến nghị)</option>
              {providers.map((item) => (
                <option
                  key={item.name}
                  value={item.name}
                  disabled={!item.configured}
                >
                  {item.label}
                  {item.configured ? ` · ${item.model}` : " · chưa có key"}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Gắn với kênh" htmlFor="channel">
            <Select
              id="channel"
              value={channelId}
              onChange={(event) => setChannelId(event.target.value)}
            >
              <option value="">Không gắn kênh</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Giọng điệu" htmlFor="tone">
            <Input
              id="tone"
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              placeholder="VD: hài hước, chuyên gia, gần gũi…"
              maxLength={120}
            />
          </Field>

          <Field label="Yêu cầu chi tiết" htmlFor="prompt">
            <Textarea
              id="prompt"
              rows={7}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="VD: Viết kịch bản 8 phút về 5 lỗi khi mua hàng online, hướng tới khán giả 25-35 tuổi…"
              maxLength={20000}
            />
          </Field>

          <button
            type="button"
            onClick={generate}
            disabled={loading || prompt.trim().length < 3}
            className={buttonStyles("primary", "md", "w-full")}
          >
            <SparkIcon className="size-3.5" />
            {loading ? "AI đang viết…" : "Tạo nội dung"}
          </button>
        </Panel>

        <Panel eyebrow="Provider" title="Trạng thái" bodyClassName="p-0">
          <ul className="divide-y divide-ink-700">
            {providers.map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between px-4 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm text-fog-300">
                  <span
                    className="inline-block size-1.5 rounded-full"
                    style={{
                      backgroundColor: item.configured
                        ? "#4cc38a"
                        : "#3a4657",
                    }}
                  />
                  {item.label}
                </span>
                <span className="font-mono text-[10.5px] text-fog-600">
                  {item.configured ? item.model : "chưa cấu hình"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel
          eyebrow="Kết quả"
          title={result ? `${result.provider} · ${result.model}` : "Bản nháp"}
          actions={
            result && (
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(result.text);
                  setCopied(true);
                }}
                className={buttonStyles("ghost", "sm")}
              >
                <CopyIcon className="size-3.5" />
                {copied ? "Đã copy" : "Copy"}
              </button>
            )
          }
          bodyClassName="p-0"
        >
          {error && (
            <div className="p-4">
              <Alert tone="error">{error}</Alert>
            </div>
          )}

          {!error && !result && (
            <div className="flex min-h-72 flex-col items-center justify-center gap-2 p-8 text-center">
              <SparkIcon className="size-6 text-ink-500" />
              <p className="text-sm text-fog-500">
                Mô tả yêu cầu bên trái và bấm Tạo nội dung.
              </p>
              <p className="max-w-sm text-xs text-fog-600">
                Kịch bản, chương sách, caption, chiến lược kênh — AI router sẽ
                chọn provider phù hợp nhất.
              </p>
            </div>
          )}

          {result && (
            <div className="max-h-[560px] overflow-auto p-5">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-fog-100">
                {result.text}
              </pre>
            </div>
          )}
        </Panel>

        {result && (
          <SavePanel
            key={result.text.slice(0, 32)}
            content={result.text}
            provider={result.provider}
            defaultChannelId={channelId}
          />
        )}
      </div>
    </div>
  );
}

function SavePanel({
  content,
  provider,
  defaultChannelId,
}: {
  content: string;
  provider: string;
  defaultChannelId?: string;
}) {
  const [state, action] = useActionState(saveContent, initialFormState);

  return (
    <Panel eyebrow="Lưu trữ" title="Lưu vào kho nội dung">
      <form action={action} className="space-y-4">
        {state.status === "error" && (
          <Alert tone="error">{state.message}</Alert>
        )}
        {state.status === "success" && (
          <Alert tone="success">{state.message}</Alert>
        )}

        <input type="hidden" name="content" value={content} />
        <input type="hidden" name="ai_provider" value={provider} />
        <input
          type="hidden"
          name="channel_id"
          value={defaultChannelId ?? ""}
        />

        <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
          <Field label="Tiêu đề" htmlFor="title">
            <Input
              id="title"
              name="title"
              placeholder="Tiêu đề gợi nhớ nội dung"
              required
              maxLength={200}
            />
          </Field>
          <Field label="Loại" htmlFor="kind">
            <Select id="kind" name="kind" defaultValue="other">
              {Object.entries(CONTENT_KINDS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <SubmitButton pendingText="Đang lưu…">
          Lưu vào kho nội dung
        </SubmitButton>
      </form>
    </Panel>
  );
}
