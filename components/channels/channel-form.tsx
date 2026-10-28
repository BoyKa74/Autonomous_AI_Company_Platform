"use client";

import { useActionState } from "react";
import { createChannel, updateChannel } from "@/app/actions/channels";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/kit";
import { PLATFORMS, PLATFORM_ORDER, REGIONS, STATUSES, STATUS_ORDER } from "@/lib/constants";
import type { Channel } from "@/types/database";
import { tr, type Locale } from "@/lib/i18n/messages";

export function ChannelForm({
  mode,
  channel,
  companies = [],
  defaultCompanyId,
  locale,
}: {
  mode: "create" | "edit";
  channel?: Channel;
  companies?: { id: string; name: string }[];
  defaultCompanyId?: string;
  locale: Locale;
}) {
  const action = mode === "create" ? createChannel : updateChannel;
  const [state, formAction] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && (
        <Alert tone="error">{tr(locale, state.message)}</Alert>
      )}
      {state.status === "success" && (
        <Alert tone="success">{tr(locale, state.message)}</Alert>
      )}

      {mode === "edit" && channel && (
        <input type="hidden" name="id" value={channel.id} />
      )}

      <Field label={tr(locale, "Tên kênh")} htmlFor="name">
        <Input
          id="name"
          name="name"
          placeholder={tr(locale, "VD: VIC Review Công Nghệ")}
          defaultValue={channel?.name}
          maxLength={120}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr(locale, "Nền tảng")} htmlFor="platform">
          <Select
            id="platform"
            name="platform"
            defaultValue={channel?.platform ?? "youtube"}
          >
            {PLATFORM_ORDER.map((platform) => (
              <option key={platform} value={platform}>
                {tr(locale, PLATFORMS[platform].label)}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={tr(locale, "Công ty AI")}
          htmlFor="company_id"
          className="sm:col-span-2"
        >
          <Select
            id="company_id"
            name="company_id"
            defaultValue={
              channel?.company_id ?? defaultCompanyId ?? ""
            }
          >
            <option value="">{tr(locale, "Chưa gán công ty")}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={tr(locale, "Trạng thái")} htmlFor="status">
          <Select id="status" name="status" defaultValue={channel?.status ?? "active"}>
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {tr(locale, STATUSES[status].label)}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={tr(locale, "Handle / tài khoản")} htmlFor="handle">
          <Input
            id="handle"
            name="handle"
            placeholder="@vicreview"
            defaultValue={channel?.handle ?? ""}
            maxLength={120}
          />
        </Field>

        <Field label={tr(locale, "Khu vực")} htmlFor="region">
          <Select id="region" name="region" defaultValue={channel?.region ?? "VN"}>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label={tr(locale, "Link kênh")}
          htmlFor="url"
          className="sm:col-span-2"
        >
          <Input
            id="url"
            name="url"
            type="url"
            placeholder="https://youtube.com/@vicreview"
            defaultValue={channel?.url ?? ""}
          />
        </Field>

        <Field
          label="Follower"
          htmlFor="followers"
          hint={tr(locale, "Số hiện tại, cập nhật thủ công ở giai đoạn 1.")}
        >
          <Input
            id="followers"
            name="followers"
            type="number"
            min={0}
            step={1}
            defaultValue={channel?.followers ?? 0}
          />
        </Field>

        <Field label={tr(locale, "Mục tiêu kênh")} htmlFor="goal">
          <Input
            id="goal"
            name="goal"
            placeholder={tr(locale, "VD: 100K sub trước 12/2026")}
            defaultValue={channel?.goal ?? ""}
            maxLength={300}
          />
        </Field>
      </div>

      <Field label={tr(locale, "Ghi chú vận hành")} htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder={tr(locale, "Lịch đăng, người phụ trách, đầu việc tiếp theo…")}
          defaultValue={channel?.notes ?? ""}
          maxLength={2000}
        />
      </Field>

      <SubmitButton
        pendingText={
          mode === "create" ? tr(locale, "Đang tạo…") : tr(locale, "Đang lưu…")
        }
      >
        {mode === "create" ? tr(locale, "Tạo kênh") : tr(locale, "Lưu thay đổi")}
      </SubmitButton>
    </form>
  );
}
