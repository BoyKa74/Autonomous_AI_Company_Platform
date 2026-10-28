import type { Metadata } from "next";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  currentMonthBounds,
  getRevenuePlan,
  listCompanies,
  listExpenseEntries,
  listRevenueEntries,
  listChannels,
} from "@/lib/data";
import { getMonthlySpend } from "@/lib/ai/budget";
import {
  ExpenseForm,
  RevenueForm,
  RevenuePlanForm,
} from "@/components/revenue/forms";
import { deleteExpenseEntry, deleteRevenueEntry } from "@/app/actions/revenue";
import { SubmitButton } from "@/components/ui/submit-button";
import { CompanyNav } from "@/components/company/company-nav";
import { getLocale } from "@/lib/i18n/server";
import {
  EmptyState,
  Eyebrow,
  MeterBar,
  Panel,
  Select,
  buttonStyles,
} from "@/components/ui/kit";
import {
  EXPENSE_CATEGORIES,
  REVENUE_SOURCES,
} from "@/lib/constants";
import { formatUsd, formatVnd } from "@/lib/utils";
import { tr } from "@/lib/i18n/messages";

export const metadata: Metadata = { title: "Revenue & expenses" };

function budgetColor(ratio: number): string {
  if (ratio >= 1) return "#18855a";
  if (ratio >= 0.5) return "#cd8615";
  return "#cf3f45";
}

export default async function RevenuePage({
  searchParams,
}: PageProps<"/revenue">) {
  await connection();
  const locale = await getLocale();
  const numberLocale = locale === "en" ? "en-US" : "vi-VN";
  const me = await requireUser();
  const params = await searchParams;

  const companies = await listCompanies();
  if (companies.length === 0) {
    return (
      <div className="space-y-6 rise-in">
        <header>
          <Eyebrow>{tr(locale, "Kinh doanh")}</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
            {tr(locale, "Doanh thu & chi phí")}
          </h1>
        </header>
        <EmptyState
          title={tr(locale, "Chưa có công ty AI")}
          description={tr(
            locale,
            "Tạo công ty AI trước, sau đó quay lại đây để nhập doanh thu và chi phí thật."
          )}
        />
      </div>
    );
  }

  const selectedId =
    typeof params.company === "string" &&
    companies.some((company) => company.id === params.company)
      ? params.company
      : companies[0].id;
  const company = companies.find((entry) => entry.id === selectedId)!;

  const month = currentMonthBounds(locale);
  const supabase = await createClient();

  const [entries, expenses, plan, aiSpendUsd, channels] = await Promise.all([
    listRevenueEntries(selectedId, month.start, month.end),
    listExpenseEntries(selectedId, month.start, month.end),
    getRevenuePlan(selectedId),
    getMonthlySpend(supabase, me.id, selectedId),
    listChannels({ companyId: selectedId }),
  ]);

  const revenueVnd = entries.reduce(
    (total, entry) => total + Number(entry.amount_vnd),
    0
  );
  const expenseVnd = expenses.reduce(
    (total, entry) => total + Number(entry.amount_vnd),
    0
  );
  const rate = plan?.usd_vnd_rate ?? 26000;
  const aiVnd = aiSpendUsd * rate;
  const profitVnd = revenueVnd - expenseVnd - aiVnd;
  const target = Number(company.monthly_revenue_target_vnd);
  const targetRatio = target > 0 ? revenueVnd / target : 0;

  const projectedRevenue = plan
    ? (Number(plan.monthly_views) *
        Number(plan.ctr_pct) *
        Number(plan.conversion_pct) *
        Number(plan.avg_order_value_vnd) *
        Number(plan.commission_pct)) /
      1_000_000
    : 0;
  const projectedCost =
    aiVnd + expenseVnd + Number(plan?.ads_budget_vnd ?? 0);
  const projectedProfit = projectedRevenue - projectedCost;

  return (
    <div className="space-y-6 rise-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{tr(locale, "Kinh doanh")}</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
            {tr(locale, "Doanh thu & chi phí")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-fog-500">
            {tr(
              locale,
              "Số liệu thật từ sổ bạn nhập — không có số mẫu. Khi kết nối API Facebook/TikTok/Shopee, module này sẽ tự đồng bộ thay vì nhập tay."
            )}
          </p>
        </div>

        <form method="get" className="flex items-end gap-2">
          <div>
            <label
              htmlFor="company-select"
              className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-fog-600"
            >
              {tr(locale, "Công ty")}
            </label>
            <Select
              id="company-select"
              name="company"
              defaultValue={selectedId}
              className="w-56"
            >
              {companies.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </Select>
          </div>
          <button type="submit" className={buttonStyles("secondary", "md")}>
            {tr(locale, "Xem")}
          </button>
        </form>
      </header>

      <CompanyNav company={company}  locale={locale} />

      <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-fog-600">
        {month.label} · {company.name}
      </p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          label={tr(locale, "Doanh thu thật")}
          value={formatVnd(revenueVnd, locale)}
          tone="ok"
          locale={locale}
        />
        <SummaryCard
          label={tr(locale, "Chi phí AI")}
          value={formatVnd(aiVnd, locale)}
          note={`${formatUsd(aiSpendUsd)} token · ${tr(
            locale,
            "tỷ giá"
          )} ${rate.toLocaleString(numberLocale)}`}
          locale={locale}
        />
        <SummaryCard
          label={tr(locale, "Chi phí vận hành")}
          value={formatVnd(expenseVnd, locale)}
          locale={locale}
        />
        <SummaryCard
          label={tr(locale, "Lợi nhuận thật")}
          value={formatVnd(profitVnd, locale)}
          tone={profitVnd >= 0 ? "ok" : "bad"}
          locale={locale}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Panel
          eyebrow={tr(locale, "Mục tiêu tháng")}
          title={tr(locale, "Tiến độ doanh thu")}
        >
          {target > 0 ? (
            <>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="font-mono text-2xl font-semibold tabular-nums text-fog-100">
                  {formatVnd(revenueVnd, locale)}
                </p>
                <p className="font-mono text-xs text-fog-500">
                  / {formatVnd(target, locale)}
                </p>
              </div>
              <MeterBar
                value={Math.min(1, targetRatio)}
                color={budgetColor(targetRatio)}
              />
              <p className="mt-2 text-xs text-fog-600">
                {tr(locale, "Đạt")} {Math.round(targetRatio * 100)}%{" "}
                {tr(locale, "mục tiêu tháng.")}
              </p>
            </>
          ) : (
            <p className="text-sm text-fog-500">
              {tr(
                locale,
                "Chưa đặt mục tiêu. Điền “Mục tiêu doanh thu/tháng” trong form Kế hoạch bên dưới."
              )}
            </p>
          )}
        </Panel>

        <Panel
          eyebrow={tr(locale, "Dự báo")}
          title={tr(locale, "Theo giả định của bạn")}
        >
          {plan ? (
            <>
              <div className="space-y-1.5 text-sm">
                <p className="flex justify-between gap-3 text-fog-300">
                  <span>{tr(locale, "Doanh thu dự kiến")}</span>
                  <span className="font-mono text-ok-400">
                    {formatVnd(projectedRevenue, locale)}
                  </span>
                </p>
                <p className="flex justify-between gap-3 text-fog-300">
                  <span>{tr(locale, "Chi phí dự kiến")}</span>
                  <span className="font-mono">{formatVnd(projectedCost, locale)}</span>
                </p>
                <p className="flex justify-between gap-3 border-t border-ink-700 pt-1.5 font-medium text-fog-100">
                  <span>{tr(locale, "Lợi nhuận dự kiến")}</span>
                  <span
                    className={
                      projectedProfit >= 0
                        ? "font-mono text-ok-400"
                        : "font-mono text-bad-400"
                    }
                  >
                    {formatVnd(projectedProfit, locale)}
                  </span>
                </p>
              </div>
              <p className="mt-3 border-t border-ink-700 pt-2 text-xs text-fog-600">
                {tr(locale, "Giả định hiện tại:")}{" "}
                {plan.monthly_views.toLocaleString(numberLocale)} views · CTR{" "}
                {plan.ctr_pct}% · CR {plan.conversion_pct}% · AOV{" "}
                {formatVnd(Number(plan.avg_order_value_vnd), locale)} ·{" "}
                {tr(locale, "hoa hồng")} {plan.commission_pct}%.
              </p>
            </>
          ) : (
            <p className="text-sm text-fog-500">
              {tr(
                locale,
                "Điền “Kế hoạch & dự báo” bên dưới để xem doanh thu/chi phí/lợi nhuận dự kiến từ giả định thực tế của bạn."
              )}
            </p>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          eyebrow={tr(locale, "Sổ doanh thu")}
          title={tr(locale, "Ghi nhận doanh thu thật")}
        >
          <RevenueForm
            companyId={selectedId}
            channels={channels.map((channel) => ({
              id: channel.id,
              name: channel.name,
            }))}
            locale={locale}
          />
        </Panel>
        <Panel
          eyebrow={tr(locale, "Sổ chi phí")}
          title={tr(locale, "Ghi nhận chi phí thật")}
        >
          <ExpenseForm companyId={selectedId} locale={locale} />
        </Panel>
      </div>

      <Panel
        eyebrow={tr(locale, "Kế hoạch & dự báo")}
        title={tr(locale, "Giả định kinh doanh")}
      >
        <RevenuePlanForm
          companyId={selectedId}
          plan={plan}
          targetVnd={target}
          actualAiVnd={aiVnd}
          actualExpenseVnd={expenseVnd}
          locale={locale}
        />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          eyebrow={tr(locale, "Sổ doanh thu")}
          title={`${entries.length} ${tr(locale, "khoản trong tháng")}`}
          bodyClassName="p-0"
        >
          {entries.length === 0 ? (
            <p className="p-4 text-sm text-fog-500">
              {tr(
                locale,
                "Chưa có doanh thu thật trong tháng. Ghi khoản đầu tiên ở trên."
              )}
            </p>
          ) : (
            <ul className="divide-y divide-ink-700">
              {entries.slice(0, 30).map((entry) => {
                const meta = REVENUE_SOURCES[entry.source];
                return (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <span
                      className="inline-block size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-fog-100">
                        {tr(locale, meta.label)}
                        {entry.platform ? ` · ${entry.platform}` : ""}
                      </p>
                      <p className="text-xs text-fog-600">
                        {entry.occurred_on}
                        {entry.channel ? ` · ${entry.channel.name}` : ""}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </p>
                    </div>
                    <span className="font-mono text-sm tabular-nums text-ok-400">
                      {formatVnd(Number(entry.amount_vnd), locale)}
                    </span>
                    <form action={deleteRevenueEntry}>
                      <input type="hidden" name="id" value={entry.id} />
                      <SubmitButton size="sm" variant="ghost" pendingText="…">
                        {tr(locale, "Xoá")}
                      </SubmitButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel
          eyebrow={tr(locale, "Sổ chi phí")}
          title={`${expenses.length} ${tr(locale, "khoản trong tháng")}`}
          bodyClassName="p-0"
        >
          {expenses.length === 0 ? (
            <p className="p-4 text-sm text-fog-500">
              {tr(locale, "Chưa có chi phí vận hành trong tháng.")}
            </p>
          ) : (
            <ul className="divide-y divide-ink-700">
              {expenses.slice(0, 30).map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-fog-100">
                      {tr(locale, EXPENSE_CATEGORIES[entry.category])}
                    </p>
                    <p className="text-xs text-fog-600">
                      {entry.occurred_on}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </div>
                  <span className="font-mono text-sm tabular-nums text-fog-300">
                    {formatVnd(Number(entry.amount_vnd), locale)}
                  </span>
                  <form action={deleteExpenseEntry}>
                    <input type="hidden" name="id" value={entry.id} />
                    <SubmitButton size="sm" variant="ghost" pendingText="…">
                      {tr(locale, "Xoá")}
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <p className="text-xs leading-relaxed text-fog-600">
        {tr(
          locale,
          "Lưu ý minh bạch: chi phí AI lấy từ sổ token thật của hệ thống; doanh thu và chi phí vận hành do bạn nhập từ báo cáo sàn/ngân hàng. Chưa có số liệu nào được tạo tự động khi chưa kết nối API."
        )}
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  tone,
  locale,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: "ok" | "bad";
  locale: "en" | "vi";
}) {
  return (
    <div className="rounded-lg border border-ink-700 bg-white p-4">
      <Eyebrow>{label}</Eyebrow>
      <p
        className={
          tone === "ok"
            ? "mt-2 font-mono text-2xl font-semibold tabular-nums text-ok-400"
            : tone === "bad"
              ? "mt-2 font-mono text-2xl font-semibold tabular-nums text-bad-400"
              : "mt-2 font-mono text-2xl font-semibold tabular-nums text-fog-100"
        }
      >
        {value}
      </p>
      {note && <p className="mt-1 text-xs text-fog-600">{note}</p>}
      {!note && tone === undefined && (
        <p className="mt-1 text-xs text-fog-600">
          {tr(locale, "Số thật từ sổ đã nhập")}
        </p>
      )}
    </div>
  );
}
