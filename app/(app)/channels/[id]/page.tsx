import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getChannel, listContentItems } from "@/lib/data";
import { ChannelForm } from "@/components/channels/channel-form";
import { ContentItemRow } from "@/components/content/content-item-row";
import { deleteChannel } from "@/app/actions/channels";
import {
  DataValue,
  Eyebrow,
  Panel,
  Tag,
  buttonStyles,
} from "@/components/ui/kit";
import { SubmitButton } from "@/components/ui/submit-button";
import { ArrowLeftIcon, SparkIcon } from "@/components/icons";
import { ChannelRowMeta } from "@/components/channels/channel-card";
import { formatDate, formatDateTime } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/channels/[id]">): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const channel = await getChannel(id);
  return { title: channel?.name ?? "Kênh" };
}

export default async function ChannelDetailPage({
  params,
}: PageProps<"/channels/[id]">) {
  await connection();
  const { id } = await params;
  const channel = await getChannel(id);
  if (!channel) notFound();

  const items = await listContentItems({ channelId: id, limit: 100 });

  return (
    <div className="space-y-6 rise-in">
      <header className="space-y-3">
        <Link
          href="/channels"
          className={buttonStyles("ghost", "sm", "-ml-2 text-fog-500")}
        >
          <ArrowLeftIcon className="size-3.5" />
          Kênh
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow>Hồ sơ kênh</Eyebrow>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
              {channel.name}
            </h1>
            <div className="mt-2">
              <ChannelRowMeta channel={channel} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/ai?channel=${channel.id}`}
              className={buttonStyles("secondary")}
            >
              <SparkIcon className="size-3.5" />
              Viết với AI
            </Link>
            <form action={deleteChannel}>
              <input type="hidden" name="id" value={channel.id} />
              <SubmitButton
                variant="danger"
                pendingText="Đang xoá…"
                confirm={`Xoá kênh "${channel.name}"? Nội dung thuộc kênh sẽ không bị xoá.`}
              >
                Xoá kênh
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Panel eyebrow="Cập nhật" title="Thông tin kênh" bodyClassName="p-5">
          <ChannelForm mode="edit" channel={channel} />
        </Panel>

        <div className="space-y-6">
          <Panel eyebrow="Hồ sơ" title="Chỉ số & liên kết">
            <dl className="space-y-3">
              <InfoRow label="Follower">
                <DataValue>{channel.followers.toLocaleString("vi-VN")}</DataValue>
              </InfoRow>
              <InfoRow label="Handle">
                <span className="font-mono text-sm text-fog-300">
                  {channel.handle || "—"}
                </span>
              </InfoRow>
              <InfoRow label="Khu vực">
                <Tag>{channel.region}</Tag>
              </InfoRow>
              <InfoRow label="Link">
                {channel.url ? (
                  <a
                    href={channel.url}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-sm text-info-400 hover:underline"
                  >
                    {channel.url}
                  </a>
                ) : (
                  <span className="text-sm text-fog-600">—</span>
                )}
              </InfoRow>
              <InfoRow label="Mục tiêu">
                <span className="text-sm text-fog-300">
                  {channel.goal || "—"}
                </span>
              </InfoRow>
              <InfoRow label="Ngày tạo">
                <span className="font-mono text-xs text-fog-500">
                  {formatDate(channel.created_at)}
                </span>
              </InfoRow>
              <InfoRow label="Cập nhật">
                <span className="font-mono text-xs text-fog-500">
                  {formatDateTime(channel.updated_at)}
                </span>
              </InfoRow>
            </dl>

            {channel.notes && (
              <div className="mt-4 rounded-md border border-ink-700 bg-ink-900 p-3">
                <Eyebrow className="mb-1">Ghi chú vận hành</Eyebrow>
                <p className="whitespace-pre-wrap text-sm text-fog-300">
                  {channel.notes}
                </p>
              </div>
            )}
          </Panel>

          <Panel
            eyebrow="Nội dung"
            title={`Kho nội dung (${items.length})`}
            bodyClassName="p-0"
          >
            {items.length === 0 ? (
              <p className="p-4 text-sm text-fog-500">
                Chưa có nội dung nào cho kênh này.{" "}
                <Link
                  href={`/ai?channel=${channel.id}`}
                  className="font-medium text-signal-500 hover:text-signal-400"
                >
                  Viết cùng AI
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-ink-700">
                {items.map((item) => (
                  <ContentItemRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="font-mono text-[11px] uppercase tracking-[0.14em] text-fog-600">
        {label}
      </dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
