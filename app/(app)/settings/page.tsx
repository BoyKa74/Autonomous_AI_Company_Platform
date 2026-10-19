import type { Metadata } from "next";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { ProfileForm } from "@/components/settings/profile-form";
import { Eyebrow, Panel, Tag } from "@/components/ui/kit";
import { SubmitButton } from "@/components/ui/submit-button";
import { LogoutIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Cài đặt" };

export default async function SettingsPage() {
  await connection();
  const me = await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6 rise-in">
      <header>
        <Eyebrow>Tài khoản</Eyebrow>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          Cài đặt
        </h1>
      </header>

      <Panel eyebrow="Hồ sơ" title="Thông tin cá nhân" bodyClassName="p-5">
        <ProfileForm
          defaultName={me.profile?.full_name ?? ""}
          email={me.email ?? ""}
        />
      </Panel>

      <Panel eyebrow="Quyền" title="Vai trò hệ thống">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-fog-500">
            {me.profile?.role === "admin"
              ? "Bạn là admin: quản lý người dùng và xem toàn bộ kênh."
              : "Vai trò user: quản lý kênh và nội dung của riêng bạn."}
          </p>
          <Tag
            className={
              me.profile?.role === "admin" ? "text-signal-400" : undefined
            }
          >
            {me.profile?.role ?? "user"}
          </Tag>
        </div>
      </Panel>

      <Panel eyebrow="Phiên" title="Đăng xuất">
        <form action={signOut}>
          <SubmitButton variant="danger" pendingText="Đang đăng xuất…">
            <LogoutIcon className="size-3.5" />
            Đăng xuất khỏi thiết bị này
          </SubmitButton>
        </form>
      </Panel>
    </div>
  );
}
