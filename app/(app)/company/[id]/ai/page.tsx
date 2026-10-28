import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getCompany, listChannels } from "@/lib/data";
import { listProviderStatus, TASK_LABELS } from "@/lib/ai/router";
import { AiStudio } from "@/components/ai/ai-studio";
import { CompanyNav } from "@/components/company/company-nav";
import { Eyebrow } from "@/components/ui/kit";
import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";

export const metadata: Metadata = { title: "AI Studio" };

export default async function CompanyAiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ channel?: string }>;
}) {
  await connection();
  const { id } = await params;
  const query = await searchParams;
  const company = await getCompany(id);
  if (!company) notFound();

  const locale = await getLocale();
  const channels = await listChannels({ companyId: id });
  const defaultChannelId = channels.some(
    (channel) => channel.id === query.channel
  )
    ? query.channel
    : undefined;
  const providers = listProviderStatus();
  const taskOptions = Object.entries(TASK_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="space-y-6 rise-in">
      <header>
        <Eyebrow>AI Studio</Eyebrow>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          {tr(locale, "AI Studio của công ty")} · {company.name}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-fog-500">
          {tr(
            locale,
            "Không gian AI dùng kênh và ngữ cảnh của công ty này."
          )}
        </p>
      </header>

      <CompanyNav company={company} locale={locale} />

      <AiStudio
        channels={channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
          platform: channel.platform,
        }))}
        providers={providers}
        taskOptions={taskOptions}
        defaultChannelId={defaultChannelId}
        locale={locale}
      />
    </div>
  );
}
