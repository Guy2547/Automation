import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Admin-only user management. Uses the SERVICE ROLE key server-side only
 * (never NEXT_PUBLIC_) so browsers never see it.
 * Requires env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server not configured: missing SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function requireUserManager() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const svc = serviceClient();
  const { data: profile } = await svc.from("profiles").select("role").eq("id", user.id).single();
  const role = (profile?.role as string) ?? "";
  if (role === "admin") return { user, role };
  const { data: roleRow } = await svc.from("roles").select("permissions").eq("name", role).single();
  const perms = (roleRow?.permissions ?? {}) as Record<string, boolean>;
  if (perms["users.manage"] !== true) return null;
  return { user, role };
}

/** Create auth user + profile row. Body: { email, password, role, display_name } */
export async function POST(req: Request) {
  try {
    const gate = await requireUserManager();
    if (!gate) return NextResponse.json({ error: "Forbidden (needs users.manage)" }, { status: 403 });
    const { email, password, role, display_name } = (await req.json()) as {
      email?: string;
      password?: string;
      role?: string;
      display_name?: string;
    };
    if (!email || !password || password.length < 6)
      return NextResponse.json({ error: "กรุณากรอกอีเมลและรหัสผ่าน (≥6 ตัวอักษร)" }, { status: 400 });

    const svc = serviceClient();
    const { data: roleRow } = await svc.from("roles").select("name").eq("name", role ?? "technician").single();
    const finalRole = roleRow?.name ?? "technician";

    const { data, error } = await svc.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { display_name: display_name?.trim() || undefined },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const { error: pErr } = await svc.from("profiles").upsert({
      id: data.user.id,
      email: email.trim().toLowerCase(),
      role: finalRole,
      display_name: display_name?.trim() || email.split("@")[0],
    });
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Create user failed" }, { status: 500 });
  }
}

/** Delete auth user (profiles row cascades). ?id=<auth uuid> */
export async function DELETE(req: Request) {
  try {
    const gate = await requireUserManager();
    if (!gate) return NextResponse.json({ error: "Forbidden (needs users.manage)" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (id === gate.user.id)
      return NextResponse.json({ error: "ห้ามลบตัวเอง" }, { status: 400 });
    const svc = serviceClient();
    const { error } = await svc.auth.admin.deleteUser(id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Delete user failed" }, { status: 500 });
  }
}
