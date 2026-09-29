"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import AppShell from "@/components/AppShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import { fetchActivity, type ActivityEvent } from "@/lib/activity";
import { isSupabaseConfigured } from "@/lib/supabase/client";

/** "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/131..." -> "Chrome · Windows" */
function shortUA(ua: string): string {
  if (!ua) return "—";
  const b =
    /Edg\/([\d.]+)/.exec(ua) ? "Edge" :
    /Chrome\/([\d.]+)/.exec(ua) ? "Chrome" :
    /Firefox\/([\d.]+)/.exec(ua) ? "Firefox" :
    /Safari\/([\d.]+)/.exec(ua) ? "Safari" : "?";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${b} · ${os}` : b;
}

const ACTION_GROUPS = ["login", "logout", "machine", "alarm", "maintenance", "user", "role"];

export default function ActivityPage() {
  const t = useTranslations("activity");
  const [rows, setRows] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const connected = isSupabaseConfigured();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setRows(await fetchActivity());
      } catch (e) {
        setError(e instanceof Error ? e.message : t("loadFailed"));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const hitQ =
          !q ||
          `${r.email} ${r.action} ${r.detail} ${r.ip}`.toLowerCase().includes(q.toLowerCase());
        const hitG = !group || r.action === group || r.action.startsWith(`${group}.`);
        return hitQ && hitG;
      }),
    [rows, q, group]
  );

  const logins = rows.filter((r) => r.action === "login").length;
  const crud = rows.filter((r) => !["login", "logout"].includes(r.action)).length;

  return (
    <AppShell crumb="Activity" mascot="activity">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[19px] font-bold">{t("title")}</div>
          <div className="text-[13px]" style={{ color: "var(--ink-soft)" }}>{t("subtitle")}</div>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton filename="activity.csv" rows={filtered} />
        </div>
      </div>

      {!connected && (
        <div className="card p-4 mb-5 text-[12.5px]" style={{ color: "var(--ink-soft)" }}>
          {t("demoHint")}
        </div>
      )}
      <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>{t("totalEvents")}</div><div className="text-[26px] font-bold">{loading ? "…" : rows.length}</div></div>
            <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>{t("logins")}</div><div className="text-[26px] font-bold" style={{ color: "var(--ok)" }}>{loading ? "…" : logins}</div></div>
            <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>{t("crud")}</div><div className="text-[26px] font-bold" style={{ color: "var(--gold-soft)" }}>{loading ? "…" : crud}</div></div>
          </div>

          {error && <div className="text-[12.5px] font-medium px-3 py-2 rounded-lg mb-4" style={{ background: "var(--alarm-bg)", color: "var(--alarm)" }}>{error}</div>}

          <div className="card">
            <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--line)" }}>
              <input placeholder={t("searchPh")} className="text-[12.5px] px-3.5 py-2 rounded-lg flex-1" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="text-[12.5px] px-2.5 py-2 rounded-lg" value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="">{t("allActions")}</option>
                {ACTION_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>{t("thTime")}</th><th>{t("thUser")}</th><th>{t("thAction")}</th><th>{t("thDetail")}</th><th>{t("thIp")}</th><th>{t("thBrowser")}</th></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td className="mono whitespace-nowrap" style={{ color: "var(--ink-soft)" }}>
                      {new Date(r.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}
                    </td>
                    <td>
                      <div className="font-medium">{r.email}</div>
                      <div className="text-[11px] capitalize" style={{ color: "var(--ink-faint)" }}>{r.role || "—"}</div>
                    </td>
                    <td><span className="pill mono" style={{ background: "var(--gold-bg)", color: "var(--gold-soft)" }}>{r.action}</span></td>
                    <td style={{ color: "var(--ink-soft)" }}>{r.detail || "—"}</td>
                    <td className="mono" style={{ color: "var(--ink-soft)" }}>{r.ip || "—"}</td>
                    <td style={{ color: "var(--ink-soft)" }}>{shortUA(r.user_agent)}</td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && <tr><td colSpan={6} className="text-center" style={{ color: "var(--ink-faint)" }}>{t("noFound")}</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
        </>
    </AppShell>
  );
}
