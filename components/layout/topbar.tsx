import { Brand } from "@/components/layout/sidebar";
import { NavLinks } from "@/components/layout/nav-links";
import { signOut } from "@/app/actions/auth";
import { SubmitButton } from "@/components/ui/submit-button";
import { LogoutIcon } from "@/components/icons";
import type { Profile } from "@/types/database";

export function Topbar({ profile }: { profile: Profile | null }) {
  const isAdmin = profile?.role === "admin";

  return (
    <header className="sticky top-0 z-20 border-b border-ink-700 bg-ink-900/85 backdrop-blur md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Brand compact />
        <div className="flex items-center gap-2">
          <p className="max-w-40 truncate text-xs text-fog-500">
            {profile?.full_name || profile?.email}
          </p>
          <form action={signOut}>
            <SubmitButton
              variant="ghost"
              size="sm"
              className="px-1.5"
              pendingText="…"
            >
              <LogoutIcon className="size-3.5" />
            </SubmitButton>
          </form>
        </div>
      </div>
      <div className="border-t border-ink-700 px-3 py-1.5">
        <NavLinks isAdmin={isAdmin} orientation="horizontal" />
      </div>
    </header>
  );
}
