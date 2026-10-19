"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions/admin";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input } from "@/components/ui/kit";

export function ProfileForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const [state, action] = useActionState(updateProfile, initialFormState);

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}
      {state.status === "success" && (
        <Alert tone="success">{state.message}</Alert>
      )}

      <Field label="Tên hiển thị" htmlFor="full_name">
        <Input
          id="full_name"
          name="full_name"
          defaultValue={defaultName}
          maxLength={120}
          required
        />
      </Field>

      <Field label="Email" htmlFor="email-display" hint="Email không đổi được ở đây.">
        <Input id="email-display" value={email} disabled readOnly />
      </Field>

      <SubmitButton pendingText="Đang lưu…">Lưu hồ sơ</SubmitButton>
    </form>
  );
}
