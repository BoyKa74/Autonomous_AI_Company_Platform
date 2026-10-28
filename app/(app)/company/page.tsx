import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  getBudgetOverview,
  listAgentCompanyCounts,
  listCompanies,
  listRecentLedger,
} from "@/lib/data";
import { CompanyCreateForm } from "@/components/company/company-create-form";
import { BudgetSettingsForm } from "@/components/company/budget-settings-form";
import {
  DataValue,
  EmptyState,
  Eyebrow,
  MeterBar,
  Panel,
  Tag,
} from "@/components/ui/kit";
import { COMPANY_STATUSES, COMPANY_VERTICALS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { ChevronRightIcon } from "@/components/icons";
import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";

export const metadata: Metadata = { title: "AI Companies" };

function budgetColor(ratio: number): string {
  if (ratio >= 1) return "#cf3f45";
  if (ratio >= 0.8) return "#b07d10";
  return "#18855a";
}

export default async function CompanyPage() {
  await connection();
  const me = await requireUser();
  const locale = await getLocale();
  const numberLocale = locale === "en" ? "en-US" : "vi-VN";

  const [overview, companies, ledger, agentCounts] = await Promise.all([
    getBudgetOverview(me.id),
    listCompanies(),
    listRecentLedger(10),
    listAgentCompanyCounts(),
  ]);

  const ratio =
    overview.settings.monthly_budget_usd > 0
      ? overview.systemSpend / overview.settings.monthly_budget_usd
      : 0;

  const spendByCompany = new Map(
    overview.companies.map((company) => [company.id, company])
  );

  return (
    <div className="space-y-6 rise-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{tr(locale, "Tập đoàn AI")}</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
            {tr(locale, "Công ty AI")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-fog-500">
            {tr(
              locale,
              "Bạn là chủ tịch. Các công ty AI vận hành theo cơ cấu CEO → quản lý → chuyên viên; mọi đầu ra chờ bạn duyệt trước khi phát hành."
            )}
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Panel
          eyebrow={tr(locale, "Danh sách")}
          title={`${companies.length} ${tr(locale, "công ty")}`}
          bodyClassName="p-2"
        >
          {companies.length === 0 ? (
            <div className="p-2">
              <EmptyState
                title={tr(locale, "Chưa có công ty AI")}
                description={tr(
                  locale,
                  "Tạo công ty Affiliate, Xuất bản hoặc Media để bắt đầu."
                )}
              />
            </div>
          ) : (
            <ul className="space-y-2">
              {companies.map((company) => {
                const vertical = COMPANY_VERTICALS[company.vertical];
                const status = COMPANY_STATUSES[company.status];
                const spend = spendByCompany.get(company.id);
                const companyRatio =
                  spend && spend.budget > 0 ? spend.spend / spend.budget : 0;
                return (
                  <li key={company.id}>
                    <Link
                      href={`/company/${company.id}`}
                      className="group flex items-center gap-3 rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-3 transition-all hover:-translate-y-0.5 hover:border-signal-500/60 hover:bg-white hover:shadow-md"
                    >
                      <span
                        className="h-11 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: vertical.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-fog-100">
                            {company.name}
                          </span>
                          <Tag>{agentCounts[company.id] ?? 0} AI</Tag>
                        </div>
                        <p className="mt-0.5 text-xs text-fog-600">
                          {tr(locale, vertical.label)} ·{" "}
                          {tr(locale, "tự chủ cấp")} {company.autonomy_level}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <MeterBar
                            value={Math.min(1, companyRatio)}
                            color={budgetColor(companyRatio)}
                            className="w-24"
                          />
                          <span className="font-mono text-[10px] tabular-nums text-fog-600">
                            ${(spend?.spend ?? 0).toFixed(2)} / $
                            {(spend?.budget ?? 0).toFixed(0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span
                          className="font-mono text-[10px] uppercase tracking-wider"
                          style={{ color: status.color }}
                        >
                          {tr(locale, status.label)}
                        </span>
                        <span className="flex items-center gap-0.5 font-mono text-[10px] uppercase tracking-wider text-fog-600 transition-colors group-hover:text-signal-500">
                          {tr(locale, "Mở")}
                          <ChevronRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          eyebrow={tr(locale, "Ngân sách")}
          title={tr(locale, "Kiểm soát chi phí AI")}
        >
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-3xl font-semibold tabular-nums text-fog-100">
                ${overview.systemSpend.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-fog-600">
                {tr(locale, "đã dùng tháng này / trần")} $
                {overview.settings.monthly_budget_usd.toFixed(2)}
              </p>
            </div>
            <Tag
              className={
                ratio >= 1
                  ? "text-bad-400"
                  : ratio >= overview.settings.alert_threshold_pct / 100
                    ? "text-warn-400"
                    : "text-ok-400"
              }
            >
              {ratio >= 1
                ? tr(locale, "Đã chặn")
                : ratio >= overview.settings.alert_threshold_pct / 100
                  ? tr(locale, "Cảnh báo")
                  : tr(locale, "An toàn")}
            </Tag>
          </div>

          <MeterBar value={Math.min(1, ratio)} color={budgetColor(ratio)} />

          <div className="mt-5 border-t border-ink-700 pt-4">
            <BudgetSettingsForm settings={overview.settings} locale={locale} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Panel
          eyebrow={tr(locale, "Chi tiêu")}
          title={tr(locale, "Theo công ty")}
          bodyClassName="p-0"
        >
          {overview.companies.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={tr(locale, "Chưa có công ty")}
                description={tr(
                  locale,
                  "Tạo công ty AI đầu tiên ở khung bên dưới."
                )}
              />
            </div>
          ) : (
            <ul className="divide-y divide-ink-700">
              {overview.companies.map((company) => {
                const companyRatio =
                  company.budget > 0 ? company.spend / company.budget : 0;
                return (
                  <li
                    key={company.id}
                    className="flex items-center gap-4 px-4 py-3"
                  >
                    <Link
                      href={`/company/${company.id}`}
                      className="min-w-0 flex-1 truncate text-sm text-fog-100 hover:text-signal-500"
                    >
                      {company.name}
                    </Link>
                    <MeterBar
                      value={Math.min(1, companyRatio)}
                      color={budgetColor(companyRatio)}
                      className="w-24"
                    />
                    <DataValue className="w-28 text-right text-xs text-fog-500">
                      ${company.spend.toFixed(2)}/${company.budget.toFixed(0)}
                    </DataValue>
                  </li>
                );
              })}
            </ul>
          )}

          {overview.topAgents.length > 0 && (
            <div className="border-t border-ink-700 px-4 py-3">
              <Eyebrow className="mb-2">
                {tr(locale, "Agent tốn nhất tháng")}
              </Eyebrow>
              <ul className="space-y-1.5">
                {overview.topAgents.map((agent) => (
                  <li
                    key={agent.id}
                    className="flex items-center justify-between text-xs text-fog-300"
                  >
                    <span className="truncate">{agent.name}</span>
                    <span className="font-mono tabular-nums text-fog-500">
                      ${agent.spend.toFixed(4)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>

        <Panel
          eyebrow={tr(locale, "Sổ chi phí")}
          title={tr(locale, "Giao dịch gần đây")}
          bodyClassName="p-0"
        >
          {ledger.length === 0 ? (
            <p className="p-4 text-sm text-fog-500">
              {tr(
                locale,
                "Chưa có giao dịch. Mỗi lần AI chạy sẽ được ghi vào sổ này."
              )}
            </p>
          ) : (
            <ul className="divide-y divide-ink-700">
              {ledger.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-fog-300">
                      {entry.agent?.name ?? entry.provider} ·{" "}
                      {entry.company?.name ?? "—"}
                    </span>
                    <span className="block font-mono text-[10px] text-fog-600">
                      {entry.model} · {formatDateTime(entry.created_at, locale)}
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-fog-500">
                    {(
                      entry.input_tokens + entry.output_tokens
                    ).toLocaleString(numberLocale)}{" "}
                    {tr(locale, "tk")}
                  </span>
                  <DataValue className="w-16 text-right text-xs">
                    ${Number(entry.cost_usd).toFixed(4)}
                  </DataValue>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        eyebrow={tr(locale, "Công ty mới")}
        title={tr(locale, "Tạo công ty AI")}
      >
        <CompanyCreateForm locale={locale} />
        <p className="mt-4 border-t border-ink-700 pt-3 text-xs text-fog-600">
          {tr(locale, "Mẹo: tạo công ty → mở chi tiết → bấm")}{" "}
          <span className="text-fog-300">{tr(locale, "Cài cơ cấu mẫu")}</span>{" "}
          {tr(
            locale,
            "để hệ thống tự dựng CEO + các phòng ban cho ngành đó."
          )}
        </p>
      </Panel>
    </div>
  );
}
