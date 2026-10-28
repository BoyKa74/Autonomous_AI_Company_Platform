"use client";

import { useActionState } from "react";
import { updateCompany, installTemplate } from "@/app/actions/company";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/kit";
import { COMPANY_STATUSES } from "@/lib/constants";
import type { Company } from "@/types/database";

export function CompanyControls({
  company,
  hasAgents,
  hasTemplate,
}: {
  company: Company;
  hasAgents: boolean;
  hasTemplate: boolean;
}) {
  const [state, action] = useActionState(updateCompany, initialFormState);

  return (
    <div className="space-y-4">
      {!hasAgents && hasTemplate && (
        <form action={installTemplate} className="flex flex-wrap items-center gap-3 rounded-md border border-signal-600/40 bg-signal-500/5 p-3">
          <input type="hidden" name="company_id" value={company.id} />
          <p className="flex-1 text-sm text-fog-300">
            Công ty chưa có nhân sự. Cài cơ cấu mẫu (CEO + quản lý + chuyên
            viên) để bắt đầu ngay.
          </p>
          <SubmitButton size="sm" pendingText="Đang cài…">
            Cài cơ cấu mẫu
          </SubmitButton>
        </form>
      )}

      <form action={action} className="space-y-4">
        {state.status === "error" && (
          <Alert tone="error">{state.message}</Alert>
        )}
        {state.status === "success" && (
          <Alert tone="success">{state.message}</Alert>
        )}

        <input type="hidden" name="id" value={company.id} />

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Trạng thái" htmlFor="status">
            <Select id="status" name="status" defaultValue={company.status}>
              {Object.entries(COMPANY_STATUSES).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Cấp tự chủ" htmlFor="autonomy_level">
            <Select
              id="autonomy_level"
              name="autonomy_level"
              defaultValue={String(company.autonomy_level)}
            >
              <option value="0">Cấp 0 — duyệt mọi bước</option>
              <option value="1">Cấp 1 — draft tự động</option>
              <option value="2">Cấp 2 — tự đăng có luật</option>
              <option value="3">Cấp 3 — tự vận hành</option>
            </Select>
          </Field>

          <Field label="Ngân sách tháng (USD)" htmlFor="monthly_budget_usd">
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
            label="Token miễn phí mỗi ngày"
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

        <Field label="Sứ mệnh" htmlFor="mission">
          <Textarea
            id="mission"
            name="mission"
            rows={3}
            defaultValue={company.mission ?? ""}
            maxLength={1000}
          />
        </Field>

        <SubmitButton variant="secondary" pendingText="Đang lưu…">
          Lưu cấu hình
        </SubmitButton>
      </form>
    </div>
  );
}
