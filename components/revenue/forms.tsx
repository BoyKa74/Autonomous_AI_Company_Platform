"use client";

import { useActionState, useState } from "react";
import {
  addExpenseEntry,
  addRevenueEntry,
  saveRevenuePlan,
} from "@/app/actions/revenue";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Alert,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/kit";
import { EXPENSE_CATEGORIES, REVENUE_SOURCES } from "@/lib/constants";
import { formatVnd } from "@/lib/utils";
import type { RevenuePlan } from "@/types/database";
import { tr, type Locale } from "@/lib/i18n/messages";

const today = () => new Date().toISOString().slice(0, 10);

export function RevenueForm({
  companyId,
  channels,
  locale,
}: {
  companyId: string;
  channels: { id: string; name: string }[];
  locale: Locale;
}) {
  const [state, action] = useActionState(addRevenueEntry, initialFormState);

  return (
    <form action={action} className="space-y-3">
      {state.status === "error" && (
        <Alert tone="error">{tr(locale, state.message)}</Alert>
      )}
      {state.status === "success" && (
        <Alert tone="success">{tr(locale, state.message)}</Alert>
      )}
      <input type="hidden" name="company_id" value={companyId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tr(locale, "Ngày")} htmlFor="rev-date">
          <Input id="rev-date" name="occurred_on" type="date" defaultValue={today()} required />
        </Field>
        <Field label={tr(locale, "Nguồn")} htmlFor="rev-source">
          <Select id="rev-source" name="source" defaultValue="affiliate">
            {Object.entries(REVENUE_SOURCES).map(([value, meta]) => (
              <option key={value} value={value}>
                {tr(locale, meta.label)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={tr(locale, "Số tiền (VND)")} htmlFor="rev-amount">
          <Input
            id="rev-amount"
            name="amount_vnd"
            type="number"
            min={0}
            step={1000}
            placeholder={tr(locale, "VD: 1500000")}
            required
          />
        </Field>
        <Field label={tr(locale, "Nền tảng")} htmlFor="rev-platform">
          <Input id="rev-platform" name="platform" placeholder="shopee / tiktok / facebook / youtube" maxLength={60} />
        </Field>
        <Field
          label={tr(locale, "Gắn kênh (tuỳ chọn)")}
          htmlFor="rev-channel"
          className="sm:col-span-2"
        >
          <Select id="rev-channel" name="channel_id" defaultValue="">
            <option value="">{tr(locale, "Không gắn kênh")}</option>
            {channels.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label={tr(locale, "Mã tham chiếu (tuỳ chọn)")} htmlFor="rev-ref">
        <Input id="rev-ref" name="external_ref" placeholder={tr(locale, "Mã đơn / mã hoa hồng trên sàn")} maxLength={200} />
      </Field>
      <Field label={tr(locale, "Ghi chú")} htmlFor="rev-note">
        <Textarea id="rev-note" name="note" rows={2} maxLength={500} />
      </Field>

      <SubmitButton pendingText={tr(locale, "Đang ghi…")}>
        {tr(locale, "Ghi doanh thu")}
      </SubmitButton>
    </form>
  );
}

export function ExpenseForm({
  companyId,
  locale,
}: {
  companyId: string;
  locale: Locale;
}) {
  const [state, action] = useActionState(addExpenseEntry, initialFormState);

  return (
    <form action={action} className="space-y-3">
      {state.status === "error" && (
        <Alert tone="error">{tr(locale, state.message)}</Alert>
      )}
      {state.status === "success" && (
        <Alert tone="success">{tr(locale, state.message)}</Alert>
      )}
      <input type="hidden" name="company_id" value={companyId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={tr(locale, "Ngày")} htmlFor="exp-date">
          <Input id="exp-date" name="occurred_on" type="date" defaultValue={today()} required />
        </Field>
        <Field label={tr(locale, "Loại chi")} htmlFor="exp-category">
          <Select id="exp-category" name="category" defaultValue="tools">
            {Object.entries(EXPENSE_CATEGORIES).map(([value, label]) => (
              <option key={value} value={value}>
                {tr(locale, label)}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={tr(locale, "Số tiền (VND)")}
          htmlFor="exp-amount"
          className="sm:col-span-2"
        >
          <Input
            id="exp-amount"
            name="amount_vnd"
            type="number"
            min={0}
            step={1000}
            placeholder={tr(locale, "VD: 500000")}
            required
          />
        </Field>
      </div>
      <Field label={tr(locale, "Ghi chú")} htmlFor="exp-note">
        <Textarea id="exp-note" name="note" rows={2} maxLength={500} />
      </Field>

      <SubmitButton pendingText={tr(locale, "Đang ghi…")}>
        {tr(locale, "Ghi chi phí")}
      </SubmitButton>
    </form>
  );
}

export function RevenuePlanForm({
  companyId,
  plan,
  targetVnd,
  actualAiVnd,
  actualExpenseVnd,
  locale,
}: {
  companyId: string;
  plan: RevenuePlan | null;
  targetVnd: number;
  actualAiVnd: number;
  actualExpenseVnd: number;
  locale: Locale;
}) {
  const [state, action] = useActionState(saveRevenuePlan, initialFormState);

  const [views, setViews] = useState(String(plan?.monthly_views ?? 0));
  const [ctr, setCtr] = useState(String(plan?.ctr_pct ?? 1));
  const [conversion, setConversion] = useState(String(plan?.conversion_pct ?? 1));
  const [aov, setAov] = useState(String(plan?.avg_order_value_vnd ?? 0));
  const [commission, setCommission] = useState(String(plan?.commission_pct ?? 0));
  const [ads, setAds] = useState(String(plan?.ads_budget_vnd ?? 0));

  const projectedRevenue =
    (Number(views) * Number(ctr) * Number(conversion) * Number(aov) * Number(commission)) /
    1_000_000;
  const projectedCost = actualAiVnd + actualExpenseVnd + Number(ads);
  const projectedProfit = projectedRevenue - projectedCost;

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && (
        <Alert tone="error">{tr(locale, state.message)}</Alert>
      )}
      {state.status === "success" && (
        <Alert tone="success">{tr(locale, state.message)}</Alert>
      )}
      <input type="hidden" name="company_id" value={companyId} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field
          label={tr(locale, "Mục tiêu doanh thu/tháng (VND)")}
          htmlFor="plan-target"
        >
          <Input
            id="plan-target"
            name="monthly_revenue_target_vnd"
            type="number"
            min={0}
            step={100000}
            defaultValue={targetVnd}
          />
        </Field>
        <Field label={tr(locale, "Lượt xem / tháng")} htmlFor="plan-views">
          <Input
            id="plan-views"
            name="monthly_views"
            type="number"
            min={0}
            value={views}
            onChange={(event) => setViews(event.target.value)}
          />
        </Field>
        <Field label={tr(locale, "CTR (%)")} htmlFor="plan-ctr" hint={tr(locale, "Tỷ lệ click / lượt xem.")}>
          <Input
            id="plan-ctr"
            name="ctr_pct"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={ctr}
            onChange={(event) => setCtr(event.target.value)}
          />
        </Field>
        <Field
          label={tr(locale, "Tỷ lệ chuyển đổi (%)")}
          htmlFor="plan-cr"
        >
          <Input
            id="plan-cr"
            name="conversion_pct"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={conversion}
            onChange={(event) => setConversion(event.target.value)}
          />
        </Field>
        <Field
          label={tr(locale, "Giá trị đơn TB (VND)")}
          htmlFor="plan-aov"
        >
          <Input
            id="plan-aov"
            name="avg_order_value_vnd"
            type="number"
            min={0}
            step={1000}
            value={aov}
            onChange={(event) => setAov(event.target.value)}
          />
        </Field>
        <Field label={tr(locale, "Hoa hồng (%)")} htmlFor="plan-commission">
          <Input
            id="plan-commission"
            name="commission_pct"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={commission}
            onChange={(event) => setCommission(event.target.value)}
          />
        </Field>
        <Field
          label={tr(locale, "Ngân sách quảng cáo (VND)")}
          htmlFor="plan-ads"
        >
          <Input
            id="plan-ads"
            name="ads_budget_vnd"
            type="number"
            min={0}
            step={100000}
            value={ads}
            onChange={(event) => setAds(event.target.value)}
          />
        </Field>
        <Field label={tr(locale, "Tỷ giá USD→VND")} htmlFor="plan-rate">
          <Input
            id="plan-rate"
            name="usd_vnd_rate"
            type="number"
            min={1000}
            step={100}
            defaultValue={plan?.usd_vnd_rate ?? 26000}
          />
        </Field>
      </div>

      <div className="space-y-1.5 rounded-md border border-ink-700 bg-ink-900 p-3 text-sm">
        <p className="text-fog-500">
          {tr(locale, "Công thức: views × CTR × CR × AOV × hoa hồng")}
        </p>
        <p className="flex justify-between gap-3 text-fog-300">
          <span>{tr(locale, "Doanh thu dự kiến")}</span>
          <span className="font-mono text-ok-400">
            {formatVnd(projectedRevenue, locale)}
          </span>
        </p>
        <p className="flex justify-between gap-3 text-fog-300">
          <span>
            {tr(
              locale,
              "Chi phí dự kiến (AI thực tế + vận hành + quảng cáo)"
            )}
          </span>
          <span className="font-mono text-fog-300">
            {formatVnd(projectedCost, locale)}
          </span>
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

      <SubmitButton pendingText={tr(locale, "Đang lưu…")}>
        {tr(locale, "Lưu kế hoạch & dự báo")}
      </SubmitButton>
    </form>
  );
}
