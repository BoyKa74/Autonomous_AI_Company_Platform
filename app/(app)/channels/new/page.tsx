import Link from "next/link";
import type { Metadata } from "next";
import { ChannelForm } from "@/components/channels/channel-form";
import { Eyebrow, Panel, buttonStyles } from "@/components/ui/kit";
import { ArrowLeftIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Thêm kênh" };

export default function NewChannelPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 rise-in">
      <header>
        <Link
          href="/channels"
          className={buttonStyles("ghost", "sm", "-ml-2 text-fog-500")}
        >
          <ArrowLeftIcon className="size-3.5" />
          Kênh
        </Link>
        <Eyebrow className="mt-3">Kênh mới</Eyebrow>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          Thêm kênh vào hệ sinh thái
        </h1>
        <p className="mt-1 text-sm text-fog-500">
          Khai báo kênh YouTube, TikTok, Facebook, đầu sách, kênh truyền thông
          hoặc gian hàng bán — kể cả khu vực nước ngoài.
        </p>
      </header>

      <Panel bodyClassName="p-5">
        <ChannelForm mode="create" />
      </Panel>
    </div>
  );
}
