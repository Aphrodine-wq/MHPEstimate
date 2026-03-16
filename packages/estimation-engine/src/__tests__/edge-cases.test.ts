import { describe, it, expect } from "vitest";
import { calculateMaterialCost } from "../calculations/materials";
import { calculateLaborCost } from "../calculations/labor";
import { calculateMargins } from "../calculations/margins";
import { runValidation } from "../validation/runner";
import { PROJECT_TYPES, type ProjectType } from "@proestimate/shared/constants";
import type { Estimate, EstimateLineItem } from "@proestimate/shared/types";

// ─── Helpers ────────────────────────────────────────────────────────

function makeEstimate(overrides: Partial<Estimate> = {}): Estimate {
  return {
    id: "est-edge",
    estimate_number: "E-EDGE-001",
    client_id: null,
    estimator_id: null,
    reviewer_id: null,
    project_type: "addition_remodel",
    estimate_category: "building",
    foundation_type: null,
    foundation_block_height: null,
    square_footage: null,
    project_address: null,
    status: "draft",
    scope_inclusions: [],
    scope_exclusions: ["Landscaping"],
    site_conditions: null,
    materials_subtotal: 5000,
    labor_subtotal: 8000,
    subcontractor_total: 2000,
    retail_total: 0,
    actual_total: 0,
    permits_fees: 500,
    overhead_profit: 3000,
    contingency: 1500,
    tax: 0,
    grand_total: 20000,
    cost_per_sqft: null,
    gross_margin_pct: null,
    estimated_start: null,
    estimated_end: null,
    valid_through: null,
    tier: "midrange",
    source: "manual",
    call_id: null,
    validation_results: null,
    validation_passed: false,
    pdf_path: null,
    docx_path: null,
    version: 1,
    parent_estimate_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sent_at: null,
    accepted_at: null,
    declined_at: null,
    ...overrides,
  };
}

function makeLineItem(overrides: Partial<EstimateLineItem> = {}): EstimateLineItem {
  return {
    id: "li-edge",
    estimate_id: "est-edge",
    line_number: 1,
    category: "General",
    description: "General work",
    quantity: 1,
    unit: "ea",
    unit_price: 100,
    extended_price: 100,
    material_cost: null,
    labor_cost: null,
    retail_price: null,
    notes: null,
    product_id: null,
    price_source: null,
    price_date: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── calculateMaterialCost edge cases ──────────────────────────────

describe("calculateMaterialCost - edge cases", () => {
  const allProjectTypes = Object.keys(PROJECT_TYPES) as ProjectType[];

  it.each(allProjectTypes)("works for project type: %s", (projectType) => {
    const result = calculateMaterialCost({
      quantity: 50,
      unitPrice: 10,
      projectType,
    });
    expect(result.totalCost).toBeGreaterThanOrEqual(0);
    expect(result.wasteFactor).toBeGreaterThanOrEqual(0);
    expect(result.adjustedQuantity).toBeGreaterThanOrEqual(50);
  });

  it("handles very large quantities (10000+)", () => {
    const result = calculateMaterialCost({
      quantity: 50000,
      unitPrice: 2.5,
      projectType: "new_build",
    });
    expect(result.totalCost).toBeGreaterThan(100000);
    expect(result.baseQuantity).toBe(50000);
  });

  it("handles very small unit prices (0.01)", () => {
    const result = calculateMaterialCost({
      quantity: 100,
      unitPrice: 0.01,
      projectType: "porch",
    });
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.totalCost).toBeLessThan(2);
  });

  it("custom waste factor of 0 works", () => {
    const result = calculateMaterialCost({
      quantity: 100,
      unitPrice: 10,
      projectType: "porch",
      customWasteFactor: 0,
    });
    expect(result.wasteFactor).toBe(0);
    expect(result.adjustedQuantity).toBe(100);
    expect(result.totalCost).toBe(1000);
  });

  it("custom waste factor of 1.0 (100%) works", () => {
    const result = calculateMaterialCost({
      quantity: 100,
      unitPrice: 10,
      projectType: "porch",
      customWasteFactor: 1.0,
    });
    expect(result.wasteFactor).toBe(1.0);
    expect(result.adjustedQuantity).toBe(200);
    expect(result.totalCost).toBe(2000);
  });

  it("handles quantity of 1", () => {
    const result = calculateMaterialCost({
      quantity: 1,
      unitPrice: 999.99,
      projectType: "door_window",
    });
    expect(result.adjustedQuantity).toBe(1);
    expect(result.totalCost).toBe(999.99);
  });

  it("returns consistent results for same inputs", () => {
    const input = { quantity: 42, unitPrice: 7.77, projectType: "deck" as const };
    const r1 = calculateMaterialCost(input);
    const r2 = calculateMaterialCost(input);
    expect(r1).toEqual(r2);
  });
});

// ─── calculateLaborCost edge cases ─────────────────────────────────

describe("calculateLaborCost - edge cases", () => {
  it("handles very large crew (20)", () => {
    const result = calculateLaborCost({
      hoursEstimated: 8,
      hourlyRate: 45,
      crewSize: 20,
    });
    expect(result.totalCrewHours).toBe(160);
    expect(result.totalCost).toBe(7200);
  });

  it("handles high complexity multiplier (3.0)", () => {
    const result = calculateLaborCost({
      hoursEstimated: 10,
      hourlyRate: 50,
      crewSize: 2,
      complexityMultiplier: 3.0,
    });
    expect(result.totalCrewHours).toBe(60);
    expect(result.totalCost).toBe(3000);
  });

  it("handles fractional hours (0.5)", () => {
    const result = calculateLaborCost({
      hoursEstimated: 0.5,
      hourlyRate: 100,
      crewSize: 1,
    });
    expect(result.totalCrewHours).toBe(0.5);
    expect(result.totalCost).toBe(50);
  });

  it("handles very high hourly rate", () => {
    const result = calculateLaborCost({
      hoursEstimated: 1,
      hourlyRate: 500,
      crewSize: 1,
    });
    expect(result.totalCost).toBe(500);
  });

  it("returns consistent results for same inputs", () => {
    const input = { hoursEstimated: 8, hourlyRate: 45, crewSize: 3 };
    const r1 = calculateLaborCost(input);
    const r2 = calculateLaborCost(input);
    expect(r1).toEqual(r2);
  });
});

// ─── calculateMargins edge cases ───────────────────────────────────

describe("calculateMargins - edge cases", () => {
  it("handles very small costs (under $100)", () => {
    const result = calculateMargins({
      materialsCost: 20,
      laborCost: 30,
      subcontractorCost: 0,
      permitsFees: 0,
      overheadProfit: 30,
      contingency: 10,
    });
    expect(result.totalCost).toBe(50);
    expect(result.grandTotal).toBe(90);
    expect(result.grossMarginPct).toBeGreaterThan(0);
  });

  it("handles very large costs (over $1M)", () => {
    const result = calculateMargins({
      materialsCost: 500000,
      laborCost: 300000,
      subcontractorCost: 100000,
      permitsFees: 50000,
      overheadProfit: 200000,
      contingency: 100000,
    });
    expect(result.totalCost).toBe(950000);
    expect(result.grandTotal).toBe(1250000);
    expect(result.grossMarginPct).toBeGreaterThan(0);
  });

  it("grossMarginPct precision is maintained", () => {
    const result = calculateMargins({
      materialsCost: 7777,
      laborCost: 3333,
      subcontractorCost: 0,
      permitsFees: 0,
      overheadProfit: 5000,
      contingency: 1000,
    });
    expect(typeof result.grossMarginPct).toBe("number");
    // Should not have more than 4 decimal places
    const decimals = result.grossMarginPct.toString().split(".")[1];
    if (decimals) {
      expect(decimals.length).toBeLessThanOrEqual(4);
    }
  });

  it("returns consistent results for same inputs", () => {
    const input = {
      materialsCost: 5000,
      laborCost: 8000,
      subcontractorCost: 2000,
      permitsFees: 500,
      overheadProfit: 6000,
      contingency: 1500,
    };
    const r1 = calculateMargins(input);
    const r2 = calculateMargins(input);
    expect(r1).toEqual(r2);
  });
});

// ─── Integration: full estimate workflow ───────────────────────────

describe("Full estimate pipeline integration", () => {
  it("calculates material + labor + margins for a complete estimate", () => {
    // Step 1: Calculate materials for 3 items
    const lumber = calculateMaterialCost({ quantity: 200, unitPrice: 4.5, projectType: "porch" });
    const concrete = calculateMaterialCost({ quantity: 10, unitPrice: 120, projectType: "porch" });
    const hardware = calculateMaterialCost({ quantity: 50, unitPrice: 8.0, projectType: "porch" });
    const totalMaterials = lumber.totalCost + concrete.totalCost + hardware.totalCost;

    // Step 2: Calculate labor for 2 trades
    const framing = calculateLaborCost({ hoursEstimated: 40, hourlyRate: 45, crewSize: 2 });
    const finishing = calculateLaborCost({ hoursEstimated: 24, hourlyRate: 40, crewSize: 1 });
    const totalLabor = framing.totalCost + finishing.totalCost;

    // Step 3: Feed into margins
    const margins = calculateMargins({
      materialsCost: totalMaterials,
      laborCost: totalLabor,
      subcontractorCost: 0,
      permitsFees: 500,
      overheadProfit: (totalMaterials + totalLabor) * 0.15,
      contingency: (totalMaterials + totalLabor) * 0.10,
    });

    expect(margins.grandTotal).toBeGreaterThan(margins.totalCost);
    expect(margins.grossMarginPct).toBeGreaterThan(0);
    expect(margins.totalCost).toBeGreaterThan(0);
    // With 15% overhead + 10% contingency, margin should be reasonable
    expect(margins.grossMarginPct).toBeGreaterThan(0.15);
  });
});

// ─── runValidation edge cases ──────────────────────────────────────

describe("runValidation - edge cases", () => {
  it("handles empty line items array", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [],
    });
    expect(results).toHaveLength(15);
    // With no line items, most checks should still produce valid results
    for (const r of results) {
      expect(["PASS", "WARN", "FAIL"]).toContain(r.status);
    }
  });

  it("handles line items with very long descriptions", () => {
    const longDesc = "A".repeat(5000);
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem({ description: longDesc })],
    });
    expect(results).toHaveLength(15);
  });

  it("multiple validation runs produce consistent results (deterministic)", () => {
    const input = {
      estimate: makeEstimate({ permits_fees: 1000, contingency: 2000 }),
      lineItems: [
        makeLineItem({ category: "demo", description: "Demo work" }),
        makeLineItem({ category: "cleanup", description: "Final cleanup" }),
      ],
    };
    const r1 = runValidation(input);
    const r2 = runValidation(input);
    expect(r1).toEqual(r2);
  });

  it("every result has a non-empty message", () => {
    const results = runValidation({
      estimate: makeEstimate(),
      lineItems: [makeLineItem()],
    });
    for (const r of results) {
      expect(r.message.length).toBeGreaterThan(0);
    }
  });

  it("handles estimate with all zero financial fields", () => {
    const results = runValidation({
      estimate: makeEstimate({
        materials_subtotal: 0,
        labor_subtotal: 0,
        subcontractor_total: 0,
        permits_fees: 0,
        overhead_profit: 0,
        contingency: 0,
        grand_total: 0,
      }),
      lineItems: [makeLineItem()],
    });
    expect(results).toHaveLength(15);
    // Permits and contingency should fail
    const permitsCheck = results.find((r) => r.check_id === 4)!;
    expect(permitsCheck.status).toBe("FAIL");
    const contingencyCheck = results.find((r) => r.check_id === 7)!;
    expect(contingencyCheck.status).toBe("FAIL");
  });
});
