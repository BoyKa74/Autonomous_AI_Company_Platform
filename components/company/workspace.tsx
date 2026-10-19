"use client";

import { useMemo, useState } from "react";
import { OrgScene } from "@/components/company/org-scene";
import { TaskForm } from "@/components/company/task-form";
import { TaskList } from "@/components/company/task-list";
import { removeAgent } from "@/app/actions/company";
import { SubmitButton } from "@/components/ui/submit-button";
import { Eyebrow, Panel, Tag } from "@/components/ui/kit";
import { AGENT_ROLES, TASK_STATUSES } from "@/lib/constants";
import type { AiAgent, AgentTask, Company } from "@/types/database";

const ACTIVE_STATUSES: AgentTask["status"][] = ["queued", "running", "review"];

export function CompanyWorkspace({
  company,
  agents,
  tasks,
}: {
  company: Company;
  agents: AiAgent[];
  tasks: AgentTask[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [dark, setDark] = useState(false);

  const selected = agents.find((agent) => agent.id === selectedId) ?? null;

  const activeByAgent = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const task of tasks) {
      if (!task.agent_id) continue;
      if (ACTIVE_STATUSES.includes(task.status)) {
        counts[task.agent_id] = (counts[task.agent_id] ?? 0) + 1;
      }
    }
    return counts;
  }, [tasks]);

  const handoffs = useMemo(() => {
    const byId = new Map(agents.map((agent) => [agent.id, agent]));
    const ceo = agents.find((agent) => agent.role === "ceo") ?? null;
    const pairs = new Map<string, { fromId: string; toId: string }>();

    for (const task of tasks) {
      if (!task.agent_id) continue;
      const target = byId.get(task.agent_id);
      if (!target) continue;

      if (task.status === "queued" || task.status === "running") {
        const from = target.parent_id ? byId.get(target.parent_id) : null;
        if (from) {
          pairs.set(`${from.id}->${target.id}`, {
            fromId: from.id,
            toId: target.id,
          });
        }
      } else if (task.status === "review" && ceo && target.id !== ceo.id) {
        pairs.set(`${target.id}->${ceo.id}`, {
          fromId: target.id,
          toId: ceo.id,
        });
      }
    }

    return [...pairs.values()];
  }, [agents, tasks]);

  const agentNames = useMemo(
    () => Object.fromEntries(agents.map((agent) => [agent.id, agent.name])),
    [agents]
  );

  const focusedTasks = selectedId
    ? tasks.filter((task) => task.agent_id === selectedId)
    : tasks;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-xl border border-ink-700 bg-ink-850">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 px-4 py-3">
            <div>
              <Eyebrow>Văn phòng AI · 3D</Eyebrow>
              <h2 className="mt-0.5 font-display text-sm font-semibold text-fog-100">
                {agents.length} robot đang làm việc
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 md:flex">
                {(Object.keys(AGENT_ROLES) as AiAgent["role"][])
                  .filter((role) => role !== "super_admin")
                  .map((role) => (
                    <span
                      key={role}
                      className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fog-500"
                    >
                      <span
                        className="inline-block size-1.5 rounded-full"
                        style={{ backgroundColor: AGENT_ROLES[role].color }}
                      />
                      {AGENT_ROLES[role].label}
                    </span>
                  ))}
              </div>
              <button
                type="button"
                onClick={() => setSpinning((value) => !value)}
                className="rounded-md border border-ink-600 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-100"
              >
                {spinning ? "Dừng xoay" : "Tự xoay"}
              </button>
              <div className="flex overflow-hidden rounded-md border border-ink-600">
                <button
                  type="button"
                  onClick={() => setDark(false)}
                  className={
                    dark
                      ? "px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fog-500 hover:bg-ink-800"
                      : "bg-signal-500 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#241503]"
                  }
                >
                  Ngày
                </button>
                <button
                  type="button"
                  onClick={() => setDark(true)}
                  className={
                    dark
                      ? "bg-signal-500 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#241503]"
                      : "px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fog-500 hover:bg-ink-800"
                  }
                >
                  Đêm
                </button>
              </div>
            </div>
          </header>

          <div className="relative h-[540px]">
            {agents.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="font-display text-sm font-semibold text-fog-100">
                  Công ty chưa có AI nào
                </p>
                <p className="max-w-xs text-sm text-fog-500">
                  Cài cơ cấu mẫu hoặc thêm AI thủ công ở khung bên phải.
                </p>
              </div>
            ) : (
              <>
                <OrgScene
                  agents={agents}
                  activeByAgent={activeByAgent}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  spinning={spinning}
                  title={company.name}
                  dark={dark}
                  handoffs={handoffs}
                />
                <p className="pointer-events-none absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.18em] text-fog-600">
                  Kéo để xoay · lăn chuột để zoom · bấm vào robot để xem việc ·
                  robot cầm tệp = đang giao việc
                </p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Panel
            eyebrow="Chi tiết"
            title={selected ? selected.name : "Chọn một AI trên sơ đồ"}
            bodyClassName="p-4"
          >
            {selected ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="font-mono text-[10.5px] uppercase tracking-wider"
                    style={{ color: AGENT_ROLES[selected.role].color }}
                  >
                    {AGENT_ROLES[selected.role].label}
                  </span>
                  {selected.status === "paused" && <Tag>tạm dừng</Tag>}
                  {(activeByAgent[selected.id] ?? 0) > 0 && (
                    <Tag className="text-signal-500">
                      {activeByAgent[selected.id]} việc đang xử lý
                    </Tag>
                  )}
                </div>

                <p className="text-sm text-fog-300">
                  {selected.title || "Chưa có chức danh"}
                </p>

                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-fog-600">Provider</dt>
                    <dd className="font-mono text-fog-300">
                      {selected.provider || "router tự chọn"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fog-600">Model</dt>
                    <dd className="font-mono text-fog-300">
                      {selected.model || "mặc định provider"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fog-600">Trần token/lần</dt>
                    <dd className="font-mono text-fog-300">
                      {selected.max_tokens_per_run.toLocaleString("vi-VN")}
                    </dd>
                  </div>
                </dl>

                {selected.system_prompt && (
                  <div className="rounded-md border border-ink-700 bg-ink-900 p-3">
                    <Eyebrow className="mb-1">System prompt</Eyebrow>
                    <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-fog-400">
                      {selected.system_prompt}
                    </pre>
                  </div>
                )}

                <form action={removeAgent}>
                  <input type="hidden" name="id" value={selected.id} />
                  <input
                    type="hidden"
                    name="company_id"
                    value={company.id}
                  />
                  <SubmitButton
                    size="sm"
                    variant="danger"
                    pendingText="Đang xoá…"
                    confirm={`Xoá AI "${selected.name}" khỏi công ty?`}
                  >
                    Xoá AI này
                  </SubmitButton>
                </form>
              </div>
            ) : (
              <p className="text-sm text-fog-500">
                Bấm vào một robot trong văn phòng 3D để xem chức danh, prompt và
                nhiệm vụ của AI đó.
              </p>
            )}
          </Panel>

          <Panel eyebrow="Giao việc" title="Nhiệm vụ mới" bodyClassName="p-4">
            <TaskForm
              key={selectedId ?? "none"}
              companyId={company.id}
              agents={agents}
              defaultAgentId={selectedId}
            />
          </Panel>
        </div>
      </div>

      <Panel
        eyebrow="Tiến độ"
        title={
          selected
            ? `Nhiệm vụ của ${selected.name} (${focusedTasks.length})`
            : `Tất cả nhiệm vụ (${tasks.length})`
        }
        actions={
          selected ? (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="font-mono text-[10px] uppercase tracking-wider text-fog-500 hover:text-fog-100"
            >
              Xem tất cả
            </button>
          ) : undefined
        }
        bodyClassName="p-0"
      >
        <TaskList tasks={focusedTasks} agentNames={agentNames} />
      </Panel>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TASK_STATUSES) as AgentTask["status"][]).map((status) => (
          <span
            key={status}
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: TASK_STATUSES[status].color }}
          >
            ● {TASK_STATUSES[status].label}
          </span>
        ))}
      </div>
    </div>
  );
}
