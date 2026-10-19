"use client";

import { useActionState } from "react";
import { createTask } from "@/app/actions/company";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/kit";
import type { AiAgent } from "@/types/database";
import { AGENT_ROLES } from "@/lib/constants";

export function TaskForm({
  companyId,
  agents,
  defaultAgentId,
}: {
  companyId: string;
  agents: Pick<AiAgent, "id" | "name" | "role">[];
  defaultAgentId?: string | null;
}) {
  const [state, action] = useActionState(createTask, initialFormState);

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}
      {state.status === "success" && (
        <Alert tone="success">{state.message}</Alert>
      )}

      <input type="hidden" name="company_id" value={companyId} />

      <Field label="Giao cho AI" htmlFor="task-agent">
        <Select
          id="task-agent"
          name="agent_id"
          required
          defaultValue={defaultAgentId ?? ""}
        >
          <option value="">Chọn AI thực hiện…</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name} · {AGENT_ROLES[agent.role].label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Tiêu đề nhiệm vụ" htmlFor="task-title">
        <Input
          id="task-title"
          name="title"
          placeholder="VD: Viết 3 kịch bản video review tai nghe cho TikTok"
          maxLength={200}
          required
        />
      </Field>

      <Field
        label="Mô tả chi tiết"
        htmlFor="task-brief"
        hint="Càng cụ thể, đầu ra càng đúng. Hệ thống sẽ ước tính chi phí trước khi chạy."
      >
        <Textarea
          id="task-brief"
          name="brief"
          rows={5}
          placeholder="Mục tiêu, đối tượng, định dạng đầu ra mong muốn…"
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
        Bắt buộc duyệt trước khi dùng (khuyến nghị)
      </label>

      <SubmitButton pendingText="Đang tạo…">Tạo nhiệm vụ</SubmitButton>
    </form>
  );
}
