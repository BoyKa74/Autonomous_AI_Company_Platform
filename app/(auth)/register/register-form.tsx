"use client";

import { useActionState } from "react";
import { register } from "@/app/actions/auth";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input } from "@/components/ui/kit";

export function RegisterForm() {
  const [state, action] = useActionState(register, initialFormState);

  return (
    <form action={action} className="space-y-4">
      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}
      {state.status === "success" && (
        <Alert tone="success">{state.message}</Alert>
      )}

      <Field label="Display name" htmlFor="full_name">
        <Input
          id="full_name"
          name="full_name"
          autoComplete="name"
          placeholder="Jane Doe"
          required
        />
      </Field>

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint="At least 6 characters."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          minLength={6}
          required
        />
      </Field>

      <SubmitButton className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
