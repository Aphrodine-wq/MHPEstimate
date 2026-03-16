import { describe, it, expect } from "vitest";
import {
  signatureSchema,
  changeOrderCreateSchema,
  changeOrderUpdateSchema,
  changeOrderDeleteSchema,
  sendEstimateSchema,
  teamInviteSchema,
  declineSchema,
  portalChangeOrderSignSchema,
  validateBody,
} from "../lib/api-validation";

describe("api-validation schemas", () => {
  // ── signatureSchema ──
  describe("signatureSchema", () => {
    it("accepts valid signature data", () => {
      const result = signatureSchema.safeParse({
        signatureDataUrl: "data:image/png;base64,abc123",
        signerName: "John Doe",
        signerEmail: "john@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing signerName", () => {
      const result = signatureSchema.safeParse({
        signatureDataUrl: "data:image/png;base64,abc123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects oversized signature data (>500KB)", () => {
      const result = signatureSchema.safeParse({
        signatureDataUrl: "x".repeat(500_001),
        signerName: "John Doe",
      });
      expect(result.success).toBe(false);
    });

    it("allows optional signerEmail", () => {
      const result = signatureSchema.safeParse({
        signatureDataUrl: "data:image/png;base64,abc",
        signerName: "Jane",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email format", () => {
      const result = signatureSchema.safeParse({
        signatureDataUrl: "data:image/png;base64,abc",
        signerName: "Jane",
        signerEmail: "not-an-email",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── changeOrderCreateSchema ──
  describe("changeOrderCreateSchema", () => {
    it("accepts valid change order", () => {
      const result = changeOrderCreateSchema.safeParse({
        description: "Add extra bathroom tile work",
        cost_impact: 1500.0,
        timeline_impact: "2 additional days",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing description", () => {
      const result = changeOrderCreateSchema.safeParse({
        cost_impact: 500,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-finite cost_impact (Infinity)", () => {
      const result = changeOrderCreateSchema.safeParse({
        description: "Test",
        cost_impact: Infinity,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-finite cost_impact (NaN)", () => {
      const result = changeOrderCreateSchema.safeParse({
        description: "Test",
        cost_impact: NaN,
      });
      expect(result.success).toBe(false);
    });

    it("allows negative cost_impact (credit)", () => {
      const result = changeOrderCreateSchema.safeParse({
        description: "Removed countertop upgrade",
        cost_impact: -800,
      });
      expect(result.success).toBe(true);
    });

    it("allows null timeline_impact", () => {
      const result = changeOrderCreateSchema.safeParse({
        description: "Minor paint change",
        cost_impact: 0,
        timeline_impact: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects description over 2000 chars", () => {
      const result = changeOrderCreateSchema.safeParse({
        description: "x".repeat(2001),
        cost_impact: 100,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── changeOrderUpdateSchema ──
  describe("changeOrderUpdateSchema", () => {
    it("accepts valid update with status", () => {
      const result = changeOrderUpdateSchema.safeParse({
        change_order_id: "550e8400-e29b-41d4-a716-446655440000",
        status: "approved",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status value", () => {
      const result = changeOrderUpdateSchema.safeParse({
        change_order_id: "550e8400-e29b-41d4-a716-446655440000",
        status: "pending",
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-UUID change_order_id", () => {
      const result = changeOrderUpdateSchema.safeParse({
        change_order_id: "not-a-uuid",
        status: "approved",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── changeOrderDeleteSchema ──
  describe("changeOrderDeleteSchema", () => {
    it("accepts valid UUID", () => {
      const result = changeOrderDeleteSchema.safeParse({
        change_order_id: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-UUID", () => {
      const result = changeOrderDeleteSchema.safeParse({
        change_order_id: "abc123",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── sendEstimateSchema ──
  describe("sendEstimateSchema", () => {
    it("accepts valid send request", () => {
      const result = sendEstimateSchema.safeParse({
        to: "client@example.com",
        message: "Here is your estimate",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email", () => {
      const result = sendEstimateSchema.safeParse({
        to: "not-email",
      });
      expect(result.success).toBe(false);
    });

    it("rejects message over 5000 chars", () => {
      const result = sendEstimateSchema.safeParse({
        to: "test@test.com",
        message: "x".repeat(5001),
      });
      expect(result.success).toBe(false);
    });
  });

  // ── teamInviteSchema ──
  describe("teamInviteSchema", () => {
    it("accepts valid invite", () => {
      const result = teamInviteSchema.safeParse({
        email: "newguy@northmshomepros.com",
        full_name: "New Guy",
        role: "estimator",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid role", () => {
      const result = teamInviteSchema.safeParse({
        email: "test@test.com",
        full_name: "Test",
        role: "superadmin",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid roles", () => {
      const roles = ["estimator", "pm", "field_tech", "sales", "admin", "owner"];
      for (const role of roles) {
        const result = teamInviteSchema.safeParse({
          email: "test@test.com",
          full_name: "Test User",
          role,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  // ── declineSchema ──
  describe("declineSchema", () => {
    it("accepts empty decline (no reason)", () => {
      const result = declineSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts decline with reason", () => {
      const result = declineSchema.safeParse({
        reason: "Too expensive",
        declinerName: "Jane Client",
      });
      expect(result.success).toBe(true);
    });

    it("rejects reason over 2000 chars", () => {
      const result = declineSchema.safeParse({
        reason: "x".repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });

  // ── portalChangeOrderSignSchema ──
  describe("portalChangeOrderSignSchema", () => {
    it("accepts valid sign request", () => {
      const result = portalChangeOrderSignSchema.safeParse({
        changeOrderId: "550e8400-e29b-41d4-a716-446655440000",
        signerName: "John Client",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing signerName", () => {
      const result = portalChangeOrderSignSchema.safeParse({
        changeOrderId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid UUID for changeOrderId", () => {
      const result = portalChangeOrderSignSchema.safeParse({
        changeOrderId: "not-uuid",
        signerName: "John",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty signerName", () => {
      const result = portalChangeOrderSignSchema.safeParse({
        changeOrderId: "550e8400-e29b-41d4-a716-446655440000",
        signerName: "",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── validateBody helper ──
  describe("validateBody", () => {
    it("returns data on valid input", () => {
      const result = validateBody(declineSchema, { reason: "Too expensive" });
      expect("data" in result).toBe(true);
      if ("data" in result) {
        expect(result.data.reason).toBe("Too expensive");
      }
    });

    it("returns error string on invalid input", () => {
      const result = validateBody(sendEstimateSchema, { to: "not-email" });
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(typeof result.error).toBe("string");
        expect(result.error.length).toBeGreaterThan(0);
      }
    });

    it("returns joined error messages for multiple issues", () => {
      const result = validateBody(teamInviteSchema, {});
      expect("error" in result).toBe(true);
      if ("error" in result) {
        expect(result.error).toContain(","); // Multiple errors joined
      }
    });
  });
});
