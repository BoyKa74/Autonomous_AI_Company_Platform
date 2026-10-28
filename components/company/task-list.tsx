"use client";

import { useState } from "react";
import { approveTask, markTaskPublished, rejectTask } from "@/app/actions/company";
import { runTaskStep } from "@/app/actions/workflows";
import { SubmitButton } from "@/components/ui/submit-button";
import { EmptyState, Eyebrow, Tag } from "@/components/ui/kit";
import { TASK_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { AgentTask } from "@/types/database";

export function TaskList({
  tasks,
  agentNames,
  channels,
}: {
  tasks: AgentTask[];
  agentNames: Record<string, string>;
  channels: { id: string; name: string }[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const channelName = new Map(
    channels.map((channel) => [channel.id, channel.name])
  );

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
                  {task.channel_id && (
                    <Tag>{channelName.get(task.channel_id) ?? "Kênh"}</Tag>
                  )}
                  {task.status === "approved" && (
                    <Tag className={task.published_at ? "text-ok-400" : "text-warn-400"}>
                      {task.published_at ? "đã đăng" : "sẵn sàng đăng"}
                    </Tag>
                  )}
                  <Eyebrow>
                    dự toán ${task.estimate_usd.toFixed(4)} · chi phí $
                    {task.actual_usd.toFixed(4)}
                  </Eyebrow>
                  {Number(task.reward_usd) > 0 && (
                    <span className="font-mono text-[10.5px] uppercase tracking-wider text-ok-400">
                      thưởng ${Number(task.reward_usd).toFixed(2)}
                    </span>
                  )}
                  {Array.isArray(task.workflow_state) &&
                    task.workflow_state.length > 0 && (
                      <span className="font-mono text-[10.5px] uppercase tracking-wider text-fog-500">
                        bước{" "}
                        {
                          (
                            task.workflow_state as {
                              status: string;
                            }[]
                          ).filter((entry) => entry.status === "done").length
                        }
                        /{(task.workflow_state as unknown[]).length}
                      </span>
                    )}
                </div>
                <p className="mt-1 truncate text-sm font-medium text-fog-100">
                  {task.title}
                </p>
                <p className="mt-0.5 font-mono text-[10.5px] text-fog-600">
                  {formatDateTime(task.created_at)}
                  {` · ${task.actual_tokens.toLocaleString(
                    "vi-VN"
                  )}/${task.token_budget.toLocaleString("vi-VN")} token`}
                </p>
              </button>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                {["queued", "manager_review", "failed", "rejected"].includes(
                  task.status
                ) && (
                  <form action={runTaskStep}>
                    <input type="hidden" name="id" value={task.id} />
                    <SubmitButton size="sm" pendingText="Đang chạy…">
                      Chạy bước
                    </SubmitButton>
                  </form>
                )}
                {task.status === "approved" && (
                  <>
                    {task.result && (
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(task.result ?? "");
                          setCopiedId(task.id);
                        }}
                        className="rounded-md border border-ink-600 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-100"
                      >
                        {copiedId === task.id ? "Đã copy" : "Copy nội dung"}
                      </button>
                    )}
                    {!task.published_at && (
                      <form action={markTaskPublished}>
                        <input type="hidden" name="id" value={task.id} />
                        <SubmitButton size="sm" variant="secondary" pendingText="…">
                          Đã đăng
                        </SubmitButton>
                      </form>
                    )}
                  </>
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
                  {task.result || "Chưa có kết quả — bấm Chạy bước để tạo."}
                </pre>
                {typeof task.review === "object" &&
                  task.review !== null &&
                  !Array.isArray(task.review) &&
                  task.review.notes && (
                    <div className="mt-3 rounded-md border border-ink-700 bg-white p-3">
                      <Eyebrow className="mb-1">
                        Quản lý duyệt
                        {task.review.by ? ` · ${String(task.review.by)}` : ""}
                      </Eyebrow>
                      <p className="whitespace-pre-wrap text-sm text-fog-300">
                        {String(task.review.notes)}
                      </p>
                    </div>
                  )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
