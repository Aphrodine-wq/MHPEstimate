import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("validateEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("validates correct production env", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    const { validateEnv } = await import("../lib/env");
    const env = validateEnv();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("test-anon-key");
    expect(env.NODE_ENV).toBe("production");
  });

  it("throws in production with missing required vars", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { validateEnv } = await import("../lib/env");
    expect(() => validateEnv()).toThrow("Invalid environment variables");
  });

  it("falls back gracefully in development", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { validateEnv } = await import("../lib/env");
    // Should not throw in dev mode
    const env = validateEnv();
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("http://localhost:54321");
  });

  it("accepts optional Sentry DSN", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://abc@sentry.io/123";
    const { validateEnv } = await import("../lib/env");
    const env = validateEnv();
    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBe("https://abc@sentry.io/123");
  });

  it("accepts empty string for optional Sentry DSN", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
    process.env.NEXT_PUBLIC_SENTRY_DSN = "";
    const { validateEnv } = await import("../lib/env");
    const env = validateEnv();
    expect(env.NEXT_PUBLIC_SENTRY_DSN).toBe("");
  });
});
