"use client";

import { useState } from "react";
import { deleteContentItem, setContentStatus } from "@/app/actions/content";
import { SubmitButton } from "@/components/ui/submit-button";
import { Tag } from "@/components/ui/kit";
import { CONTENT_KINDS, CONTENT_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { ContentItem } from "@/types/database";
import { tr, type Locale } from "@/lib/i18n/messages";

export function ContentItemRow({
  item,
  locale,
}: {
  item: ContentItem;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-medium text-fog-100">
            {item.title}
          </p>
          <p className="mt-0.5 flex items-center gap-2 text-xs text-fog-600">
            <span>{tr(locale, CONTENT_KINDS[item.kind])}</span>
            <span>·</span>
            <span>{formatDateTime(item.created_at, locale)}</span>
            {item.ai_provider && (
              <>
                <span>·</span>
                <span className="text-signal-600">AI: {item.ai_provider}</span>
              </>
            )}
          </p>
        </button>

        <div className="flex items-center gap-2">
          <span
            className="font-mono text-[10.5px] uppercase tracking-wider"
            style={{ color: CONTENT_STATUSES[item.status].color }}
          >
            {tr(locale, CONTENT_STATUSES[item.status].label)}
          </span>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-md border border-ink-700 bg-ink-900 p-3">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-fog-300">
            {item.content}
          </pre>
          <div className="flex flex-wrap items-center gap-2">
            <form action={setContentStatus} className="flex items-center gap-2">
              <input type="hidden" name="id" value={item.id} />
              <input
                type="hidden"
                name="channel_id"
                value={item.channel_id ?? ""}
              />
              <select
                name="status"
                defaultValue={item.status}
                className="h-8 rounded-md border border-ink-600 bg-ink-800 px-2 text-xs text-fog-100"
                aria-label={tr(locale, "Đổi trạng thái nội dung")}
              >
                {Object.entries(CONTENT_STATUSES).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {tr(locale, meta.label)}
                  </option>
                ))}
              </select>
              <SubmitButton size="sm" variant="secondary" pendingText="…">
                {tr(locale, "Lưu trạng thái")}
              </SubmitButton>
            </form>

            <form action={deleteContentItem}>
              <input type="hidden" name="id" value={item.id} />
              <input
                type="hidden"
                name="channel_id"
                value={item.channel_id ?? ""}
              />
              <SubmitButton
                size="sm"
                variant="danger"
                pendingText={tr(locale, "Đang xoá…")}
                confirm={tr(locale, "Xoá nội dung này?")}
              >
                {tr(locale, "Xoá")}
              </SubmitButton>
            </form>

            <Tag>
              {item.channel_id
                ? tr(locale, "Thuộc kênh")
                : tr(locale, "Chưa gán kênh")}
            </Tag>
          </div>
        </div>
      )}
    </li>
  );
}
