import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import {
  computeChannelStats,
  listAllChannelsWithOwner,
  listContentItems,
  listProfiles,
} from "@/lib/data";
import { StatModule } from "@/components/ui/stat-module";
import { DataValue, MeterBar, Panel, PlatformChip } from "@/components/ui/kit";
import { PLATFORM_ORDER, PLATFORMS } from "@/lib/constants";
import { compactNumber, signalLevel } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";

export const metadata: Metadata = { title: "System overview" };

export default async function AdminOverviewPage() {
  await connection();
  const locale = await getLocale();
  const [profiles, channels, contentItems] = await Promise.all([
    listProfiles(),
    listAllChannelsWithOwner(),
    listContentItems({ limit: 500 }),
  ]);

  const stats = computeChannelStats(channels);
  const adminCount = profiles.filter((p) => p.role === "admin" || p.role === "super_admin").length;
  const maxFollowers = Math.max(
    1,
    ...PLATFORM_ORDER.map((p) => stats.byPlatform[p]?.followers ?? 0)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatModule
          label={tr(locale, "Người dùng")}
          value={profiles.length}
          note={`${adminCount} admin`}
        />
        <StatModule
          label={tr(locale, "Kênh toàn hệ thống")}
          value={stats.total}
        />
        <StatModule
          label={tr(locale, "Kênh đang chạy")}
          value={stats.active}
          accent={stats.active > 0}
        />
        <StatModule
          label={tr(locale, "Nội dung trong kho")}
          value={contentItems.length}
          note={`${compactNumber(stats.followers)} ${tr(
            locale,
            "follower tổng"
          )}`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          eyebrow={tr(locale, "Phân bố")}
          title={tr(locale, "Kênh theo nền tảng")}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-ink-700">
            {PLATFORM_ORDER.filter((p) => stats.byPlatform[p]).map(
              (platform) => {
                const row = stats.byPlatform[platform];
                return (
                  <li key={platform} className="flex items-center gap-4 px-4 py-3">
                    <PlatformChip
                      platform={platform}
                      label={tr(locale, PLATFORMS[platform].short)}
                      className="w-24 justify-start"
                    />
                    <DataValue className="w-8 text-right">{row.count}</DataValue>
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
        </Panel>

        <Panel
          eyebrow={tr(locale, "Lối tắt")}
          title={tr(locale, "Quản trị")}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-ink-700">
            <li>
              <Link
                href="/admin/users"
                className="flex items-center justify-between px-4 py-3 text-sm text-fog-300 transition-colors hover:bg-ink-800 hover:text-fog-100"
              >
                {tr(locale, "Quản lý người dùng & phân quyền")}
                <span className="font-mono text-xs text-fog-600">
                  {profiles.length}
                </span>
              </Link>
            </li>
            <li>
              <Link
                href="/admin/channels"
                className="flex items-center justify-between px-4 py-3 text-sm text-fog-300 transition-colors hover:bg-ink-800 hover:text-fog-100"
              >
                {tr(locale, "Toàn bộ kênh của mọi tài khoản")}
                <span className="font-mono text-xs text-fog-600">
                  {channels.length}
                </span>
              </Link>
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
