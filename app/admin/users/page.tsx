"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import ExportCsvButton from "@/components/ExportCsvButton";
import Modal, { FormError } from "@/components/Modal";
import {
  createClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import {
  demoAddedEmails, demoEmails, demoRoleOf, deleteDemoUser, getSession, hasPermission, listRoles, setDemoRole,
  withPermissions, type Session,
} from "@/lib/store";

interface UserRow {
  email: string;
  name: string;
  role: string;
  id: string;
}

function rolePill(role: string) {
  if (role === "admin")
    return <span className="pill" style={{ background: "var(--gold-bg)", color: "var(--gold-soft)" }}><span className="dot" style={{ background: "var(--gold)", color: "var(--gold)" }} />Admin</span>;
  if (role === "technician")
    return <span className="pill" style={{ background: "var(--ok-bg)", color: "var(--ok)" }}><span className="dot" style={{ background: "var(--ok)", color: "var(--ok)" }} />Technician</span>;
  if (role === "viewer")
    return <span className="pill" style={{ background: "var(--stop-bg)", color: "var(--stop)" }}><span className="dot" style={{ background: "var(--stop)", color: "var(--stop)" }} />Viewer</span>;
  return <span className="pill" style={{ background: "rgba(111,195,184,0.13)", color: "#6FC3B8" }}><span className="dot" style={{ background: "#6FC3B8", color: "#6FC3B8" }} />{role}</span>;
}

export default function UsersPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState(() => {
    try { return listRoles(); } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ email: string; role: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("technician");
  const [addError, setAddError] = useState<string | null>(null);
  const [confirmDelUser, setConfirmDelUser] = useState<UserRow | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const [{ data: profiles }, { data: roleRows }] = await Promise.all([
          supabase.from("profiles").select("id, email, role, display_name").order("email"),
          supabase.from("roles").select("name, display_name, permissions, is_builtin").order("name"),
        ]);
        if (roleRows) setRoles(roleRows as typeof roles);
        setUsers((profiles ?? []).map((p) => ({
          email: p.email, name: p.display_name || p.email.split("@")[0], role: p.role, id: p.id,
        })));
      } else {
        setUsers(demoEmails().map((email, i) => ({
          email,
          name: email === "admin@test.com" ? "Kaito T." : email === "technician@test.com" ? "Anan P." : email.split("@")[0],
          role: demoRoleOf(email),
          id: `demo-${i}`,
        })));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const raw = getSession();
    setSession(raw ? withPermissions(raw) : null);
    try { setRoles(listRoles()); } catch { /* ignore */ }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyRole() {
    if (!confirm || !session) return;
    setError(null);
    try {
      if (isSupabaseConfigured()) {
        const supabase = createClient();
        const { error } = await supabase.from("profiles").update({ role: confirm.role }).eq("email", confirm.email);
        if (error) throw new Error(error.message);
      } else {
        setDemoRole(confirm.email, confirm.role);
      }
      setConfirm(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "เปลี่ยน role ไม่สำเร็จ");
      setConfirm(null);
    }
  }

  async function addUser() {
    setAddError(null);
    try {
      const email = newEmail.trim().toLowerCase();
      if (!email) throw new Error("กรุณากรอกอีเมล");
      if (newPass.length < 6) throw new Error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      if (isSupabaseConfigured()) {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: newPass, role: newRole, display_name: newName.trim() || undefined }),
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "สร้าง user ไม่สำเร็จ");
      } else {
        setDemoRole(email, newRole);
      }
      setAddOpen(false);
      setNewEmail("");
      setNewPass("");
      setNewName("");
      await refresh();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "สร้าง user ไม่สำเร็จ");
    }
  }

  async function removeUser() {
    if (!confirmDelUser) return;
    setError(null);
    try {
      if (isSupabaseConfigured()) {
        if (confirmDelUser.id.startsWith("demo-")) throw new Error("แถวนี้เป็น demo fallback — ไม่มีใน Supabase");
        const res = await fetch(`/api/admin/users?id=${encodeURIComponent(confirmDelUser.id)}`, { method: "DELETE" });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "ลบ user ไม่สำเร็จ");
      } else {
        deleteDemoUser(confirmDelUser.email);
      }
      setConfirmDelUser(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ลบ user ไม่สำเร็จ");
      setConfirmDelUser(null);
    }
  }

  const admins = users.filter((u) => u.role === "admin").length;
  const canManage = session ? hasPermission(session, "users.manage") : false;
  const canRoles = session ? hasPermission(session, "roles.manage") : false;

  return (
    <AppShell crumb="Users" mascot="Manage roles carefully — changes apply on next login.">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[19px] font-bold">Users</div>
          <div className="text-[13px]" style={{ color: "var(--ink-soft)" }}>Assign roles — users sign in via Supabase Auth (passwords stored hashed)</div>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton filename="users.csv" rows={users} />
          {canManage && <button className="btn-primary text-[13px] px-4 py-2 rounded-lg" onClick={() => { setAddError(null); setNewRole(roles[0]?.name ?? "technician"); setAddOpen(true); }}>+ Add User</button>}
          {canRoles && <Link href="/admin/roles" className="btn-ghost text-[13px] px-4 py-2 rounded-lg">Manage Roles</Link>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>Total users</div><div className="text-[26px] font-bold">{users.length}</div></div>
        <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>Admins</div><div className="text-[26px] font-bold" style={{ color: "var(--gold-soft)" }}>{admins}</div></div>
        <div className="card p-4"><div className="text-[12px] mb-2" style={{ color: "var(--ink-soft)" }}>Other roles</div><div className="text-[26px] font-bold" style={{ color: "var(--ok)" }}>{users.length - admins}</div></div>
      </div>

      {error && <div className="text-[12.5px] font-medium px-3 py-2 rounded-lg mb-4" style={{ background: "var(--alarm-bg)", color: "var(--alarm)" }}>{error}</div>}

      <div className="card">
        <div className="px-5 py-4 border-b font-semibold text-[14.5px]" style={{ borderColor: "var(--line)" }}>
          All users {loading && <span className="text-[12px] font-normal" style={{ color: "var(--ink-faint)" }}>· loading...</span>}
        </div>
        <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th>User</th><th>Role</th><th>User ID</th><th>Change role</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email}>
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0" style={{ background: "linear-gradient(135deg,#2C4A38,#16261D)", color: "var(--gold-soft)" }}>
                      {u.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{u.name} {session?.email === u.email && <span className="pill ml-1" style={{ background: "var(--gold-bg)", color: "var(--gold-soft)" }}>you</span>}</div>
                      <div className="text-[11.5px] mono" style={{ color: "var(--ink-faint)" }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>{rolePill(u.role)} <span className="mono text-[11px] ml-1" style={{ color: "var(--ink-faint)" }}>{u.role}</span></td>
                <td className="mono text-[12px]" style={{ color: "var(--ink-soft)" }}>{u.id.slice(0, 8)}…</td>
                <td>
                  {canManage && session?.email !== u.email ? (
                    <select
                      className="text-[12.5px] px-2.5 py-1.5 rounded-md"
                      value={u.role}
                      onChange={(e) => { if (e.target.value !== u.role) setConfirm({ email: u.email, role: e.target.value }); }}
                    >
                      {roles.map((r) => <option key={r.name} value={r.name}>{r.display_name || r.name}</option>)}
                    </select>
                  ) : (
                    <span className="text-[12px]" style={{ color: "var(--ink-faint)" }}>{session?.email === u.email ? "ห้ามเปลี่ยน role ตัวเอง" : "—"}</span>
                  )}
                </td>
                <td className="text-right pr-4">
                  {canManage && session?.email !== u.email && (
                    <span className="text-[12px]" style={{ color: "var(--alarm)", cursor: "pointer" }} onClick={() => setConfirmDelUser(u)}>Delete</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && <tr><td colSpan={5} className="text-center" style={{ color: "var(--ink-faint)" }}>No users found</td></tr>}
          </tbody>
        </table>
        </div>
      </div>

      <details className="card mt-6 px-5 py-4 text-[12.5px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        <summary className="cursor-pointer font-semibold text-[13px]" style={{ color: "var(--ink)" }}>รีเซ็ตรหัสผ่าน (ทำใน Supabase Dashboard)</summary>
        <ol className="list-decimal ml-5 mt-2">
          <li>Authentication → Users → เลือก user → Reset password (รหัสเก็บแบบ hash อัตโนมัติ)</li>
          <li>สร้าง/ลบ user ทำได้จากปุ่มบนหน้านี้ (ต้องตั้ง SUPABASE_SERVICE_ROLE_KEY ฝั่ง server ก่อน)</li>
        </ol>
      </details>

      {confirmDelUser && (
        <Modal title="Delete user" onClose={() => setConfirmDelUser(null)}>
          <p className="text-[13.5px] mb-4" style={{ color: "var(--ink-soft)" }}>
            ลบ <b style={{ color: "var(--ink)" }}>{confirmDelUser.email}</b>? จะลบ auth user + ข้อมูล profile ถาวร
            {isSupabaseConfigured() ? "" : " (demo mode: ลบได้เฉพาะ user ที่สร้างเพิ่ม)"}
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost text-[13px] px-3 py-2 rounded-lg flex-1" onClick={() => setConfirmDelUser(null)}>Cancel</button>
            <button className="text-[13px] px-3 py-2 rounded-lg flex-1" style={{ background: "var(--alarm-bg)", color: "var(--alarm)" }} onClick={removeUser}>Delete</button>
          </div>
        </Modal>
      )}

      {addOpen && (
        <Modal title="Add User" onClose={() => setAddOpen(false)}>
          <FormError message={addError} />
          <div className="field"><label>Email *</label>
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="tech2@test.com" autoComplete="off" />
          </div>
          <div className="field"><label>Password * (≥6 ตัวอักษร, เก็บแบบ hash ฝั่ง Supabase Auth)</label>
            <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="••••••" autoComplete="new-password" />
          </div>
          <div className="field"><label>Display name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Suda K." />
          </div>
          <div className="field"><label>Role</label>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
              {roles.map((r) => <option key={r.name} value={r.name}>{r.display_name || r.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-ghost text-[13px] px-3 py-2 rounded-lg flex-1" onClick={() => setAddOpen(false)}>Cancel</button>
            <button className="btn-primary text-[13px] px-3 py-2 rounded-lg flex-1" onClick={addUser}>Create User</button>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title="Confirm role change" onClose={() => setConfirm(null)}>
          <FormError message={null} />
          <p className="text-[13.5px] mb-4" style={{ color: "var(--ink-soft)" }}>
            เปลี่ยน <b style={{ color: "var(--ink)" }}>{confirm.email}</b> เป็น role <b style={{ color: "var(--gold-soft)" }}>{confirm.role}</b>? มีผลครั้งถัดไปที่ user login
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost text-[13px] px-3 py-2 rounded-lg flex-1" onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn-primary text-[13px] px-3 py-2 rounded-lg flex-1" onClick={applyRole}>Confirm</button>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
