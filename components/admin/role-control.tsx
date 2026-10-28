"use client";

import { useActionState } from "react";
import { updateUserRole } from "@/app/actions/admin";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Select } from "@/components/ui/kit";
import { tr, type Locale } from "@/lib/i18n/messages";

export function RoleControl({
  userId,
  role,
  isSelf,
  locale,
}: {
  userId: string;
  role: "user" | "admin" | "super_admin";
  isSelf: boolean;
  locale: Locale;
}) {
  const [state, action] = useActionState(updateUserRole, initialFormState);

  return (
    <form action={action} className="flex items-center justify-end gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <Select
        name="role"
        defaultValue={role}
        disabled={isSelf}
        aria-label={tr(locale, "Vai trò")}
        className="h-8 w-28 text-xs"
      >
        <option value="user">user</option>
        <option value="admin">admin</option>
        <option value="super_admin">super_admin</option>
      </Select>
      <SubmitButton size="sm" variant="secondary" pendingText="…">
        {tr(locale, "Lưu")}
      </SubmitButton>
      {state.status === "error" && (
        <span className="text-xs text-bad-400">{tr(locale, state.message)}</span>
      )}
    </form>
  );
}
