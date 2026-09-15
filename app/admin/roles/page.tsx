"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import Modal, { FormError } from "@/components/Modal";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { createRole, deleteRole, getSession, listRoles, updateRole, withPermissions, type Session } from "@/lib/store";
import { PERMISSION_KEYS, type RoleRow } from "@/lib/types";

const GROUPS: { label: string; keys: string[] }[] = [
  { label: "Machines", keys: ["machines.manage"] },
  { label: "Alarms", keys: ["alarms.status", "alarms.delete"] },
  { label: "Maintenance", keys: ["maintenance.edit", "maintenance.delete"] },
  { label: "Administration", keys: ["users.manage", "roles.manage"] },
  { label: "Data", keys: ["export"] },
];

const SHORT: Record<string, string> = {
  "machines.manage": "Full machine control",
  "alarms.status": "Change status",
  "alarms.delete": "Delete alarms",
  "maintenance.edit": "Create & edit records",
  "maintenance.delete": "Delete records",
  "users.manage": "Manage users",
  "roles.manage": "Manage roles",
  export: "Export CSV",
};

const ACCENTS: Record<string, string> = {
  admin: "linear-gradient(90deg, #F6D583, #C98A2C)",
  technician: "linear-gradient(90deg, #3FD68E, #2E8F5E)",
  viewer: "linear-gradient(90deg, #7C8F84, #4A5A51)",
};

const emptyPerms = () => Object.fromEntries(PERMISSION_KEYS.map((p) => [p.key, false]));

export default function RolesPage() {
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
      setError(e instanceof Error ? e.message : "โหลด roles ไม่สำเร็จ");
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
          if (!clean) throw new Error("Role name ห้ามว่าง (a-z, 0-9, -, _)");
          const { error } = await supabase.from("roles").insert({ name: clean, display_name: display.trim() || clean, permissions: perms, is_builtin: false });
          if (error) throw new Error(error.message);
        }
      } else {
        if (editing) updateRole(editing.name, { display_name: display, permissions: perms });
        else createRole({ name, display_name: display, permissions: perms });
      }
      setOpen(false);
      await refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ");
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
      setConfirmDel(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบไม่สำเร็จ");
      setConfirmDel(null);
    }
  }

  const builtIn = roles.filter((r) => r.is_builtin).length;
  const onCount = (r: RoleRow) => Object.values(r.permissions).filter(Boolean).length;

  return (
    <AppShell crumb="Roles" mascot="Create custom roles — tick only the permissions each role needs.">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[19px] font-bold">Roles</div>
          <div className="text-[13px]" style={{ color: "var(--ink-soft)" }}>Create custom roles and control permissions per role</div>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton filename="roles.csv" rows={roles.map((r) => ({ name: r.name, display_name: r.display_name, permissions: onCount(r), builtin: r.is_builtin }))} />
          <button className="btn-primary text-[13px] px-4 py-2.5 rounded-lg" onClick={startAdd}>+ New Role</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>Total roles</div><div className="text-[26px] font-bold">{roles.length}</div></div>
        <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>Built-in</div><div className="text-[26px] font-bold" style={{ color: "var(--gold-soft)" }}>{builtIn}</div></div>
        <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>Custom</div><div className="text-[26px] font-bold" style={{ color: "var(--ok)" }}>{roles.length - builtIn}</div></div>
      </div>

      {error && <div className="text-[12.5px] font-medium px-3 py-2 rounded-lg mb-4" style={{ background: "var(--alarm-bg)", color: "var(--alarm)" }}>{error}</div>}

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
                  ? <span className="pill" style={{ background: "var(--gold-bg)", color: "var(--gold-soft)" }}>built-in</span>
                  : <span className="pill" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>custom</span>}
              </div>

              <div className="flex items-center gap-2 mt-3 mb-1">
                <div className="bar-track flex-1"><div className="bar-fill" style={{ width: `${Math.round((on / PERMISSION_KEYS.length) * 100)}%`, background: accent }} /></div>
                <span className="text-[11px] font-semibold" style={{ color: "var(--ink-soft)" }}>{on}/{PERMISSION_KEYS.length}</span>
              </div>

              {GROUPS.map((g) => (
                <div key={g.label}>
                  <div className="perm-group-label">{g.label}</div>
                  {g.keys.map((k) => {
                    const has = r.permissions[k] === true;
                    return (
                      <div className="perm-row" key={k}>
                        <span className="perm-check" style={has ? { background: "var(--ok-bg)", color: "var(--ok)" } : { background: "rgba(255,255,255,0.04)", color: "var(--ink-faint)" }}>
                          {has ? "✓" : "–"}
                        </span>
                        <span style={{ color: has ? "var(--ink)" : "var(--ink-faint)" }}>{SHORT[k]}</span>
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className="flex gap-2 mt-4">
                <button className="btn-ghost text-[12.5px] px-3 py-1.5 rounded-md flex-1" onClick={() => startEdit(r)}>Edit</button>
                {!r.is_builtin && (
                  <button className="text-[12.5px] px-3 py-1.5 rounded-md flex-1" style={{ background: "var(--alarm-bg)", color: "var(--alarm)" }} onClick={() => setConfirmDel(r.name)}>Delete</button>
                )}
              </div>
            </div>
          );
        })}
        {roles.length === 0 && !loading && (
          <div className="card p-6 text-[13px]" style={{ color: "var(--ink-faint)" }}>No roles found</div>
        )}
      </div>

      {open && (
        <Modal title={editing ? `Edit role: ${editing.name}` : "New Role"} onClose={() => setOpen(false)}>
          <FormError message={formError} />
          {!editing && (
            <>
              <div className="field"><label>Role name * (a-z, 0-9, -, _ ห้ามซ้ำ เช่น supervisor)</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="supervisor" />
              </div>
              <div className="field"><label>Start from preset</label>
                <select value={preset} onChange={(e) => applyPreset(e.target.value)}>
                  <option value="">Blank — no permissions</option>
                  {roles.map((r) => <option key={r.name} value={r.name}>Copy from {r.display_name || r.name}</option>)}
                </select>
              </div>
            </>
          )}
          <div className="field"><label>Display name *</label>
            <input value={display} onChange={(e) => setDisplay(e.target.value)} placeholder="Supervisor" />
          </div>
          <div className="field"><label>Permissions</label>
            {GROUPS.map((g) => (
              <div key={g.label}>
                <div className="perm-group-label">{g.label}</div>
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
                    <span style={{ color: perms[k] ? "var(--ink)" : "var(--ink-faint)" }}>{SHORT[k]}</span>
                    <span className="mono text-[10.5px] ml-auto" style={{ color: "var(--ink-faint)" }}>{k}</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-ghost text-[13px] px-3 py-2 rounded-lg flex-1" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary text-[13px] px-3 py-2 rounded-lg flex-1" onClick={save}>Save Role</button>
          </div>
        </Modal>
      )}

      {confirmDel && (
        <Modal title="Delete role" onClose={() => setConfirmDel(null)}>
          <p className="text-[13.5px] mb-4" style={{ color: "var(--ink-soft)" }}>
            ลบ role <b className="mono" style={{ color: "var(--alarm)" }}>{confirmDel}</b>? ถ้ามี user ใช้ role นี้อยู่จะ login แล้วไม่มีสิทธิ์ — เปลี่ยน role ของ user พวกนั้นก่อน
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost text-[13px] px-3 py-2 rounded-lg flex-1" onClick={() => setConfirmDel(null)}>Cancel</button>
            <button className="text-[13px] px-3 py-2 rounded-lg flex-1" style={{ background: "var(--alarm-bg)", color: "var(--alarm)" }} onClick={remove}>Delete</button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
