import type { Metadata } from "next";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { signOut } from "@/app/actions/auth";
import { ProfileForm } from "@/components/settings/profile-form";
import { Eyebrow, Panel, Tag } from "@/components/ui/kit";
import { SubmitButton } from "@/components/ui/submit-button";
import { LogoutIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await connection();
  const me = await requireUser();
  const locale = await getLocale();

  return (
    <div className="mx-auto max-w-2xl space-y-6 rise-in">
      <header>
        <Eyebrow>{t(locale, "settings.account")}</Eyebrow>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-fog-100">
          {t(locale, "settings.title")}
        </h1>
      </header>

      <Panel
        eyebrow={t(locale, "settings.profile")}
        title={t(locale, "settings.personalInfo")}
        bodyClassName="p-5"
      >
        <ProfileForm
          defaultName={me.profile?.full_name ?? ""}
          email={me.email ?? ""}
          locale={locale}
        />
      </Panel>

      <Panel
        eyebrow={t(locale, "settings.language")}
        title={t(locale, "settings.language")}
        bodyClassName="p-5"
      >
        <p className="mb-3 text-sm text-fog-500">
          {t(locale, "settings.languageHint")}
        </p>
        <LanguageSwitcher locale={locale} />
      </Panel>

      <Panel
        eyebrow={t(locale, "settings.role")}
        title={t(locale, "settings.systemRole")}
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-fog-500">
            {me.profile?.role === "super_admin"
              ? t(locale, "settings.roleSuper")
              : me.profile?.role === "admin"
                ? t(locale, "settings.roleAdmin")
                : t(locale, "settings.roleUser")}
          </p>
          <Tag
            className={
              me.profile?.role === "admin" || me.profile?.role === "super_admin"
                ? "text-signal-400"
                : undefined
            }
          >
            {me.profile?.role ?? "user"}
          </Tag>
        </div>
      </Panel>

      <Panel
        eyebrow={t(locale, "settings.session")}
        title={t(locale, "settings.signOut")}
      >
        <form action={signOut}>
          <SubmitButton
            variant="danger"
            pendingText={t(locale, "nav.signOut") + "…"}
          >
            <LogoutIcon className="size-3.5" />
            {t(locale, "settings.signOutDevice")}
          </SubmitButton>
        </form>
      </Panel>
    </div>
  );
}
