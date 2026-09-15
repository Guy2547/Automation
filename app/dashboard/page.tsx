"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import StatusPill from "@/components/StatusPill";
import { getSession, hasPermission, listAlarms, listMachines, listMaintenance, withPermissions, type Session } from "@/lib/store";

export default function DashboardPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [machines, setMachines] = useState(listMachinesSafe);
  const [alarms, setAlarms] = useState(listAlarmsSafe);
  const [maint, setMaint] = useState(listMaintSafe);

  function listMachinesSafe() {
    try { return listMachines(); } catch { return []; }
  }
  function listAlarmsSafe() {
    try { return listAlarms(); } catch { return []; }
  }
  function listMaintSafe() {
    try { return listMaintenance(); } catch { return []; }
  }

  useEffect(() => {
    const raw = getSession();
    setSession(raw ? withPermissions(raw) : null);
    setMachines(listMachinesSafe());
    setAlarms(listAlarmsSafe());
    setMaint(listMaintSafe());
  }, []);

  const running = machines.filter((m) => m.status === "Running").length;
  const stop = machines.filter((m) => m.status === "Stop").length;
  const alarmN = machines.filter((m) => m.status === "Alarm").length;
  const maintN = machines.filter((m) => m.status === "Maintenance").length;
  const uptime = machines.length === 0 ? 100 : Math.round(((running + stop) / machines.length) * 100);
  const openAlarms = alarms.filter((a) => a.status === "Open");

  return (
    <AppShell crumb="Dashboard">
      {/* HERO */}
      <div className="hero rounded-2xl p-7 mb-6 flex items-center gap-10">
        <div className="flex-shrink-0 relative" style={{ width: 132, height: 132 }}>
          <svg width="132" height="132" viewBox="0 0 132 132">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3FD68E" />
                <stop offset="100%" stopColor="#F0BD4B" />
              </linearGradient>
            </defs>
            <circle cx="66" cy="66" r="56" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
            <circle cx="66" cy="66" r="56" fill="none" stroke="url(#gaugeGrad)" strokeWidth="10"
              strokeLinecap="round" strokeDasharray="351.9" strokeDashoffset={351.9 - (351.9 * uptime) / 100}
              transform="rotate(-90 66 66)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[26px] font-extrabold leading-none">{uptime}%</div>
            <div className="text-[10.5px] mt-1" style={{ color: "var(--ink-faint)" }}>Uptime today</div>
          </div>
        </div>

        <div className="flex-1">
          <div className="text-[12px] font-medium mb-1" style={{ color: "var(--ink-soft)" }}>Factory Overview</div>
          <div className="text-[22px] font-bold mb-4">{machines.length} machines under monitoring</div>
          <div className="tile-grid grid grid-cols-4 gap-3">
            <div className="tile px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11.5px] mb-1.5" style={{ color: "var(--ink-soft)" }}><span className="dot" style={{ background: "var(--ok)", color: "var(--ok)" }} />Running</div>
              <div className="text-[20px] font-bold">{running}</div>
            </div>
            <div className="tile px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11.5px] mb-1.5" style={{ color: "var(--ink-soft)" }}><span className="dot" style={{ background: "var(--stop)", color: "var(--stop)" }} />Stop</div>
              <div className="text-[20px] font-bold">{stop}</div>
            </div>
            <div className="tile px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11.5px] mb-1.5" style={{ color: "var(--ink-soft)" }}><span className="dot" style={{ background: "var(--alarm)", color: "var(--alarm)" }} />Alarm</div>
              <div className="text-[20px] font-bold" style={{ color: "var(--alarm)" }}>{alarmN}</div>
            </div>
            <div className="tile px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11.5px] mb-1.5" style={{ color: "var(--ink-soft)" }}><span className="dot" style={{ background: "var(--maint)", color: "var(--maint)" }} />Maintenance</div>
              <div className="text-[20px] font-bold" style={{ color: "var(--gold-soft)" }}>{maintN}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 self-start flex-shrink-0">
          {session && hasPermission(session, "machines.manage") && (
            <Link href="/machines" className="btn-primary text-[13px] px-4 py-2.5 rounded-lg text-center">+ Add Machine</Link>
          )}
          <ExportCsvButton filename="machines.csv" rows={machines} />
        </div>
      </div>

      <div className="content-grid grid grid-cols-3 gap-6">
        {/* MACHINE STATUS */}
        <div className="col-span-2 card">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--line)" }}>
            <h2 className="font-semibold text-[14.5px]">Machine Status</h2>
            <Link href="/machines" className="text-[12px] font-medium" style={{ color: "var(--gold-soft)" }}>View all</Link>
          </div>
          <div className="px-5 py-2">
            <div className="machine-row" style={{ color: "var(--ink-faint)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em", borderBottom: "1px solid var(--line)" }}>
              <div>Machine</div><div>Status</div><div>Load</div><div>Updated</div>
            </div>
            {machines.slice(0, 5).map((m) => (
              <div className="machine-row" key={m.id}>
                <div>
                  <div className="font-semibold text-[13.5px]">{m.name}</div>
                  <div className="text-[11px] mono" style={{ color: "var(--ink-faint)" }}>{m.machine_id} · {m.location}</div>
                </div>
                <StatusPill status={m.status} />
                <div className="bar-track"><div className="bar-fill" style={{ width: `${m.load_pct ?? 0}%`, background: m.status === "Running" ? "var(--ok)" : m.status === "Alarm" ? "var(--alarm)" : m.status === "Maintenance" ? "var(--maint)" : "var(--stop)" }} /></div>
                <div className="text-[11.5px]" style={{ color: "var(--ink-faint)" }}>{m.updated_at}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ALARM TIMELINE */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--line)" }}>
            <h2 className="font-semibold text-[14.5px]">Recent Alarms ({openAlarms.length} open)</h2>
            <Link href="/alarms" className="text-[12px] font-medium" style={{ color: "var(--gold-soft)" }}>View all</Link>
          </div>
          <div className="p-5">
            <div className="timeline">
              {alarms.slice(0, 3).map((a) => (
                <div className="timeline-item" key={a.id}>
                  <div className="timeline-dot" style={{ background: a.status === "Open" ? "var(--alarm)" : a.status === "In Progress" ? "var(--maint)" : "var(--stop)" }} />
                  <div className="flex justify-between items-center mb-1">
                    <span className="mono text-[11px] font-semibold" style={{ color: a.status === "Open" ? "var(--alarm)" : "var(--ink-soft)" }}>{a.alarm_code}</span>
                    <StatusPill status={a.status} />
                  </div>
                  <div className="text-[13px] font-medium leading-snug">{a.machine_name} — {a.description}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--ink-faint)" }}>{a.occurred_at}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MAINTENANCE TABLE */}
      <div className="card mt-6">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--line)" }}>
          <h2 className="font-semibold text-[14.5px]">Maintenance Records ({maint.length})</h2>
          <div className="flex gap-2">
            <ExportCsvButton filename="maintenance.csv" rows={maint} />
            <Link href="/maintenance" className="btn-ghost text-[12.5px] font-medium px-3 py-1.5 rounded-md">+ New Record</Link>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th>Machine</th><th>Type</th><th>Problem</th><th>Technician</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {maint.slice(0, 5).map((t) => (
              <tr key={t.id}>
                <td className="mono font-medium">{t.machine_name}</td>
                <td>{t.maintenance_type}</td>
                <td style={{ color: "var(--ink-soft)" }}>{t.problem}</td>
                <td>{t.technician}</td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>{t.date}</td>
                <td><StatusPill status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </AppShell>
  );
}
