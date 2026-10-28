"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tr, type Locale } from "@/lib/i18n/messages";
import type { Company } from "@/types/database";

export function CompanyNav({
  company,
  locale,
}: {
  company: Pick<Company, "id" | "name">;
  locale: Locale;
}) {
  const pathname = usePathname();
  const tabs = [
    { href: `/company/${company.id}`, label: "Tổng quan", key: "overview" },
    { href: `/company/${company.id}#workspace-tree`, label: "Agents", key: "agents" },
    { href: `/company/${company.id}#tasks`, label: "Nhiệm vụ", key: "tasks" },
    { href: `/company/${company.id}/ai`, label: "AI Studio", key: "ai" },
    { href: `/knowledge?company=${company.id}`, label: "Tri thức", key: "knowledge" },
    { href: `/channels?company=${company.id}`, label: "Kênh", key: "channels" },
    {
      href: `/connections?company=${company.id}`,
      label: "Kết nối",
      key: "connections",
    },
    { href: `/revenue?company=${company.id}`, label: "Doanh thu", key: "revenue" },
    { href: `/company/${company.id}#settings`, label: "Cấu hình", key: "settings" },
  ];

  const activeKey =
    pathname === `/company/${company.id}`
      ? "overview"
      : pathname === `/company/${company.id}/ai`
        ? "ai"
        : pathname === "/knowledge" || pathname.startsWith("/knowledge/")
          ? "knowledge"
        : pathname === "/channels" || pathname.startsWith("/channels/")
          ? "channels"
          : pathname === "/connections"
            ? "connections"
            : pathname === "/revenue"
              ? "revenue"
              : null;

  return (
    <nav className="flex flex-wrap items-center gap-1 rounded-lg border border-ink-700 bg-ink-850 p-1.5">
      <span className="mr-1 hidden px-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-fog-600 sm:inline">
        {company.name}
      </span>
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={
            activeKey === tab.key
              ? "rounded-md bg-signal-500/10 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-500"
              : "rounded-md px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-100"
          }
        >
          {tr(locale, tab.label)}
        </Link>
      ))}
    </nav>
  );
}
