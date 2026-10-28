import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getCompany,
  listAgents,
  listChannels,
  listCompanyReports,
  listTasks,
} from "@/lib/data";
import { listProviderStatus } from "@/lib/ai/router";
import { createClient } from "@/lib/supabase/server";
import { getMonthlySpend } from "@/lib/ai/budget";
import { tokenDayStartIso } from "@/lib/ai/token-budget";
import { COMPANY_TEMPLATES } from "@/lib/company-templates";
import { CompanyControls } from "@/components/company/company-controls";
import { AgentForm } from "@/components/company/agent-form";
import { CompanyWorkspace } from "@/components/company/workspace";
import { CompanyNav } from "@/components/company/company-nav";
import { getLocale } from "@/lib/i18n/server";
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
import { tr } from "@/lib/i18n/messages";

export async function generateMetadata({
  params,
}: PageProps<"/company/[id]">): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const company = await getCompany(id);
  return { title: company?.name ?? "AI Company" };
}

export default async function CompanyDetailPage({
  params,
  searchParams,
}: PageProps<"/company/[id]">) {
  await connection();
  const me = await requireUser();
  const { id } = await params;
  const search = await searchParams;
  const headless = search.headless === "1";
  const locale = await getLocale();
  const numberLocale = locale === "en" ? "en-US" : "vi-VN";

  const company = await getCompany(id);
  if (!company) notFound();

  const tokenDayStart = tokenDayStartIso();
  const tokenSince =
    new Date(company.token_budget_started_at) > new Date(tokenDayStart)
      ? company.token_budget_started_at
      : tokenDayStart;

  const supabase = await createClient();
  const [agents, tasks, companySpend, reports, channels, tokenRows] =
    await Promise.all([
      listAgents(id),
      listTasks({ companyId: id, limit: 50 }),
      getMonthlySpend(supabase, me.id, id),
      listCompanyReports(id, 3),
      listChannels({ companyId: id }),
      supabase
        .from("cost_ledger")
        .select("agent_id,input_tokens,output_tokens")
        .eq("company_id", id)
        .gte("created_at", tokenSince)
        .limit(10_000),
    ]);

  const dailyTokenRows = tokenRows.data ?? [];
  const companyTokenUsed = dailyTokenRows.reduce(
    (total, row) =>
      total + Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0),
    0
  );
  const agentTokenUsage: Record<string, number> = {};
  for (const row of dailyTokenRows) {
    if (!row.agent_id) continue;
    agentTokenUsage[row.agent_id] =
      (agentTokenUsage[row.agent_id] ?? 0) +
      Number(row.input_tokens ?? 0) +
      Number(row.output_tokens ?? 0);
  }

  const companyTokenReserved = tasks.reduce((total, task) => {
    if (
      !["queued", "running", "manager_review", "review"].includes(task.status)
    ) {
      return total;
    }
    if (new Date(task.created_at) < new Date(tokenSince)) return total;
    return (
      total + Math.max(0, Number(task.token_budget) - Number(task.actual_tokens))
    );
  }, 0);
  const companyTokenCommitted = companyTokenUsed + companyTokenReserved;

  const vertical = COMPANY_VERTICALS[company.vertical];
  const status = COMPANY_STATUSES[company.status];
  const hasTemplate = company.vertical in COMPANY_TEMPLATES;
  const budgetRatio =
    company.monthly_budget_usd > 0
      ? companySpend / company.monthly_budget_usd
      : 0;
  const budgetBarColor =
    budgetRatio >= 1 ? "#ea6a6a" : budgetRatio >= 0.8 ? "#e8b64b" : "#4cc38a";
  const tokenRatio =
    company.daily_token_budget > 0
      ? companyTokenCommitted / company.daily_token_budget
      : 0;
  const tokenBarColor =
    tokenRatio >= 1 ? "#ea6a6a" : tokenRatio >= 0.8 ? "#e8b64b" : "#4cc38a";

  const agentNames = Object.fromEntries(
    agents.map((agent) => [agent.id, agent.name])
  );
  void agentNames;
  const aiReady = listProviderStatus().some((provider) => provider.configured);

  return (
    <div className="space-y-6 rise-in">
      <header className="space-y-3">
        <Link
          href="/company"
          className={buttonStyles("ghost", "sm", "-ml-2 text-fog-500")}
        >
          <ArrowLeftIcon className="size-3.5" />
          {tr(locale, "Công ty AI")}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow>{tr(locale, vertical.label)}</Eyebrow>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
              {company.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="font-mono text-[10.5px] uppercase tracking-wider"
                style={{ color: status.color }}
              >
                {tr(locale, status.label)}
              </span>
              <Tag>{tr(locale, "Tự chủ cấp")} {company.autonomy_level}</Tag>
              <Tag>{agents.length} AI</Tag>
            </div>
            {company.mission && (
              <p className="mt-2 max-w-2xl text-sm text-fog-500">
                {company.mission}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="min-w-56 rounded-lg border border-ink-700 bg-ink-850 p-3">
              <Eyebrow className="mb-2">{tr(locale, "Ngân sách tháng")}</Eyebrow>
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
            <div className="min-w-56 rounded-lg border border-ink-700 bg-ink-850 p-3">
              <Eyebrow className="mb-2">{tr(locale, "Token hôm nay")}</Eyebrow>
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <DataValue>
                  {companyTokenCommitted.toLocaleString(numberLocale)}
                </DataValue>
                <span className="font-mono text-xs text-fog-600">
                  / {company.daily_token_budget.toLocaleString(numberLocale)}
                </span>
              </div>
              <MeterBar
                value={Math.min(1, tokenRatio)}
                color={tokenBarColor}
              />
              <p className="mt-1.5 font-mono text-[10px] text-fog-600">
                {tr(locale, "dùng")}{" "}
                {companyTokenUsed.toLocaleString(numberLocale)} ·{" "}
                {tr(locale, "đã cấp")}{" "}
                {companyTokenReserved.toLocaleString(numberLocale)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <CompanyNav company={company} locale={locale} />

      <CompanyWorkspace
        company={company}
        agents={agents}
        tasks={tasks}
        aiReady={aiReady}
        reports={reports}
        channels={channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
        }))}
        headless={headless}
        tokenUsage={agentTokenUsage}
        locale={locale}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          id="settings"
          eyebrow={tr(locale, "Cấu hình")}
          title={tr(locale, "Vận hành công ty")}
          bodyClassName="p-5"
        >
          <CompanyControls
            company={company}
            hasAgents={agents.length > 0}
            hasTemplate={hasTemplate}
            locale={locale}
          />
        </Panel>

        <Panel
          id="agent-form"
          eyebrow={tr(locale, "Nhân sự")}
          title={tr(locale, "Thêm AI mới")}
          bodyClassName="p-5"
        >
          <AgentForm companyId={company.id} agents={agents} locale={locale} />
        </Panel>
      </div>
    </div>
  );
}
