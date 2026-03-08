import { describe, it, expect } from "vitest";
import { MARGIN_GUARDRAILS } from "../constants/margins";

describe("MARGIN_GUARDRAILS", () => {
  it("has all expected guardrail keys", () => {
    expect(MARGIN_GUARDRAILS).toHaveProperty("grossMargin");
    expect(MARGIN_GUARDRAILS).toHaveProperty("materialMarkup");
    expect(MARGIN_GUARDRAILS).toHaveProperty("laborMarkup");
    expect(MARGIN_GUARDRAILS).toHaveProperty("subcontractorMarkup");
    expect(MARGIN_GUARDRAILS).toHaveProperty("smallJobPremium");
    expect(MARGIN_GUARDRAILS).toHaveProperty("rushJobPremium");
  });

  it("grossMargin.alertBelow is 0.28", () => {
    expect(MARGIN_GUARDRAILS.grossMargin.alertBelow).toBe(0.28);
  });

  it("grossMargin target >= min", () => {
    expect(MARGIN_GUARDRAILS.grossMargin.target).toBeGreaterThanOrEqual(
      MARGIN_GUARDRAILS.grossMargin.min
    );
  });

  it("materialMarkup target >= min", () => {
    expect(MARGIN_GUARDRAILS.materialMarkup.target).toBeGreaterThanOrEqual(
      MARGIN_GUARDRAILS.materialMarkup.min
    );
  });

  it("laborMarkup target >= min", () => {
    expect(MARGIN_GUARDRAILS.laborMarkup.target).toBeGreaterThanOrEqual(
      MARGIN_GUARDRAILS.laborMarkup.min
    );
  });

  it("subcontractorMarkup target >= min", () => {
    expect(MARGIN_GUARDRAILS.subcontractorMarkup.target).toBeGreaterThanOrEqual(
      MARGIN_GUARDRAILS.subcontractorMarkup.min
    );
  });

  it("all percentage thresholds are between 0 and 1", () => {
    const { grossMargin, materialMarkup, laborMarkup, subcontractorMarkup } = MARGIN_GUARDRAILS;
    for (const g of [grossMargin, materialMarkup, laborMarkup, subcontractorMarkup]) {
      expect(g.min).toBeGreaterThanOrEqual(0);
      expect(g.min).toBeLessThanOrEqual(1);
      expect(g.target).toBeGreaterThanOrEqual(0);
      expect(g.target).toBeLessThanOrEqual(1);
      expect(g.alertBelow).toBeGreaterThanOrEqual(0);
      expect(g.alertBelow).toBeLessThanOrEqual(1);
    }
  });

  it("smallJobPremium has threshold, min, and target", () => {
    expect(MARGIN_GUARDRAILS.smallJobPremium.threshold).toBe(2000);
    expect(MARGIN_GUARDRAILS.smallJobPremium.min).toBeGreaterThan(0);
    expect(MARGIN_GUARDRAILS.smallJobPremium.target).toBeGreaterThanOrEqual(
      MARGIN_GUARDRAILS.smallJobPremium.min
    );
  });

  it("rushJobPremium has min and target", () => {
    expect(MARGIN_GUARDRAILS.rushJobPremium.min).toBeGreaterThan(0);
    expect(MARGIN_GUARDRAILS.rushJobPremium.target).toBeGreaterThanOrEqual(
      MARGIN_GUARDRAILS.rushJobPremium.min
    );
  });
});
