import Link from "next/link";
import { buttonStyles } from "@/components/ui/kit";

export const instant = false;

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-signal-500">
        404 · No signal
      </p>
      <h1 className="font-display text-2xl font-bold text-fog-100">
        This page does not exist
      </h1>
      <p className="max-w-sm text-sm text-fog-500">
        The link may have been deleted, or you do not have access.
      </p>
      <Link href="/dashboard" className={buttonStyles("primary")}>
        Back to dashboard
      </Link>
    </div>
  );
}
