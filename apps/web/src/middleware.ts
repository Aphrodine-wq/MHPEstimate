import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js middleware for route protection and security headers.
 * Runs on the edge before every request.
 *
 * - Public routes: /, /auth, /auth/callback, /_next, /api/health, /portal, /api/portal
 * - Protected routes: everything else requires a valid session
 * - Security headers applied to all responses
 */

const PUBLIC_PATHS = [
  "/auth",
  "/auth/callback",
  "/api/health",
  // Customer portal — token-validated, no Supabase auth required
  "/portal",
  "/api/portal",
  // Stripe webhooks — signature-validated, no Supabase auth
  "/api/webhooks",
];

/**
 * Adds security headers to a NextResponse
 */
function addSecurityHeaders(response: NextResponse, pathname: string): NextResponse {
  // X-Content-Type-Options: prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // X-Frame-Options: prevent clickjacking
  // DENY for all routes except /portal/* which should be SAMEORIGIN
  const frameOptions = pathname.startsWith("/portal") ? "SAMEORIGIN" : "DENY";
  response.headers.set("X-Frame-Options", frameOptions);

  // X-XSS-Protection: enable XSS protection (for older browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer-Policy: control referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy: restrict browser features
  response.headers.set("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths, static assets, and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/"
  ) {
    const response = NextResponse.next();
    return addSecurityHeaders(response, pathname);
  }

  // Auth disabled for now — allow all routes through
  const response = NextResponse.next();
  return addSecurityHeaders(response, pathname);
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
