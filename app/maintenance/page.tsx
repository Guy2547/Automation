"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import AppShell from "@/components/AppShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import Modal from "@/components/Modal";
import TFormError from "@/components/TFormError";
import StatusPill from "@/components/StatusPill";
import {
  createMaintenance, deleteMaintenance, getSession, hasPermission, listMachines, listMaintenance, updateMaintenance, withPermissions,
  type Session,
} from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { MAINT_STATUSES, MAINT_TYPES, type MaintenanceRecord, type MaintenanceStatus, type MaintenanceType } from "@/lib/types";

export default function MaintenancePage() {
  const t = useTranslations("maintenance");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const tStatus = useTranslations("status");
  const trStatus = (s: string) => {
    try {
      return tStatus(s);
    } catch {
      return s;
    }
  };
  const [session, setSession] = useState<Session | null>(null);
  const [rows, setRows] = useState<MaintenanceRecord[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [tech, setTech] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [form, setForm] = useState({ machine_id: "", maintenance_type: "Corrective" as MaintenanceType, problem: "", action_taken: "", technician: "", date: "2026-09-15", status: "Open" as MaintenanceStatus });
  const [error, setError] = useState<string | null>(null);

  const canEdit = session ? hasPermission(session, "maintenance.edit") : false;
  const canDelete = session ? hasPermission(session, "maintenance.delete") : false;
  const machines = (() => { try { return listMachines(); } catch { return []; } })();

  function refresh() {
    try { setRows(listMaintenance()); } catch { /* ignore */ }
  }
  useEffect(() => {
    const raw = getSession();
    setSession(raw ? withPermissions(raw) : null);
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
  function startEdit(rec: MaintenanceRecord) {
    setEditing(rec);
    setForm({ machine_id: rec.machine_id, maintenance_type: rec.maintenance_type, problem: rec.problem, action_taken: rec.action_taken, technician: rec.technician, date: rec.date, status: rec.status });
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
      if (editing) {
        updateMaintenance(editing.id, payload);
        void logActivity("maintenance.update", payload.machine_name);
      } else {
        createMaintenance(payload);
        void logActivity("maintenance.create", payload.machine_name);
      }
      setOpen(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : tErr("saveFailed"));
    }
  }

  function remove(id: string, name: string) {
    if (confirm(t("confirmDelete"))) {
      deleteMaintenance(id);
      void logActivity("maintenance.delete", name);
      refresh();
    }
  }

  return (
    <AppShell crumb="Maintenance">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[19px] font-bold">{t("title")}</div>
          <div className="text-[13px]" style={{ color: "var(--ink-soft)" }}>{t("subtitle")}</div>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton filename="maintenance.csv" rows={filtered} />
          {canEdit && <button className="btn-primary text-[13px] px-4 py-2.5 rounded-lg" onClick={startAdd}>{t("newRecord")}</button>}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2 px-5 py-4 border-b flex-wrap" style={{ borderColor: "var(--line)" }}>
          <input placeholder={t("searchPh")} className="text-[12.5px] px-3.5 py-2 rounded-lg flex-1" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="text-[12.5px] px-2.5 py-2 rounded-lg" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{tCommon("allStatus")}</option>
            {MAINT_STATUSES.map((s) => <option key={s} value={s}>{trStatus(s)}</option>)}
          </select>
          <input placeholder={t("techPh")} className="text-[12.5px] px-3.5 py-2 rounded-lg" value={tech} onChange={(e) => setTech(e.target.value)} />
        </div>
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th>{t("thMachine")}</th><th>{t("thType")}</th><th>{t("thProblem")}</th><th>{t("thAction")}</th><th>{t("thTech")}</th><th>{t("thDate")}</th><th>{t("thStatus")}</th><th></th></tr></thead>
          <tbody>
            {filtered.map((rec) => (
              <tr key={rec.id}>
                <td className="mono font-medium">{rec.machine_name}</td>
                <td>{trStatus(rec.maintenance_type)}</td>
                <td style={{ color: "var(--ink-soft)" }}>{rec.problem}</td>
                <td style={{ color: "var(--ink-soft)" }}>{rec.action_taken}</td>
                <td>{rec.technician}</td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>{rec.date}</td>
                <td><StatusPill status={rec.status} /></td>
                <td className="text-right pr-4 whitespace-nowrap">
                  {canEdit && <span className="text-[12px] mr-3" style={{ color: "var(--ink-faint)", cursor: "pointer" }} onClick={() => startEdit(rec)}>{tCommon("edit")}</span>}
                  {canDelete && <span className="text-[12px]" style={{ color: "var(--alarm)", cursor: "pointer" }} onClick={() => remove(rec.id, rec.machine_name)}>{tCommon("delete")}</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="text-center" style={{ color: "var(--ink-faint)" }}>{t("noFound")}</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
      {!canEdit && <div className="text-[12px] mt-3" style={{ color: "var(--ink-faint)" }}>{t("readonly")}</div>}

      {open && (
        <Modal title={editing ? t("editTitle") : t("addTitle")} onClose={() => setOpen(false)}>
          <TFormError error={error} />
          <div className="field"><label>{t("fMachine")}</label>
            <select value={form.machine_id} onChange={(e) => setForm({ ...form, machine_id: e.target.value })}>
              <option value="">{t("fSelectMachine")}</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.machine_id} · {m.name}</option>)}
            </select>
          </div>
          <div className="field"><label>{t("fType")}</label>
            <select value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value as MaintenanceType })}>
              {MAINT_TYPES.map((s) => <option key={s} value={s}>{trStatus(s)}</option>)}
            </select>
          </div>
          <div className="field"><label>{t("fProblem")}</label><input value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} placeholder="Sensor fault" /></div>
          <div className="field"><label>{t("fAction")}</label><input value={form.action_taken} onChange={(e) => setForm({ ...form, action_taken: e.target.value })} placeholder="Recalibrated, tested" /></div>
          <div className="field"><label>{t("fTech")}</label><input value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} placeholder="Suda K." /></div>
          <div className="field"><label>{t("fDate")}</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="field"><label>{t("fStatus")}</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MaintenanceStatus })}>
              {MAINT_STATUSES.map((s) => <option key={s} value={s}>{trStatus(s)}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-ghost text-[13px] px-3 py-2 rounded-lg flex-1" onClick={() => setOpen(false)}>{tCommon("cancel")}</button>
            <button className="btn-primary text-[13px] px-3 py-2 rounded-lg flex-1" onClick={save}>{t("save")}</button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
