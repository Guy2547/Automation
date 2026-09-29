"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import AppShell from "@/components/AppShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import Modal from "@/components/Modal";
import TFormError from "@/components/TFormError";
import StatusPill from "@/components/StatusPill";
import {
  createAlarm, deleteAlarm, getSession, hasPermission, listAlarms, listMachines, updateAlarm, withPermissions,
  type Session,
} from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { ALARM_STATUSES, type Alarm, type AlarmStatus } from "@/lib/types";

export default function AlarmsPage() {
  const t = useTranslations("alarms");
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
  const [rows, setRows] = useState<Alarm[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ machine_id: "", alarm_code: "", description: "", occurred_at: "", cause: "", status: "Open" as AlarmStatus });
  const [error, setError] = useState<string | null>(null);

  const canDelete = session ? hasPermission(session, "alarms.delete") : false;
  const canChangeStatus = session ? hasPermission(session, "alarms.status") : false;
  const canReport = canChangeStatus;
  const machines = (() => { try { return listMachines(); } catch { return []; } })();

  function refresh() {
    try { setRows(listAlarms()); } catch { /* ignore */ }
  }
  useEffect(() => {
    const raw = getSession();
    setSession(raw ? withPermissions(raw) : null);
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
      void logActivity("alarm.report", form.alarm_code.trim());
      setOpen(false);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : tErr("saveFailed"));
    }
  }

  function changeStatus(id: string, code: string, next: AlarmStatus) {
    updateAlarm(id, { status: next });
    void logActivity("alarm.status", `${code} → ${next}`);
    refresh();
  }

  function remove(id: string, code: string) {
    if (confirm(t("confirmDelete", { code }))) {
      deleteAlarm(id);
      void logActivity("alarm.delete", code);
      refresh();
    }
  }

  const permText = canDelete ? t("permFull") : canChangeStatus ? t("permStatus") : t("permRead");

  return (
    <AppShell crumb="Alarms">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[19px] font-bold">{t("title")}</div>
          <div className="text-[13px]" style={{ color: "var(--ink-soft)" }}>{t("subtitle")}</div>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton filename="alarms.csv" rows={filtered} />
          {canReport && <button className="btn-primary text-[13px] px-4 py-2.5 rounded-lg" onClick={() => { setError(null); setOpen(true); }}>{t("reportBtn")}</button>}
        </div>
      </div>

      <div className="flex gap-2 mb-5 flex-wrap">
        <span className="pill" style={{ background: "var(--alarm-bg)", color: "var(--alarm)", cursor: "pointer" }} onClick={() => setStatus(status === "Open" ? "" : "Open")}>{trStatus("Open")} · {counts.open}</span>
        <span className="pill" style={{ background: "var(--maint-bg)", color: "var(--maint)", cursor: "pointer" }} onClick={() => setStatus(status === "In Progress" ? "" : "In Progress")}>{trStatus("In Progress")} · {counts.prog}</span>
        <span className="pill" style={{ background: "var(--stop-bg)", color: "var(--stop)", cursor: "pointer" }} onClick={() => setStatus(status === "Closed" ? "" : "Closed")}>{trStatus("Closed")} · {counts.closed}</span>
      </div>

      <div className="card mb-4">
        <div className="flex items-center gap-2 px-5 py-4 border-b flex-wrap" style={{ borderColor: "var(--line)" }}>
          <input placeholder={t("searchPh")} className="text-[12.5px] px-3.5 py-2 rounded-lg flex-1" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="text-[12.5px] px-2.5 py-2 rounded-lg" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{tCommon("allStatus")}</option>
            {ALARM_STATUSES.map((s) => <option key={s} value={s}>{trStatus(s)}</option>)}
          </select>
          <input type="date" className="text-[12.5px] px-2.5 py-2 rounded-lg" value={from} onChange={(e) => setFrom(e.target.value)} title={t("fromDate")} />
          <input type="date" className="text-[12.5px] px-2.5 py-2 rounded-lg" value={to} onChange={(e) => setTo(e.target.value)} title={t("toDate")} />
        </div>
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th>{t("thCode")}</th><th>{t("thMachine")}</th><th>{t("thDesc")}</th><th>{t("thDate")}</th><th>{t("thCause")}</th><th>{t("thStatus")}</th><th></th></tr></thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id}>
                <td className="mono font-semibold" style={{ color: "var(--alarm)" }}>{a.alarm_code}</td>
                <td className="font-medium">{a.machine_name}</td>
                <td style={{ color: "var(--ink-soft)" }}>{a.description}</td>
                <td className="mono" style={{ color: "var(--ink-soft)" }}>{a.occurred_at}</td>
                <td style={{ color: "var(--ink-soft)" }}>{a.cause}</td>
                <td>
                  {canChangeStatus ? (
                  <select
                    className="text-[12px] px-2 py-1 rounded-md"
                    value={a.status}
                    onChange={(e) => changeStatus(a.id, a.alarm_code, e.target.value as AlarmStatus)}
                  >
                    {ALARM_STATUSES.map((s) => <option key={s} value={s}>{trStatus(s)}</option>)}
                  </select>
                  ) : (
                    <StatusPill status={a.status} />
                  )}
                </td>
                <td className="text-right pr-4">
                  {canDelete && <span className="text-[12px]" style={{ color: "var(--alarm)", cursor: "pointer" }} onClick={() => remove(a.id, a.alarm_code)}>{tCommon("delete")}</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center" style={{ color: "var(--ink-faint)" }}>{t("noFound")}</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
      <div className="text-[12px]" style={{ color: "var(--ink-faint)" }}>
        {t("roleLine", { role: session?.role ?? "—", perm: permText })}
      </div>

      {open && (
        <Modal title={t("modalTitle")} onClose={() => setOpen(false)}>
          <TFormError error={error} />
          <div className="field"><label>{t("fMachine")}</label>
            <select value={form.machine_id} onChange={(e) => setForm({ ...form, machine_id: e.target.value })}>
              <option value="">{t("fSelectMachine")}</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.machine_id} · {m.name}</option>)}
            </select>
          </div>
          <div className="field"><label>{t("fCode")}</label><input value={form.alarm_code} onChange={(e) => setForm({ ...form, alarm_code: e.target.value })} placeholder="AL-1050" /></div>
          <div className="field"><label>{t("fDesc")}</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Motor overload" /></div>
          <div className="field"><label>{t("fDate")}</label><input value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} placeholder="2026-09-15 09:41" /></div>
          <div className="field"><label>{t("fCause")}</label><input value={form.cause} onChange={(e) => setForm({ ...form, cause: e.target.value })} placeholder="Overcurrent trip" /></div>
          <div className="field"><label>{t("fStatus")}</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AlarmStatus })}>
              {ALARM_STATUSES.map((s) => <option key={s} value={s}>{trStatus(s)}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-ghost text-[13px] px-3 py-2 rounded-lg flex-1" onClick={() => setOpen(false)}>{tCommon("cancel")}</button>
            <button className="btn-primary text-[13px] px-3 py-2 rounded-lg flex-1" onClick={save}>{t("report")}</button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
