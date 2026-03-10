import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { getEnv } from "./env";

/**
 * Extracts and validates the Supabase auth session from an incoming API request.
 *
 * Supports two auth mechanisms (in priority order):
 * 1. Authorization: Bearer <token> header — used by programmatic clients
 * 2. Cookie-based session — used by the browser (reads sb-*-auth-token cookie)
 *
 * Uses the ANON key (not service role) so RLS is respected during auth validation.
 *
 * @returns { user, error } — user is null when unauthenticated or on error
 */
export async function getAuthUser(request: NextRequest) {
  const env = getEnv();

  // --- Attempt 1: Bearer token from Authorization header ---
  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (bearerToken) {
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: { user }, error } = await supabase.auth.getUser(bearerToken);
    return { user, error };
  }

  // --- Attempt 2: Cookie-based session (browser requests) ---
  // Find the Supabase auth cookie — it follows the pattern sb-<project-ref>-auth-token
  // or the legacy supabase-auth-token name.
  const cookies = request.cookies.getAll();
  const authCookie = cookies.find(
    (c) => c.name.startsWith("sb-") && c.name.endsWith("-auth-token")
  );

  if (authCookie) {
    try {
      // The cookie value is a JSON array: [access_token, refresh_token, ...]
      const parsed: unknown = JSON.parse(authCookie.value);
      const accessToken =
        Array.isArray(parsed) && typeof parsed[0] === "string"
          ? parsed[0]
          : typeof parsed === "object" && parsed !== null && "access_token" in parsed
          ? (parsed as { access_token: string }).access_token
          : null;

      if (accessToken) {
        const supabase = createClient(
          env.NEXT_PUBLIC_SUPABASE_URL,
          env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );
        const { data: { user }, error } = await supabase.auth.getUser(accessToken);
        return { user, error };
      }
    } catch {
      // Cookie value malformed — fall through to unauthenticated
    }
  }

  return { user: null, error: new Error("No valid auth token found") };
}

const ALLOWED_DOMAIN = "@northmshomepros.com";

/**
 * Server-side domain restriction check.
 * Returns true if the user's email belongs to the allowed domain.
 */
export function isAllowedDomain(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN);
}
