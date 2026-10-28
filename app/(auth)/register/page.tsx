import Link from "next/link";
import type { Metadata } from "next";
import { RegisterForm } from "./register-form";
import { Panel } from "@/components/ui/kit";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <Panel
      eyebrow="Authentication"
      title="Create an operator account"
      bodyClassName="p-5"
    >
      <RegisterForm />
      <p className="mt-5 border-t border-ink-700 pt-4 text-sm text-fog-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-signal-500 hover:text-signal-400"
        >
          Sign in
        </Link>
      </p>
    </Panel>
  );
}
