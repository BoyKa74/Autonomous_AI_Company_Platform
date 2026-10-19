import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { NavLinks } from "@/components/layout/nav-links";
import { SubmitButton } from "@/components/ui/submit-button";
import { LogoutIcon } from "@/components/icons";
import { Eyebrow, Tag } from "@/components/ui/kit";
import type { Profile } from "@/types/database";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="relative flex size-7 items-center justify-center rounded-md border border-ink-600 bg-ink-800">
        <span className="font-display text-[11px] font-bold tracking-tight text-signal-500">
          VIC
        </span>
        <span
          aria-hidden
          className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-signal-500"
          style={{ boxShadow: "0 0 6px #f0a63c" }}
        />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-sm font-bold tracking-tight text-fog-100">
            Affiliate
          </span>
          <span className="mt-0.5 block font-mono text-[9px] uppercase tracking-[0.22em] text-fog-600">
            Console
          </span>
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ profile }: { profile: Profile | null }) {
  const isAdmin = profile?.role === "admin";

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-ink-700 bg-ink-950 px-3 py-4 md:flex">
      <div className="px-2">
        <Brand />
      </div>

      <div className="mt-8 flex-1">
        <Eyebrow className="mb-2 px-2.5">Điều hướng</Eyebrow>
        <NavLinks isAdmin={isAdmin} />
      </div>

      <div className="border-t border-ink-700 px-2 pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-fog-300" title={profile?.email ?? ""}>
            {profile?.full_name || profile?.email || "Người dùng"}
          </p>
          {isAdmin && <Tag className="text-signal-400">Admin</Tag>}
        </div>
        <form action={signOut}>
          <SubmitButton
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            pendingText="Đang đăng xuất…"
          >
            <LogoutIcon className="size-3.5" />
            Đăng xuất
          </SubmitButton>
        </form>
      </div>
    </aside>
  );
}
