import { describe, it, expect } from "vitest";
import { calculateMaterialCost } from "../calculations/materials";
import { calculateLaborCost } from "../calculations/labor";
import { calculateMargins } from "../calculations/margins";

// ─── calculateMaterialCost ──────────────────────────────────────────

describe("calculateMaterialCost", () => {
  it("applies default waste factor for porch (10%)", () => {
    const result = calculateMaterialCost({
      quantity: 100,
      unitPrice: 5.0,
      projectType: "porch",
    });
    expect(result.wasteFactor).toBe(0.10);
    // adjustedQuantity is Math.ceil(100 * 1.10) = ceil(110.00000000000001) = 111
    // due to floating point: 100 * 1.10 = 110.00000000000001
    expect(result.adjustedQuantity).toBe(Math.ceil(100 * (1 + 0.10)));
    // totalCost uses raw float: 100 * 1.10 * 5 = 550, rounded to 2 decimals
    expect(result.totalCost).toBe(550.0);
  });

  it("applies default waste factor for bathroom_renovation (15%)", () => {
    const result = calculateMaterialCost({
      quantity: 100,
      unitPrice: 10.0,
      projectType: "bathroom_renovation",
    });
    expect(result.wasteFactor).toBe(0.15);
    expect(result.adjustedQuantity).toBe(115);
    expect(result.totalCost).toBe(1150.0);
  });

  it("applies default waste factor for kitchen_renovation (12.5%)", () => {
    const result = calculateMaterialCost({
      quantity: 80,
      unitPrice: 12.0,
      projectType: "kitchen_renovation",
    });
    expect(result.wasteFactor).toBe(0.125);
    expect(result.adjustedQuantity).toBe(90); // Math.ceil(80 * 1.125) = 90
    expect(result.totalCost).toBe(1080.0); // 90 * 12
  });

  it("applies zero waste factor for door_window", () => {
    const result = calculateMaterialCost({
      quantity: 10,
      unitPrice: 250.0,
      projectType: "door_window",
    });
    expect(result.wasteFactor).toBe(0.0);
    expect(result.adjustedQuantity).toBe(10);
    expect(result.totalCost).toBe(2500.0);
  });

  it("uses custom waste factor when provided", () => {
    const result = calculateMaterialCost({
      quantity: 100,
      unitPrice: 5.0,
      projectType: "porch",
      customWasteFactor: 0.20,
    });
    expect(result.wasteFactor).toBe(0.20);
    expect(result.adjustedQuantity).toBe(120);
    expect(result.totalCost).toBe(600.0);
  });

  it("handles zero quantity", () => {
    const result = calculateMaterialCost({
      quantity: 0,
      unitPrice: 50.0,
      projectType: "deck",
    });
    expect(result.baseQuantity).toBe(0);
    expect(result.adjustedQuantity).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it("handles zero unit price", () => {
    const result = calculateMaterialCost({
      quantity: 100,
      unitPrice: 0,
      projectType: "deck",
    });
    expect(result.totalCost).toBe(0);
  });

  it("returns baseQuantity unchanged", () => {
    const result = calculateMaterialCost({
      quantity: 57,
      unitPrice: 3.25,
      projectType: "fencing",
    });
    expect(result.baseQuantity).toBe(57);
  });

  it("ceils adjusted quantity (non-integer result)", () => {
    // 7 * 1.10 = 7.7 -> ceil = 8
    const result = calculateMaterialCost({
      quantity: 7,
      unitPrice: 10.0,
      projectType: "porch",
    });
    expect(result.adjustedQuantity).toBe(8);
  });

  it("rounds totalCost to 2 decimal places", () => {
    // totalCost = rawAdjustedQty * unitPrice, rounded to 2 decimals
    // rawAdjustedQty = 3 * 1.05 = 3.15, totalCost = 3.15 * 3.33 = 10.4895 -> 10.49
    const result = calculateMaterialCost({
      quantity: 3,
      unitPrice: 3.33,
      projectType: "fencing",
    });
    const rawAdjusted = 3 * (1 + 0.05);
    expect(result.totalCost).toBe(Math.round(rawAdjusted * 3.33 * 100) / 100);
  });

  it("handles fractional quantities", () => {
    // rawAdjusted = 2.5 * 1.10 = 2.75, ceil = 3
    // totalCost = 2.75 * 100 = 275.0 (uses raw float, not ceiled)
    const result = calculateMaterialCost({
      quantity: 2.5,
      unitPrice: 100.0,
      projectType: "porch",
    });
    expect(result.adjustedQuantity).toBe(3);
    expect(result.totalCost).toBe(275.0);
  });
});

// ─── calculateLaborCost ─────────────────────────────────────────────

describe("calculateLaborCost", () => {
  it("calculates basic labor cost", () => {
    const result = calculateLaborCost({
      hoursEstimated: 8,
      hourlyRate: 45,
      crewSize: 2,
    });
    expect(result.totalCrewHours).toBe(16); // 8 * 2
    expect(result.totalCost).toBe(720); // 16 * 45
    expect(result.complexityMultiplier).toBe(1.0);
  });

  it("applies complexity multiplier", () => {
    const result = calculateLaborCost({
      hoursEstimated: 10,
      hourlyRate: 50,
      crewSize: 3,
      complexityMultiplier: 1.5,
    });
    expect(result.totalCrewHours).toBe(45); // 10 * 3 * 1.5
    expect(result.totalCost).toBe(2250); // 45 * 50
  });

  it("handles zero hours", () => {
    const result = calculateLaborCost({
      hoursEstimated: 0,
      hourlyRate: 50,
      crewSize: 2,
    });
    expect(result.totalCrewHours).toBe(0);
    expect(result.totalCost).toBe(0);
  });

  it("handles single crew member", () => {
    const result = calculateLaborCost({
      hoursEstimated: 40,
      hourlyRate: 35,
      crewSize: 1,
    });
    expect(result.totalCrewHours).toBe(40);
    expect(result.totalCost).toBe(1400);
  });

  it("preserves hoursPerWorker from input", () => {
    const result = calculateLaborCost({
      hoursEstimated: 24,
      hourlyRate: 60,
      crewSize: 4,
    });
    expect(result.hoursPerWorker).toBe(24);
    expect(result.crewSize).toBe(4);
  });

  it("rounds totalCost to 2 decimal places", () => {
    const result = calculateLaborCost({
      hoursEstimated: 3,
      hourlyRate: 33.33,
      crewSize: 1,
    });
    expect(result.totalCost).toBe(99.99);
  });

  it("rounds totalCrewHours to 2 decimal places", () => {
    const result = calculateLaborCost({
      hoursEstimated: 7,
      hourlyRate: 40,
      crewSize: 3,
      complexityMultiplier: 1.1,
    });
    // 7 * 3 * 1.1 = 23.1
    expect(result.totalCrewHours).toBe(23.1);
    expect(result.totalCost).toBe(924); // 23.1 * 40
  });

  it("handles zero hourly rate", () => {
    const result = calculateLaborCost({
      hoursEstimated: 10,
      hourlyRate: 0,
      crewSize: 2,
    });
    expect(result.totalCost).toBe(0);
  });
});

// ─── calculateMargins ───────────────────────────────────────────────

describe("calculateMargins", () => {
  it("calculates margins for a typical project", () => {
    const result = calculateMargins({
      materialsCost: 5000,
      laborCost: 8000,
      subcontractorCost: 2000,
      permitsFees: 500,
      overheadProfit: 6000,
      contingency: 1500,
    });
    expect(result.totalCost).toBe(15500); // 5000 + 8000 + 2000 + 500
    expect(result.grandTotal).toBe(23000); // 15500 + 6000 + 1500
    // grossMarginPct = (23000 - 15500) / 23000 = 0.3260869...
    expect(result.grossMarginPct).toBeCloseTo(0.3261, 3);
    expect(result.alerts).toHaveLength(0); // above 28% threshold
  });

  it("fires alert when gross margin is below 28%", () => {
    const result = calculateMargins({
      materialsCost: 8000,
      laborCost: 5000,
      subcontractorCost: 2000,
      permitsFees: 500,
      overheadProfit: 1000,
      contingency: 500,
    });
    // totalCost = 15500, grandTotal = 17000
    // grossMarginPct = (17000 - 15500) / 17000 = 0.0882...
    expect(result.grossMarginPct).toBeLessThan(0.28);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]!.metric).toBe("Gross Margin");
    expect(result.alerts[0]!.threshold).toBe(0.28);
  });

  it("no alert when margin is exactly at threshold", () => {
    // Need grossMarginPct = 0.28 exactly
    // (grandTotal - totalCost) / grandTotal = 0.28
    // so totalCost/grandTotal = 0.72
    // totalCost = 7200, grandTotal = 10000 => overhead+contingency = 2800
    const result = calculateMargins({
      materialsCost: 3600,
      laborCost: 3600,
      subcontractorCost: 0,
      permitsFees: 0,
      overheadProfit: 2000,
      contingency: 800,
    });
    expect(result.totalCost).toBe(7200);
    expect(result.grandTotal).toBe(10000);
    expect(result.grossMarginPct).toBe(0.28);
    expect(result.alerts).toHaveLength(0);
  });

  it("handles all-zero inputs", () => {
    const result = calculateMargins({
      materialsCost: 0,
      laborCost: 0,
      subcontractorCost: 0,
      permitsFees: 0,
      overheadProfit: 0,
      contingency: 0,
    });
    expect(result.totalCost).toBe(0);
    expect(result.grandTotal).toBe(0);
    expect(result.grossMarginPct).toBe(0);
    // grossMarginPct is 0, which is < 0.28, so alert fires
    expect(result.alerts).toHaveLength(1);
  });

  it("handles project with only overhead (100% margin)", () => {
    const result = calculateMargins({
      materialsCost: 0,
      laborCost: 0,
      subcontractorCost: 0,
      permitsFees: 0,
      overheadProfit: 5000,
      contingency: 0,
    });
    expect(result.totalCost).toBe(0);
    expect(result.grandTotal).toBe(5000);
    expect(result.grossMarginPct).toBe(1.0);
    expect(result.alerts).toHaveLength(0);
  });

  it("rounds totalCost and grandTotal to 2 decimal places", () => {
    const result = calculateMargins({
      materialsCost: 1000.555,
      laborCost: 2000.445,
      subcontractorCost: 0,
      permitsFees: 0,
      overheadProfit: 1000,
      contingency: 0,
    });
    expect(result.totalCost).toBe(3001.0);
    expect(result.grandTotal).toBe(4001.0);
  });

  it("alert message contains percentage values", () => {
    const result = calculateMargins({
      materialsCost: 9000,
      laborCost: 1000,
      subcontractorCost: 0,
      permitsFees: 0,
      overheadProfit: 500,
      contingency: 0,
    });
    expect(result.alerts.length).toBeGreaterThan(0);
    expect(result.alerts[0]!.message).toContain("Gross margin");
    expect(result.alerts[0]!.message).toContain("28%");
  });
});
