"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import AppShell from "@/components/AppShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import StatusPill from "@/components/StatusPill";
import { getSession, hasPermission, listAlarms, listMachines, listMaintenance, withPermissions, type Session } from "@/lib/store";
import { SPEEDS, getSimSpeed, isSimLive, resetSimulation, setSimLive, setSimSpeed, useAnimatedNumber, useSimulatorTick } from "@/lib/simulator";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tStatus = useTranslations("status");
  const trStatus = (s: string) => {
    try {
      return tStatus(s);
    } catch {
      return s;
    }
  };
  const [session, setSession] = useState<Session | null>(null);
  const [machines, setMachines] = useState(listMachinesSafe);
  const [alarms, setAlarms] = useState(listAlarmsSafe);
  const [maint, setMaint] = useState(listMaintSafe);
  const [live, setLive] = useState(() => {
    try { return isSimLive(); } catch { return true; }
  });
  const [speed, setSpeed] = useState(() => {
    try { return getSimSpeed(); } catch { return 1; }
  });

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

  function refreshSim() {
    setMachines(listMachinesSafe());
    setAlarms(listAlarmsSafe());
    setMaint(listMaintSafe());
  }
  useSimulatorTick(live, speed * 1000, refreshSim);

  function toggleLive() {
    const next = !live;
    setLive(next);
    setSimLive(next);
  }
  function changeSpeed(v: number) {
    setSpeed(v);
    setSimSpeed(v);
  }
  function resetSim() {
    resetSimulation();
    refreshSim();
  }

  const running = machines.filter((m) => m.status === "Running").length;
  const stop = machines.filter((m) => m.status === "Stop").length;
  const alarmN = machines.filter((m) => m.status === "Alarm").length;
  const maintN = machines.filter((m) => m.status === "Maintenance").length;
  const uptime = machines.length === 0 ? 100 : Math.round(((running + stop) / machines.length) * 100);
  const openAlarms = alarms.filter((a) => a.status === "Open");
  const animatedUptime = useAnimatedNumber(uptime);
  const simDur = { "--sim-dur": `${Math.max(0.5, speed * 0.9)}s` } as CSSProperties;

  return (
    <AppShell crumb="Dashboard">
      {/* HERO */}
      <div className="hero rounded-2xl p-7 mb-6 flex items-center gap-10" style={simDur}>
        <div className="flex-shrink-0 relative" style={{ width: 132, height: 132 }}>
          <svg width="132" height="132" viewBox="0 0 132 132">
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3FD68E" />
                <stop offset="100%" stopColor="#F0BD4B" />
              </linearGradient>
            </defs>
            <circle cx="66" cy="66" r="56" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
            <circle cx="66" cy="66" r="56" fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" className="gauge-arc"
              strokeLinecap="round" strokeDasharray="351.9" strokeDashoffset={351.9 - (351.9 * uptime) / 100}
              transform="rotate(-90 66 66)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[26px] font-extrabold leading-none tabular-nums">{animatedUptime}%</div>
            <div className="text-[10.5px] mt-1" style={{ color: "var(--ink-faint)" }}>{t("uptimeToday")}</div>
          </div>
        </div>

        <div className="flex-1">
          <div className="text-[12px] font-medium mb-1" style={{ color: "var(--ink-soft)" }}>{t("factoryOverview")}</div>
          <div className="text-[22px] font-bold mb-4">{machines.length} {t("machinesUnderMonitoring")}</div>
          <div className="tile-grid grid grid-cols-4 gap-3">
            <div className="tile px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11.5px] mb-1.5" style={{ color: "var(--ink-soft)" }}><span className="dot" style={{ background: "var(--ok)", color: "var(--ok)" }} />{t("running")}</div>
              <div className="text-[20px] font-bold">{running}</div>
            </div>
            <div className="tile px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11.5px] mb-1.5" style={{ color: "var(--ink-soft)" }}><span className="dot" style={{ background: "var(--stop)", color: "var(--stop)" }} />{t("stop")}</div>
              <div className="text-[20px] font-bold">{stop}</div>
            </div>
            <div className="tile px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11.5px] mb-1.5" style={{ color: "var(--ink-soft)" }}><span className="dot" style={{ background: "var(--alarm)", color: "var(--alarm)" }} />{t("alarm")}</div>
              <div className="text-[20px] font-bold" style={{ color: "var(--alarm)" }}>{alarmN}</div>
            </div>
            <div className="tile px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11.5px] mb-1.5" style={{ color: "var(--ink-soft)" }}><span className="dot" style={{ background: "var(--maint)", color: "var(--maint)" }} />{t("maintenance")}</div>
              <div className="text-[20px] font-bold" style={{ color: "var(--gold-soft)" }}>{maintN}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 self-start flex-shrink-0">
          {session && hasPermission(session, "machines.manage") && (
            <Link href="/machines" className="btn-primary text-[13px] px-4 py-2.5 rounded-lg text-center">{t("addMachine")}</Link>
          )}
          <ExportCsvButton filename="machines.csv" rows={machines} />
          <button
            className="btn-ghost text-[12px] font-semibold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5"
            onClick={toggleLive}
            title={live ? t("paused") : t("live")}
          >
            <span className="dot" style={{ background: live ? "var(--ok)" : "var(--ink-faint)", color: live ? "var(--ok)" : "var(--ink-faint)" }} />
            {live ? t("live") : t("paused")}
          </button>
          <select
            className="btn-ghost text-[12px] font-medium px-2 py-2 rounded-lg"
            value={speed}
            onChange={(e) => changeSpeed(Number(e.target.value))}
            title={t("speed")}
          >
            {SPEEDS.map((s) => <option key={s} value={s}>{t("every", { n: s })}</option>)}
          </select>
          <button className="text-[11.5px] px-3 py-1.5 rounded-lg" style={{ color: "var(--ink-faint)" }} onClick={resetSim}>
            {t("resetSim")}
          </button>
        </div>
      </div>

      <div className="content-grid grid grid-cols-3 gap-6">
        {/* MACHINE STATUS */}
        <div className="col-span-2 card" style={simDur}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--line)" }}>
            <h2 className="font-semibold text-[14.5px]">{t("machineStatus")}</h2>
            <Link href="/machines" className="text-[12px] font-medium" style={{ color: "var(--gold-soft)" }}>{tCommon("viewAll")}</Link>
          </div>
          <div className="px-5 py-2">
            <div className="machine-row" style={{ color: "var(--ink-faint)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".03em", borderBottom: "1px solid var(--line)" }}>
              <div>{t("machine")}</div><div>{t("statusCol")}</div><div>{t("load")}</div><div>{t("updated")}</div>
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
            <h2 className="font-semibold text-[14.5px]">{t("recentAlarms")} ({openAlarms.length} {t("open")})</h2>
            <Link href="/alarms" className="text-[12px] font-medium" style={{ color: "var(--gold-soft)" }}>{tCommon("viewAll")}</Link>
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
          <h2 className="font-semibold text-[14.5px]">{t("maintenanceRecords")} ({maint.length})</h2>
          <div className="flex gap-2">
            <ExportCsvButton filename="maintenance.csv" rows={maint} />
            <Link href="/maintenance" className="btn-ghost text-[12.5px] font-medium px-3 py-1.5 rounded-md">{t("newRecord")}</Link>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th>{t("thMachine")}</th><th>{t("thType")}</th><th>{t("thProblem")}</th><th>{t("thTechnician")}</th><th>{t("thDate")}</th><th>{t("thStatus")}</th></tr></thead>
          <tbody>
            {maint.slice(0, 5).map((row) => (
              <tr key={row.id}>
                <td className="mono font-medium">{row.machine_name}</td>
                <td>{trStatus(row.maintenance_type)}</td>
                <td style={{ color: "var(--ink-soft)" }}>{row.problem}</td>
                <td>{row.technician}</td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>{row.date}</td>
                <td><StatusPill status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </AppShell>
  );
}
