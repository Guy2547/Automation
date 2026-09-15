import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  )
    return NextResponse.next();

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Without Supabase env (demo mode) auth is enforced client-side.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return NextResponse.next();

  // With Supabase: check session cookie via @supabase/ssr indirectly.
  // We keep middleware light — page-level server checks + RLS enforce roles.
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/machines/:path*", "/alarms/:path*", "/maintenance/:path*", "/reports/:path*", "/admin/:path*"],
};
