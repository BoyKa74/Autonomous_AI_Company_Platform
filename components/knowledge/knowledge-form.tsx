"use client";

import { useActionState } from "react";
import {
  createKnowledgeDoc,
  updateKnowledgeDoc,
} from "@/app/actions/knowledge";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  Alert,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui/kit";
import { KNOWLEDGE_CATEGORIES, KNOWLEDGE_DOMAINS } from "@/lib/constants";
import type { KnowledgeDoc } from "@/types/database";
import { tr, type Locale } from "@/lib/i18n/messages";

export function KnowledgeForm({
  mode,
  doc,
  companies,
  defaultCompanyId,
  locale,
}: {
  mode: "create" | "edit";
  doc?: KnowledgeDoc;
  companies: { id: string; name: string }[];
  defaultCompanyId?: string;
  locale: Locale;
}) {
  const action = mode === "create" ? createKnowledgeDoc : updateKnowledgeDoc;
  const [state, formAction] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && (
        <Alert tone="error">{tr(locale, state.message)}</Alert>
      )}
      {state.status === "success" && (
        <Alert tone="success">{tr(locale, state.message)}</Alert>
      )}

      {mode === "edit" && doc && (
        <input type="hidden" name="id" value={doc.id} />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr(locale, "Tiêu đề")} htmlFor="doc-title">
          <Input
            id="doc-title"
            name="title"
            defaultValue={doc?.title}
            placeholder={tr(locale, "VD: Công thức content Facebook 2026")}
            maxLength={200}
            required
          />
        </Field>

        <Field label={tr(locale, "Loại tài liệu")} htmlFor="doc-category">
          <Select
            id="doc-category"
            name="category"
            defaultValue={doc?.category ?? "prompt"}
          >
            {Object.entries(KNOWLEDGE_CATEGORIES).map(([value, meta]) => (
              <option key={value} value={value}>
                {tr(locale, meta.label)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={tr(locale, "Mảng")}
          htmlFor="doc-domain"
          hint={tr(locale, "VD: Content Facebook, SEO & Website, Sách & Xuất bản…")}
        >
          <Input
            id="doc-domain"
            name="domain"
            list="knowledge-domains"
            defaultValue={doc?.domain ?? "Chung"}
            maxLength={60}
            required
          />
          <datalist id="knowledge-domains">
            {KNOWLEDGE_DOMAINS.map((domain) => (
              <option key={domain} value={domain} />
            ))}
          </datalist>
        </Field>

        <Field
          label={tr(locale, "Phạm vi")}
          htmlFor="doc-company"
          hint={tr(locale, "Để trống = mọi công ty AI đều dùng.")}
        >
          <Select
            id="doc-company"
            name="company_id"
            defaultValue={doc?.company_id ?? defaultCompanyId ?? ""}
          >
            <option value="">{tr(locale, "Dùng chung (toàn hệ thống)")}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Tags"
          htmlFor="doc-tags"
          hint={tr(locale, "Phân cách bằng dấu phẩy.")}
        >
          <Input
            id="doc-tags"
            name="tags"
            defaultValue={(doc?.tags ?? []).join(", ")}
            placeholder="facebook, content, viral"
            maxLength={300}
          />
        </Field>
      </div>

      <Field
        label={tr(locale, "Nội dung / Prompt")}
        htmlFor="doc-content"
        hint={tr(locale, "Đây là phần AI sẽ đọc và áp dụng khi chạy việc.")}
      >
        <Textarea
          id="doc-content"
          name="content"
          rows={10}
          defaultValue={doc?.content}
          placeholder={tr(locale, "Dán prompt, playbook, quy trình hoặc kiến thức cần AI ghi nhớ…")}
          maxLength={50000}
          required
        />
      </Field>

      <div className="flex flex-wrap gap-5">
        <label className="flex items-center gap-2 text-sm text-fog-300">
          <input
            type="checkbox"
            name="active"
            defaultChecked={doc ? doc.active : true}
            className="size-4 accent-[#cd8615]"
          />
          {tr(locale, "AI được dùng tài liệu này")}
        </label>
        <label className="flex items-center gap-2 text-sm text-fog-300">
          <input
            type="checkbox"
            name="pinned"
            defaultChecked={doc?.pinned ?? false}
            className="size-4 accent-[#cd8615]"
          />
          {tr(locale, "Ghim (ưu tiên khi có xung đột)")}
        </label>
      </div>

      <SubmitButton pendingText={tr(locale, "Đang lưu…")}>
        {mode === "create" ? tr(locale, "Thêm tài liệu") : tr(locale, "Lưu thay đổi")}
      </SubmitButton>
    </form>
  );
}
