import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Audit log (Supabase-only). Client sends { action, detail };
 * the server stamps who / role / IP / browser — never trust client values.
 */

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server not configured: missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function caller() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const svc = serviceClient();
  const { data: profile } = await svc
    .from("profiles")
    .select("email, role")
    .eq("id", user.id)
    .single();
  return {
    user,
    email: (profile?.email as string) ?? user.email ?? "",
    role: (profile?.role as string) ?? "",
  };
}

async function canView(role: string) {
  if (role === "admin") return true;
  const svc = serviceClient();
  const { data: roleRow } = await svc.from("roles").select("permissions").eq("name", role).single();
  return (roleRow?.permissions as Record<string, boolean> | undefined)?.["users.manage"] === true;
}

/** Append one audit event. Body: { action, detail } */
export async function POST(req: Request) {
  try {
    const who = await caller();
    if (!who) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { action, detail } = (await req.json()) as { action?: string; detail?: string };
    if (!action || typeof action !== "string")
      return NextResponse.json({ error: "Missing action" }, { status: 400 });
    const fwd = req.headers.get("x-forwarded-for");
    const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
    const ua = (req.headers.get("user-agent") || "").slice(0, 300);
    const svc = serviceClient();
    const { error } = await svc.from("activity_log").insert({
      user_id: who.user.id,
      email: who.email,
      role: who.role,
      action: action.slice(0, 64),
      detail: (detail ?? "").slice(0, 500),
      ip,
      user_agent: ua,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Log failed" }, { status: 500 });
  }
}

/** Latest 200 events, admin (users.manage) only. */
export async function GET() {
  try {
    const who = await caller();
    if (!who) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await canView(who.role)))
      return NextResponse.json({ error: "Forbidden (needs users.manage)" }, { status: 403 });
    const svc = serviceClient();
    const { data, error } = await svc
      .from("activity_log")
      .select("id, email, role, action, detail, ip, user_agent, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ rows: data ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Read failed" }, { status: 500 });
  }
}
