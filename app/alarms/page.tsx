"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import Modal, { FormError } from "@/components/Modal";
import StatusPill from "@/components/StatusPill";
import {
  createAlarm, deleteAlarm, getSession, listAlarms, listMachines, updateAlarm,
  type Session,
} from "@/lib/store";
import { ALARM_STATUSES, type Alarm, type AlarmStatus } from "@/lib/types";

export default function AlarmsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<Alarm[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ machine_id: "", alarm_code: "", description: "", occurred_at: "", cause: "", status: "Open" as AlarmStatus });
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.role === "admin";
  const machines = (() => { try { return listMachines(); } catch { return []; } })();

  function refresh() {
    try { setRows(listAlarms()); } catch { /* ignore */ }
  }
  useEffect(() => {
    setSession(getSession());
    refresh();
  }, []);

  const filtered = rows.filter((r) => {
    const hitQ = !q || `${r.alarm_code} ${r.machine_name} ${r.description}`.toLowerCase().includes(q.toLowerCase());
    const hitS = !status || r.status === status;
    return hitQ && hitS;
  });
  const counts = {
    open: rows.filter((r) => r.status === "Open").length,
    prog: rows.filter((r) => r.status === "In Progress").length,
    closed: rows.filter((r) => r.status === "Closed").length,
  };

  function save() {
    setError(null);
    try {
      const m = machines.find((x) => x.id === form.machine_id);
      createAlarm({
        machine_id: form.machine_id || m?.id || "m2",
        machine_name: m?.name || "Unknown Machine",
        alarm_code: form.alarm_code.trim(),
        description: form.description.trim(),
        occurred_at: form.occurred_at || "just now",
        cause: form.cause.trim() || "—",
        status: form.status,
      });
      setOpen(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  }

  return (
    <AppShell crumb="Alarms">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[19px] font-bold">Alarms</div>
          <div className="text-[13px]" style={{ color: "var(--ink-soft)" }}>All alarm events across the floor, newest first</div>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton filename="alarms.csv" rows={filtered} />
          <button className="btn-primary text-[13px] px-4 py-2.5 rounded-lg" onClick={() => { setError(null); setOpen(true); }}>+ Report Alarm</button>
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        <span className="pill" style={{ background: "var(--alarm-bg)", color: "var(--alarm)", cursor: "pointer" }} onClick={() => setStatus(status === "Open" ? "" : "Open")}>Open · {counts.open}</span>
        <span className="pill" style={{ background: "var(--maint-bg)", color: "var(--maint)", cursor: "pointer" }} onClick={() => setStatus(status === "In Progress" ? "" : "In Progress")}>In Progress · {counts.prog}</span>
        <span className="pill" style={{ background: "var(--stop-bg)", color: "var(--stop)", cursor: "pointer" }} onClick={() => setStatus(status === "Closed" ? "" : "Closed")}>Closed · {counts.closed}</span>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2 px-5 py-4 border-b flex-wrap" style={{ borderColor: "var(--line)" }}>
          <input placeholder="Search code / machine / description..." className="text-[12.5px] px-3.5 py-2 rounded-lg flex-1" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="text-[12.5px] px-2.5 py-2 rounded-lg" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {ALARM_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input type="date" className="text-[12.5px] px-2.5 py-2 rounded-lg" value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
          <input type="date" className="text-[12.5px] px-2.5 py-2 rounded-lg" value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
        </div>
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th>Code</th><th>Machine</th><th>Description</th><th>Date/Time</th><th>Cause</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td className="mono font-semibold" style={{ color: "var(--alarm)" }}>{a.alarm_code}</td>
                <td className="font-medium">{a.machine_name}</td>
                <td style={{ color: "var(--ink-soft)" }}>{a.description}</td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>{a.occurred_at}</td>
                <td style={{ color: "var(--ink-soft)" }}>{a.cause}</td>
                <td>
                  <select
                    className="text-[12px] px-2 py-1 rounded-md"
                    value={a.status}
                    onChange={(e) => { updateAlarm(a.id, { status: e.target.value as AlarmStatus }); refresh(); }}
                  >
                    {ALARM_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="text-right pr-4">
                  {isAdmin && <span className="text-[12px]" style={{ color: "var(--alarm)", cursor: "pointer" }} onClick={() => { if (confirm(`Delete ${a.alarm_code}?`)) { deleteAlarm(a.id); refresh(); } }}>Delete</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center" style={{ color: "var(--ink-faint)" }}>No alarms found</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
      <div className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
        {isAdmin ? "Admin — full manage." : "Technician — เปลี่ยนสถานะ Alarm ได้ (dropdown), ลบไม่ได้"} · Filter วันที่ (from/to) ใช้กับ export และเป็น Bonus date-range filter
      </div>

      {open && (
        <Modal title="Report Alarm" onClose={() => setOpen(false)}>
          <FormError message={error} />
          <div className="field"><label>Machine *</label>
            <select value={form.machine_id} onChange={(e) => setForm({ ...form, machine_id: e.target.value })}>
              <option value="">— เลือกเครื่องจักร —</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.machine_id} · {m.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Alarm Code * (ห้ามซ้ำ เช่น AL-1050)</label><input value={form.alarm_code} onChange={(e) => setForm({ ...form, alarm_code: e.target.value })} placeholder="AL-1050" /></div>
          <div className="field"><label>Description *</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Motor overload" /></div>
          <div className="field"><label>Date/Time</label><input value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} placeholder="2026-09-15 09:41" /></div>
          <div className="field"><label>Cause</label><input value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })} placeholder="Overcurrent trip" /></div>
          <div className="field"><label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AlarmStatus })}>
              {ALARM_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-ghost text-[13px] px-3 py-2 rounded-lg flex-1" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary text-[13px] px-3 py-2 rounded-lg flex-1" onClick={save}>Report</button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
