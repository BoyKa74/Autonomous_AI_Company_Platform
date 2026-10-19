import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listChannels } from "@/lib/data";
import { ChannelFilters } from "@/components/channels/channel-filters";
import { ChannelCard } from "@/components/channels/channel-card";
import { EmptyState, Eyebrow, buttonStyles } from "@/components/ui/kit";
import { PlusIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Kênh" };

export default async function ChannelsPage({ searchParams }: PageProps<"/channels">) {
  await connection();
  const params = await searchParams;
  const filters = {
    platform: typeof params.platform === "string" ? params.platform : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    region: typeof params.region === "string" ? params.region : undefined,
    q: typeof params.q === "string" ? params.q : undefined,
  };

  const channels = await listChannels(filters);

  return (
    <div className="space-y-6 rise-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Hệ sinh thái</Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
            Kênh
          </h1>
          <p className="mt-1 text-sm text-fog-500">
            {channels.length} kênh theo bộ lọc hiện tại
          </p>
        </div>
        <Link href="/channels/new" className={buttonStyles("primary")}>
          <PlusIcon className="size-3.5" />
          Thêm kênh
        </Link>
      </header>

      <ChannelFilters />

      {channels.length === 0 ? (
        <EmptyState
          title="Không tìm thấy kênh nào"
          description="Thử xoá bộ lọc, hoặc thêm kênh mới vào hệ sinh thái."
          action={
            <Link href="/channels/new" className={buttonStyles("primary", "sm")}>
              Thêm kênh
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </div>
  );
}
