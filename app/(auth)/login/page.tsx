import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Panel } from "@/components/ui/kit";

export const metadata: Metadata = { title: "Sign in" };
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <Panel
      eyebrow="Authentication"
      title="Sign in to the control plane"
      bodyClassName="p-5"
    >
      <LoginForm next={next} />
      <p className="mt-5 border-t border-ink-700 pt-4 text-sm text-fog-500">
        No account yet?{" "}
        <Link
          href="/register"
          className="font-medium text-signal-500 hover:text-signal-400"
        >
          Create an account
        </Link>
      </p>
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-4 rounded-md border border-ink-700 bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-fog-500">
          <p className="mb-1 text-[9px] uppercase tracking-[0.14em] text-fog-600">
            Dev demo account
          </p>
          <p>Email: dev-demo@vicaffiliate.com</p>
          <p>Password: VicDevDemo!2026#K7Q</p>
          <p className="mt-1 text-[10px] text-fog-600">
            Admin of the demo workspace only — no access to real data.
          </p>
        </div>
      )}
    </Panel>
  );
}
