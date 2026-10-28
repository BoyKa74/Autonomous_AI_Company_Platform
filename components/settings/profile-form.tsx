"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/admin";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input } from "@/components/ui/kit";
import { t, type Locale } from "@/lib/i18n/messages";

export function ProfileForm({
  defaultName,
  email,
  locale,
}: {
  defaultName: string;
  email: string;
  locale: Locale;
}) {
  const [state, action] = useActionState(updateProfile, initialFormState);

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}
      {state.status === "success" && (
        <Alert tone="success">{state.message}</Alert>
      )}

      <Field label={t(locale, "settings.displayName")} htmlFor="full_name">
        <Input
          id="full_name"
          name="full_name"
          defaultValue={defaultName}
          maxLength={120}
          required
        />
      </Field>

      <Field label={t(locale, "settings.email")} htmlFor="email-display" hint={t(locale, "settings.emailHint")}>
        <Input id="email-display" value={email} disabled readOnly />
      </Field>

      <SubmitButton pendingText={t(locale, "settings.saving")}>{t(locale, "settings.saveProfile")}</SubmitButton>
    </form>
  );
}
