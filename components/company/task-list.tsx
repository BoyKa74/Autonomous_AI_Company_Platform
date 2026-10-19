"use client";

import { useState } from "react";
import { approveTask, rejectTask, runTask } from "@/app/actions/company";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState, Eyebrow } from "@/components/ui/kit";
import { TASK_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { AgentTask } from "@/types/database";

export function TaskList({
  tasks,
  agentNames,
}: {
  tasks: AgentTask[];
  agentNames: Record<string, string>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Chưa có nhiệm vụ nào"
        description="Giao việc cho một AI ở khung bên trái để bắt đầu."
      />
    );
  }

  return (
    <ul className="divide-y divide-ink-700">
      {tasks.map((task) => {
        const meta = TASK_STATUSES[task.status];
        const open = openId === task.id;
        return (
          <li key={task.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setOpenId(open ? null : task.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="font-mono text-[10.5px] uppercase tracking-wider"
                    style={{ color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <Eyebrow>
                    {task.agent_id
                      ? agentNames[task.agent_id] ?? "Agent"
                      : "Chưa gán"}
                  </Eyebrow>
                  <Eyebrow>
                    dự toán ${task.estimate_usd.toFixed(4)} · thực tế $
                    {task.actual_usd.toFixed(4)}
                  </Eyebrow>
                </div>
                <p className="mt-1 truncate text-sm font-medium text-fog-100">
                  {task.title}
                </p>
                <p className="mt-0.5 font-mono text-[10.5px] text-fog-600">
                  {formatDateTime(task.created_at)}
                  {task.actual_tokens > 0
                    ? ` · ${task.actual_tokens.toLocaleString("vi-VN")} token`
                    : ""}
                </p>
              </button>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {["queued", "failed", "rejected"].includes(task.status) && (
                  <form action={runTask}>
                    <input type="hidden" name="id" value={task.id} />
                    <SubmitButton size="sm" pendingText="Đang chạy…">
                      Chạy
                    </SubmitButton>
                  </form>
                )}
                {task.status === "review" && (
                  <>
                    <form action={approveTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <input
                        type="hidden"
                        name="company_id"
                        value={task.company_id}
                      />
                      <SubmitButton size="sm" pendingText="…">
                        Duyệt
                      </SubmitButton>
                    </form>
                    <form action={rejectTask}>
                      <input type="hidden" name="id" value={task.id} />
                      <input
                        type="hidden"
                        name="company_id"
                        value={task.company_id}
                      />
                      <SubmitButton
                        size="sm"
                        variant="danger"
                        pendingText="…"
                      >
                        Từ chối
                      </SubmitButton>
                    </form>
                  </>
                )}
              </div>
            </div>

            {task.error && task.status !== "failed" && (
              <p className="mt-2 text-xs text-warn-400">{task.error}</p>
            )}

            {task.status === "failed" && task.error && (
              <p className="mt-2 rounded border border-bad-400/30 bg-bad-400/10 px-2 py-1.5 text-xs text-bad-400">
                {task.error}
              </p>
            )}

            {open && (
              <div className="mt-3 rounded-md border border-ink-700 bg-ink-900 p-3">
                {task.brief && (
                  <>
                    <Eyebrow className="mb-1">Yêu cầu</Eyebrow>
                    <p className="mb-3 whitespace-pre-wrap text-xs text-fog-500">
                      {task.brief}
                    </p>
                  </>
                )}
                <Eyebrow className="mb-1">Kết quả</Eyebrow>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-fog-100">
                  {task.result || "Chưa có kết quả — bấm Chạy để tạo."}
                </pre>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
