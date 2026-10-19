"use client";

import { useActionState } from "react";
import { updateAiSettings } from "@/app/actions/company";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input } from "@/components/ui/kit";
import type { AiSettings } from "@/types/database";

export function BudgetSettingsForm({ settings }: { settings: AiSettings }) {
  const [state, action] = useActionState(updateAiSettings, initialFormState);

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}
      {state.status === "success" && (
        <Alert tone="success">{state.message}</Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Ngân sách tháng (USD)"
          htmlFor="monthly_budget_usd"
          hint="Tổng cho toàn bộ tập đoàn."
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

        <Field label="Cảnh báo khi đạt (%)" htmlFor="alert_threshold_pct">
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
        Chặn cứng khi chạm ngân sách (khuyến nghị bật)
      </label>

      <SubmitButton variant="secondary" pendingText="Đang lưu…">
        Lưu ngân sách
      </SubmitButton>
    </form>
  );
}
