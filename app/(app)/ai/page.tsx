import type { Metadata } from "next";
import { connection } from "next/server";
import { listChannels, listMediaJobs } from "@/lib/data";
import { listProviderStatus, TASK_LABELS } from "@/lib/ai/router";
import { AiStudio } from "@/components/ai/ai-studio";
import { MediaPanel } from "@/components/media/media-panel";
import { Eyebrow } from "@/components/ui/kit";
import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";

export const metadata: Metadata = { title: "AI Studio" };

export default async function AiPage({ searchParams }: PageProps<"/ai">) {
  await connection();
  const locale = await getLocale();
  const params = await searchParams;
  const defaultChannelId =
    typeof params.channel === "string" ? params.channel : undefined;

  const [channels, mediaJobs] = await Promise.all([
    listChannels({}),
    listMediaJobs(8),
  ]);
  const providers = listProviderStatus();
  const taskOptions = Object.entries(TASK_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  return (
    <div className="space-y-8 rise-in">
      <header>
        <Eyebrow>AI Studio</Eyebrow>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          {tr(locale, "Giao việc cho AI")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-fog-500">
          {tr(
            locale,
            "Một cửa để viết kịch bản, chương sách, caption và chiến lược kênh. Router tự chọn provider mạnh nhất cho từng loại việc và chuyển sang provider khác nếu lỗi."
          )}
        </p>
      </header>

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

      <section className="space-y-3 border-t border-ink-700 pt-8">
        <div>
          <Eyebrow>{tr(locale, "Xưởng media")}</Eyebrow>
          <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-fog-100">
            {tr(locale, "Tạo nhạc & giọng đọc trên máy chạy")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-fog-500">
            {tr(
              locale,
              "Job được xếp hàng tại đây và do worker trên máy Windows xử lý bằng ACE-Step (nhạc) và VieNeu-TTS (giọng Việt). Kết quả lưu vào kho media trên cloud."
            )}
          </p>
        </div>
        <MediaPanel
          jobs={mediaJobs}
          channels={channels.map((channel) => ({
            id: channel.id,
            name: channel.name,
          }))}
          locale={locale}
        />
      </section>
    </div>
  );
}

