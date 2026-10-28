"use client";

import { useActionState } from "react";
import { createCompany } from "@/app/actions/company";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/kit";
import { COMPANY_VERTICALS } from "@/lib/constants";
import { tr, type Locale } from "@/lib/i18n/messages";
import type { CompanyVertical } from "@/types/database";

export function CompanyCreateForm({ locale }: { locale: Locale }) {
  const [state, action] = useActionState(createCompany, initialFormState);

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && (
        <Alert tone="error">{tr(locale, state.message)}</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr(locale, "Tên công ty")} htmlFor="name">
          <Input
            id="name"
            name="name"
            placeholder={tr(locale, "VD: VIC Affiliate")}
            maxLength={120}
            required
          />
        </Field>

        <Field label={tr(locale, "Ngành")} htmlFor="vertical">
          <Select id="vertical" name="vertical" defaultValue="affiliate">
            {Object.entries(COMPANY_VERTICALS).map(([value, meta]) => (
              <option key={value} value={value}>
                {tr(locale, meta.label)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={tr(locale, "Ngân sách AI / tháng (USD)")}
          htmlFor="monthly_budget_usd"
          hint={tr(locale, "Chặn cứng khi công ty tiêu hết ngân sách.")}
        >
          <Input
            id="monthly_budget_usd"
            name="monthly_budget_usd"
            type="number"
            min={0}
            step={1}
            defaultValue={15}
          />
        </Field>

        <Field label={tr(locale, "Cấp tự chủ")} htmlFor="autonomy_level">
          <Select id="autonomy_level" name="autonomy_level" defaultValue="1">
            <option value="0">{tr(locale, "Cấp 0 — duyệt mọi bước")}</option>
            <option value="1">{tr(locale, "Cấp 1 — draft tự động, duyệt mới đăng")}</option>
            <option value="2">{tr(locale, "Cấp 2 — tự đăng có luật")}</option>
            <option value="3">{tr(locale, "Cấp 3 — tự vận hành")}</option>
          </Select>
        </Field>
      </div>

      <Field label={tr(locale, "Sứ mệnh")} htmlFor="mission">
        <Textarea
          id="mission"
          name="mission"
          rows={3}
          placeholder={tr(locale, "VD: Xây nguồn thu nhập affiliate bền vững qua nội dung review chuẩn SEO…")}
          maxLength={1000}
        />
      </Field>

      <SubmitButton pendingText={tr(locale, "Đang tạo…")}>
        {tr(locale, "Tạo công ty")}
      </SubmitButton>
    </form>
  );
}

export function verticalLabel(vertical: CompanyVertical): string {
  return COMPANY_VERTICALS[vertical].label;
}
