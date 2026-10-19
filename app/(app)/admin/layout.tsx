import type { Metadata } from "next";
import { connection } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { Eyebrow } from "@/components/ui/kit";

export const metadata: Metadata = { title: "Admin" };
export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  await requireAdmin();

  return (
    <div className="space-y-6 rise-in">
      <header className="border-b border-ink-700 pb-4">
        <Eyebrow className="text-signal-500">Khu vực quản trị</Eyebrow>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          Admin console
        </h1>
      </header>
      {children}
    </div>
  );
}
