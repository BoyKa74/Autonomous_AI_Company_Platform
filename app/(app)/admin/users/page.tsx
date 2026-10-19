import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listProfiles, listAllChannelsWithOwner } from "@/lib/data";
import { Panel, Tag } from "@/components/ui/kit";
import { RoleControl } from "@/components/admin/role-control";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Người dùng" };

export default async function AdminUsersPage() {
  await connection();
  const me = await requireAdmin();
  const [profiles, channels] = await Promise.all([
    listProfiles(),
    listAllChannelsWithOwner(),
  ]);

  const channelCount = new Map<string, number>();
  for (const channel of channels) {
    channelCount.set(
      channel.owner_id,
      (channelCount.get(channel.owner_id) ?? 0) + 1
    );
  }

  return (
    <Panel
      eyebrow="Tài khoản"
      title={`${profiles.length} người dùng`}
      bodyClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink-700 font-mono text-[10.5px] uppercase tracking-[0.14em] text-fog-600">
              <th className="px-4 py-2.5 font-medium">Người dùng</th>
              <th className="px-4 py-2.5 font-medium">Kênh</th>
              <th className="px-4 py-2.5 font-medium">Tham gia</th>
              <th className="px-4 py-2.5 text-right font-medium">Vai trò</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-700">
            {profiles.map((profile) => (
              <tr key={profile.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-fog-100">
                    {profile.full_name || "—"}
                    {profile.id === me.id && (
                      <Tag className="ml-2 align-middle">bạn</Tag>
                    )}
                  </p>
                  <p className="font-mono text-[11px] text-fog-600">
                    {profile.email}
                  </p>
                </td>
                <td className="px-4 py-3 font-mono text-sm tabular-nums text-fog-300">
                  {channelCount.get(profile.id) ?? 0}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-fog-600">
                  {formatDate(profile.created_at)}
                </td>
                <td className="px-4 py-3">
                  <RoleControl
                    userId={profile.id}
                    role={profile.role}
                    isSelf={profile.id === me.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
