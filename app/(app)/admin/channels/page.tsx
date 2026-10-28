import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listAllChannelsWithOwner } from "@/lib/data";
import { DataValue, Panel, PlatformChip, StatusChip, Tag } from "@/components/ui/kit";
import { compactNumber, formatDateTime } from "@/lib/utils";
import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";
import { PLATFORMS, STATUSES } from "@/lib/constants";

export const metadata: Metadata = { title: "All channels" };

export default async function AdminChannelsPage() {
  await connection();
  const locale = await getLocale();
  const channels = await listAllChannelsWithOwner();

  return (
    <Panel
      eyebrow={tr(locale, "Toàn hệ thống")}
      title={`${channels.length} ${tr(locale, "kênh")}`}
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-700 font-mono text-[10.5px] uppercase tracking-[0.14em] text-fog-600">
              <th className="px-4 py-2.5 font-medium">{tr(locale, "Kênh")}</th>
              <th className="px-4 py-2.5 font-medium">{tr(locale, "Nền tảng")}</th>
              <th className="px-4 py-2.5 font-medium">{tr(locale, "Chủ sở hữu")}</th>
              <th className="px-4 py-2.5 text-right font-medium">Follower</th>
              <th className="px-4 py-2.5 text-right font-medium">{tr(locale, "Cập nhật")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {channels.map((channel) => (
              <tr key={channel.id} className="hover:bg-ink-800">
                <td className="px-4 py-3">
                  <Link
                    href={`/channels/${channel.id}`}
                    className="flex items-center gap-2 font-medium text-fog-100 hover:text-signal-300"
                  >
                    {channel.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusChip
                      status={channel.status}
                      label={tr(locale, STATUSES[channel.status].label)}
                    />
                    <Tag>{channel.region}</Tag>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <PlatformChip
                    platform={channel.platform}
                    label={tr(locale, PLATFORMS[channel.platform].short)}
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="text-fog-300">
                    {channel.owner?.full_name || "—"}
                  </p>
                  <p className="font-mono text-[11px] text-fog-600">
                    {channel.owner?.email}
                  </p>
                </td>
                <td className="px-4 py-3 text-right">
                  <DataValue>{compactNumber(channel.followers)}</DataValue>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs text-fog-600">
                  {formatDateTime(channel.updated_at, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
