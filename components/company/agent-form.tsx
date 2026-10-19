"use client";

import { useActionState } from "react";
import { addAgent } from "@/app/actions/company";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/kit";
import { AGENT_ROLES } from "@/lib/constants";
import type { AiAgent } from "@/types/database";

const PROVIDER_OPTIONS = [
  { value: "", label: "Tự động (router chọn)" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google Gemini" },
  { value: "openrouter", label: "OpenRouter" },
];

export function AgentForm({
  companyId,
  agents,
}: {
  companyId: string;
  agents: Pick<AiAgent, "id" | "name" | "role">[];
}) {
  const [state, action] = useActionState(addAgent, initialFormState);

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}
      {state.status === "success" && (
        <Alert tone="success">{state.message}</Alert>
      )}

      <input type="hidden" name="company_id" value={companyId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tên AI" htmlFor="agent-name">
          <Input
            id="agent-name"
            name="name"
            placeholder="VD: Writer SEO"
            maxLength={120}
            required
          />
        </Field>

        <Field label="Vai trò" htmlFor="agent-role">
          <Select id="agent-role" name="role" defaultValue="specialist">
            <option value="ceo">CEO</option>
            <option value="manager">Quản lý</option>
            <option value="specialist">Chuyên viên</option>
            <option value="worker">Thực thi</option>
          </Select>
        </Field>

        <Field label="Cấp trên" htmlFor="agent-parent">
          <Select id="agent-parent" name="parent_id" defaultValue="">
            <option value="">Không có (cấp cao nhất)</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} · {AGENT_ROLES[agent.role].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Chức danh" htmlFor="agent-title">
          <Input
            id="agent-title"
            name="title"
            placeholder="VD: Chuyên viên SEO video"
            maxLength={160}
          />
        </Field>

        <Field label="Provider" htmlFor="agent-provider">
          <Select id="agent-provider" name="provider" defaultValue="">
            {PROVIDER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Trần token mỗi lần chạy"
          htmlFor="agent-tokens"
          hint="Giới hạn output để tránh đốt token."
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
      </div>

      <Field label="System prompt" htmlFor="agent-prompt">
        <Textarea
          id="agent-prompt"
          name="system_prompt"
          rows={4}
          placeholder="Mô tả nhiệm vụ, cách làm việc và định dạng đầu ra của AI này…"
          maxLength={8000}
        />
      </Field>

      <SubmitButton pendingText="Đang thêm…">Thêm AI</SubmitButton>
    </form>
  );
}
