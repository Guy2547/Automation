"use client";

import { isSupabaseConfigured } from "./supabase/client";
import { getSession } from "./store";

/** Audit actions tracked (admin-only view at /admin/activity). */
export type ActivityAction =
  | "login"
  | "logout"
  | "machine.create"
  | "machine.update"
  | "machine.delete"
  | "alarm.report"
  | "alarm.status"
  | "alarm.delete"
  | "maintenance.create"
  | "maintenance.update"
  | "maintenance.delete"
  | "user.create"
  | "user.role"
  | "user.delete"
  | "role.create"
  | "role.update"
  | "role.delete";

export interface ActivityEvent {
  id: string;
  email: string;
  role: string;
  action: string;
  detail: string;
  ip: string;
  user_agent: string;
  created_at: string;
}

const LS_KEY = "amms.activity";
const MAX_ROWS = 200;

function readLocal(): ActivityEvent[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const rows = JSON.parse(raw) as ActivityEvent[];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function writeLocal(rows: ActivityEvent[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows.slice(0, MAX_ROWS)));
  } catch {
    /* storage full or unavailable — audit must never break the main flow */
  }
}

/** Fire-and-forget: never throws. Demo mode stores in localStorage, Supabase mode POSTs to /api/activity. */
export async function logActivity(action: ActivityAction, detail = ""): Promise<void> {
  try {
    if (!isSupabaseConfigured()) {
      const s = getSession();
      const row: ActivityEvent = {
        id: `local-${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`,
        email: s?.email ?? "",
        role: s?.role ?? "",
        action,
        detail,
        ip: "local",
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : "",
        created_at: new Date().toISOString(),
      };
      writeLocal([row, ...readLocal()]);
      return;
    }
    await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, detail }),
    });
  } catch {
    /* audit must never break the main flow */
  }
}

/** Admin-only read. Demo mode reads from localStorage. */
export async function fetchActivity(): Promise<ActivityEvent[]> {
  if (!isSupabaseConfigured()) return readLocal();
  const res = await fetch("/api/activity", { method: "GET" });
  if (!res.ok) return [];
  const body = (await res.json()) as { rows?: ActivityEvent[] };
  return body.rows ?? [];
}
