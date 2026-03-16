/**
 * Next.js instrumentation hook.
 * Runs once when the server starts (Node.js runtime only).
 * Used for startup validation and initialization.
 */

import { validateEnv } from "./lib/env-validation";

export async function register() {
  // Validate required environment variables on startup
  const missingVars = validateEnv();

  if (missingVars.length > 0) {
    console.warn(
      `${missingVars.length} environment variable(s) missing. The application may not work correctly.`
    );
  }
}
