"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/actions/locale";
import { t, type Locale } from "@/lib/i18n/messages";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const [pending, startTransition] = useTransition();
  const options: { value: Locale; label: string }[] = [
    { value: "en", label: t(locale, "settings.english") },
    { value: "vi", label: t(locale, "settings.vietnamese") },
  ];

  const choose = (value: Locale) => {
    startTransition(async () => {
      await setLocale(value);
      window.location.reload();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={pending || locale === option.value}
          onClick={() => choose(option.value)}
          className={
            locale === option.value
              ? "rounded-md border border-signal-500/60 bg-signal-500/10 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-signal-500"
              : "rounded-md border border-ink-600 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-fog-500 transition-colors hover:bg-ink-800 hover:text-fog-100 disabled:opacity-50"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
