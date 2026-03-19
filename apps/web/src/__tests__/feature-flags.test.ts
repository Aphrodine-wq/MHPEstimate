/**
 * Tests for the feature flag system from @mhp/shared.
 * Located in apps/web tests due to filesystem constraints on packages/shared/__tests__.
 */
import { describe, it, expect } from "vitest";
import {
  DEFAULT_FLAGS,
  resolveFlags,
  isFeatureEnabled,
  type FeatureFlags,
} from "@proestimate/shared";

describe("DEFAULT_FLAGS", () => {
  it("has all expected flag keys", () => {
    const expectedKeys: (keyof FeatureFlags)[] = [
      "voice_ai", "dark_mode", "ml_pricing", "ocr_invoices",
      "mobile_app", "multi_tier", "realtime_collab",
      "document_export", "analytics", "change_orders",
      "portal_access", "auto_estimate", "photo_estimate",
      "win_prediction", "quickbooks_integration", "material_cart_links",
      "job_scheduling", "docusign_integration",
    ];
    for (const key of expectedKeys) {
      expect(key in DEFAULT_FLAGS).toBe(true);
    }
  });

  it("has boolean values only", () => {
    for (const value of Object.values(DEFAULT_FLAGS)) {
      expect(typeof value).toBe("boolean");
    }
  });

  it("has sensible defaults — core on, experimental off", () => {
    expect(DEFAULT_FLAGS.voice_ai).toBe(true);
    expect(DEFAULT_FLAGS.multi_tier).toBe(true);
    expect(DEFAULT_FLAGS.document_export).toBe(true);
    expect(DEFAULT_FLAGS.dark_mode).toBe(false);
    expect(DEFAULT_FLAGS.ml_pricing).toBe(false);
    expect(DEFAULT_FLAGS.mobile_app).toBe(false);
  });
});

describe("resolveFlags", () => {
  it("returns defaults when no remote flags", () => {
    expect(resolveFlags()).toEqual(DEFAULT_FLAGS);
    expect(resolveFlags(undefined)).toEqual(DEFAULT_FLAGS);
  });

  it("overrides defaults with remote flags", () => {
    const flags = resolveFlags({ dark_mode: true, ml_pricing: true });
    expect(flags.dark_mode).toBe(true);
    expect(flags.ml_pricing).toBe(true);
    expect(flags.voice_ai).toBe(DEFAULT_FLAGS.voice_ai);
  });

  it("remote false overrides default true", () => {
    expect(resolveFlags({ voice_ai: false }).voice_ai).toBe(false);
  });

  it("handles empty remote object", () => {
    expect(resolveFlags({})).toEqual(DEFAULT_FLAGS);
  });

  it("handles full override to all-true", () => {
    const allTrue: FeatureFlags = {
      voice_ai: true, dark_mode: true, ml_pricing: true,
      ocr_invoices: true, mobile_app: true, multi_tier: true,
      realtime_collab: true, document_export: true,
      analytics: true, change_orders: true,
      portal_access: true, auto_estimate: true, photo_estimate: true,
      win_prediction: true, quickbooks_integration: true,
      material_cart_links: true, job_scheduling: true,
      docusign_integration: true,
    };
    const flags = resolveFlags(allTrue);
    for (const v of Object.values(flags)) expect(v).toBe(true);
  });
});

describe("isFeatureEnabled", () => {
  it("returns true for enabled features", () => {
    expect(isFeatureEnabled(DEFAULT_FLAGS, "voice_ai")).toBe(true);
  });

  it("returns false for disabled features", () => {
    expect(isFeatureEnabled(DEFAULT_FLAGS, "dark_mode")).toBe(false);
  });

  it("works with resolved flags", () => {
    const flags = resolveFlags({ dark_mode: true });
    expect(isFeatureEnabled(flags, "dark_mode")).toBe(true);
  });

  it("checks each flag independently", () => {
    const flags = resolveFlags({ voice_ai: false, dark_mode: true });
    expect(isFeatureEnabled(flags, "voice_ai")).toBe(false);
    expect(isFeatureEnabled(flags, "dark_mode")).toBe(true);
    expect(isFeatureEnabled(flags, "analytics")).toBe(true);
  });
});
