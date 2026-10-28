"use client";

import { useActionState } from "react";
import { createTask } from "@/app/actions/company";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/kit";
import type { AiAgent } from "@/types/database";
import { AGENT_ROLES } from "@/lib/constants";
import { tr, type Locale } from "@/lib/i18n/messages";

export function TaskForm({
  companyId,
  agents,
  channels,
  defaultAgentId,
  locale,
}: {
  companyId: string;
  agents: Pick<AiAgent, "id" | "name" | "role">[];
  channels: { id: string; name: string }[];
  defaultAgentId?: string | null;
  locale: Locale;
}) {
  const [state, action] = useActionState(createTask, initialFormState);

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && (
        <Alert tone="error">{tr(locale, state.message)}</Alert>
      )}
      {state.status === "success" && (
        <Alert tone="success">{tr(locale, state.message)}</Alert>
      )}

      <input type="hidden" name="company_id" value={companyId} />

      <Field
        label={tr(locale, "Kênh đăng")}
        htmlFor="task-channel"
        hint={tr(locale, "AI sẽ đọc hướng dẫn riêng (ai_brief) của kênh này.")}
      >
        <Select id="task-channel" name="channel_id" defaultValue="">
          <option value="">{tr(locale, "Không gắn kênh")}</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={tr(locale, "Giao cho AI")} htmlFor="task-agent">
        <Select
          id="task-agent"
          name="agent_id"
          required
          defaultValue={defaultAgentId ?? ""}
        >
          <option value="">{tr(locale, "Chọn AI thực hiện…")}</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} · {tr(locale, AGENT_ROLES[agent.role].label)}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={tr(locale, "Tiêu đề nhiệm vụ")} htmlFor="task-title">
        <Input
          id="task-title"
          name="title"
          placeholder={tr(locale, "VD: Viết 3 kịch bản video review tai nghe cho TikTok")}
          maxLength={200}
          required
        />
      </Field>

      <Field
        label={tr(locale, "Mô tả chi tiết")}
        htmlFor="task-brief"
        hint={tr(locale, "Càng cụ thể, đầu ra càng đúng. Hệ thống sẽ ước tính chi phí trước khi chạy.")}
      >
        <Textarea
          id="task-brief"
          name="brief"
          rows={5}
          placeholder={tr(locale, "Mục tiêu, đối tượng, định dạng đầu ra mong muốn…")}
          maxLength={20000}
          required
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-fog-300">
        <input
          type="checkbox"
          name="requires_approval"
          defaultChecked
          className="size-4 accent-[#f0a63c]"
        />
        {tr(locale, "Bắt buộc duyệt trước khi dùng (khuyến nghị)")}
      </label>

      <SubmitButton pendingText={tr(locale, "Đang tạo…")}>
        {tr(locale, "Tạo nhiệm vụ")}
      </SubmitButton>
    </form>
  );
}
