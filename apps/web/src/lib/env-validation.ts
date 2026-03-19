/**
 * Environment variable validation for the MHPEstimate web app.
 * Call validateEnv() from instrumentation.ts or middleware on startup.
 * Logs warnings for missing variables and returns array of missing keys.
 */

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const REQUIRED_IN_PRODUCTION = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_SENTRY_DSN",
  "PORTAL_TOKEN_SECRET",
] as const;

/**
 * Validates that required environment variables are set.
 * Logs warnings for missing variables.
 * @returns Array of missing environment variable keys (empty if all present)
 */
export function validateEnv(): string[] {
  const missing: string[] = [];

  // Check required in all environments
  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  // Check additionally required in production
  if (process.env.NODE_ENV === "production") {
    for (const key of REQUIRED_IN_PRODUCTION) {
      if (!process.env[key]) {
        missing.push(key);
      }
    }
  }

  // Log warning if any are missing
  if (missing.length > 0) {
    console.error(
      `⚠️  Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return missing;
}
