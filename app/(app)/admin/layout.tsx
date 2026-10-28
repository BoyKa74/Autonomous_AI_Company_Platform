import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { Eyebrow } from "@/components/ui/kit";
import { getLocale } from "@/lib/i18n/server";
import { tr } from "@/lib/i18n/messages";

export const metadata: Metadata = { title: "Admin" };
export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const locale = await getLocale();
  await requireAdmin();

  return (
    <div className="space-y-6 rise-in">
      <header className="border-b border-ink-700 pb-4">
        <Eyebrow className="text-signal-500">
          {tr(locale, "Khu vực quản trị")}
        </Eyebrow>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          Admin console
        </h1>
      </header>
      {children}
    </div>
  );
}
