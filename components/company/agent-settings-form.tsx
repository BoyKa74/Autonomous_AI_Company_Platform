"use client";

import { useActionState, useState } from "react";
import { updateAgentSettings } from "@/app/actions/company";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Alert,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/kit";
import {
  stepsForAgent,
  type WorkflowStep,
  type WorkflowStepMode,
} from "@/lib/workflows";
import { tr, type Locale } from "@/lib/i18n/messages";
import type { AiAgent } from "@/types/database";

const MODE_OPTIONS: { value: WorkflowStepMode; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "voice", label: "Voice" },
  { value: "music", label: "Music" },
  { value: "note", label: "Manual" },
];

function nextStepId(steps: WorkflowStep[]): string {
  const used = new Set(steps.map((step) => step.id));
  let index = steps.length + 1;
  while (used.has(`s${index}`)) index += 1;
  return `s${index}`;
}

export function AgentSettingsForm({
  agent,
  companyId,
  locale,
}: {
  agent: AiAgent;
  companyId: string;
  locale: Locale;
}) {
  const [state, action] = useActionState(updateAgentSettings, initialFormState);
  const [steps, setSteps] = useState<WorkflowStep[]>(() =>
    stepsForAgent(agent)
  );

  const updateStep = (index: number, patch: Partial<WorkflowStep>) => {
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...patch } : step
      )
    );
  };

  const addStep = () => {
    setSteps((current) => [
      ...current,
      {
        id: nextStepId(current),
        title: tr(locale, "Bước mới"),
        mode: "text",
        instruction: "",
      },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index));
  };

  return (
    <form
      action={action}
      className="space-y-3 rounded-md border border-ink-700 bg-ink-850 p-3"
    >
      {state.status === "error" && (
        <Alert tone="error">{tr(locale, state.message)}</Alert>
      )}
      {state.status === "success" && (
        <Alert tone="success">{tr(locale, state.message)}</Alert>
      )}

      <input type="hidden" name="id" value={agent.id} />
      <input type="hidden" name="company_id" value={companyId} />
      <input type="hidden" name="workflow" value={JSON.stringify(steps)} />

      <Field
        label={tr(locale, "System prompt")}
        htmlFor={`agent-system-prompt-${agent.id}`}
        hint={tr(
          locale,
          "Prompt nền quy định vai trò, cách làm việc và giới hạn của AI."
        )}
      >
        <Textarea
          id={`agent-system-prompt-${agent.id}`}
          name="system_prompt"
          rows={4}
          defaultValue={agent.system_prompt ?? ""}
          maxLength={8000}
          placeholder={tr(
            locale,
            "VD: Bạn viết nội dung kỹ thuật. Nêu rõ giả định, không bịa trải nghiệm."
          )}
        />
      </Field>

      <div className="border-t border-ink-700 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-fog-600">
              {tr(locale, "Quy trình AI")}
            </p>
            <p className="mt-0.5 text-[11px] text-fog-500">
              {tr(locale, "Các bước AI sẽ chạy cho mỗi nhiệm vụ.")}
            </p>
          </div>
          <button
            type="button"
            onClick={addStep}
            className="rounded border border-ink-600 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-fog-400 transition-colors hover:border-ink-500 hover:text-fog-100"
          >
            + {tr(locale, "Thêm bước")}
          </button>
        </div>

        <div className="mt-2 space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="rounded border border-ink-700 bg-ink-900 p-2.5"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-[9px] uppercase tracking-wider text-fog-600">
                  {tr(locale, "Bước")} {index + 1}
                </span>
                <Select
                  aria-label={tr(locale, "Chế độ")}
                  value={step.mode}
                  onChange={(event) =>
                    updateStep(index, {
                      mode: event.target.value as WorkflowStepMode,
                    })
                  }
                  className="ml-auto h-8 w-24 text-xs"
                >
                  {MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {tr(locale, option.label)}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => removeStep(index)}
                  disabled={steps.length <= 1}
                  aria-label={tr(locale, "Xoá bước")}
                  className="grid size-8 shrink-0 place-items-center rounded border border-ink-700 text-fog-500 transition-colors hover:border-bad-400/50 hover:text-bad-400 disabled:opacity-40"
                >
                  ×
                </button>
              </div>
              <Input
                aria-label={tr(locale, "Tên bước")}
                value={step.title}
                onChange={(event) =>
                  updateStep(index, { title: event.target.value })
                }
                maxLength={200}
                className="mb-2 h-8 w-full text-xs"
              />
              <Textarea
                aria-label={tr(locale, "Hướng dẫn cho bước")}
                value={step.instruction}
                onChange={(event) =>
                  updateStep(index, { instruction: event.target.value })
                }
                rows={2}
                maxLength={4000}
                placeholder={tr(
                  locale,
                  "Mô tả việc AI cần làm ở bước này…"
                )}
                className="text-xs"
              />
            </div>
          ))}
        </div>
      </div>

      <SubmitButton
        size="sm"
        variant="secondary"
        pendingText={tr(locale, "Đang lưu…")}
      >
        {tr(locale, "Lưu prompt & workflow")}
      </SubmitButton>
    </form>
  );
}
