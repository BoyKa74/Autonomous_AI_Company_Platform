"use client";

import { createContext, useContext, type ReactNode } from "react";
import { t, tr, type Locale } from "@/lib/i18n/messages";

const LocaleContext = createContext<Locale>("vi");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useI18n() {
  const locale = useContext(LocaleContext);
  return {
    locale,
    t: (key: string) => t(locale, key),
    tr: (text: string) => tr(locale, text),
  };
}
