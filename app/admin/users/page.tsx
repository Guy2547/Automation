"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import type { Session } from "@/lib/store";
import { getSession } from "@/lib/store";

export default function UsersPage() {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    setSession(getSession());
  }, []);

  return (
    <AppShell crumb="Users" mascot="Admin only — manage roles carefully.">
      <div className="mb-5">
        <div className="text-[19px] font-bold">Users</div>
        <div className="text-[13px]" style={{ color: "var(--ink-soft)" }}>Admin only — จัดการ role ผ่าน Supabase Dashboard (Authentication → Users → profiles.role)</div>
      </div>
      <div className="card p-5 text-[13px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        <div className="mb-2">Signed in as <b style={{ color: "var(--ink)" }}>{session?.email}</b> (<b style={{ color: "var(--gold-soft)" }}>{session?.role}</b>)</div>
        <ol className="list-decimal ml-5">
          <li>Supabase Dashboard → Authentication → Users → Create user: <span className="mono">admin@test.com</span> / <span className="mono">technician@test.com</span> (ตั้งรหัสที่นั่น — เก็บแบบ hash อัตโนมัติ)</li>
          <li>SQL Editor → รัน <span className="mono">supabase/schema.sql</span> แล้ว <span className="mono">supabase/seed.sql</span> (แก้ UUID ให้ตรง user จริง)</li>
          <li>Table Editor → <span className="mono">profiles</span> → ตั้ง <span className="mono">role = admin / technician</span></li>
        </ol>
      </div>
    </AppShell>
  );
}
