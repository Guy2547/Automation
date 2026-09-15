"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Mascot from "./Mascot";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { getSession, hasPermission, listAlarms, withPermissions, type Session } from "@/lib/store";

const mascotMsgs: Record<string, string> = {
  dashboard: "3 alarms need a look today — Conveyor 05 first!",
  machines: "5 machines total — check the Alarm unit first.",
  alarms: "Conveyor Belt 05 has been open the longest.",
  maintenance: "1 job waiting for part — bearing is on order.",
  reports: "CNC Router 11 had the most alarms this week.",
  users: "Admin only — manage roles carefully.",
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
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen app-shell">
      <Sidebar openCount={openCount} />
      <main className="flex-1 min-w-0">
        <Topbar crumb={crumb} />
        <div className="main-pad px-8 py-7">
          <section className="page">{children}</section>
        </div>
      </main>
      <Mascot message={mascot ?? mascotMsgs[crumb.toLowerCase()] ?? mascotMsgs.dashboard} />
    </div>
  );
}
