import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { validateEnv } from "../lib/env-validation";

describe("env-validation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Create a fresh copy of env for each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns empty array when all required vars are set (development)", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    const missing = validateEnv();
    expect(missing).toEqual([]);
  });

  it("returns missing vars when SUPABASE_URL is not set", () => {
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    const missing = validateEnv();
    expect(missing).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("returns missing vars when SUPABASE_ANON_KEY is not set", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const missing = validateEnv();
    expect(missing).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it("checks production-only vars when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    // Don't set production-only vars
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    delete process.env.PORTAL_SECRET;

    const missing = validateEnv();
    expect(missing).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(missing).toContain("RESEND_API_KEY");
    expect(missing).toContain("NEXT_PUBLIC_SENTRY_DSN");
    expect(missing).toContain("PORTAL_SECRET");
  });

  it("returns empty array when all production vars are set", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://sentry.io/123";
    process.env.PORTAL_SECRET = "super-secret-key";

    const missing = validateEnv();
    expect(missing).toEqual([]);
  });

  it("does not check production-only vars in development", () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.RESEND_API_KEY;

    const missing = validateEnv();
    expect(missing).toEqual([]);
  });
});
