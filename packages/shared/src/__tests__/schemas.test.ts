import { describe, it, expect } from "vitest";
import {
  clientSchema,
  estimateCreateSchema,
  lineItemSchema,
  invoiceUploadSchema,
} from "../validation/schemas";

// ─── clientSchema ──────────────────────────────────────────────────

describe("clientSchema", () => {
  it("accepts a valid client with all fields", () => {
    const result = clientSchema.safeParse({
      full_name: "John Doe",
      email: "john@example.com",
      phone: "555-0100",
      address_line1: "123 Main St",
      city: "Nashville",
      state: "TN",
      zip: "37201",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal valid client (name only)", () => {
    const result = clientSchema.safeParse({ full_name: "Jane" });
    expect(result.success).toBe(true);
  });

  it("rejects missing full_name", () => {
    const result = clientSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty full_name", () => {
    const result = clientSchema.safeParse({ full_name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = clientSchema.safeParse({
      full_name: "Test",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null optional fields", () => {
    const result = clientSchema.safeParse({
      full_name: "Test",
      email: null,
      phone: null,
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects state longer than 2 characters", () => {
    const result = clientSchema.safeParse({
      full_name: "Test",
      state: "Tennessee",
    });
    expect(result.success).toBe(false);
  });
});

// ─── estimateCreateSchema ──────────────────────────────────────────

describe("estimateCreateSchema", () => {
  it("accepts valid estimate with all fields", () => {
    const result = estimateCreateSchema.safeParse({
      client_id: "550e8400-e29b-41d4-a716-446655440000",
      project_type: "porch",
      project_address: "123 Main St",
      tier: "midrange",
      source: "manual",
      scope_inclusions: ["Framing"],
      scope_exclusions: ["Landscaping"],
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for tier, source, and arrays", () => {
    const result = estimateCreateSchema.safeParse({
      project_type: "deck",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tier).toBe("midrange");
      expect(result.data.source).toBe("manual");
      expect(result.data.scope_inclusions).toEqual([]);
      expect(result.data.scope_exclusions).toEqual([]);
    }
  });

  it("rejects missing project_type", () => {
    const result = estimateCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty project_type", () => {
    const result = estimateCreateSchema.safeParse({ project_type: "" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid tier values", () => {
    for (const tier of ["budget", "midrange", "high_end", "good", "better", "best"]) {
      const result = estimateCreateSchema.safeParse({ project_type: "deck", tier });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid tier value", () => {
    const result = estimateCreateSchema.safeParse({
      project_type: "deck",
      tier: "platinum",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid source values", () => {
    for (const source of ["manual", "voice", "template"]) {
      const result = estimateCreateSchema.safeParse({ project_type: "deck", source });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid client_id (not UUID)", () => {
    const result = estimateCreateSchema.safeParse({
      project_type: "deck",
      client_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

// ─── lineItemSchema ────────────────────────────────────────────────

describe("lineItemSchema", () => {
  it("accepts a valid line item", () => {
    const result = lineItemSchema.safeParse({
      estimate_id: "550e8400-e29b-41d4-a716-446655440000",
      line_number: 1,
      category: "framing",
      description: "Frame walls",
      quantity: 100,
      unit: "lf",
      unit_price: 5.5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing estimate_id", () => {
    const result = lineItemSchema.safeParse({
      line_number: 1,
      category: "framing",
      description: "Frame",
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-positive line_number", () => {
    const result = lineItemSchema.safeParse({
      estimate_id: "550e8400-e29b-41d4-a716-446655440000",
      line_number: 0,
      category: "framing",
      description: "Frame",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty category", () => {
    const result = lineItemSchema.safeParse({
      estimate_id: "550e8400-e29b-41d4-a716-446655440000",
      line_number: 1,
      category: "",
      description: "Frame",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty description", () => {
    const result = lineItemSchema.safeParse({
      estimate_id: "550e8400-e29b-41d4-a716-446655440000",
      line_number: 1,
      category: "framing",
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null optional fields", () => {
    const result = lineItemSchema.safeParse({
      estimate_id: "550e8400-e29b-41d4-a716-446655440000",
      line_number: 1,
      category: "framing",
      description: "Frame",
      quantity: null,
      unit: null,
      unit_price: null,
      notes: null,
      product_id: null,
      price_source: null,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative unit_price", () => {
    const result = lineItemSchema.safeParse({
      estimate_id: "550e8400-e29b-41d4-a716-446655440000",
      line_number: 1,
      category: "framing",
      description: "Frame",
      unit_price: -5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid price_source values", () => {
    for (const source of ["home_depot", "lowes", "invoice", "manual"]) {
      const result = lineItemSchema.safeParse({
        estimate_id: "550e8400-e29b-41d4-a716-446655440000",
        line_number: 1,
        category: "material",
        description: "Lumber",
        price_source: source,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ─── invoiceUploadSchema ───────────────────────────────────────────

describe("invoiceUploadSchema", () => {
  it("accepts valid invoice", () => {
    const result = invoiceUploadSchema.safeParse({
      supplier_name: "Home Depot",
      invoice_number: "INV-001",
      invoice_date: "2026-01-15",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all fields optional)", () => {
    const result = invoiceUploadSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts null fields", () => {
    const result = invoiceUploadSchema.safeParse({
      supplier_name: null,
      invoice_number: null,
      invoice_date: null,
    });
    expect(result.success).toBe(true);
  });
});
