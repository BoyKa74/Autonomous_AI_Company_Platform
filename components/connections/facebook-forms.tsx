"use client";

import { useActionState } from "react";
import { connectFacebook, publishToFacebook } from "@/app/actions/connections";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Alert,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/kit";
import { tr, type Locale } from "@/lib/i18n/messages";

export function FacebookConnectForm({
  companies,
  locale,
}: {
  companies: { id: string; name: string }[];
  locale: Locale;
}) {
  const [state, action] = useActionState(connectFacebook, initialFormState);

  return (
    <form action={action} className="space-y-3">
      {state.status === "error" && (
        <Alert tone="error">{tr(locale, state.message)}</Alert>
      )}
      {state.status === "success" && (
        <Alert tone="success">{tr(locale, state.message)}</Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Page ID" htmlFor="fb-page-id" hint={tr(locale, "Chỉ gồm chữ số.")}>
          <Input
            id="fb-page-id"
            name="page_id"
            placeholder={tr(locale, "VD: 123456789012345")}
            inputMode="numeric"
            required
          />
        </Field>

        <Field
          label={tr(locale, "Gắn với công ty (tuỳ chọn)")}
          htmlFor="fb-company"
        >
          <Select id="fb-company" name="company_id" defaultValue="">
            <option value="">{tr(locale, "Không gắn")}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Page Access Token"
        htmlFor="fb-token"
        hint={tr(
          locale,
          "Token được mã hoá AES-256-GCM trước khi lưu. Không hiển thị lại cho trình duyệt."
        )}
      >
        <Textarea
          id="fb-token"
          name="access_token"
          rows={3}
          placeholder={tr(locale, "Dán Page Access Token từ Graph API Explorer…")}
          required
        />
      </Field>

      <SubmitButton pendingText={tr(locale, "Đang kiểm tra Page…")}>
        {tr(locale, "Kiểm tra & kết nối")}
      </SubmitButton>
    </form>
  );
}

export function FacebookPublishForm({
  accountId,
  accountName,
  locale,
}: {
  accountId: string;
  accountName: string;
  locale: Locale;
}) {
  const [state, action] = useActionState(publishToFacebook, initialFormState);

  return (
    <form action={action} className="space-y-2">
      {state.status === "error" && (
        <Alert tone="error">{tr(locale, state.message)}</Alert>
      )}
      {state.status === "success" && (
        <Alert tone="success">{tr(locale, state.message)}</Alert>
      )}
      <input type="hidden" name="account_id" value={accountId} />
      <Field
        label={`${tr(locale, "Đăng thử lên")} ${accountName}`}
        htmlFor={`fb-post-${accountId}`}
        hint={tr(locale, "Bài sẽ được đăng thật lên Page. Cân nhắc trước khi bấm.")}
      >
        <Textarea
          id={`fb-post-${accountId}`}
          name="message"
          rows={2}
          placeholder={tr(locale, "Nội dung bài đăng thử…")}
          maxLength={5000}
          required
        />
      </Field>
      <SubmitButton
        size="sm"
        variant="secondary"
        pendingText={tr(locale, "Đang đăng…")}
        confirm={tr(locale, "Đăng bài này lên Page thật?")}
      >
        {tr(locale, "Đăng thử")}
      </SubmitButton>
    </form>
  );
}
