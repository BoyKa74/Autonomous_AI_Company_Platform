"use client";

import { useMemo, useState } from "react";
import { Eyebrow, Tag } from "@/components/ui/kit";
import { SubmitButton } from "@/components/ui/submit-button";
import { rerunStep, updateStepOutput } from "@/app/actions/workflows";
import {
  parseStepStates,
  stepsForAgent,
  type WorkflowStepMode,
  type WorkflowStepState,
} from "@/lib/workflows";
import { cn } from "@/lib/utils";
import { tr, type Locale } from "@/lib/i18n/messages";
import type { AiAgent, AgentTask } from "@/types/database";

const MODE_LABEL: Record<WorkflowStepMode, string> = {
  text: "AI",
  voice: "VOICE",
  music: "NHẠC",
  note: "THỦ CÔNG",
};

const STATUS_META: Record<
  WorkflowStepState["status"],
  { label: string; color: string }
> = {
  pending: { label: "Chờ", color: "#8b95a7" },
  running: { label: "Đang chạy", color: "#cd8615" },
  done: { label: "Xong", color: "#18855a" },
  failed: { label: "Lỗi", color: "#cf3f45" },
};

const CARD_W = 200;
const CARD_H = 104;
const GAP = 64;
const HEIGHT = 220;

export function WorkflowCanvas({
  agent,
  task,
  agents,
  locale,
}: {
  agent: AiAgent;
  task: AgentTask | null;
  agents: AiAgent[];
  locale: Locale;
}) {
  const steps = useMemo(() => stepsForAgent(agent), [agent]);
  const states = useMemo(
    () => (task ? parseStepStates(task) : []),
    [task]
  );
  const [selected, setSelected] = useState(0);

  const stateFor = (index: number): WorkflowStepState =>
    states.find((entry) => entry.stepId === steps[index]?.id) ??
    states[index] ?? {
      stepId: steps[index]?.id ?? "",
      status: "pending",
    };

  const positions = steps.map((_, index) => ({
    x: 20 + index * (CARD_W + GAP),
    y: index % 2 === 0 ? 34 : 96,
  }));

  const totalWidth =
    steps.length * CARD_W + Math.max(0, steps.length - 1) * GAP + 40;

  const selectedStep = steps[selected];
  const selectedState = selectedStep ? stateFor(selected) : null;
  const canIntervene =
    Boolean(task) &&
    task !== null &&
    ["queued", "running", "manager_review", "review", "failed", "rejected"].includes(
      task.status
    );
  const doneCount = steps.filter(
    (_, index) => stateFor(index).status === "done"
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Tag>{agent.name}</Tag>
        <Tag>{doneCount}/{steps.length} {tr(locale, "bước")}</Tag>
        {task ? (
          <span className="min-w-0 truncate text-xs text-fog-500">
            {task.title}
          </span>
        ) : (
          <span className="text-xs text-fog-600">
            {tr(locale, "Chưa có nhiệm vụ — tạo hoặc bật tự động để dây chuyền chạy.")}
          </span>
        )}
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="relative" style={{ width: totalWidth, height: HEIGHT }}>
          <svg
            className="pointer-events-none absolute inset-0"
            width={totalWidth}
            height={HEIGHT}
            aria-hidden
          >
            {positions.slice(0, -1).map((position, index) => {
              const next = positions[index + 1];
              const nextState = stateFor(index + 1);
              const x1 = position.x + CARD_W;
              const y1 = position.y + 52;
              const x2 = next.x;
              const y2 = next.y + 52;
              return (
                <path
                  key={index}
                  d={`M ${x1} ${y1} C ${x1 + 42} ${y1}, ${x2 - 42} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={
                    nextState.status === "done"
                      ? "#18855a"
                      : nextState.status === "running"
                        ? "#cd8615"
                        : "#cbd3df"
                  }
                  strokeWidth={1.6}
                  strokeDasharray={
                    nextState.status === "pending" ? "4 4" : undefined
                  }
                />
              );
            })}
          </svg>

          {steps.map((step, index) => {
            const state = stateFor(index);
            const meta = STATUS_META[state.status];
            const active = selected === index;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setSelected(index)}
                className={cn(
                  "absolute rounded-lg border bg-white px-3 py-2.5 text-left shadow-sm transition-all",
                  active
                    ? "border-signal-500 ring-2 ring-signal-500/30"
                    : "border-ink-600 hover:border-ink-500",
                  state.status === "running" && "animate-pulse"
                )}
                style={{
                  left: positions[index].x,
                  top: positions[index].y,
                  width: CARD_W,
                  height: CARD_H,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-fog-600">
                    {tr(locale, "Bước")} {index + 1}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className="inline-block size-1.5 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span
                      className="font-mono text-[9.5px] uppercase tracking-wider"
                      style={{ color: meta.color }}
                    >
                      {tr(locale, meta.label)}
                    </span>
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-fog-100">
                  {step.title}
                </p>
                <p className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-fog-600">
                  {tr(locale, MODE_LABEL[step.mode])}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-md border border-ink-700 bg-ink-900 p-3">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Eyebrow>{tr(locale, "Bước")} {selected + 1}</Eyebrow>
          <span className="text-xs text-fog-300">{selectedStep?.title}</span>
          {selectedState?.mediaJobId && <Tag>media job</Tag>}
        </div>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-fog-100">
          {selectedState?.output ||
            selectedState?.error ||
            tr(locale, "Chưa có kết quả cho bước này.")}
        </pre>
        {selectedState?.feedback && (
          <p className="mt-2 text-xs text-warn-400">
            {tr(locale, "Góp ý đã gửi:")} {selectedState.feedback}
          </p>
        )}
      </div>

      {canIntervene && task && selectedStep && (
        <details className="rounded-md border border-ink-700 bg-white p-3">
          <summary className="cursor-pointer font-display text-sm font-semibold text-fog-100">
            {tr(locale, "Can thiệp bước này")}
          </summary>

          <div className="mt-3 space-y-4 text-sm">
            <form action={rerunStep} className="space-y-2">
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="step_id" value={selectedStep.id} />
              <p className="text-xs text-fog-500">
                {tr(
                  locale,
                  "Góp ý cho AI hiện tại rồi chạy lại đúng bước này (các bước sau sẽ chạy lại từ đầu)."
                )}
              </p>
              <textarea
                name="feedback"
                rows={2}
                maxLength={2000}
                placeholder={tr(locale, "VD: hook còn yếu, viết lại mạnh hơn; hoặc số liệu chưa đúng…")}
                className="w-full rounded-md border border-ink-600 bg-white px-2.5 py-2 text-xs text-fog-100 placeholder:text-fog-600 focus:border-signal-500 focus:outline-none"
              />
              <SubmitButton size="sm" variant="secondary" pendingText={tr(locale, "Đang gửi…")}>
                {tr(locale, "Chạy lại bước này")}
              </SubmitButton>
            </form>

            <form
              action={rerunStep}
              className="space-y-2 border-t border-ink-700 pt-3"
            >
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="step_id" value={selectedStep.id} />
              <p className="text-xs text-fog-500">
                {tr(locale, "Giao lại toàn bộ việc cho AI khác (AI cũ bị trừ 4 điểm).")}
              </p>
              <textarea
                name="feedback"
                rows={2}
                maxLength={2000}
                placeholder={tr(locale, "Góp ý cho AI mới…")}
                className="w-full rounded-md border border-ink-600 bg-white px-2.5 py-2 text-xs text-fog-100 placeholder:text-fog-600 focus:border-signal-500 focus:outline-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                <select
                  name="agent_id"
                  defaultValue=""
                  required
                  className="h-8 rounded-md border border-ink-600 bg-white px-2 text-xs text-fog-100"
                >
                  <option value="">{tr(locale, "Chọn AI thay thế…")}</option>
                  {agents
                    .filter(
                      (candidate) =>
                        candidate.id !== agent.id &&
                        candidate.status === "active"
                    )
                    .map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name} ·{" "}
                        {candidate.title ?? tr(locale, candidate.role)}
                      </option>
                    ))}
                </select>
                <SubmitButton size="sm" pendingText={tr(locale, "Đang giao…")}>
                  {tr(locale, "Giao AI khác")}
                </SubmitButton>
              </div>
            </form>

            <form
              action={updateStepOutput}
              className="space-y-2 border-t border-ink-700 pt-3"
            >
              <input type="hidden" name="task_id" value={task.id} />
              <input type="hidden" name="step_id" value={selectedStep.id} />
              <p className="text-xs text-fog-500">
                {tr(locale, "Hoặc tự sửa kết quả của bước này rồi cho chạy tiếp.")}
              </p>
              <textarea
                name="output"
                rows={4}
                defaultValue={selectedState?.output ?? ""}
                className="w-full rounded-md border border-ink-600 bg-white px-2.5 py-2 font-sans text-xs text-fog-100 focus:border-signal-500 focus:outline-none"
              />
              <SubmitButton size="sm" variant="secondary" pendingText={tr(locale, "Đang lưu…")}>
                {tr(locale, "Lưu kết quả sửa")}
              </SubmitButton>
            </form>
          </div>
        </details>
      )}
    </div>
  );
}
