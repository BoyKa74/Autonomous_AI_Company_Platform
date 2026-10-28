"use client";

import { useActionState } from "react";
import { addAgent } from "@/app/actions/company";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/kit";
import { AGENT_ROLES } from "@/lib/constants";
import { OPENCODE_FREE_MODELS } from "@/lib/ai/free-models";
import type { AiAgent } from "@/types/database";
import { tr, type Locale } from "@/lib/i18n/messages";

const PROVIDER_OPTIONS = [
  { value: "", label: "Tự động (router chọn)" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google Gemini" },
  { value: "groq", label: "Groq" },
  { value: "opencode", label: "OpenCode Zen (free)" },
  { value: "openrouter", label: "OpenRouter" },
];

export function AgentForm({
  companyId,
  agents,
  locale,
}: {
  companyId: string;
  agents: Pick<AiAgent, "id" | "name" | "role">[];
  locale: Locale;
}) {
  const [state, action] = useActionState(addAgent, initialFormState);

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && (
        <Alert tone="error">{tr(locale, state.message)}</Alert>
      )}
      {state.status === "success" && (
        <Alert tone="success">{tr(locale, state.message)}</Alert>
      )}

      <input type="hidden" name="company_id" value={companyId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr(locale, "Tên AI")} htmlFor="agent-name">
          <Input
            id="agent-name"
            name="name"
            placeholder={tr(locale, "VD: Writer SEO")}
            maxLength={120}
            required
          />
        </Field>

        <Field label={tr(locale, "Vai trò")} htmlFor="agent-role">
          <Select id="agent-role" name="role" defaultValue="specialist">
            <option value="ceo">CEO</option>
            <option value="manager">{tr(locale, "Quản lý")}</option>
            <option value="specialist">{tr(locale, "Chuyên viên")}</option>
            <option value="worker">{tr(locale, "Thực thi")}</option>
          </Select>
        </Field>

        <Field label={tr(locale, "Cấp trên")} htmlFor="agent-parent">
          <Select id="agent-parent" name="parent_id" defaultValue="">
            <option value="">{tr(locale, "Không có (cấp cao nhất)")}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} · {tr(locale, AGENT_ROLES[agent.role].label)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={tr(locale, "Chức danh")} htmlFor="agent-title">
          <Input
            id="agent-title"
            name="title"
            placeholder={tr(locale, "VD: Chuyên viên SEO video")}
            maxLength={160}
          />
        </Field>

        <Field label="Provider" htmlFor="agent-provider">
          <Select id="agent-provider" name="provider" defaultValue="">
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {tr(locale, option.label)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Model free (OpenCode Zen)"
          htmlFor="agent-model"
          hint={tr(locale, "Để trống = model free mặc định. Chỉ chọn model trong danh sách free.")}
        >
          <Input
            id="agent-model"
            name="model"
            list="opencode-free-models"
            placeholder="deepseek-v4.1-flash-free"
          />
          <datalist id="opencode-free-models">
            {OPENCODE_FREE_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label} · {model.use}
              </option>
            ))}
          </datalist>
        </Field>

        <Field
          label={tr(locale, "Trần token mỗi lần chạy")}
          htmlFor="agent-tokens"
          hint={tr(locale, "Giới hạn output để tránh đốt token.")}
        >
          <Input
            id="agent-tokens"
            name="max_tokens_per_run"
            type="number"
            min={256}
            max={32000}
            step={256}
            defaultValue={4000}
          />
        </Field>

        <Field
          label={tr(locale, "Hạn mức token mỗi ngày")}
          htmlFor="agent-daily-tokens"
          hint={tr(locale, "CEO chia pool này cho các task; hết là dừng.")}
        >
          <Input
            id="agent-daily-tokens"
            name="daily_token_budget"
            type="number"
            min={500}
            max={200000}
            step={500}
            defaultValue={15000}
          />
        </Field>
      </div>

      <Field label="System prompt" htmlFor="agent-prompt">
        <Textarea
          id="agent-prompt"
          name="system_prompt"
          rows={4}
          placeholder={tr(locale, "Mô tả nhiệm vụ, cách làm việc và định dạng đầu ra của AI này…")}
          maxLength={8000}
        />
      </Field>

      <SubmitButton pendingText={tr(locale, "Đang thêm…")}>
        {tr(locale, "Thêm AI")}
      </SubmitButton>
    </form>
  );
}
