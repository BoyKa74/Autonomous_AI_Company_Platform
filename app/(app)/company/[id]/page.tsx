import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { getCompany, listAgents, listTasks } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getMonthlySpend } from "@/lib/ai/budget";
import { COMPANY_TEMPLATES } from "@/lib/company-templates";
import { CompanyControls } from "@/components/company/company-controls";
import { AgentForm } from "@/components/company/agent-form";
import { CompanyWorkspace } from "@/components/company/workspace";
import {
  DataValue,
  Eyebrow,
  MeterBar,
  Panel,
  Tag,
  buttonStyles,
} from "@/components/ui/kit";
import { COMPANY_STATUSES, COMPANY_VERTICALS } from "@/lib/constants";
import { ArrowLeftIcon } from "@/components/icons";

export async function generateMetadata({
  params,
}: PageProps<"/company/[id]">): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const company = await getCompany(id);
  return { title: company?.name ?? "Công ty AI" };
}

export default async function CompanyDetailPage({
  params,
}: PageProps<"/company/[id]">) {
  await connection();
  const me = await requireUser();
  const { id } = await params;

  const company = await getCompany(id);
  if (!company) notFound();

  const supabase = await createClient();
  const [agents, tasks, companySpend] = await Promise.all([
    listAgents(id),
    listTasks({ companyId: id, limit: 50 }),
    getMonthlySpend(supabase, me.id, id),
  ]);

  const vertical = COMPANY_VERTICALS[company.vertical];
  const status = COMPANY_STATUSES[company.status];
  const hasTemplate = company.vertical in COMPANY_TEMPLATES;
  const budgetRatio =
    company.monthly_budget_usd > 0
      ? companySpend / company.monthly_budget_usd
      : 0;
  const budgetBarColor =
    budgetRatio >= 1 ? "#ea6a6a" : budgetRatio >= 0.8 ? "#e8b64b" : "#4cc38a";

  const agentNames = Object.fromEntries(
    agents.map((agent) => [agent.id, agent.name])
  );
  void agentNames;

  return (
    <div className="space-y-6 rise-in">
      <header className="space-y-3">
        <Link
          href="/company"
          className={buttonStyles("ghost", "sm", "-ml-2 text-fog-500")}
        >
          <ArrowLeftIcon className="size-3.5" />
          Công ty AI
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow>{vertical.label}</Eyebrow>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
              {company.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="font-mono text-[10.5px] uppercase tracking-wider"
                style={{ color: status.color }}
              >
                {status.label}
              </span>
              <Tag>Tự chủ cấp {company.autonomy_level}</Tag>
              <Tag>{agents.length} AI</Tag>
            </div>
            {company.mission && (
              <p className="mt-2 max-w-2xl text-sm text-fog-500">
                {company.mission}
              </p>
            )}
          </div>

          <div className="min-w-56 rounded-lg border border-ink-700 bg-ink-850 p-3">
            <Eyebrow className="mb-2">Ngân sách tháng</Eyebrow>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <DataValue>${companySpend.toFixed(2)}</DataValue>
              <span className="font-mono text-xs text-fog-600">
                / ${company.monthly_budget_usd.toFixed(0)}
              </span>
            </div>
            <MeterBar
              value={Math.min(1, budgetRatio)}
              color={budgetBarColor}
            />
          </div>
        </div>
      </header>

      <CompanyWorkspace company={company} agents={agents} tasks={tasks} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Cấu hình" title="Vận hành công ty" bodyClassName="p-5">
          <CompanyControls
            company={company}
            hasAgents={agents.length > 0}
            hasTemplate={hasTemplate}
          />
        </Panel>

        <Panel eyebrow="Nhân sự" title="Thêm AI mới" bodyClassName="p-5">
          <AgentForm companyId={company.id} agents={agents} />
        </Panel>
      </div>
    </div>
  );
}
