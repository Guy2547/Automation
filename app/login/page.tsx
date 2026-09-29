"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import TFormError from "@/components/TFormError";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { login } from "@/lib/store";
import { logActivity } from "@/lib/activity";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("login");
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("admin1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const s = await login(email, password);
      void logActivity("login", s.email);
      router.push(s.role === "admin" ? "/dashboard" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loginFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="modal-box" style={{ width: 400 }}>
        <div className="flex items-center gap-2.5 mb-6">
          <div className="brand-mark">A</div>
          <div className="leading-tight">
            <div className="text-white font-bold text-[14px]">Alarm &amp; Maintenance</div>
            <div className="text-[10.5px] mono" style={{ color: "var(--ink-faint)" }}>MANAGEMENT SYSTEM</div>
          </div>
          <div className="ml-auto">
            <LanguageSwitcher compact />
          </div>
        </div>
        <h1 className="font-bold text-[18px] mb-1">{t("title")}</h1>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--ink-soft)" }}>
          {t("subtitle")}
        </p>
        <form onSubmit={submit}>
          <TFormError error={error} />
          <div className="field">
            <label>{t("email")}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@test.com" autoComplete="email" />
          </div>
          <div className="field">
            <label>{t("password")}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" />
          </div>
          <button className="btn-primary text-[13px] px-3 py-2.5 rounded-lg w-full mt-2" disabled={busy}>
            {busy ? t("signingIn") : t("loginBtn")}
          </button>
        </form>
        <div className="text-[11.5px] mt-4 leading-relaxed" style={{ color: "var(--ink-faint)" }}>
          {t("demo")} <span className="mono">admin@test.com / admin1234</span> {t("adminSuffix")} · <span className="mono">technician@test.com / technician1234</span> {t("techSuffix")}
        </div>
        <div className="text-[11px] mt-3 leading-relaxed" style={{ color: "var(--ink-faint)" }}>
          {t("authors")}
        </div>
      </div>
    </div>
  );
}
