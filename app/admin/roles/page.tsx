"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Modal, { FormError } from "@/components/Modal";
import StatusPill from "@/components/StatusPill";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { createRole, deleteRole, getSession, listRoles, updateRole, withPermissions, type Session } from "@/lib/store";
import { PERMISSION_KEYS, type RoleRow } from "@/lib/types";

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
    setFormError(null);
    setOpen(true);
  }
  function startEdit(r: RoleRow) {
    setEditing(r);
    setName(r.name);
    setDisplay(r.display_name);
    setPerms({ ...emptyPerms(), ...r.permissions });
    setFormError(null);
    setOpen(true);
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

  return (
    <AppShell crumb="Roles" mascot="Create custom roles — tick only the permissions each role needs.">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[19px] font-bold">Roles</div>
          <div className="text-[13px]" style={{ color: "var(--ink-soft)" }}>Create custom roles and control permissions per role</div>
        </div>
        <button className="btn-primary text-[13px] px-4 py-2.5 rounded-lg" onClick={startAdd}>+ New Role</button>
      </div>

      {error && <div className="text-[12.5px] font-medium px-3 py-2 rounded-lg mb-4" style={{ background: "var(--alarm-bg)", color: "var(--alarm)" }}>{error}</div>}

      <div className="grid grid-cols-3 gap-4">
        {roles.map((r) => {
          const onCount = Object.values(r.permissions).filter(Boolean).length;
          return (
            <div className="card p-5" key={r.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-bold text-[15px]">{r.display_name || r.name}</div>
                {r.is_builtin
                  ? <span className="pill" style={{ background: "var(--gold-bg)", color: "var(--gold-soft)" }}>built-in</span>
                  : <span className="pill" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>custom</span>}
              </div>
              <div className="mono text-[11.5px] mb-3" style={{ color: "var(--ink-faint)" }}>{r.name} · {onCount}/{PERMISSION_KEYS.length} permissions</div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {PERMISSION_KEYS.filter((p) => r.permissions[p.key]).map((p) => (
                  <span key={p.key} className="pill" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}>{p.key}</span>
                ))}
                {onCount === 0 && <StatusPill status="Stop" />}
              </div>
              <div className="flex gap-2">
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
            <div className="field"><label>Role name * (a-z, 0-9, -, _ ห้ามซ้ำ เช่น supervisor)</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="supervisor" />
            </div>
          )}
          <div className="field"><label>Display name *</label>
            <input value={display} onChange={(e) => setDisplay(e.target.value)} placeholder="Supervisor" />
          </div>
          <div className="field"><label>Permissions</label>
            <div className="flex flex-col gap-2 mt-1">
              {PERMISSION_KEYS.map((p) => (
                <label key={p.key} className="flex items-center gap-2.5 text-[13px] cursor-pointer" style={{ color: "var(--ink-soft)" }}>
                  <input
                    type="checkbox"
                    checked={perms[p.key] === true}
                    onChange={(e) => setPerms({ ...perms, [p.key]: e.target.checked })}
                    style={{ width: 15, height: 15, accentColor: "#F0BD4B" }}
                  />
                  <span className="mono text-[12px]" style={{ color: "var(--ink-faint)" }}>{p.key}</span> {p.label}
                </label>
              ))}
            </div>
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
