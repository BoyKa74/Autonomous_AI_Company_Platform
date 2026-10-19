"use client";

import { useActionState } from "react";
import { createChannel, updateChannel } from "@/app/actions/channels";
import { initialFormState } from "@/lib/action-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert, Field, Input, Select, Textarea } from "@/components/ui/kit";
import { PLATFORMS, PLATFORM_ORDER, REGIONS, STATUSES, STATUS_ORDER } from "@/lib/constants";
import type { Channel } from "@/types/database";

export function ChannelForm({
  mode,
  channel,
}: {
  mode: "create" | "edit";
  channel?: Channel;
}) {
  const action = mode === "create" ? createChannel : updateChannel;
  const [state, formAction] = useActionState(action, initialFormState);

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && <Alert tone="error">{state.message}</Alert>}
      {state.status === "success" && (
        <Alert tone="success">{state.message}</Alert>
      )}

      {mode === "edit" && channel && (
        <input type="hidden" name="id" value={channel.id} />
      )}

      <Field label="Tên kênh" htmlFor="name">
        <Input
          id="name"
          name="name"
          placeholder="VD: VIC Review Công Nghệ"
          defaultValue={channel?.name}
          maxLength={120}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nền tảng" htmlFor="platform">
          <Select
            id="platform"
            name="platform"
            defaultValue={channel?.platform ?? "youtube"}
          >
            {PLATFORM_ORDER.map((platform) => (
              <option key={platform} value={platform}>
                {PLATFORMS[platform].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Trạng thái" htmlFor="status">
          <Select id="status" name="status" defaultValue={channel?.status ?? "active"}>
            {STATUS_ORDER.map((status) => (
              <option key={status} value={status}>
                {STATUSES[status].label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Handle / tài khoản" htmlFor="handle">
          <Input
            id="handle"
            name="handle"
            placeholder="@vicreview"
            defaultValue={channel?.handle ?? ""}
            maxLength={120}
          />
        </Field>

        <Field label="Khu vực" htmlFor="region">
          <Select id="region" name="region" defaultValue={channel?.region ?? "VN"}>
            {REGIONS.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Link kênh" htmlFor="url" className="sm:col-span-2">
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
          hint="Số hiện tại, cập nhật thủ công ở giai đoạn 1."
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

        <Field label="Mục tiêu kênh" htmlFor="goal">
          <Input
            id="goal"
            name="goal"
            placeholder="VD: 100K sub trước 12/2026"
            defaultValue={channel?.goal ?? ""}
            maxLength={300}
          />
        </Field>
      </div>

      <Field label="Ghi chú vận hành" htmlFor="notes">
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="Lịch đăng, người phụ trách, đầu việc tiếp theo…"
          defaultValue={channel?.notes ?? ""}
          maxLength={2000}
        />
      </Field>

      <SubmitButton pendingText={mode === "create" ? "Đang tạo…" : "Đang lưu…"}>
        {mode === "create" ? "Tạo kênh" : "Lưu thay đổi"}
      </SubmitButton>
    </form>
  );
}
