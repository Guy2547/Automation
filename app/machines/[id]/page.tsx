"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import StatusPill from "@/components/StatusPill";
import { listAlarms, listMachines, listMaintenance } from "@/lib/store";

export default function MachineHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [machine, setMachine] = useState(() => {
    try { return listMachines().find((m) => m.id === id) ?? null; } catch { return null; }
  });
  const [alarms, setAlarms] = useState(() => {
    try { return listAlarms().filter((a) => a.machine_id === id); } catch { return []; }
  });
  const [maint, setMaint] = useState(() => {
    try { return listMaintenance().filter((t) => t.machine_id === id); } catch { return []; }
  });

  useEffect(() => {
    try {
      setMachine(listMachines().find((m) => m.id === id) ?? null);
      setAlarms(listAlarms().filter((a) => a.machine_id === id));
      setMaint(listMaintenance().filter((t) => t.machine_id === id));
    } catch { /* ignore */ }
  }, [id]);

  return (
    <AppShell crumb="Machines" mascot="Full history of this machine — alarms and maintenance in one place.">
      <div className="mb-5">
        <Link href="/machines" className="text-[12.5px]" style={{ color: "var(--gold-soft)" }}>← Back to Machines</Link>
      </div>
      {!machine ? (
        <div className="card p-6 text-[13px]" style={{ color: "var(--ink-faint)" }}>Machine not found</div>
      ) : (
        <>
          <div className="hero rounded-2xl p-6 mb-6">
            <div className="text-[12px] mono" style={{ color: "var(--ink-soft)" }}>{machine.machine_id} · {machine.location}</div>
            <div className="text-[22px] font-bold mb-2">{machine.name}</div>
            <div className="flex gap-2 items-center">
              <StatusPill status={machine.status} />
              <span className="text-[12px]" style={{ color: "var(--ink-faint)" }}>{machine.type} · updated {machine.updated_at}</span>
            </div>
          </div>
          <div className="content-grid grid grid-cols-2 gap-6">
            <div className="card">
              <div className="px-5 py-4 border-b font-semibold text-[14.5px]" style={{ borderColor: "var(--line)" }}>Alarms ({alarms.length})</div>
              <table>
                <thead><tr><th>Code</th><th>Description</th><th>Status</th></tr></thead>
                <tbody>
                  {alarms.map((a) => <tr key={a.id}><td className="mono" style={{ color: "var(--alarm)" }}>{a.alarm_code}</td><td style={{ color: "var(--ink-soft)" }}>{a.description} · {a.occurred_at}</td><td><StatusPill status={a.status} /></td></tr>)}
                  {alarms.length === 0 && <tr><td colSpan={3} className="text-center" style={{ color: "var(--ink-faint)" }}>No alarms</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="card">
              <div className="px-5 py-4 border-b font-semibold text-[14.5px]" style={{ borderColor: "var(--line)" }}>Maintenance ({maint.length})</div>
              <table>
                <thead><tr><th>Date</th><th>Problem</th><th>Status</th></tr></thead>
                <tbody>
                  {maint.map((t) => <tr key={t.id}><td className="mono" style={{ color: "var(--ink-soft)" }}>{t.date}</td><td style={{ color: "var(--ink-soft)" }}>{t.problem} · {t.technician}</td><td><StatusPill status={t.status} /></td></tr>)}
                  {maint.length === 0 && <tr><td colSpan={3} className="text-center" style={{ color: "var(--ink-faint)" }}>No maintenance records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
