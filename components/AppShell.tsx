"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Mascot from "./Mascot";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getSession, hasPermission, listAlarms, withPermissions, type Session } from "@/lib/store";

const mascotKeys: Record<string, string> = {
  dashboard: "dashboard",
  machines: "machines",
  alarms: "alarms",
  maintenance: "maintenance",
  reports: "reports",
  users: "users",
  roles: "roles",
  activity: "activity",
};

export default function AppShell({
  crumb,
  mascot,
  children,
}: {
  crumb: string;
  mascot?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const tMascot = useTranslations("mascot");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    const raw = getSession();
    if (!raw) {
      router.replace("/login");
      return;
    }
    const s = withPermissions(raw);
    if (crumb === "Users" && !hasPermission(s, "users.manage")) {
      router.replace("/dashboard");
      return;
    }
    if (crumb === "Activity" && !hasPermission(s, "users.manage")) {
      router.replace("/dashboard");
      return;
    }
    if (crumb === "Roles" && !hasPermission(s, "roles.manage")) {
      router.replace("/dashboard");
      return;
    }
    setSession(s);
    try {
      setOpenCount(listAlarms().filter((a) => a.status === "Open").length);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, [router, crumb]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[13px]" style={{ color: "var(--ink-faint)" }}>
        {tCommon("loading")}
      </div>
    );
  }

  const key = mascotKeys[crumb.toLowerCase()] ?? "dashboard";
  let mascotMsg: string;
  try {
    mascotMsg = tMascot(key);
  } catch {
    mascotMsg = key;
  }
  if (mascot) {
    // `mascot` may be a message key (e.g. "history") or a literal message.
    try {
      mascotMsg = tMascot(mascot);
    } catch {
      mascotMsg = mascot;
    }
  }
  const navKey = key === "history" ? "machines" : key;
  let crumbLabel = crumb;
  try {
    crumbLabel = tNav(navKey);
  } catch {
    crumbLabel = crumb;
  }

  return (
    <div className="flex min-h-screen app-shell">
      <Sidebar openCount={openCount} />
      <main className="flex-1 min-w-0">
        <Topbar crumb={crumbLabel} />
        <div className="main-pad px-8 py-7">
          <section className="page">{children}</section>
        </div>
      </main>
      <Mascot message={mascotMsg} />
    </div>
  );
}
