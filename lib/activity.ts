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
const IP_CACHE_KEY = "amms.client-ip";
const IP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function readCachedIp(): string | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(IP_CACHE_KEY);
    if (!raw) return null;
    const { ip, exp } = JSON.parse(raw) as { ip?: string; exp?: number };
    if (typeof ip === "string" && ip && typeof exp === "number" && exp > Date.now()) return ip;
    return null;
  } catch {
    return null;
  }
}

function writeCachedIp(ip: string) {
  try {
    localStorage.setItem(IP_CACHE_KEY, JSON.stringify({ ip, exp: Date.now() + IP_CACHE_TTL_MS }));
  } catch {
    /* ignore */
  }
}

/** Public IP via ipify (cached 24h). Falls back to "local" when offline/blocked. */
async function getClientIp(): Promise<string> {
  try {
    if (typeof window === "undefined" || typeof fetch === "undefined") return "local";
    const cached = readCachedIp();
    if (cached) return cached;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2000);
    try {
      const res = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
      if (!res.ok) return "local";
      const body = (await res.json()) as { ip?: string };
      const ip = (body.ip ?? "").trim();
      if (/^[\d.a-fA-F:.]+$/.test(ip) && ip.length <= 45) {
        writeCachedIp(ip);
        return ip;
      }
      return "local";
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return "local";
  }
}

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
      const ip = await getClientIp();
      const row: ActivityEvent = {
        id: `local-${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`,
        email: s?.email ?? "",
        role: s?.role ?? "",
        action,
        detail,
        ip,
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
