"use client";

import { NextIntlClientProvider } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import en from "@/messages/en.json";
import th from "@/messages/th.json";

export type Locale = "th" | "en";

export const LOCALES: Locale[] = ["th", "en"];
export const DEFAULT_LOCALE: Locale = "th";
const STORAGE_KEY = "amms.locale";
const COOKIE_KEY = "NEXT_LOCALE";

const MESSAGES: Record<Locale, Record<string, unknown>> = {
  th: th as unknown as Record<string, unknown>,
  en: en as unknown as Record<string, unknown>,
};

function readStored(): Locale {
  try {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    const ls = localStorage.getItem(STORAGE_KEY);
    if (ls === "en" || ls === "th") return ls;
    const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(th|en)/);
    if (m) return m[1] as Locale;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

const LocaleCtx = createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

export function useAppLocale() {
  return useContext(LocaleCtx);
}

export default function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Lazy init reads localStorage/cookie — no effect needed, no hydration
  // mismatch beyond the first paint (default 'th' matches <html lang="th">).
  const [locale, setLocaleState] = useState<Locale>(readStored);

  useEffect(() => {
    document.documentElement.lang = locale === "th" ? "th" : "en";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      document.cookie = `${COOKIE_KEY}=${l}; path=/; max-age=31536000`;
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <LocaleCtx.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider
        locale={locale}
        messages={MESSAGES[locale]}
        timeZone="Asia/Bangkok"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleCtx.Provider>
  );
}
