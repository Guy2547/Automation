import { createBrowserClient } from "@supabase/ssr";

export function isSupabaseConfigured() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!url || !key) return false;
  // Treat template placeholders as unconfigured so local dev falls back to demo mode
  // instead of firing requests at a dummy URL and surfacing a misleading bad-password error.
  if (url.includes("your-project") || key.includes("your-anon-key")) return false;
  if (!/^https:\/\/.+\.supabase\.co\/?$/.test(url)) return false;
  if (key.length < 20) return false;
  return true;
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
