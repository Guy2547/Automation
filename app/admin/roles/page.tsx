"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import AppShell from "@/components/AppShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import Modal from "@/components/Modal";
import TFormError from "@/components/TFormError";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { createRole, deleteRole, getSession, listRoles, updateRole, withPermissions, type Session } from "@/lib/store";
import { logActivity } from "@/lib/activity";
import { errorKeyOf } from "@/lib/errorMap";
import { PERMISSION_KEYS, type RoleRow } from "@/lib/types";

const GROUPS: { key: string; keys: string[] }[] = [
  { key: "groupMachines", keys: ["machines.manage"] },
  { key: "groupAlarms", keys: ["alarms.status", "alarms.delete"] },
  { key: "groupMaintenance", keys: ["maintenance.edit", "maintenance.delete"] },
  { key: "groupAdmin", keys: ["users.manage", "roles.manage"] },
  { key: "groupData", keys: ["export"] },
];

const SHORT_KEYS: Record<string, string> = {
  "machines.manage": "perm_machines_manage",
  "alarms.status": "perm_alarms_status",
  "alarms.delete": "perm_alarms_delete",
  "maintenance.edit": "perm_maintenance_edit",
  "maintenance.delete": "perm_maintenance_delete",
  "users.manage": "perm_users_manage",
  "roles.manage": "perm_roles_manage",
  export: "perm_export",
};

const ACCENTS: Record<string, string> = {
  admin: "linear-gradient(90deg, #F6D583, #C98A2C)",
  technician: "linear-gradient(90deg, #3FD68E, #2E8F5E)",
  viewer: "linear-gradient(90deg, #7C8F84, #4A5A51)",
};

const emptyPerms = () => Object.fromEntries(PERMISSION_KEYS.map((p) => [p.key, false]));

export default function RolesPage() {
  const t = useTranslations("roles");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("errors");
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [name, setName] = useState("");
  const [display, setDisplay] = useState("");
  const [perms, setPerms] = useState<Record<string, boolean>>(emptyPerms());
  const [preset, setPreset] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  void session;

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseConfigured()) {
        const { data } = await createClient().from("roles").select("name, display_name, permissions, is_builtin").order("name");
        if (data) {
          setRoles(data as RoleRow[]);
          setLoading(false);
          return;
        }
      }
      setRoles(listRoles());
    } catch (e) {
      setError(e instanceof Error ? e.message : tErr("loadRolesFailed"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const raw = getSession();
    setSession(raw ? withPermissions(raw) : null);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startAdd() {
    setEditing(null);
    setName("");
    setDisplay("");
    setPerms(emptyPerms());
    setPreset("");
    setFormError(null);
    setOpen(true);
  }
  function startEdit(r: RoleRow) {
    setEditing(r);
    setName(r.name);
    setDisplay(r.display_name);
    setPerms({ ...emptyPerms(), ...r.permissions });
    setPreset("");
    setFormError(null);
    setOpen(true);
  }
  function applyPreset(v: string) {
    setPreset(v);
    if (!v) {
      setPerms(emptyPerms());
      return;
    }
    const src = roles.find((r) => r.name === v);
    if (src) setPerms({ ...emptyPerms(), ...src.permissions });
  }

  async function save() {
    setFormError(null);
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        if (editing) {
          const { error } = await supabase.from("roles").update({ display_name: display.trim(), permissions: perms }).eq("name", editing.name);
          if (error) throw new Error(error.message);
        } else {
          const clean = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
          if (!clean) throw new Error(tErr("roleNameRequired"));
          const { error } = await supabase.from("roles").insert({ name: clean, display_name: display.trim() || clean, permissions: perms, is_builtin: false });
          if (error) throw new Error(error.message);
        }
      } else {
        if (editing) updateRole(editing.name, { display_name: display, permissions: perms });
        else createRole({ name, display_name: display, permissions: perms });
      }
      void logActivity(editing ? "role.update" : "role.create", editing?.name ?? name.trim());
      setOpen(false);
      await refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : tErr("saveFailed"));
    }
  }

  async function remove() {
    if (!confirmDel) return;
    setError(null);
    try {
      if (isSupabaseConfigured()) {
        const { error } = await createClient().from("roles").delete().eq("name", confirmDel);
        if (error) throw new Error(error.message);
      } else {
        deleteRole(confirmDel);
      }
      void logActivity("role.delete", confirmDel);
      setConfirmDel(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : tErr("deleteFailed"));
      setConfirmDel(null);
    }
  }

  const builtIn = roles.filter((r) => r.is_builtin).length;
  const onCount = (r: RoleRow) => Object.values(r.permissions).filter(Boolean).length;
  const errKey = errorKeyOf(error);
  const errMsg = !error ? null : errKey ? (() => { try { return tErr(errKey); } catch { return error; } })() : error;

  return (
    <AppShell crumb="Roles" mascot="roles">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[19px] font-bold">{t("title")}</div>
          <div className="text-[13px]" style={{ color: "var(--ink-soft)" }}>{t("subtitle")}</div>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton filename="roles.csv" rows={roles.map((r) => ({ name: r.name, display_name: r.display_name, permissions: onCount(r), builtin: r.is_builtin }))} />
          <button className="btn-primary text-[13px] px-4 py-2.5 rounded-lg" onClick={startAdd}>{t("newRole")}</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>{t("totalRoles")}</div><div className="text-[26px] font-bold">{roles.length}</div></div>
        <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>{t("builtIn")}</div><div className="text-[26px] font-bold" style={{ color: "var(--gold-soft)" }}>{builtIn}</div></div>
        <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>{t("custom")}</div><div className="text-[26px] font-bold" style={{ color: "var(--ok)" }}>{roles.length - builtIn}</div></div>
      </div>

      {errMsg && <div className="text-[12.5px] font-medium px-3 py-2 rounded-lg mb-4" style={{ background: "var(--alarm-bg)", color: "var(--alarm)" }}>{errMsg}</div>}

      <div className="grid grid-cols-3 gap-4">
        {roles.map((r) => {
          const on = onCount(r);
          const accent = ACCENTS[r.name] ?? "linear-gradient(90deg, #6FC3B8, #2E8F8A)";
          return (
            <div className="card role-card p-5" key={r.name} style={{ ["--role-accent" as string]: accent }}>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[16px] font-extrabold flex-shrink-0" style={{ background: accent, color: "#0B1611" }}>
                  {(r.display_name || r.name).slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] truncate">{r.display_name || r.name}</div>
                  <div className="mono text-[11px]" style={{ color: "var(--ink-faint)" }}>{r.name}</div>
                </div>
                {r.is_builtin
                  ? <span className="pill" style={{ background: "var(--gold-bg)", color: "var(--gold-soft)" }}>{t("builtInPill")}</span>
                  : <span className="pill" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>{t("customPill")}</span>}
              </div>

              <div className="flex items-center gap-2 mt-3 mb-1">
                <div className="bar-track flex-1"><div className="bar-fill" style={{ width: `${Math.round((on / PERMISSION_KEYS.length) * 100)}%`, background: accent }} /></div>
                <span className="text-[11px] font-semibold" style={{ color: "var(--ink-soft)" }}>{on}/{PERMISSION_KEYS.length}</span>
              </div>

              {GROUPS.map((g) => (
                <div key={g.key}>
                  <div className="perm-group-label">{t(g.key)}</div>
                  {g.keys.map((k) => {
                    const has = r.permissions[k] === true;
                    return (
                      <div className="perm-row" key={k}>
                        <span className="perm-check" style={has ? { background: "var(--ok-bg)", color: "var(--ok)" } : { background: "rgba(255,255,255,0.04)", color: "var(--ink-faint)" }}>
                          {has ? "✓" : "–"}
                        </span>
                        <span style={{ color: has ? "var(--ink)" : "var(--ink-faint)" }}>{t(SHORT_KEYS[k])}</span>
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className="flex gap-2 mt-4">
                <button className="btn-ghost text-[12.5px] px-3 py-1.5 rounded-md flex-1" onClick={() => startEdit(r)}>{tCommon("edit")}</button>
                {!r.is_builtin && (
                  <button className="text-[12.5px] px-3 py-1.5 rounded-md flex-1" style={{ background: "var(--alarm-bg)", color: "var(--alarm)" }} onClick={() => setConfirmDel(r.name)}>{tCommon("delete")}</button>
                )}
              </div>
            </div>
          );
        })}
        {roles.length === 0 && !loading && (
          <div className="card p-6 text-[13px]" style={{ color: "var(--ink-faint)" }}>{t("noRoles")}</div>
        )}
      </div>

      {open && (
        <Modal title={editing ? t("editTitle", { name: editing.name }) : t("newTitle")} onClose={() => setOpen(false)}>
          <TFormError error={formError} />
          {!editing && (
            <>
              <div className="field"><label>{t("fName")}</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="supervisor" />
              </div>
              <div className="field"><label>{t("fPreset")}</label>
                <select value={preset} onChange={(e) => applyPreset(e.target.value)}>
                  <option value="">{t("blank")}</option>
                  {roles.map((r) => <option key={r.name} value={r.name}>{t("copyFrom", { name: r.display_name || r.name })}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="field"><label>{t("fDisplay")}</label>
            <input value={display} onChange={(e) => setDisplay(e.target.value)} placeholder="Supervisor" />
          </div>
          <div className="field"><label>{t("fPerms")}</label>
            {GROUPS.map((g) => (
              <div key={g.key}>
                <div className="perm-group-label">{t(g.key)}</div>
                {g.keys.map((k) => (
                  <label key={k} className="perm-row" style={{ cursor: "pointer" }}>
                    <span className="switch">
                      <input
                        type="checkbox"
                        checked={perms[k] === true}
                        onChange={(e) => setPerms({ ...perms, [k]: e.target.checked })}
                      />
                      <span className="track" />
                    </span>
                    <span style={{ color: perms[k] ? "var(--ink)" : "var(--ink-faint)" }}>{t(SHORT_KEYS[k])}</span>
                    <span className="mono text-[10.5px] ml-auto" style={{ color: "var(--ink-faint)" }}>{k}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-ghost text-[13px] px-3 py-2 rounded-lg flex-1" onClick={() => setOpen(false)}>{tCommon("cancel")}</button>
            <button className="btn-primary text-[13px] px-3 py-2 rounded-lg flex-1" onClick={save}>{t("save")}</button>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <Modal title={t("delTitle")} onClose={() => setConfirmDel(null)}>
          <p className="text-[13.5px] mb-4" style={{ color: "var(--ink-soft)" }}>
            {t("delBody", { name: confirmDel })}
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost text-[13px] px-3 py-2 rounded-lg flex-1" onClick={() => setConfirmDel(null)}>{tCommon("cancel")}</button>
            <button className="text-[13px] px-3 py-2 rounded-lg flex-1" style={{ background: "var(--alarm-bg)", color: "var(--alarm)" }} onClick={remove}>{tCommon("delete")}</button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
