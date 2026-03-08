/**
 * Runtime environment validation using Zod.
 * Validates all required env vars at startup so we fail fast
 * instead of getting cryptic errors deep in the app.
 */

import { z } from "zod";

const envSchema = z.object({
  // Supabase (required for all functionality)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL")
    .min(1),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),

  // Sentry (optional — monitoring)
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal("")),

  // ElevenLabs (optional — voice AI)
  NEXT_PUBLIC_ELEVENLABS_API_KEY: z.string().optional(),

  // App config
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables. Call once at app startup.
 * Returns validated env object or throws with descriptive error.
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const missing = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
      .join("\n");

    console.error(`\n❌ Invalid environment variables:\n${missing}\n`);

    // In development, warn but don't crash (allows running without Supabase)
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️  Running in development mode with missing env vars. Some features will be disabled.\n");
      return envSchema.parse({
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dev-anon-key",
      });
    }

    throw new Error(`Invalid environment variables:\n${missing}`);
  }

  return result.data;
}

/** Singleton validated env */
let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}
