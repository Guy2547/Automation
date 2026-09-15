"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import Modal, { FormError } from "@/components/Modal";
import StatusPill from "@/components/StatusPill";
import {
  createMaintenance, deleteMaintenance, getSession, listMachines, listMaintenance, updateMaintenance,
  type Session,
} from "@/lib/store";
import { MAINT_STATUSES, MAINT_TYPES, type MaintenanceRecord, type MaintenanceStatus, type MaintenanceType } from "@/lib/types";

export default function MaintenancePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<MaintenanceRecord[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [tech, setTech] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [form, setForm] = useState({ machine_id: "", maintenance_type: "Corrective" as MaintenanceType, problem: "", action_taken: "", technician: "", date: "2026-09-15", status: "Open" as MaintenanceStatus });
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.role === "admin";
  const machines = (() => { try { return listMachines(); } catch { return []; } })();

  function refresh() {
    try { setRows(listMaintenance()); } catch { /* ignore */ }
  }
  useEffect(() => {
    setSession(getSession());
    refresh();
  }, []);

  const filtered = rows.filter((r) => {
    const hitQ = !q || `${r.machine_name} ${r.problem}`.toLowerCase().includes(q.toLowerCase());
    const hitT = !tech || r.technician.toLowerCase().includes(tech.toLowerCase());
    return hitQ && (!status || r.status === status) && hitT;
  });

  function startAdd() {
    setEditing(null);
    setForm({ machine_id: "", maintenance_type: "Corrective", problem: "", action_taken: "", technician: session?.name ?? "", date: "2026-09-15", status: "Open" });
    setError(null);
    setOpen(true);
  }
  function startEdit(t: MaintenanceRecord) {
    setEditing(t);
    setForm({ machine_id: t.machine_id, maintenance_type: t.maintenance_type, problem: t.problem, action_taken: t.action_taken, technician: t.technician, date: t.date, status: t.status });
    setError(null);
    setOpen(true);
  }
  function save() {
    setError(null);
    try {
      const m = machines.find((x) => x.id === (form.machine_id || editing?.machine_id));
      const payload = {
        machine_id: form.machine_id || editing?.machine_id || m?.id || "m2",
        machine_name: m ? `${m.machine_id} · ${m.name}` : (editing?.machine_name || "Unknown"),
        maintenance_type: form.maintenance_type,
        problem: form.problem.trim(),
        action_taken: form.action_taken.trim() || "—",
        technician: form.technician.trim(),
        date: form.date,
        status: form.status,
      };
      if (editing) updateMaintenance(editing.id, payload);
      else createMaintenance(payload);
      setOpen(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  }

  return (
    <AppShell crumb="Maintenance">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[19px] font-bold">Maintenance</div>
          <div className="text-[13px]" style={{ color: "var(--ink-soft)" }}>Preventive and corrective work across all machines</div>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton filename="maintenance.csv" rows={filtered} />
          <button className="btn-primary text-[13px] px-4 py-2.5 rounded-lg" onClick={startAdd}>+ New Record</button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 px-5 py-4 border-b flex-wrap" style={{ borderColor: "var(--line)" }}>
          <input placeholder="Search machine / problem..." className="text-[12.5px] px-3.5 py-2 rounded-lg flex-1" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="text-[12.5px] px-2.5 py-2 rounded-lg" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {MAINT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input placeholder="Technician..." className="text-[12.5px] px-3.5 py-2 rounded-lg" value={tech} onChange={(e) => setTech(e.target.value)} />
        </div>
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th>Machine</th><th>Type</th><th>Problem</th><th>Action Taken</th><th>Technician</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td className="mono font-medium">{t.machine_name}</td>
                <td>{t.maintenance_type}</td>
                <td style={{ color: "var(--ink-soft)" }}>{t.problem}</td>
                <td style={{ color: "var(--ink-soft)" }}>{t.action_taken}</td>
                <td>{t.technician}</td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>{t.date}</td>
                <td><StatusPill status={t.status} /></td>
                <td className="text-right pr-4 whitespace-nowrap">
                  <span className="text-[12px] mr-3" style={{ color: "var(--ink-faint)", cursor: "pointer" }} onClick={() => startEdit(t)}>Edit</span>
                  {isAdmin && <span className="text-[12px]" style={{ color: "var(--alarm)", cursor: "pointer" }} onClick={() => { if (confirm("Delete this record?")) { deleteMaintenance(t.id); refresh(); } }}>Delete</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="text-center" style={{ color: "var(--ink-faint)" }}>No records found</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
      {!isAdmin && <div className="text-[12px] mt-3" style={{ color: "var(--ink-faint)" }}>Technician — สร้าง/แก้ไขได้, ลบไม่ได้ (เฉพาะ Admin)</div>}

      {open && (
        <Modal title={editing ? "Edit Maintenance Record" : "New Maintenance Record"} onClose={() => setOpen(false)}>
          <FormError message={error} />
          <div className="field"><label>Machine *</label>
            <select value={form.machine_id} onChange={(e) => setForm({ ...form, machine_id: e.target.value })}>
              <option value="">— เลือกเครื่องจักร —</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.machine_id} · {m.name}</option>)}
            </select>
          </div>
          <div className="field"><label>Type</label>
            <select value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value as MaintenanceType })}>
              {MAINT_TYPES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field"><label>Problem *</label><input value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} placeholder="Sensor fault" /></div>
          <div className="field"><label>Action Taken</label><input value={form.action_taken} onChange={(e) => setForm({ ...form, action_taken: e.target.value })} placeholder="Recalibrated, tested" /></div>
          <div className="field"><label>Technician *</label><input value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} placeholder="Suda K." /></div>
          <div className="field"><label>Date *</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="field"><label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MaintenanceStatus })}>
              {MAINT_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-ghost text-[13px] px-3 py-2 rounded-lg flex-1" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary text-[13px] px-3 py-2 rounded-lg flex-1" onClick={save}>Save Record</button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
