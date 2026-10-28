import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";

export default async function AppLoading() {
  const locale = await getLocale();
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label={tr(locale, "Đang tải")}
    >
      <div className="h-8 w-56 animate-pulse rounded-md bg-ink-800" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-lg border border-ink-700 bg-ink-850"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="h-64 animate-pulse rounded-lg border border-ink-700 bg-ink-850" />
        <div className="h-64 animate-pulse rounded-lg border border-ink-700 bg-ink-850" />
      </div>
    </div>
  );
}
