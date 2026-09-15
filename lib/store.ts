"use client";

import { createClient, isSupabaseConfigured } from "./supabase/client";
import { seedAlarms, seedMachines, seedMaintenance } from "./mock";
import { DEMO_ROLE_PERMS, seedRoles, type Alarm, type Machine, type MaintenanceRecord, type Role, type RoleRow } from "./types";

export interface Session {
  email: string;
  role: Role;
  name: string;
  permissions?: Record<string, boolean>;
}

const S_KEY = "amms.session";
const M_KEY = "amms.machines";
const A_KEY = "amms.alarms";
const T_KEY = "amms.maintenance";
const R_KEY = "amms.roles";
const U_KEY = "amms.user_roles"; // demo-mode email -> role overrides

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function write(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}
function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`;
}

export function ensureSeed() {
  if (!localStorage.getItem(M_KEY)) write(M_KEY, seedMachines);
  if (!localStorage.getItem(A_KEY)) write(A_KEY, seedAlarms);
  if (!localStorage.getItem(T_KEY)) write(T_KEY, seedMaintenance);
  if (!localStorage.getItem(R_KEY)) write(R_KEY, seedRoles);
}

/** Resolve effective permissions for a role (demo map; Supabase roles table when configured at login). */
export function permsFor(role: Role): Record<string, boolean> {
  if (DEMO_ROLE_PERMS[role]) return DEMO_ROLE_PERMS[role];
  try {
    const custom = listRoles().find((r) => r.name === role);
    if (custom) return custom.permissions;
  } catch {
    /* ignore */
  }
  return {};
}

export function hasPermission(session: Session | null, key: string): boolean {
  if (!session) return false;
  if (session.permissions) return session.permissions[key] === true;
  if (session.role === "admin") return true;
  return permsFor(session.role)[key] === true;
}

/** Backfill permissions for sessions stored before roles existed. */
export function withPermissions(s: Session): Session {
  if (s.permissions) return s;
  const out = { ...s, permissions: permsFor(s.role) };
  try {
    const cur = read<Session | null>(S_KEY, null);
    if (cur && cur.email === s.email) write(S_KEY, out);
  } catch {
    /* ignore */
  }
  return out;
}

/* ---------------- Auth ----------------
   Passwords are NEVER stored by this app. With Supabase configured,
   signInWithPassword is used (Supabase Auth stores only a bcrypt hash
   in auth.users). Without Supabase (demo mode) any password >= 6 chars
   is accepted and only the role is kept in localStorage. */
export async function login(email: string, password: string): Promise<Session> {
  email = email.trim().toLowerCase();
  if (!email || !password) throw new Error("กรุณากรอกอีเมลและรหัสผ่าน");
  if (password.length < 6) throw new Error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");

  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    const user = data.user;
    let role: Role = "technician";
    let name = email.split("@")[0];
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, display_name")
      .eq("id", user.id)
      .single();
    if (profile) {
      role = (profile.role as Role) ?? "technician";
      name = profile.display_name ?? name;
    } else if (email.startsWith("admin")) role = "admin";
    // permissions from roles table (fallback to demo map if migration not run yet)
    let permissions = permsFor(role);
    try {
      const { data: roleRow } = await supabase
        .from("roles")
        .select("permissions")
        .eq("name", role)
        .single();
      if (roleRow?.permissions) permissions = roleRow.permissions as Record<string, boolean>;
    } catch {
      /* keep fallback */
    }
    const s: Session = { email, role, name, permissions };
    write(S_KEY, s);
    return s;
  }

  // demo mode
  const overrides = read<Record<string, Role>>(U_KEY, {});
  let role: Role = "technician";
  let name = "Tech User";
  if (overrides[email]) {
    role = overrides[email];
    name = email.split("@")[0];
  } else if (email.startsWith("admin")) {
    role = "admin";
    name = "Kaito T.";
  } else if (email.startsWith("tech")) {
    role = "technician";
    name = "Anan P.";
  }
  const s: Session = { email, role, name, permissions: permsFor(role) };
  write(S_KEY, s);
  return s;
}

export async function logout() {
  try {
    if (isSupabaseConfigured()) await createClient().auth.signOut();
  } catch {
    /* ignore */
  }
  localStorage.removeItem(S_KEY);
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  return read<Session | null>(S_KEY, null);
}

/* ---------------- Machines ---------------- */
export function listMachines(): Machine[] {
  ensureSeed();
  return read<Machine[]>(M_KEY, seedMachines);
}
export function createMachine(input: Omit<Machine, "id" | "updated_at">): Machine {
  if (!input.machine_id.trim()) throw new Error("Machine ID ห้ามว่าง");
  if (!input.name.trim()) throw new Error("Machine Name ห้ามว่าง");
  const rows = listMachines();
  if (rows.some((m) => m.machine_id.toLowerCase() === input.machine_id.trim().toLowerCase()))
    throw new Error("Machine ID นี้มีอยู่แล้ว (ห้ามซ้ำ)");
  const row: Machine = { ...input, machine_id: input.machine_id.trim(), name: input.name.trim(), id: uid("m"), updated_at: "just now" };
  write(M_KEY, [row, ...rows]);
  return row;
}
export function updateMachine(id: string, patch: Partial<Machine>): Machine {
  const rows = listMachines();
  const i = rows.findIndex((m) => m.id === id);
  if (i < 0) throw new Error("ไม่พบเครื่องจักร");
  if (patch.machine_id) {
    const dup = rows.some(
      (m) => m.id !== id && m.machine_id.toLowerCase() === patch.machine_id!.trim().toLowerCase()
    );
    if (dup) throw new Error("Machine ID นี้มีอยู่แล้ว (ห้ามซ้ำ)");
  }
  if (patch.name !== undefined && !patch.name.trim()) throw new Error("Machine Name ห้ามว่าง");
  rows[i] = { ...rows[i], ...patch, updated_at: "just now" };
  write(M_KEY, rows);
  return rows[i];
}
export function deleteMachine(id: string) {
  write(M_KEY, listMachines().filter((m) => m.id !== id));
}

/* ---------------- Alarms ---------------- */
export function listAlarms(): Alarm[] {
  ensureSeed();
  return read<Alarm[]>(A_KEY, seedAlarms);
}
export function createAlarm(input: Omit<Alarm, "id">): Alarm {
  if (!input.machine_name.trim()) throw new Error("กรุณาระบุเครื่องจักร");
  if (!input.alarm_code.trim()) throw new Error("Alarm Code ห้ามว่าง");
  if (!input.description.trim()) throw new Error("Alarm Description ห้ามว่าง");
  const rows = listAlarms();
  if (rows.some((a) => a.alarm_code.toLowerCase() === input.alarm_code.trim().toLowerCase()))
    throw new Error("Alarm Code นี้มีอยู่แล้ว (ห้ามซ้ำ)");
  const row: Alarm = { ...input, id: uid("a") };
  write(A_KEY, [row, ...rows]);
  return row;
}
export function updateAlarm(id: string, patch: Partial<Alarm>): Alarm {
  const rows = listAlarms();
  const i = rows.findIndex((a) => a.id === id);
  if (i < 0) throw new Error("ไม่พบ alarm");
  rows[i] = { ...rows[i], ...patch };
  write(A_KEY, rows);
  return rows[i];
}
export function deleteAlarm(id: string) {
  write(A_KEY, listAlarms().filter((a) => a.id !== id));
}

/* ---------------- Maintenance ---------------- */
export function listMaintenance(): MaintenanceRecord[] {
  ensureSeed();
  return read<MaintenanceRecord[]>(T_KEY, seedMaintenance);
}
export function createMaintenance(input: Omit<MaintenanceRecord, "id">): MaintenanceRecord {
  if (!input.machine_name.trim()) throw new Error("กรุณาระบุเครื่องจักร");
  if (!input.problem.trim()) throw new Error("Problem ห้ามว่าง");
  if (!input.technician.trim()) throw new Error("Technician ห้ามว่าง");
  if (!input.date) throw new Error("กรุณาระบุวันที่");
  const row: MaintenanceRecord = { ...input, id: uid("t") };
  const rows = listMaintenance();
  write(T_KEY, [row, ...rows]);
  return row;
}
export function updateMaintenance(id: string, patch: Partial<MaintenanceRecord>): MaintenanceRecord {
  const rows = listMaintenance();
  const i = rows.findIndex((t) => t.id === id);
  if (i < 0) throw new Error("ไม่พบ maintenance record");
  rows[i] = { ...rows[i], ...patch };
  write(T_KEY, rows);
  return rows[i];
}
export function deleteMaintenance(id: string) {
  write(T_KEY, listMaintenance().filter((t) => t.id !== id));
}

/* ---------------- Roles ---------------- */
export function listRoles(): RoleRow[] {
  ensureSeed();
  return read<RoleRow[]>(R_KEY, seedRoles);
}
export function createRole(input: Omit<RoleRow, "is_builtin">): RoleRow {
  const name = input.name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!name) throw new Error("Role name ห้ามว่าง (a-z, 0-9, -, _)");
  if (!input.display_name.trim()) throw new Error("Display name ห้ามว่าง");
  const rows = listRoles();
  if (rows.some((r) => r.name === name)) throw new Error("Role นี้มีอยู่แล้ว (ห้ามซ้ำ)");
  const row: RoleRow = { name, display_name: input.display_name.trim(), permissions: input.permissions, is_builtin: false };
  write(R_KEY, [...rows, row]);
  return row;
}
export function updateRole(name: string, patch: Partial<RoleRow>): RoleRow {
  const rows = listRoles();
  const i = rows.findIndex((r) => r.name === name);
  if (i < 0) throw new Error("ไม่พบ role");
  rows[i] = { ...rows[i], ...patch, name };
  write(R_KEY, rows);
  return rows[i];
}
export function deleteRole(name: string) {
  const rows = listRoles();
  const target = rows.find((r) => r.name === name);
  if (!target) throw new Error("ไม่พบ role");
  if (target.is_builtin) throw new Error("ห้ามลบ built-in role (admin/technician/viewer)");
  write(R_KEY, rows.filter((r) => r.name !== name));
}
/** Demo-mode: override a user's role by email (real mode: update profiles in Supabase). */
export function setDemoRole(email: string, role: Role) {
  const overrides = read<Record<string, Role>>(U_KEY, {});
  overrides[email.trim().toLowerCase()] = role;
  write(U_KEY, overrides);
  const cur = read<Session | null>(S_KEY, null);
  if (cur && cur.email === email.trim().toLowerCase()) {
    write(S_KEY, { ...cur, role, permissions: permsFor(role) });
  }
}
export function demoEmails(): string[] {
  const overrides = read<Record<string, Role>>(U_KEY, {});
  const base = ["admin@test.com", "technician@test.com"];
  return [...new Set([...base, ...Object.keys(overrides)])];
}
export function demoRoleOf(email: string): Role {
  const overrides = read<Record<string, Role>>(U_KEY, {});
  if (overrides[email]) return overrides[email];
  if (email.startsWith("admin")) return "admin";
  return "technician";
}

/* ---------------- CSV ---------------- */
export function toCsv(rows: object[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0] as Record<string, unknown>);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc((r as Record<string, unknown>)[h])).join(","))].join("\n");
}
export function downloadCsv(filename: string, rows: object[]) {
  const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
