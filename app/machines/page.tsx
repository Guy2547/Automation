"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import Modal, { FormError } from "@/components/Modal";
import StatusPill from "@/components/StatusPill";
import {
  createMachine, deleteMachine, getSession, listMachines, updateMachine,
  type Session,
} from "@/lib/store";
import { MACHINE_STATUSES, type Machine, type MachineStatus } from "@/lib/types";

const empty = { machine_id: "", name: "", type: "", location: "", status: "Running" as MachineStatus };

export default function MachinesPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<Machine[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loc, setLoc] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = session?.role === "admin";

  function refresh() {
    try { setRows(listMachines()); } catch { /* ignore */ }
  }
  useEffect(() => {
    setSession(getSession());
    refresh();
  }, []);

  const locations = useMemo(() => [...new Set(rows.map((r) => r.location).filter(Boolean))], [rows]);
  const filtered = rows.filter((r) => {
    const hitQ = !q || `${r.machine_id} ${r.name}`.toLowerCase().includes(q.toLowerCase());
    return hitQ && (!status || r.status === status) && (!loc || r.location === loc);
  });

  function startAdd() {
    setEditing(null);
    setForm(empty);
    setError(null);
    setOpen(true);
  }
  function startEdit(m: Machine) {
    setEditing(m);
    setForm({ machine_id: m.machine_id, name: m.name, type: m.type, location: m.location, status: m.status });
    setError(null);
    setOpen(true);
  }
  function save() {
    setError(null);
    try {
      if (editing) updateMachine(editing.id, { ...form });
      else createMachine({ ...form, load_pct: 0 });
      setOpen(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
    }
  }

  return (
    <AppShell crumb="Machines">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[19px] font-bold">Machines</div>
          <div className="text-[13px]" style={{ color: "var(--ink-soft)" }}>Machine Master — add, edit, and monitor every unit on the floor</div>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton filename="machines.csv" rows={filtered} />
          {isAdmin && <button className="btn-primary text-[13px] px-4 py-2.5 rounded-lg" onClick={startAdd}>+ Add Machine</button>}
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--line)" }}>
          <input placeholder="Search Machine ID or Name..." className="text-[12.5px] px-3.5 py-2 rounded-lg flex-1" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="text-[12.5px] px-2.5 py-2 rounded-lg" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {MACHINE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="text-[12.5px] px-2.5 py-2 rounded-lg" value={loc} onChange={(e) => setLoc(e.target.value)}>
            <option value="">All Locations</option>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th>Machine ID</th><th>Name</th><th>Type</th><th>Location</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td className="mono"><Link href={`/machines/${m.id}`} style={{ color: "var(--gold-soft)" }}>{m.machine_id}</Link></td>
                <td className="font-medium">{m.name}</td>
                <td style={{ color: "var(--ink-soft)" }}>{m.type || "—"}</td>
                <td style={{ color: "var(--ink-soft)" }}>{m.location || "—"}</td>
                <td><StatusPill status={m.status} /></td>
                <td className="text-right pr-4 whitespace-nowrap">
                  <Link href={`/machines/${m.id}`} className="text-[12px] mr-3" style={{ color: "var(--ink-faint)" }}>History</Link>
                  {isAdmin && (
                    <>
                      <span className="text-[12px] mr-3" style={{ color: "var(--ink-faint)", cursor: "pointer" }} onClick={() => startEdit(m)}>Edit</span>
                      <span className="text-[12px]" style={{ color: "var(--alarm)", cursor: "pointer" }} onClick={() => { if (confirm(`Delete ${m.machine_id}?`)) { deleteMachine(m.id); refresh(); } }}>Delete</span>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="text-center" style={{ color: "var(--ink-faint)" }}>No machines found</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
      {!isAdmin && <div className="text-[12px]" style={{ color: "var(--ink-faint)" }}>Technician mode — read-only. Only Admin can Add / Edit / Delete machines.</div>}

      {open && (
        <Modal title={editing ? "Edit Machine" : "Add Machine"} onClose={() => setOpen(false)}>
          <FormError message={error} />
          <div className="field"><label>Machine ID * (ห้ามซ้ำ)</label><input value={form.machine_id} onChange={(e) => setForm({ ...form, machine_id: e.target.value })} placeholder="MC-0012" /></div>
          <div className="field"><label>Machine Name *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Labeling Unit 12" /></div>
          <div className="field"><label>Type</label><input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Labeling" /></div>
          <div className="field"><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Line C" /></div>
          <div className="field"><label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MachineStatus })}>
              {MACHINE_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-ghost text-[13px] px-3 py-2 rounded-lg flex-1" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary text-[13px] px-3 py-2 rounded-lg flex-1" onClick={save}>Save Machine</button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
