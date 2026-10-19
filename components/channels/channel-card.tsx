import Link from "next/link";
import type { Channel } from "@/types/database";
import {
  DataValue,
  MeterBar,
  PlatformChip,
  StatusChip,
  Tag,
} from "@/components/ui/kit";
import { compactNumber, formatDateTime, signalLevel } from "@/lib/utils";

export function ChannelCard({ channel }: { channel: Channel }) {
  return (
    <Link
      href={`/channels/${channel.id}`}
      className="group flex flex-col gap-3 rounded-lg border border-ink-700 bg-ink-850 p-4 transition-colors hover:border-ink-500 hover:bg-ink-800"
    >
      <div className="flex items-start justify-between gap-2">
        <PlatformChip platform={channel.platform} />
        <StatusChip status={channel.status} />
      </div>

      <div className="min-w-0">
        <h3 className="truncate font-display text-sm font-semibold text-fog-100 group-hover:text-signal-300">
          {channel.name}
        </h3>
        <p className="mt-0.5 truncate font-mono text-[11px] text-fog-600">
          {channel.handle || "—"} · {channel.region}
        </p>
      </div>

      {channel.goal && (
        <p className="line-clamp-1 text-xs text-fog-500">{channel.goal}</p>
      )}

      <div className="mt-auto space-y-2">
        <MeterBar value={signalLevel(channel.followers, 1_000_000)} />
        <div className="flex items-center justify-between">
          <DataValue className="text-xs">
            {compactNumber(channel.followers)}
            <span className="ml-1 font-sans text-fog-600">follower</span>
          </DataValue>
          <span className="font-mono text-[10px] text-fog-600">
            {formatDateTime(channel.updated_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ChannelRowMeta({ channel }: { channel: Channel }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PlatformChip platform={channel.platform} />
      <StatusChip status={channel.status} />
      <Tag>{channel.region}</Tag>
    </div>
  );
}
