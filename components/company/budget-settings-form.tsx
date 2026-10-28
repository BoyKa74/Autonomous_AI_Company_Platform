"use client";

import { useActionState } from "react";
import { updateAiSettings } from "@/app/actions/company";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input } from "@/components/ui/kit";
import type { AiSettings } from "@/types/database";
import { tr, type Locale } from "@/lib/i18n/messages";

export function BudgetSettingsForm({
  settings,
  locale,
}: {
  settings: AiSettings;
  locale: Locale;
}) {
  const [state, action] = useActionState(updateAiSettings, initialFormState);

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && (
        <Alert tone="error">{tr(locale, state.message)}</Alert>
      )}
      {state.status === "success" && (
        <Alert tone="success">{tr(locale, state.message)}</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={tr(locale, "Ngân sách tháng (USD)")}
          htmlFor="monthly_budget_usd"
          hint={tr(locale, "Tổng cho toàn bộ tập đoàn.")}
        >
          <Input
            id="monthly_budget_usd"
            name="monthly_budget_usd"
            type="number"
            min={0}
            step={1}
            defaultValue={settings.monthly_budget_usd}
          />
        </Field>

        <Field label={tr(locale, "Cảnh báo khi đạt (%)")} htmlFor="alert_threshold_pct">
          <Input
            id="alert_threshold_pct"
            name="alert_threshold_pct"
            type="number"
            min={10}
            max={100}
            step={5}
            defaultValue={settings.alert_threshold_pct}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-fog-300">
        <input
          type="checkbox"
          name="hard_stop"
          defaultChecked={settings.hard_stop}
          className="size-4 accent-[#f0a63c]"
        />
        {tr(locale, "Chặn cứng khi chạm ngân sách (khuyến nghị bật)")}
      </label>

      <SubmitButton variant="secondary" pendingText={tr(locale, "Đang lưu…")}>
        {tr(locale, "Lưu ngân sách")}
      </SubmitButton>
    </form>
  );
}
