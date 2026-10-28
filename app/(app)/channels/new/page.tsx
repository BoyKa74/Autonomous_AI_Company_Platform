import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listCompanies } from "@/lib/data";
import { ChannelForm } from "@/components/channels/channel-form";
import { Eyebrow, Panel, buttonStyles } from "@/components/ui/kit";
import { ArrowLeftIcon } from "@/components/icons";
import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";

export const metadata: Metadata = { title: "Add channel" };

export default async function NewChannelPage({
  searchParams,
}: PageProps<"/channels/new">) {
  await connection();
  const locale = await getLocale();
  const params = await searchParams;
  const companies = await listCompanies();
  const company =
    typeof params.company === "string"
      ? companies.find((entry) => entry.id === params.company) ?? null
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 rise-in">
      <header>
        <Link
          href={company ? `/channels?company=${company.id}` : "/channels"}
          className={buttonStyles("ghost", "sm", "-ml-2 text-fog-500")}
        >
          <ArrowLeftIcon className="size-3.5" />
          {company ? company.name : tr(locale, "Kênh")}
        </Link>
        <Eyebrow className="mt-3">{tr(locale, "Kênh mới")}</Eyebrow>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          {tr(locale, "Thêm kênh vào hệ sinh thái")}
        </h1>
        <p className="mt-1 text-sm text-fog-500">
          {tr(
            locale,
            "Khai báo kênh YouTube, TikTok, Facebook, đầu sách, kênh truyền thông hoặc gian hàng bán — kể cả khu vực nước ngoài."
          )}
        </p>
      </header>

      <Panel bodyClassName="p-5">
        <ChannelForm
          mode="create"
          companies={companies.map((entry) => ({
            id: entry.id,
            name: entry.name,
          }))}
          defaultCompanyId={company?.id}
          locale={locale}
        />
      </Panel>
    </div>
  );
}
