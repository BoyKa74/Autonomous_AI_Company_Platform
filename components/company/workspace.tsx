"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AgentWorkspace2D,
  DARK_WORKSPACE_STYLE,
} from "@/components/company/agent-workspace-2d";
import { AgentSettingsForm } from "@/components/company/agent-settings-form";
import { OrgScene } from "@/components/company/org-scene";
import { TaskForm } from "@/components/company/task-form";
import { TaskList } from "@/components/company/task-list";
import { WorkflowCanvas } from "@/components/company/workflow-canvas";
import { removeAgent, updateAgentBudget } from "@/app/actions/company";
import {
  autoRunNext,
  planCompanyTasks,
  runCompanyAudit,
} from "@/app/actions/workflows";
import { SubmitButton } from "@/components/ui/submit-button";
import { DataValue, Eyebrow, Panel, Tag } from "@/components/ui/kit";
import { AGENT_ROLES, TASK_STATUSES } from "@/lib/constants";
import { OPENCODE_FREE_MODELS } from "@/lib/ai/free-models";
import { tierMeta } from "@/lib/economy";
import { tr, type Locale } from "@/lib/i18n/messages";
import type {
  AgentTask,
  AiAgent,
  Company,
  CompanyReport,
} from "@/types/database";

const ACTIVE_STATUSES: AgentTask["status"][] = ["queued", "running", "review"];

export function CompanyWorkspace({
  company,
  agents,
  tasks,
  aiReady,
  reports,
  channels,
  headless = false,
  tokenUsage = {},
  locale,
}: {
  company: Company;
  agents: AiAgent[];
  tasks: AgentTask[];
  aiReady: boolean;
  reports: CompanyReport[];
  channels: { id: string; name: string }[];
  headless?: boolean;
  tokenUsage?: Record<string, number>;
  locale: Locale;
}) {
  const numberLocale = locale === "en" ? "en-US" : "vi-VN";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"tree" | "3d">("tree");
  const [spinning, setSpinning] = useState(false);
  const [dark, setDark] = useState(false);
  const [auto, setAuto] = useState(false);
  const [autoMessage, setAutoMessage] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const workingRef = useRef(false);
  const router = useRouter();

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
      } else if (task.status === "manager_review") {
        const parent = target.parent_id ? byId.get(target.parent_id) : null;
        if (parent) {
          pairs.set(`${target.id}->${parent.id}`, {
            fromId: target.id,
            toId: parent.id,
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

  const leaderboard = useMemo(
    () =>
      [...agents].sort(
        (a, b) =>
          Number(b.earnings_usd) - Number(a.earnings_usd) ||
          b.score - a.score
      ),
    [agents]
  );

  const leaderId =
    leaderboard.length > 0 && Number(leaderboard[0].earnings_usd) > 0
      ? leaderboard[0].id
      : null;

  useEffect(() => {
    if (!auto) return;
    let cancelled = false;

    const tick = async () => {
      if (workingRef.current) return;
      workingRef.current = true;
      try {
        const result = await autoRunNext(company.id);
        if (!cancelled) {
          setAutoMessage(result.message);
          if (result.ran) router.refresh();
        }
      } catch (error) {
        if (!cancelled) {
          setAutoMessage(
            error instanceof Error
              ? error.message
              : tr(locale, "Lỗi khi tự chạy.")
          );
        }
      } finally {
        workingRef.current = false;
      }
    };

    tick();
    const timer = setInterval(tick, 6500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [auto, company.id, router, locale]);

  const handlePlan = async () => {
    if (!aiReady || planning) return;
    setPlanning(true);
    setAutoMessage(null);
    try {
      const result = await planCompanyTasks(company.id);
      setAutoMessage(result.message);
      router.refresh();
    } catch (error) {
      setAutoMessage(
        error instanceof Error
          ? error.message
          : tr(locale, "Lỗi khi lập kế hoạch.")
      );
    } finally {
      setPlanning(false);
    }
  };

  const handleAudit = async () => {
    if (!aiReady || auditing) return;
    setAuditing(true);
    setAutoMessage(null);
    try {
      const result = await runCompanyAudit(company.id);
      setAutoMessage(result.message);
      router.refresh();
    } catch (error) {
      setAutoMessage(
        error instanceof Error
          ? error.message
          : tr(locale, "Lỗi khi CEO kiểm tra.")
      );
    } finally {
      setAuditing(false);
    }
  };

  const workflowAgent =
    selected ??
    agents.find((agent) =>
      tasks.some(
        (task) =>
          task.agent_id === agent.id &&
          (task.status === "running" || task.status === "review")
      )
    ) ??
    agents[0] ??
    null;

  const workflowTask = workflowAgent
    ? tasks.find(
        (task) =>
          task.agent_id === workflowAgent.id &&
          ["running", "review", "queued", "failed"].includes(task.status)
      ) ??
      tasks.find((task) => task.agent_id === workflowAgent.id) ??
      null
    : null;

  const focusedTasks = selectedId
    ? tasks.filter((task) => task.agent_id === selectedId)
    : tasks;

  return (
    <div className="space-y-6">
      <div style={view === "tree" ? DARK_WORKSPACE_STYLE : undefined}
      className={`${view === "tree" ? "workspace-dark" : ""} flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-700 bg-ink-900/70 px-3 py-2`}>
        <div className="flex items-center gap-2">
          <Eyebrow>{tr(locale, "Không gian điều hành")}</Eyebrow>
          <span className="font-mono text-[10px] text-fog-600">
            {view === "tree"
              ? "Multi-Agent Workspace"
              : tr(locale, "Văn phòng 3D")}
          </span>
        </div>
        <div className="flex overflow-hidden rounded-md border border-ink-600">
          <button
            type="button"
            onClick={() => setView("tree")}
            className={
              view === "tree"
                ? "bg-signal-500 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#241503]"
                : "px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-100"
            }
          >
            Multi-Agent 2D
          </button>
          <button
            type="button"
            onClick={() => setView("3d")}
            className={
              view === "3d"
                ? "bg-signal-500 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[#241503]"
                : "px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-100"
            }
          >
            {tr(locale, "Văn phòng 3D")}
          </button>
        </div>
      </div>

      {view === "tree" ? (
        <AgentWorkspace2D
          company={company}
          agents={agents}
          tasks={tasks}
          reports={reports}
          channels={channels}
          handoffs={handoffs}
          selectedId={selectedId}
          onSelect={setSelectedId}
          tokenUsage={tokenUsage}
          aiReady={aiReady}
          locale={locale}
          auto={auto}
          onToggleAuto={() => {
            setAuto((value) => !value);
            setAutoMessage(null);
          }}
          autoMessage={autoMessage}
          planning={planning}
          auditing={auditing}
          onPlan={handlePlan}
          onAudit={handleAudit}
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div
          id="workspace-tree"
          className="overflow-hidden rounded-xl border border-ink-700 bg-ink-850"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700 px-4 py-3">
            <div>
              <Eyebrow>{tr(locale, "Văn phòng AI · 3D")}</Eyebrow>
              <h2 className="mt-0.5 font-display text-sm font-semibold text-fog-100">
                {agents.length} {tr(locale, "robot đang làm việc")}
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
                      {tr(locale, AGENT_ROLES[role].label)}
                    </span>
                  ))}
              </div>
              <button
                type="button"
                onClick={() => setSpinning((value) => !value)}
                className="rounded-md border border-ink-600 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-100"
              >
                {spinning ? tr(locale, "Dừng xoay") : tr(locale, "Tự xoay")}
              </button>
              <button
                type="button"
                disabled={!aiReady || auditing}
                onClick={handleAudit}
                className="rounded-md border border-ink-600 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-100 disabled:opacity-50"
                title={
                  aiReady
                    ? tr(locale, "CEO kiểm tra toàn công ty và lưu báo cáo")
                    : tr(locale, "Cần API key AI để CEO kiểm tra")
                }
              >
                {auditing
                  ? tr(locale, "Đang kiểm tra…")
                  : tr(locale, "CEO kiểm tra")}
              </button>
              <button
                type="button"
                disabled={!aiReady || planning}
                onClick={handlePlan}
                className="rounded-md border border-ink-600 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-100 disabled:opacity-50"
                title={
                  aiReady
                    ? tr(locale, "CEO tự lập kế hoạch và giao việc cho các AI")
                    : tr(locale, "Cần API key AI để CEO lập kế hoạch")
                }
              >
                {planning
                  ? tr(locale, "Đang lập…")
                  : tr(locale, "CEO lập kế hoạch")}
              </button>
              <button
                type="button"
                disabled={!aiReady}
                onClick={() => {
                  setAuto((value) => !value);
                  setAutoMessage(null);
                }}
                className={
                  auto
                    ? "rounded-md border border-ok-400/50 bg-ok-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-ok-400"
                    : "rounded-md border border-ink-600 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-100"
                }
                title={
                  aiReady
                    ? tr(
                        locale,
                        "AI tự chạy từng bước của dây chuyền. Tốn ngân sách AI, tắt bất cứ lúc nào."
                      )
                    : tr(
                        locale,
                        "Chưa có API key AI — thêm OPENAI_API_KEY / GOOGLE_API_KEY vào .env.local rồi khởi động lại server."
                      )
                }
              >
                {auto
                  ? tr(locale, "Tự động: BẬT")
                  : tr(locale, "Tự động: TẮT")}
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
                  {tr(locale, "Ngày")}
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
                  {tr(locale, "Đêm")}
                </button>
              </div>
            </div>
            {!aiReady && (
              <p className="mt-1 text-right text-[11px] text-warn-400">
                {tr(
                  locale,
                  "Chưa có API key AI — thêm GOOGLE_API_KEY/OPENAI_API_KEY vào .env.local để bật tự động."
                )}
              </p>
            )}
            {autoMessage && (
              <p className="mt-1 text-right text-[11px] text-fog-600">
                {autoMessage}
              </p>
            )}
          </header>

          <div className="relative h-[540px]">
            {headless ? (
              <div className="flex h-full items-center justify-center">
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-fog-600">
                  {tr(locale, "Autopilot mode · 3D tắt để chạy nền")}
                </p>
              </div>
            ) : agents.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="font-display text-sm font-semibold text-fog-100">
                  {tr(locale, "Công ty chưa có AI nào")}
                </p>
                <p className="max-w-xs text-sm text-fog-500">
                  {tr(
                    locale,
                    "Cài cơ cấu mẫu hoặc thêm AI thủ công ở khung bên phải."
                  )}
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
                  leaderId={leaderId}
                  locale={locale}
                />
                <p className="pointer-events-none absolute bottom-3 left-4 font-mono text-[10px] uppercase tracking-[0.18em] text-fog-600">
                  {tr(
                    locale,
                    "Tự động: CEO tự lập kế hoạch khi hàng đợi trống · robot cầm tệp = đang giao việc · tầng cao = hiệu suất cao"
                  )}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Panel
            eyebrow={tr(locale, "Chi tiết")}
            title={
              selected
                ? selected.name
                : tr(locale, "Chọn một AI trên sơ đồ")
            }
            bodyClassName="p-4"
          >
            {selected ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="font-mono text-[10.5px] uppercase tracking-wider"
                    style={{ color: AGENT_ROLES[selected.role].color }}
                  >
                    {tr(locale, AGENT_ROLES[selected.role].label)}
                  </span>
                  {selected.status === "paused" && (
                    <Tag>{tr(locale, "tạm dừng")}</Tag>
                  )}
                  {(activeByAgent[selected.id] ?? 0) > 0 && (
                    <Tag className="text-signal-500">
                      {activeByAgent[selected.id]}{" "}
                      {tr(locale, "việc đang xử lý")}
                    </Tag>
                  )}
                </div>

                <p className="text-sm text-fog-300">
                  {selected.title || tr(locale, "Chưa có chức danh")}
                </p>

                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-fog-600">Provider</dt>
                    <dd className="font-mono text-fog-300">
                      {selected.provider || tr(locale, "router tự chọn")}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fog-600">Model</dt>
                    <dd className="font-mono text-fog-300">
                      {selected.model || tr(locale, "mặc định provider")}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fog-600">
                      {tr(locale, "Trần token/lần")}
                    </dt>
                    <dd className="font-mono text-fog-300">
                      {selected.max_tokens_per_run.toLocaleString(numberLocale)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fog-600">
                      {tr(locale, "Hạn mức token/ngày")}
                    </dt>
                    <dd className="font-mono text-fog-300">
                      {selected.daily_token_budget.toLocaleString(numberLocale)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fog-600">
                      {tr(locale, "Token đã dùng hôm nay")}
                    </dt>
                    <dd className="font-mono text-fog-300">
                      {(tokenUsage[selected.id] ?? 0).toLocaleString(
                        numberLocale
                      )}{" "}
                      /{" "}
                      {selected.daily_token_budget.toLocaleString(numberLocale)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fog-600">
                      {tr(locale, "Tầng / hạng")}
                    </dt>
                    <dd className="font-mono text-fog-300">
                      T{selected.tier} ·{" "}
                      {tr(locale, tierMeta(selected.tier).name)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fog-600">
                      {tr(locale, "Lương đã tạo")}
                    </dt>
                    <dd className="font-mono text-ok-400">
                      ${Number(selected.earnings_usd).toFixed(2)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fog-600">
                      {tr(locale, "Điểm hiệu suất")}
                    </dt>
                    <dd className="font-mono text-fog-300">{selected.score}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-fog-600">
                      {tr(locale, "Việc duyệt / bị từ chối")}
                    </dt>
                    <dd className="font-mono text-fog-300">
                      {selected.tasks_completed} / {selected.tasks_failed}
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

                <details className="rounded-md border border-ink-700 bg-ink-900 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-fog-300">
                    {tr(locale, "Sửa prompt & workflow")}
                  </summary>
                  <div className="mt-3">
                    <AgentSettingsForm
                      key={`${selected.id}-settings`}
                      agent={selected}
                      companyId={company.id}
                      locale={locale}
                    />
                  </div>
                </details>

                <form
                  action={updateAgentBudget}
                  className="flex flex-wrap items-end gap-2 rounded-md border border-ink-700 bg-ink-900 p-3"
                >
                  <input type="hidden" name="id" value={selected.id} />
                  <input
                    type="hidden"
                    name="company_id"
                    value={company.id}
                  />
                  <label className="flex-1">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fog-600">
                      Model free
                    </span>
                    <input
                      name="model"
                      list="agent-free-models"
                      defaultValue={selected.model ?? ""}
                      placeholder="deepseek-v4.1-flash-free"
                      className="w-full rounded-md border border-ink-700 bg-ink-850 px-2 py-1.5 font-mono text-xs text-fog-100 outline-none focus:border-ember-500/60"
                    />
                    <datalist id="agent-free-models">
                      {OPENCODE_FREE_MODELS.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label} · {model.use}
                        </option>
                      ))}
                    </datalist>
                  </label>
                  <label className="flex-1">
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fog-600">
                      {tr(locale, "Hạn mức token/ngày")}
                    </span>
                    <input
                      name="daily_token_budget"
                      type="number"
                      min={500}
                      max={200000}
                      step={500}
                      defaultValue={selected.daily_token_budget}
                      className="w-full rounded-md border border-ink-700 bg-ink-850 px-2 py-1.5 font-mono text-xs text-fog-100 outline-none focus:border-ember-500/60"
                    />
                  </label>
                  <SubmitButton
                    size="sm"
                    variant="secondary"
                    pendingText={tr(locale, "Đang lưu…")}
                  >
                    {tr(locale, "Lưu")}
                  </SubmitButton>
                </form>

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
                    pendingText={tr(locale, "Đang xoá…")}
                    confirm={`${tr(locale, "Xoá AI")} "${selected.name}" ${tr(
                      locale,
                      "khỏi công ty?"
                    )}`}
                  >
                    {tr(locale, "Xoá AI này")}
                  </SubmitButton>
                </form>
              </div>
            ) : (
              <p className="text-sm text-fog-500">
                {tr(
                  locale,
                  "Bấm vào một robot trong văn phòng 3D để xem chức danh, prompt và nhiệm vụ của AI đó."
                )}
              </p>
            )}
          </Panel>

          <Panel
            eyebrow={tr(locale, "Giao việc")}
            title={tr(locale, "Nhiệm vụ mới")}
            bodyClassName="p-4"
          >
            <TaskForm
              key={selectedId ?? "none"}
              companyId={company.id}
              agents={agents}
              channels={channels}
              defaultAgentId={selectedId}
              locale={locale}
            />
          </Panel>
        </div>
      </div>

      {workflowAgent && (
        <Panel
          eyebrow={tr(locale, "Dây chuyền của AI")}
          title={`${workflowAgent.name} · ${workflowAgent.title ?? workflowAgent.name}`}
          bodyClassName="p-4"
        >
          <WorkflowCanvas
            agent={workflowAgent}
            task={workflowTask}
            agents={agents}
            locale={locale}
          />
        </Panel>
      )}
        </>
      )}

      <div
        style={view === "tree" ? DARK_WORKSPACE_STYLE : undefined}
        className={
          view === "tree"
            ? "workspace-dark space-y-6 rounded-xl bg-ink-950 p-3"
            : "space-y-6"
        }
      >
      <Panel
        id="reports"
        eyebrow={tr(locale, "Báo cáo CEO")}
        title={
          reports.length > 0
            ? `${tr(locale, "Kiểm tra toàn công ty")} · ${new Date(
                reports[0].created_at
              ).toLocaleString(numberLocale)}`
            : tr(locale, "Chưa có báo cáo CEO")
        }
        bodyClassName="p-4"
      >
        {reports.length > 0 ? (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-fog-100">
            {reports[0].content}
          </pre>
        ) : (
          <p className="text-sm text-fog-500">
            {tr(
              locale,
              "Bấm “CEO kiểm tra” ở trên để CEO đọc số liệu thật (việc, lương, ngân sách, doanh thu) và báo cáo tình hình công ty."
            )}
          </p>
        )}
      </Panel>

      <Panel
        id="tasks"
        eyebrow={tr(locale, "Tiến độ")}
        title={
          selected
            ? `${tr(locale, "Nhiệm vụ của")} ${selected.name} (${focusedTasks.length})`
            : `${tr(locale, "Tất cả nhiệm vụ")} (${tasks.length})`
        }
        actions={
          selected ? (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="font-mono text-[10px] uppercase tracking-wider text-fog-500 hover:text-fog-100"
            >
              {tr(locale, "Xem tất cả")}
            </button>
          ) : undefined
        }
        bodyClassName="p-0"
      >
        <TaskList
          tasks={focusedTasks}
          agentNames={agentNames}
          channels={channels}
          locale={locale}
        />
      </Panel>

      <Panel
        id="leaderboard"
        eyebrow={tr(locale, "Kinh tế AI")}
        title={tr(locale, "Bảng lương & thăng tầng")}
        bodyClassName="p-0"
      >
        {leaderboard.length === 0 ? (
          <p className="p-4 text-sm text-fog-500">
            {tr(locale, "Chưa có AI nào trong công ty.")}
          </p>
        ) : (
          <ul className="divide-y divide-ink-700">
            {leaderboard.slice(0, 10).map((agent, index) => {
              const meta = tierMeta(agent.tier);
              const total = agent.tasks_completed + agent.tasks_failed;
              const winRate =
                total > 0
                  ? Math.round((agent.tasks_completed / total) * 100)
                  : 0;
              const isLeader = leaderId === agent.id;
              return (
                <li
                  key={agent.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="w-7 font-mono text-xs text-fog-600">
                    #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedId(agent.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm text-fog-100">
                      {agent.name}
                      {isLeader && (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-signal-500">
                          TOP
                        </span>
                      )}
                    </span>
                    <span
                      className="block text-xs"
                      style={{ color: meta.color }}
                    >
                      {tr(locale, "Tầng")} {agent.tier} ·{" "}
                      {tr(locale, meta.name)} · {agent.score}{" "}
                      {tr(locale, "điểm")}
                    </span>
                  </button>
                  <span className="hidden font-mono text-xs tabular-nums text-fog-500 sm:block">
                    {agent.tasks_completed} {tr(locale, "đạt")} /{" "}
                    {agent.tasks_failed} {tr(locale, "lỗi")}
                  </span>
                  <span className="hidden font-mono text-xs tabular-nums text-fog-500 sm:block">
                    {winRate}%
                  </span>
                  <DataValue className="w-20 text-right text-sm text-ok-400">
                    ${Number(agent.earnings_usd).toFixed(2)}
                  </DataValue>
                </li>
              );
            })}
          </ul>
        )}
        <p className="border-t border-ink-700 px-4 py-2.5 text-xs leading-relaxed text-fog-600">
          {tr(
            locale,
            "Luật chơi: chỉ việc được con người duyệt mới được trả lương; bị từ chối thì trừ điểm và giảm thưởng. Đủ điểm thì thăng tầng, tụt điểm thì xuống tầng. AI không được tự tiêu tiền, tự phát hành hay vượt quyền. Đơn vị USD là giá trị đầu ra ước tính theo bảng thưởng, chưa phải doanh thu thực tế."
          )}
        </p>
      </Panel>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(TASK_STATUSES) as AgentTask["status"][]).map((status) => (
          <span
            key={status}
            className="font-mono text-[10px] uppercase tracking-wider"
            style={{ color: TASK_STATUSES[status].color }}
          >
            ● {tr(locale, TASK_STATUSES[status].label)}
          </span>
        ))}
      </div>
      </div>
    </div>
  );
}
