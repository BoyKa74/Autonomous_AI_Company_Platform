import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listChannels, listCompanies } from "@/lib/data";
import { ChannelFilters } from "@/components/channels/channel-filters";
import { ChannelCard } from "@/components/channels/channel-card";
import { CompanyNav } from "@/components/company/company-nav";
import { getLocale } from "@/lib/i18n/server";
import { SubmitButton } from "@/components/ui/submit-button";
import { assignChannelToCompany } from "@/app/actions/channels";
import { EmptyState, Eyebrow, buttonStyles } from "@/components/ui/kit";
import { PlusIcon } from "@/components/icons";
import { tr } from "@/lib/i18n/messages";

export const metadata: Metadata = { title: "Channels" };

export default async function ChannelsPage({ searchParams }: PageProps<"/channels">) {
  await connection();
  const locale = await getLocale();
  const params = await searchParams;
  const companies = await listCompanies();
  const selectedCompany =
    typeof params.company === "string"
      ? companies.find((company) => company.id === params.company) ?? null
      : null;
  const filters = {
    platform: typeof params.platform === "string" ? params.platform : undefined,
    status: typeof params.status === "string" ? params.status : undefined,
    region: typeof params.region === "string" ? params.region : undefined,
    q: typeof params.q === "string" ? params.q : undefined,
    companyId: selectedCompany?.id,
  };

  const [channels, unassignedChannels] = await Promise.all([
    listChannels(filters),
    selectedCompany ? listChannels({ companyId: null }) : Promise.resolve([]),
  ]);
  const createHref = selectedCompany
    ? `/channels/new?company=${selectedCompany.id}`
    : "/channels/new";

  return (
    <div className="space-y-6 rise-in">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>
            {selectedCompany ? tr(locale, "Công ty AI") : tr(locale, "Hệ sinh thái")}
          </Eyebrow>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
            {selectedCompany
              ? `${tr(locale, "Kênh")} · ${selectedCompany.name}`
              : tr(locale, "Kênh")}
          </h1>
          <p className="mt-1 text-sm text-fog-500">
            {channels.length} {tr(locale, "kênh theo bộ lọc hiện tại")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCompany && (
            <Link href="/channels" className={buttonStyles("ghost", "sm")}>
              {tr(locale, "Tất cả kênh")}
            </Link>
          )}
          <Link href={createHref} className={buttonStyles("primary")}>
            <PlusIcon className="size-3.5" />
            {tr(locale, "Thêm kênh")}
          </Link>
        </div>
      </header>

      {selectedCompany && <CompanyNav company={selectedCompany}  locale={locale} />}

      <ChannelFilters locale={locale} />

      {channels.length === 0 ? (
        <EmptyState
          title={tr(locale, "Không tìm thấy kênh nào")}
          description={
            selectedCompany && unassignedChannels.length > 0
              ? `${unassignedChannels.length} ${tr(
                  locale,
                  "kênh cũ chưa được gán công ty. Mở mục bên dưới để gán, hoặc thêm kênh mới."
                )}`
              : tr(
                  locale,
                  "Thử xoá bộ lọc, hoặc thêm kênh mới vào hệ sinh thái."
                )
          }
          action={
            <Link href={createHref} className={buttonStyles("primary", "sm")}>
              {tr(locale, "Thêm kênh")}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              locale={locale}
            />
          ))}
        </div>
      )}

      {selectedCompany && unassignedChannels.length > 0 && (
        <details className="rounded-lg border border-ink-700 bg-ink-850 p-3">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-fog-500">
            {tr(locale, "Kênh chưa gán công ty")} ({unassignedChannels.length})
          </summary>
          <p className="mt-1 text-xs text-fog-600">
            {tr(
              locale,
              "Các kênh cũ chưa thuộc công ty nào. Gán nhanh vào"
            )}{" "}
            {selectedCompany.name}:
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {unassignedChannels.slice(0, 18).map((channel) => (
              <div
                key={channel.id}
                className="flex items-center justify-between gap-2 rounded-md border border-ink-700 bg-ink-900 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-fog-100">
                    {channel.name}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-fog-600">
                    {channel.platform} · {channel.region}
                  </p>
                </div>
                <form action={assignChannelToCompany}>
                  <input type="hidden" name="id" value={channel.id} />
                  <input
                    type="hidden"
                    name="company_id"
                    value={selectedCompany.id}
                  />
                  <SubmitButton
                    size="sm"
                    variant="secondary"
                    pendingText={tr(locale, "Đang gán…")}
                  >
                    {tr(locale, "Gán")}
                  </SubmitButton>
                </form>
              </div>
            ))}
          </div>
          {unassignedChannels.length > 18 && (
            <p className="mt-2 text-xs text-fog-600">
              {tr(locale, "Còn")} {unassignedChannels.length - 18}{" "}
              {tr(
                locale,
                "kênh — mở “Tất cả kênh” để xem đầy đủ."
              )}
            </p>
          )}
        </details>
      )}
    </div>
  );
}
