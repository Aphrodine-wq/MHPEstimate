import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware for route protection.
 * Runs on the edge before every request.
 *
 * - Public routes: /, /auth, /auth/callback, /_next, /api/health
 * - Protected routes: everything else requires a valid session
 */

const PUBLIC_PATHS = [
  "/auth",
  "/auth/callback",
  "/api/health",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths, static assets, and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Check for Supabase auth token in cookies.
  // Supabase v2 stores auth as `sb-<project-ref>-auth-token`.
  // We match any cookie starting with "sb-" and ending with "-auth-token".
  const allCookies = request.cookies.getAll();
  const supabaseAuthCookie = allCookies.find(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );

  if (!supabaseAuthCookie?.value) {
    // No auth token — redirect to auth page
    const authUrl = new URL("/", request.url);
    return NextResponse.redirect(authUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
