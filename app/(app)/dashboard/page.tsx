import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listChannels, computeChannelStats, listContentItems } from "@/lib/data";
import {
  DataValue,
  EmptyState,
  Eyebrow,
  MeterBar,
  Panel,
  PlatformChip,
  StatusChip,
  Tag,
  buttonStyles,
} from "@/components/ui/kit";
import { StatModule } from "@/components/ui/stat-module";
import {
  CONTENT_STATUSES,
  CONTENT_STATUS_ORDER,
  PLATFORM_ORDER,
  PLATFORMS,
  STATUSES,
} from "@/lib/constants";
import { compactNumber, formatDateTime, signalLevel } from "@/lib/utils";
import { PlusIcon } from "@/components/icons";
import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await connection();
  const locale = await getLocale();
  const [channels, contentItems] = await Promise.all([
    listChannels({}),
    listContentItems({ limit: 300 }),
  ]);

  const stats = computeChannelStats(channels);
  const maxFollowers = Math.max(
    1,
    ...PLATFORM_ORDER.map((p) => stats.byPlatform[p]?.followers ?? 0)
  );

  const contentByStatus = CONTENT_STATUS_ORDER.map((status) => ({
    status,
    count: contentItems.filter((item) => item.status === status).length,
  }));
  const contentTotal = contentItems.length;

  const recentChannels = [...channels]
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    .slice(0, 5);

  const today = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-6 rise-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>{tr(locale, "Trung tâm điều phối")}</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
            {tr(locale, "Bảng điều khiển")}
          </h1>
          <p className="mt-1 text-sm text-fog-500">{today}</p>
        </div>
        <Link href="/channels/new" className={buttonStyles("primary")}>
          <PlusIcon className="size-3.5" />
          {tr(locale, "Thêm kênh")}
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatModule label={tr(locale, "Tổng kênh")} value={stats.total} />
        <StatModule
          label={tr(locale, "Đang phát sóng")}
          value={stats.active}
          note={`${stats.total - stats.active} ${tr(
            locale,
            stats.total - stats.active === 1 ? "channel paused" : "channels paused"
          )}`}
        />
        <StatModule
          label={tr(locale, "Kênh bán hàng")}
          value={stats.commerce}
          note={tr(locale, "Shopee · TikTok Shop · sàn khác")}
        />
        <StatModule
          label={tr(locale, "Tổng follower")}
          value={compactNumber(stats.followers)}
          note={tr(locale, "trên toàn hệ sinh thái")}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel
          eyebrow={tr(locale, "Tín hiệu")}
          title={tr(locale, "Theo nền tảng")}
          bodyClassName="p-0"
        >
          {stats.total === 0 ? (
            <div className="p-4">
              <EmptyState
                title={tr(locale, "Chưa có kênh nào")}
                description={tr(
                  locale,
                  "Thêm kênh đầu tiên để bảng tín hiệu bắt đầu hoạt động."
                )}
                action={
                  <Link href="/channels/new" className={buttonStyles("primary", "sm")}>
                    {tr(locale, "Thêm kênh đầu tiên")}
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-ink-700">
              {PLATFORM_ORDER.filter((p) => stats.byPlatform[p]).map(
                (platform) => {
                  const row = stats.byPlatform[platform];
                  return (
                    <li
                      key={platform}
                      className="flex items-center gap-4 px-4 py-3"
                    >
                      <PlatformChip
                        platform={platform}
                        label={tr(locale, PLATFORMS[platform].short)}
                        className="w-24 justify-start"
                      />
                      <DataValue className="w-8 text-right">
                        {row.count}
                      </DataValue>
                      <MeterBar
                        value={signalLevel(row.followers, maxFollowers)}
                        className="flex-1"
                      />
                      <DataValue className="w-16 text-right text-fog-500">
                        {compactNumber(row.followers)}
                      </DataValue>
                    </li>
                  );
                }
              )}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel
            eyebrow={tr(locale, "Dòng nội dung")}
            title={tr(locale, "Kho nội dung")}
          >
            {contentTotal === 0 ? (
              <p className="text-sm text-fog-500">
                {tr(locale, "Chưa có nội dung nào.")}{" "}
                <Link
                  href="/company"
                  className="font-medium text-signal-500 hover:text-signal-400"
                >
                  {tr(locale, "Mở Công ty AI")}
                </Link>{" "}
                {tr(locale, "để bắt đầu.")}
              </p>
            ) : (
              <>
                <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-ink-700">
                  {contentByStatus.map(({ status, count }) =>
                    count > 0 ? (
                      <div
                        key={status}
                        style={{
                          width: `${(count / contentTotal) * 100}%`,
                          backgroundColor: CONTENT_STATUSES[status].color,
                        }}
                        title={`${tr(locale, CONTENT_STATUSES[status].label)}: ${count}`}
                      />
                    ) : null
                  )}
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {contentByStatus.map(({ status, count }) => (
                    <li
                      key={status}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2 text-xs text-fog-300">
                        <span
                          className="inline-block size-1.5 rounded-full"
                          style={{
                            backgroundColor: CONTENT_STATUSES[status].color,
                          }}
                        />
                        {tr(locale, CONTENT_STATUSES[status].label)}
                      </span>
                      <DataValue className="text-xs">{count}</DataValue>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Panel>

          <Panel
            eyebrow={tr(locale, "Hoạt động")}
            title={tr(locale, "Kênh cập nhật gần đây")}
            bodyClassName="p-0"
          >
            {recentChannels.length === 0 ? (
              <p className="p-4 text-sm text-fog-500">
                {tr(locale, "Chưa có kênh nào.")}
              </p>
            ) : (
              <ul className="divide-y divide-ink-700">
                {recentChannels.map((channel) => (
                  <li key={channel.id}>
                    <Link
                      href={`/channels/${channel.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink-800"
                    >
                      <PlatformChip
                        platform={channel.platform}
                        label={tr(locale, PLATFORMS[channel.platform].short)}
                        withDot={false}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm text-fog-100">
                        {channel.name}
                      </span>
                      <StatusChip
                        status={channel.status}
                        label={tr(locale, STATUSES[channel.status].label)}
                      />
                      <span className="hidden font-mono text-[11px] tabular-nums text-fog-600 sm:block">
                        {formatDateTime(channel.updated_at, locale)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Tag>AI router</Tag>
        <Tag>Supabase RLS</Tag>
        <Tag>{tr(locale, "Phase 1 · quản lý kênh")}</Tag>
      </div>
    </div>
  );
}
