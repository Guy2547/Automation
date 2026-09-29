"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getSession, hasPermission, logout, withPermissions, type Session } from "@/lib/store";
import { logActivity } from "@/lib/activity";

const monitor = [
  { href: "/dashboard", key: "dashboard", icon: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></> },
  { href: "/machines", key: "machines", icon: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h6v6H9z" /></> },
  { href: "/alarms", key: "alarms", icon: <><path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" /></> },
];
const manage = [
  { href: "/maintenance", key: "maintenance", icon: <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" /> },
  { href: "/reports", key: "reports", icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></> },
];

export default function Sidebar({ openCount = 0 }: { openCount?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("nav");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    const raw = getSession();
    setSession(raw ? withPermissions(raw) : null);
  }, [pathname]);

  const item = (href: string, label: string, icon: React.ReactNode) => {
    const active = pathname === href || (href === "/dashboard" && pathname === "/");
    return (
      <Link
        key={href}
        href={href}
        className={`nav-item${active ? " active" : ""}`}
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">{icon}</svg>
        {label}
        {href === "/alarms" && openCount > 0 && (
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--alarm)", color: "#1B0604" }}>
            {openCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="sidebar w-60 flex-shrink-0 flex flex-col py-5 px-3">
      <div className="flex items-center gap-2.5 px-3 mb-9">
        <div className="brand-mark">A</div>
        <div className="leading-tight">
          <div className="text-white font-bold text-[13.5px]">Alarm &amp; Maintenance</div>
          <div className="text-[10.5px] mono" style={{ color: "var(--ink-faint)" }}>MANAGEMENT SYSTEM</div>
        </div>
      </div>

      <div className="nav-section-label">{t("monitor")}</div>
      <nav className="flex flex-col gap-1.5 px-1 mb-6">
        {monitor.map((m) => item(m.href, t(m.key), m.icon))}
      </nav>

      <div className="nav-section-label">{t("manage")}</div>
      <nav className="flex flex-col gap-1.5 px-1">
        {manage.map((m) => item(m.href, t(m.key), m.icon))}
        {session && hasPermission(session, "users.manage") && item("/admin/users", t("users"), <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>)}
        {session && hasPermission(session, "users.manage") && item("/admin/activity", t("activity"), <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>)}
        {session && hasPermission(session, "roles.manage") && item("/admin/roles", t("roles"), <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" /></>)}
      </nav>

      <div className="mt-auto px-3 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold" style={{ background: "linear-gradient(135deg,#2C4A38,#16261D)", color: "var(--gold-soft)" }}>
            {(session?.name ?? "G").slice(0, 1).toUpperCase()}
          </div>
          <div className="leading-tight flex-1">
            <div className="text-white text-[13px] font-medium">{session?.name ?? t("guest")}</div>
            <div className="text-[11px] capitalize" style={{ color: "var(--ink-faint)" }}>{session?.role ?? "—"}</div>
          </div>
          <button
            className="text-[11px] px-2 py-1 rounded-md btn-ghost"
            onClick={async () => { void logActivity("logout"); await logout(); router.push("/login"); }}
          >{t("logout")}</button>
        </div>
      </div>
    </aside>
  );
}
