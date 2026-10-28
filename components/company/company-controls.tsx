"use client";

import { useActionState } from "react";
import { updateCompany, installTemplate } from "@/app/actions/company";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/kit";
import { COMPANY_STATUSES } from "@/lib/constants";
import type { Company } from "@/types/database";
import { tr, type Locale } from "@/lib/i18n/messages";

export function CompanyControls({
  company,
  hasAgents,
  hasTemplate,
  locale,
}: {
  company: Company;
  hasAgents: boolean;
  hasTemplate: boolean;
  locale: Locale;
}) {
  const [state, action] = useActionState(updateCompany, initialFormState);

  return (
    <div className="space-y-4">
      {!hasAgents && hasTemplate && (
        <form action={installTemplate} className="flex flex-wrap items-center gap-3 rounded-md border border-signal-600/40 bg-signal-500/5 p-3">
          <input type="hidden" name="company_id" value={company.id} />
          <p className="flex-1 text-sm text-fog-300">
            {tr(
              locale,
              "Công ty chưa có nhân sự. Cài cơ cấu mẫu (CEO + quản lý + chuyên viên) để bắt đầu ngay."
            )}
          </p>
          <SubmitButton size="sm" pendingText={tr(locale, "Đang cài…")}>
            {tr(locale, "Cài cơ cấu mẫu")}
          </SubmitButton>
        </form>
      )}

      <form action={action} className="space-y-4">
        {state.status === "error" && (
          <Alert tone="error">{tr(locale, state.message)}</Alert>
        )}
        {state.status === "success" && (
          <Alert tone="success">{tr(locale, state.message)}</Alert>
        )}

        <input type="hidden" name="id" value={company.id} />

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={tr(locale, "Trạng thái")} htmlFor="status">
            <Select id="status" name="status" defaultValue={company.status}>
              {Object.entries(COMPANY_STATUSES).map(([value, meta]) => (
                <option key={value} value={value}>
                  {tr(locale, meta.label)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={tr(locale, "Cấp tự chủ")} htmlFor="autonomy_level">
            <Select
              id="autonomy_level"
              name="autonomy_level"
              defaultValue={String(company.autonomy_level)}
            >
              <option value="0">{tr(locale, "Cấp 0 — duyệt mọi bước")}</option>
              <option value="1">{tr(locale, "Cấp 1 — draft tự động")}</option>
              <option value="2">{tr(locale, "Cấp 2 — tự đăng có luật")}</option>
              <option value="3">{tr(locale, "Cấp 3 — tự vận hành")}</option>
            </Select>
          </Field>

          <Field label={tr(locale, "Ngân sách tháng (USD)")} htmlFor="monthly_budget_usd">
            <Input
              id="monthly_budget_usd"
              name="monthly_budget_usd"
              type="number"
              min={0}
              step={1}
              defaultValue={company.monthly_budget_usd}
            />
          </Field>

          <Field
            label={tr(locale, "Token miễn phí mỗi ngày")}
            htmlFor="daily_token_budget"
          >
            <Input
              id="daily_token_budget"
              name="daily_token_budget"
              type="number"
              min={1000}
              step={1000}
              defaultValue={company.daily_token_budget}
            />
          </Field>
        </div>

        <Field label={tr(locale, "Sứ mệnh")} htmlFor="mission">
          <Textarea
            id="mission"
            name="mission"
            rows={3}
            defaultValue={company.mission ?? ""}
            maxLength={1000}
          />
        </Field>

        <SubmitButton variant="secondary" pendingText={tr(locale, "Đang lưu…")}>
          {tr(locale, "Lưu cấu hình")}
        </SubmitButton>
      </form>
    </div>
  );
}
