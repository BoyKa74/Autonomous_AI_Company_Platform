import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { Panel } from "@/components/ui/kit";

export const metadata: Metadata = { title: "Đăng nhập" };
export const instant = false;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <Panel
      eyebrow="Xác thực"
      title="Đăng nhập phòng điều khiển"
      bodyClassName="p-5"
    >
      <LoginForm next={next} />
      <p className="mt-5 border-t border-ink-700 pt-4 text-sm text-fog-500">
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="font-medium text-signal-500 hover:text-signal-400"
        >
          Tạo tài khoản
        </Link>
      </p>
    </Panel>
  );
}
