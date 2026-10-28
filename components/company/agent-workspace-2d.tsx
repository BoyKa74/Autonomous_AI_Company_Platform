"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { TaskForm } from "@/components/company/task-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Eyebrow, Tag } from "@/components/ui/kit";
import { removeAgent, updateAgentBudget } from "@/app/actions/company";
import { OPENCODE_FREE_MODELS } from "@/lib/ai/free-models";
import { AGENT_ROLES, TASK_STATUSES } from "@/lib/constants";
import { tierMeta } from "@/lib/economy";
import {
  BookIcon,
  BuildingIcon,
  ChevronRightIcon,
  GaugeIcon,
  PlugIcon,
  PlusIcon,
  SparkIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/icons";
import type {
  AgentTask,
  AiAgent,
  Company,
  CompanyReport,
} from "@/types/database";

export const DARK_WORKSPACE_STYLE = {
  colorScheme: "dark",
  "--color-ink-950": "#080c12",
  "--color-ink-900": "#0b1118",
  "--color-ink-850": "#111922",
  "--color-ink-800": "#16212d",
  "--color-ink-700": "#243241",
  "--color-ink-600": "#334456",
  "--color-ink-500": "#506176",
  "--color-fog-100": "#e8eef6",
  "--color-fog-200": "#d4deea",
  "--color-fog-300": "#b6c2d1",
  "--color-fog-400": "#94a3b8",
  "--color-fog-500": "#8190a3",
  "--color-fog-600": "#647286",
  "--color-fog-700": "#4a5a6d",
  "--color-signal-300": "#f4ca7a",
  "--color-signal-400": "#f0b95a",
  "--color-signal-500": "#e8b64b",
  "--color-signal-600": "#c28a22",
  "--color-ok-400": "#4cc38a",
  "--color-warn-400": "#e8b64b",
  "--color-bad-400": "#ea6a6a",
  "--color-info-400": "#6aa8ff",
} as unknown as CSSProperties;

const DARK_ROLE_COLORS: Record<AiAgent["role"], string> = {
  super_admin: "#f0b95a",
  ceo: "#e8b64b",
  manager: "#a78bfa",
  specialist: "#2dd4bf",
  worker: "#94a3b8",
};

const ACTIVE_STATUSES: AgentTask["status"][] = [
  "queued",
  "running",
  "manager_review",
  "review",
];

type PanelTab = "overview" | "tasks" | "config";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function shortModel(model: string | null): string {
  if (!model) return "auto";
  return model.split("/").pop() ?? model;
}

function agentState(
  agent: AiAgent,
  active: number,
  failed: number,
  review: number
): { label: string; color: string } {
  if (agent.status === "paused") return { label: "Tạm dừng", color: "#7a8595" };
  if (active > 0) return { label: "Đang chạy", color: "#4cc38a" };
  if (failed > 0) return { label: "Có lỗi", color: "#ea6a6a" };
  if (review > 0) return { label: "Chờ duyệt", color: "#5b9dff" };
  return { label: "Chờ việc", color: "#8a93a3" };
}

function StatusDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-fog-500">
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function AgentCard({
  agent,
  selected,
  active,
  failed,
  review,
  used,
  budget,
  managerName,
  onSelect,
  onAssign,
  featured = false,
}: {
  agent: AiAgent;
  selected: boolean;
  active: number;
  failed: number;
  review: number;
  used: number;
  budget: number;
  managerName: string | null;
  onSelect: () => void;
  onAssign: () => void;
  featured?: boolean;
}) {
  const role = AGENT_ROLES[agent.role];
  const roleColor = DARK_ROLE_COLORS[agent.role];
  const state = agentState(agent, active, failed, review);
  const percent = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`group relative flex w-full cursor-pointer flex-col rounded-xl border p-3 text-left transition-all ${
        selected
          ? "border-signal-500/60 bg-ink-800 shadow-[0_0_0_1px_rgba(232,182,75,0.18)]"
          : "border-ink-700 bg-ink-850/90 hover:border-ink-600 hover:bg-ink-800"
      } ${featured ? "mx-auto max-w-xl p-4" : ""}`}
    >
      <span
        className="absolute inset-x-3 top-0 h-px rounded-full opacity-80"
        style={{ backgroundColor: roleColor }}
      />
      <div className="flex items-start gap-2.5">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg font-display text-[11px] font-bold"
          style={{ backgroundColor: `${roleColor}22`, color: roleColor }}
        >
          {initials(agent.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-semibold text-fog-100">
              {agent.name}
            </span>
            <StatusDot color={state.color} label={state.label} />
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-fog-600">
            <span style={{ color: roleColor }}>{role.label}</span>
            {managerName && (
              <>
                <span>·</span>
                <span className="truncate">{managerName}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="mt-2 max-h-[30px] overflow-hidden text-[11px] leading-relaxed text-fog-500">
        {agent.title || "Chưa có mô tả công việc"}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[9px] text-fog-600">
        <span>{active} việc</span>
        <span>·</span>
        <span>
          {used.toLocaleString("vi-VN")}/{budget.toLocaleString("vi-VN")} token
        </span>
        <span>·</span>
        <span className="truncate">{shortModel(agent.model)}</span>
      </div>

      <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-700">
        <span
          className="block h-full rounded-full transition-all"
          style={{ width: `${percent}%`, backgroundColor: roleColor }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAssign();
          }}
          className="font-mono text-[9px] uppercase tracking-[0.14em] text-fog-500 transition-colors hover:text-signal-500"
        >
          Giao việc
        </button>
        <ChevronRightIcon className="size-3 text-fog-600 transition-colors group-hover:text-signal-500" />
      </div>
    </div>
  );
}

function RailLink({
  href,
  icon,
  label,
  count,
  active = false,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  count?: number;
  active?: boolean;
}) {
  const className = `flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px] transition-colors ${
    active
      ? "bg-signal-500/10 text-signal-500"
      : "text-fog-500 hover:bg-ink-800 hover:text-fog-100"
  }`;
  const content = (
    <>
      <span className="grid size-5 place-items-center rounded border border-ink-700 text-fog-500">
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span className="font-mono text-[9px] text-fog-600">{count}</span>
      )}
    </>
  );
  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {content}
    </a>
  );
}

export function AgentWorkspace2D({
  company,
  agents,
  tasks,
  reports,
  channels,
  handoffs,
  selectedId,
  onSelect,
  tokenUsage,
  aiReady,
  auto,
  onToggleAuto,
  autoMessage,
  planning,
  auditing,
  onPlan,
  onAudit,
}: {
  company: Company;
  agents: AiAgent[];
  tasks: AgentTask[];
  reports: CompanyReport[];
  channels: { id: string; name: string }[];
  handoffs: { fromId: string; toId: string }[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  tokenUsage: Record<string, number>;
  aiReady: boolean;
  auto: boolean;
  onToggleAuto: () => void;
  autoMessage: string | null;
  planning: boolean;
  auditing: boolean;
  onPlan: () => void;
  onAudit: () => void;
}) {
  const [tab, setTab] = useState<PanelTab>("overview");

  const byId = useMemo(
    () => new Map(agents.map((agent) => [agent.id, agent])),
    [agents]
  );
  const ceo = useMemo(
    () =>
      agents.find((agent) => agent.role === "ceo") ??
      agents.find((agent) => !agent.parent_id) ??
      agents[0] ??
      null,
    [agents]
  );
  const managers = useMemo(
    () => agents.filter((agent) => agent.role === "manager"),
    [agents]
  );
  const specialists = useMemo(
    () =>
      agents.filter(
        (agent) => agent.role !== "ceo" && agent.role !== "manager"
      ),
    [agents]
  );
  const defaultActiveAgent = agents.find((agent) =>
    tasks.some(
      (task) =>
        task.agent_id === agent.id &&
        (task.status === "running" ||
          task.status === "queued" ||
          task.status === "manager_review" ||
          task.status === "review")
    )
  );
  const inspected =
    agents.find((agent) => agent.id === selectedId) ??
    defaultActiveAgent ??
    ceo;
  const inspectedTasks = inspected
    ? tasks.filter((task) => task.agent_id === inspected.id)
    : [];
  const children = inspected
    ? agents.filter((agent) => agent.parent_id === inspected.id)
    : [];
  const parent = inspected?.parent_id ? byId.get(inspected.parent_id) : null;
  const used = inspected ? tokenUsage[inspected.id] ?? 0 : 0;
  const budget = inspected?.daily_token_budget ?? 0;
  const percent = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;

  const activeCount = (agentId: string) =>
    tasks.filter(
      (task) => task.agent_id === agentId && ACTIVE_STATUSES.includes(task.status)
    ).length;
  const failedCount = (agentId: string) =>
    tasks.filter(
      (task) =>
        task.agent_id === agentId &&
        (task.status === "failed" || task.status === "rejected")
    ).length;
  const reviewCount = (agentId: string) =>
    tasks.filter(
      (task) =>
        task.agent_id === agentId &&
        (task.status === "review" || task.status === "manager_review")
    ).length;

  const taskCounts = useMemo(
    () => ({
      running: tasks.filter((task) => task.status === "running").length,
      queued: tasks.filter((task) => task.status === "queued").length,
      review: tasks.filter(
        (task) => task.status === "review" || task.status === "manager_review"
      ).length,
      failed: tasks.filter(
        (task) => task.status === "failed" || task.status === "rejected"
      ).length,
      approved: tasks.filter((task) => task.status === "approved").length,
    }),
    [tasks]
  );

  const assign = (agentId: string) => {
    onSelect(agentId);
    requestAnimationFrame(() => {
      document
        .getElementById("agent-task-form")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  return (
    <div style={DARK_WORKSPACE_STYLE} className="workspace-dark grid gap-4 rounded-xl bg-ink-950 p-2 xl:grid-cols-[180px_minmax(0,1fr)_330px] lg:grid-cols-[minmax(0,1fr)_330px]">
      <aside className="hidden flex-col rounded-xl border border-ink-700 bg-ink-900/80 p-3 xl:flex">
        <div className="flex items-center gap-2 border-b border-ink-700 pb-3">
          <span className="grid size-8 place-items-center rounded-lg bg-signal-500/10 text-signal-500">
            <SparkIcon className="size-4" />
          </span>
          <div>
            <p className="font-display text-xs font-semibold text-fog-100">
              AI Company
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-fog-600">
              Workspace
            </p>
          </div>
        </div>

        <nav className="mt-3 space-y-1">
          <RailLink
            href="#workspace-tree"
            icon={<UsersIcon className="size-3" />}
            label="Agents"
            active
          />
          <RailLink
            href="#tasks"
            icon={<GaugeIcon className="size-3" />}
            label="Nhiệm vụ"
            count={tasks.length}
          />
          <RailLink
            href="/knowledge"
            icon={<BookIcon className="size-3" />}
            label="Kiến thức"
          />
          <RailLink
            href="/revenue"
            icon={<WalletIcon className="size-3" />}
            label="Doanh thu"
          />
          <RailLink
            href="/connections"
            icon={<PlugIcon className="size-3" />}
            label="Kết nối"
          />
        </nav>

        <div className="mt-4 border-t border-ink-700 pt-3">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-fog-600">
            Trạng thái
          </p>
          <div className="space-y-1.5">
            <StatusLine label="Đang chạy" value={taskCounts.running} color="#4cc38a" />
            <StatusLine label="Chờ chạy" value={taskCounts.queued} color="#e8b64b" />
            <StatusLine label="Chờ duyệt" value={taskCounts.review} color="#5b9dff" />
            <StatusLine label="Lỗi" value={taskCounts.failed} color="#ea6a6a" />
            <StatusLine label="Hoàn tất" value={taskCounts.approved} color="#4cc38a" />
          </div>
        </div>

        <div className="mt-auto rounded-lg border border-ink-700 bg-ink-850 p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-fog-600">
            Dự án hiện tại
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-fog-100">
            {company.name}
          </p>
          <p className="mt-0.5 font-mono text-[9px] text-fog-600">
            {agents.length} AI · {tasks.length} việc
          </p>
          <Link
            href="/company"
            className="mt-2 inline-flex font-mono text-[9px] uppercase tracking-[0.14em] text-signal-500 hover:text-signal-400"
          >
            Đổi công ty
          </Link>
        </div>
      </aside>

      <section className="min-w-0 overflow-hidden rounded-xl border border-ink-700 bg-ink-900/70">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-700 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink-800 text-fog-300">
              <BuildingIcon className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-display text-sm font-bold text-fog-100">
                  {company.name}
                </p>
                <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-ok-400">
                  <span className="size-1.5 rounded-full bg-ok-400" />
                  Active
                </span>
              </div>
              <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-fog-600">
                Multi-Agent · {agents.length} AI · {taskCounts.running} đang chạy
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("agent-form")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-signal-500 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[#241503] transition-opacity hover:opacity-90"
            >
              <PlusIcon className="size-3" />
              Tạo AI
            </button>
            <button
              type="button"
              disabled={!aiReady}
              onClick={onToggleAuto}
              className={
                auto
                  ? "rounded-md border border-ok-400/50 bg-ok-400/10 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ok-400"
                  : "rounded-md border border-ink-600 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-100 disabled:opacity-50"
              }
            >
              {auto ? "Tự động: BẬT" : "Tự động: TẮT"}
            </button>
          </div>
        </header>

        {autoMessage && (
          <p className="border-b border-ink-700 bg-ink-850/60 px-4 py-1.5 text-[10px] text-fog-500">
            {autoMessage}
          </p>
        )}

        <div
          id="workspace-tree"
          className="scroll-mt-24 p-3 sm:p-4"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.12) 1px, transparent 0)",
            backgroundSize: "18px 18px",
          }}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <Eyebrow>Cây tổ chức</Eyebrow>
              <p className="mt-0.5 text-xs text-fog-500">
                Chọn một AI để xem chi tiết, cấu hình hoặc giao việc.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Tag>{managers.length} quản lý</Tag>
              <Tag>{specialists.length} chuyên viên</Tag>
            </div>
          </div>

          <div className="flex flex-col items-center">
            {ceo ? (
              <div className="w-full max-w-xl">
                <AgentCard
                  agent={ceo}
                  featured
                  selected={inspected?.id === ceo.id}
                  active={activeCount(ceo.id)}
                  failed={failedCount(ceo.id)}
                  review={reviewCount(ceo.id)}
                  used={tokenUsage[ceo.id] ?? 0}
                  budget={ceo.daily_token_budget}
                  managerName={null}
                  onSelect={() => onSelect(ceo.id)}
                  onAssign={() => assign(ceo.id)}
                />
              </div>
            ) : (
              <p className="py-8 text-sm text-fog-500">
                Công ty chưa có AI nào. Bấm “Tạo AI” để bắt đầu.
              </p>
            )}

            {managers.length > 0 && (
              <>
                <div className="h-5 w-px bg-ink-600" />
                <div className="h-px w-2/3 bg-ink-600" />
                <div className={`mt-3 grid w-full gap-2 ${managers.length === 1 ? "mx-auto max-w-xl" : "sm:grid-cols-2"}`}>
                  {managers.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      selected={inspected?.id === agent.id}
                      active={activeCount(agent.id)}
                      failed={failedCount(agent.id)}
                      review={reviewCount(agent.id)}
                      used={tokenUsage[agent.id] ?? 0}
                      budget={agent.daily_token_budget}
                      managerName={
                        agent.parent_id
                          ? byId.get(agent.parent_id)?.name ?? null
                          : null
                      }
                      onSelect={() => onSelect(agent.id)}
                      onAssign={() => assign(agent.id)}
                    />
                  ))}
                </div>
              </>
            )}

            {specialists.length > 0 && (
              <>
                <div className="h-5 w-px bg-ink-600" />
                <div className="h-px w-2/3 bg-ink-600" />
                <div className="mt-3 grid w-full gap-2 sm:grid-cols-2">
                  {specialists.map((agent) => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      selected={inspected?.id === agent.id}
                      active={activeCount(agent.id)}
                      failed={failedCount(agent.id)}
                      review={reviewCount(agent.id)}
                      used={tokenUsage[agent.id] ?? 0}
                      budget={agent.daily_token_budget}
                      managerName={
                        agent.parent_id
                          ? byId.get(agent.parent_id)?.name ?? null
                          : null
                      }
                      onSelect={() => onSelect(agent.id)}
                      onAssign={() => assign(agent.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-2 border-t border-ink-700 p-3 lg:grid-cols-[minmax(0,1fr)_190px]">
          <div className="rounded-lg border border-ink-700 bg-ink-850/80 p-3">
            <Eyebrow>Dependencies & Flow</Eyebrow>
            <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider">
              <FlowNode label={ceo ? ceo.name : "CEO"} color="#e8b64b" />
              <FlowArrow />
              <FlowNode label={`${managers.length} quản lý`} color="#7c53c3" />
              <FlowArrow />
              <FlowNode label={`${specialists.length} chuyên viên`} color="#0f8f9c" />
              <FlowArrow />
              <FlowNode label={`${taskCounts.review} chờ duyệt`} color="#5b9dff" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {handoffs.length > 0 ? (
                handoffs.slice(0, 4).map((handoff) => (
                  <span
                    key={`${handoff.fromId}-${handoff.toId}`}
                    className="rounded border border-ink-700 bg-ink-900 px-1.5 py-1 font-mono text-[9px] text-fog-500"
                  >
                    {byId.get(handoff.fromId)?.name ?? "AI"} →{" "}
                    {byId.get(handoff.toId)?.name ?? "AI"}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-fog-600">
                  Không có luồng bàn giao đang chạy.
                </span>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-ink-700 bg-ink-850/80 p-3">
            <Eyebrow>Quick Actions</Eyebrow>
            <div className="mt-2 grid gap-1">
              <QuickAction
                label="CEO lập kế hoạch"
                disabled={!aiReady || planning}
                onClick={onPlan}
              />
              <QuickAction
                label="CEO kiểm tra"
                disabled={!aiReady || auditing}
                onClick={onAudit}
              />
              <QuickAction
                label="Tạo AI mới"
                onClick={() =>
                  document
                    .getElementById("agent-form")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" })
                }
              />
              <a
                href="#tasks"
                className="rounded border border-ink-700 px-2 py-1.5 text-left font-mono text-[9px] uppercase tracking-[0.1em] text-fog-500 transition-colors hover:border-ink-600 hover:text-fog-100"
              >
                Xem nhiệm vụ
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto border-t border-ink-700 px-2 py-1.5">
          {agents.slice(0, 8).map((agent) => {
            const state = agentState(
              agent,
              activeCount(agent.id),
              failedCount(agent.id),
              reviewCount(agent.id)
            );
            const role = AGENT_ROLES[agent.role];
  const roleColor = DARK_ROLE_COLORS[agent.role];
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => onSelect(agent.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded px-2 py-1 font-mono text-[9px] transition-colors ${
                  inspected?.id === agent.id
                    ? "bg-ink-800 text-fog-100"
                    : "text-fog-600 hover:bg-ink-800 hover:text-fog-300"
                }`}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: roleColor }}
                />
                <span className="max-w-28 truncate">{agent.name}</span>
                <span
                  className="size-1 rounded-full"
                  style={{ backgroundColor: state.color }}
                />
              </button>
            );
          })}
          {reports[0] && (
            <a
              href="#reports"
              className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-wider text-fog-600 hover:text-signal-500"
            >
              Báo cáo CEO
            </a>
          )}
        </div>
      </section>

      <aside className="min-w-0 rounded-xl border border-ink-700 bg-ink-900/80">
        {inspected ? (
          <div className="flex h-full flex-col">
            <div className="flex items-start gap-2.5 border-b border-ink-700 p-3">
              <span
                className="grid size-9 shrink-0 place-items-center rounded-lg font-display text-xs font-bold"
                style={{
                  backgroundColor: `${AGENT_ROLES[inspected.role].color}22`,
                  color: AGENT_ROLES[inspected.role].color,
                }}
              >
                {initials(inspected.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-fog-100">
                  {inspected.name}
                </p>
                <p className="truncate text-[10px] text-fog-500">
                  {inspected.title || AGENT_ROLES[inspected.role].label}
                </p>
              </div>
              <StatusPill
                agent={inspected}
                active={activeCount(inspected.id)}
                failed={failedCount(inspected.id)}
                review={reviewCount(inspected.id)}
              />
            </div>

            <div className="flex border-b border-ink-700 px-2">
              {(
                [
                  ["overview", "Tổng quan"],
                  ["tasks", "Nhiệm vụ"],
                  ["config", "Cấu hình"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={`border-b px-2 py-2 font-mono text-[9px] uppercase tracking-[0.12em] transition-colors ${
                    tab === value
                      ? "border-signal-500 text-signal-500"
                      : "border-transparent text-fog-600 hover:text-fog-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {tab === "overview" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Metric label="Model" value={shortModel(inspected.model)} />
                    <Metric label="Provider" value={inspected.provider || "router"} />
                    <Metric
                      label="Token hôm nay"
                      value={`${used.toLocaleString("vi-VN")} / ${budget.toLocaleString("vi-VN")}`}
                    />
                    <Metric
                      label="Điểm"
                      value={`${inspected.score} · T${inspected.tier} ${tierMeta(inspected.tier).name}`}
                    />
                  </div>

                  <div>
                    <div className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider text-fog-600">
                      <span>Ngân sách token</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${percent}%`,
                          backgroundColor:
                            percent >= 90
                              ? "#ea6a6a"
                              : percent >= 70
                                ? "#e8b64b"
                                : "#4cc38a",
                        }}
                      />
                    </div>
                  </div>

                  <dl className="space-y-1.5 text-[11px]">
                    <Row label="Quản lý" value={parent?.name ?? "Trực tiếp CEO"} />
                    <Row label="Đội nhóm" value={`${children.length} AI`} />
                    <Row
                      label="Việc đạt / lỗi"
                      value={`${inspected.tasks_completed} / ${inspected.tasks_failed}`}
                    />
                    <Row
                      label="Lương đã tạo"
                      value={`$${Number(inspected.earnings_usd).toFixed(2)}`}
                    />
                    <Row label="Đang xử lý" value={String(activeCount(inspected.id))} />
                  </dl>

                  {children.length > 0 && (
                    <div>
                      <Eyebrow className="mb-1.5">Sub-agents</Eyebrow>
                      <div className="space-y-1">
                        {children.slice(0, 6).map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => onSelect(child.id)}
                            className="flex w-full items-center gap-2 rounded border border-ink-700 bg-ink-850 px-2 py-1.5 text-left transition-colors hover:border-ink-600"
                          >
                            <span
                              className="size-1.5 rounded-full"
                              style={{ backgroundColor: DARK_ROLE_COLORS[child.role] }}
                            />
                            <span className="min-w-0 flex-1 truncate text-[11px] text-fog-300">
                              {child.name}
                            </span>
                            <span className="font-mono text-[9px] text-fog-600">
                              {activeCount(child.id)} việc
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {inspected.system_prompt && (
                    <details className="rounded border border-ink-700 bg-ink-850 p-2">
                      <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-wider text-fog-600">
                        System prompt
                      </summary>
                      <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap font-sans text-[10px] leading-relaxed text-fog-400">
                        {inspected.system_prompt}
                      </pre>
                    </details>
                  )}

                  <div className="rounded border border-ink-700 bg-ink-850 p-2">
                    <Eyebrow className="mb-1">Kênh</Eyebrow>
                    <p className="text-[10px] text-fog-500">
                      {channels.length > 0
                        ? `${channels
                            .slice(0, 3)
                            .map((channel) => channel.name)
                            .join(" · ")}${
                            channels.length > 3
                              ? ` · +${channels.length - 3}`
                              : ""
                          }`
                        : "Chưa có kênh"}
                    </p>
                  </div>
                </div>
              )}

              {tab === "tasks" && (
                <div className="space-y-2">
                  {inspectedTasks.length === 0 ? (
                    <p className="text-[11px] text-fog-500">
                      AI này chưa có nhiệm vụ nào.
                    </p>
                  ) : (
                    inspectedTasks.slice(0, 10).map((task) => {
                      const status = TASK_STATUSES[task.status];
                      return (
                        <div
                          key={task.id}
                          className="rounded border border-ink-700 bg-ink-850 p-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 text-[11px] text-fog-200">
                              {task.title}
                            </p>
                            <span
                              className="shrink-0 font-mono text-[8px] uppercase tracking-wider"
                              style={{ color: status.color }}
                            >
                              {status.label}
                            </span>
                          </div>
                          <p className="mt-1 font-mono text-[9px] text-fog-600">
                            {task.actual_tokens.toLocaleString("vi-VN")}/
                            {task.token_budget.toLocaleString("vi-VN")} token
                          </p>
                        </div>
                      );
                    })
                  )}
                  <a
                    href="#tasks"
                    className="block rounded border border-ink-700 px-2 py-1.5 text-center font-mono text-[9px] uppercase tracking-wider text-fog-500 hover:text-fog-100"
                  >
                    Xem tất cả nhiệm vụ
                  </a>
                </div>
              )}

              {tab === "config" && (
                <div className="space-y-3">
                  <form
                    key={`${inspected.id}-config`}
                    action={updateAgentBudget}
                    className="space-y-2 rounded border border-ink-700 bg-ink-850 p-2.5"
                  >
                    <input type="hidden" name="id" value={inspected.id} />
                    <input type="hidden" name="company_id" value={company.id} />
                    <label className="block">
                      <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-fog-600">
                        Model free
                      </span>
                      <input
                        name="model"
                        list="agent-free-models-2d"
                        defaultValue={inspected.model ?? ""}
                        placeholder="deepseek-v4.1-flash-free"
                        className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 font-mono text-[10px] text-fog-100 outline-none focus:border-signal-500/60"
                      />
                      <datalist id="agent-free-models-2d">
                        {OPENCODE_FREE_MODELS.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.label} · {model.use}
                          </option>
                        ))}
                      </datalist>
                    </label>
                    <label className="block">
                      <span className="mb-1 block font-mono text-[9px] uppercase tracking-wider text-fog-600">
                        Hạn mức token/ngày
                      </span>
                      <input
                        name="daily_token_budget"
                        type="number"
                        min={500}
                        max={200000}
                        step={500}
                        defaultValue={inspected.daily_token_budget}
                        className="w-full rounded border border-ink-700 bg-ink-900 px-2 py-1.5 font-mono text-[10px] text-fog-100 outline-none focus:border-signal-500/60"
                      />
                    </label>
                    <SubmitButton
                      size="sm"
                      variant="secondary"
                      pendingText="Đang lưu…"
                    >
                      Lưu cấu hình
                    </SubmitButton>
                  </form>

                  <form action={removeAgent}>
                    <input type="hidden" name="id" value={inspected.id} />
                    <input type="hidden" name="company_id" value={company.id} />
                    <SubmitButton
                      size="sm"
                      variant="danger"
                      pendingText="Đang xoá…"
                      confirm={`Xoá AI "${inspected.name}" khỏi công ty?`}
                    >
                      Xoá AI này
                    </SubmitButton>
                  </form>
                </div>
              )}

              <div
                id="agent-task-form"
                className="mt-3 scroll-mt-24 border-t border-ink-700 pt-3"
              >
                <Eyebrow className="mb-2">Giao việc mới</Eyebrow>
                <TaskForm
                  key={inspected.id}
                  companyId={company.id}
                  agents={agents}
                  channels={channels}
                  defaultAgentId={inspected.id}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-sm text-fog-500">
            Chọn một AI trong cây tổ chức để xem chi tiết.
          </div>
        )}
      </aside>
    </div>
  );
}

function StatusLine({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="flex items-center gap-1.5 text-fog-500">
        <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-mono text-fog-300">{value}</span>
    </div>
  );
}

function StatusPill({
  agent,
  active,
  failed,
  review,
}: {
  agent: AiAgent;
  active: number;
  failed: number;
  review: number;
}) {
  const state = agentState(agent, active, failed, review);
  return (
    <span
      className="shrink-0 rounded border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider"
      style={{
        color: state.color,
        borderColor: `${state.color}55`,
        backgroundColor: `${state.color}12`,
      }}
    >
      {state.label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-ink-700 bg-ink-850 p-2">
      <p className="font-mono text-[8px] uppercase tracking-[0.12em] text-fog-600">
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-[10px] text-fog-200">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fog-600">{label}</dt>
      <dd className="truncate font-mono text-fog-300">{value}</dd>
    </div>
  );
}

function FlowNode({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-ink-700 bg-ink-900 px-1.5 py-1 text-fog-400">
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="max-w-28 truncate">{label}</span>
    </span>
  );
}

function FlowArrow() {
  return <span className="text-fog-600">→</span>;
}

function QuickAction({
  label,
  onClick,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded border border-ink-700 px-2 py-1.5 text-left font-mono text-[9px] uppercase tracking-[0.1em] text-fog-500 transition-colors hover:border-ink-600 hover:text-fog-100 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
