"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { t, type Locale } from "@/lib/i18n/messages";
import {
  BookIcon,
  BuildingIcon,
  GaugeIcon,
  ShieldIcon,
  SlidersIcon,
  UsersIcon,
  type IconProps,
} from "@/components/icons";

type NavItem = {
  href: string;
  labelKey: string;
  icon: (props: IconProps) => React.ReactElement;
  adminOnly?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: GaugeIcon },
  { href: "/company", labelKey: "nav.company", icon: BuildingIcon },
  { href: "/knowledge", labelKey: "nav.sharedKnowledge", icon: BookIcon },
  { href: "/settings", labelKey: "nav.settings", icon: SlidersIcon },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin", labelKey: "nav.adminOverview", icon: ShieldIcon },
  { href: "/admin/users", labelKey: "nav.adminUsers", icon: UsersIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({
  isAdmin,
  locale,
  orientation = "vertical",
}: {
  isAdmin: boolean;
  locale: Locale;
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const items = isAdmin ? [...ITEMS, ...ADMIN_ITEMS] : ITEMS;

  return (
    <nav
      className={cn(
        "flex gap-1",
        orientation === "vertical"
          ? "flex-col"
          : "flex-row items-center overflow-x-auto"
      )}
    >
      {items.map((item) => {
        const active =
          isActive(pathname, item.href) &&
          !(item.href === "/knowledge" && searchParams.get("company"));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
              orientation === "horizontal" && "shrink-0 px-2 py-1.5",
              active
                ? "bg-ink-700 font-semibold text-fog-100"
                : "text-fog-300 hover:bg-ink-800 hover:text-fog-100",
              active && item.href.startsWith("/admin") && "text-signal-400"
            )}
          >
            <Icon
              className={cn(
                "shrink-0",
                active ? "text-signal-500" : "text-fog-600"
              )}
            />
            <span className={cn(orientation === "horizontal" && "text-xs")}>
              {t(locale, item.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
