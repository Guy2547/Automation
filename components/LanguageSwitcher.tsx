"use client";

import { useLocale } from "next-intl";
import { useAppLocale, type Locale } from "./LocaleProvider";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const active = useLocale() as Locale;
  const { setLocale } = useAppLocale();

  const btn = (l: Locale, label: string) => (
    <button
      key={l}
      onClick={() => setLocale(l)}
      aria-pressed={active === l}
      title={l === "th" ? "ภาษาไทย" : "English"}
      className="text-[11.5px] font-bold px-2 py-1 rounded-md"
      style={
        active === l
          ? { background: "linear-gradient(135deg, var(--gold-soft), #d69a2e)", color: "#1b1204" }
          : { background: "transparent", color: "var(--ink-faint)", cursor: "pointer" }
      }
    >
      {label}
    </button>
  );

  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-lg"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--line)" }}
      role="group"
      aria-label="Language / ภาษา"
    >
      {btn("th", compact ? "TH" : "ไทย")}
      {btn("en", compact ? "EN" : "EN")}
    </div>
  );
}
