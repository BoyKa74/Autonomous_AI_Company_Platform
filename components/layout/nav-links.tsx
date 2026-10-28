"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookIcon,
  BroadcastIcon,
  BuildingIcon,
  GaugeIcon,
  PlugIcon,
  ShieldIcon,
  SlidersIcon,
  WalletIcon,
  SparkIcon,
  UsersIcon,
  type IconProps,
} from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  icon: (props: IconProps) => React.ReactElement;
  adminOnly?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Bảng điều khiển", icon: GaugeIcon },
  { href: "/channels", label: "Kênh", icon: BroadcastIcon },
  { href: "/company", label: "Công ty AI", icon: BuildingIcon },
  { href: "/knowledge", label: "Tri thức", icon: BookIcon },
  { href: "/revenue", label: "Doanh thu", icon: WalletIcon },
  { href: "/connections", label: "Kết nối kênh", icon: PlugIcon },
  { href: "/ai", label: "AI Studio", icon: SparkIcon },
  { href: "/settings", label: "Cài đặt", icon: SlidersIcon },
];

const ADMIN_ITEMS: NavItem[] = [
  { href: "/admin", label: "Tổng quan hệ thống", icon: ShieldIcon },
  { href: "/admin/users", label: "Người dùng", icon: UsersIcon },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLinks({
  isAdmin,
  orientation = "vertical",
}: {
  isAdmin: boolean;
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
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
        const active = isActive(pathname, item.href);
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
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
