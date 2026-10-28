import { connection } from "next/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const me = await requireUser();
  const locale = await getLocale();

  return (
    <div className="md:grid md:min-h-dvh md:grid-cols-[230px_1fr]">
        <Sidebar profile={me.profile} locale={locale} />
        <div className="flex min-w-0 flex-col">
          <Topbar profile={me.profile} locale={locale} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
          <footer className="px-4 pb-6 md:px-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog-600">
              VIC Affiliate · {t(locale, "shell.tagline")}
            </p>
          </footer>
        </div>
      </div>
  );
}
