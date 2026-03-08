import { describe, it, expect } from "vitest";
import {
  suggestPrice,
  generateEstimateFromTemplate,
  generatePackageEstimate,
  getCategoryPricing,
  findSimilarLineItems,
} from "@proestimate/estimation-engine";

describe("suggestPrice", () => {
  it("returns a suggestion for known line items", () => {
    const result = suggestPrice("Framing Material");
    expect(result.lineItemName).toBe("Framing Material");
    // Should find at least a partial match in the 28k+ item database
    if (result.match) {
      expect(result.suggestedPrice).toBeGreaterThan(0);
      expect(result.basedOn).toBeGreaterThan(0);
      expect(["high", "medium", "low"]).toContain(result.confidence);
      expect(result.priceRange.max).toBeGreaterThanOrEqual(result.priceRange.min);
    }
  });

  it("returns low confidence for unknown items", () => {
    const result = suggestPrice("Quantum Flux Capacitor Installation");
    expect(result.confidence).toBe("low");
    expect(result.basedOn).toBe(0);
    expect(result.suggestedPrice).toBe(0);
  });

  it("returns price range", () => {
    const result = suggestPrice("Drywall");
    if (result.match) {
      expect(result.priceRange.min).toBeLessThanOrEqual(result.priceRange.max);
      expect(result.suggestedPrice).toBeGreaterThanOrEqual(result.priceRange.min);
      expect(result.suggestedPrice).toBeLessThanOrEqual(result.priceRange.max);
    }
  });
});

describe("generateEstimateFromTemplate", () => {
  it("generates an estimate with correct math", () => {
    const lineItems = ["General Conditions", "Framing Material", "Framing Labor"];
    const result = generateEstimateFromTemplate("porch", lineItems, 0.03, 0.15);

    expect(result.lineItems.length).toBe(3);
    expect(result.subtotal).toBeGreaterThanOrEqual(0);
    expect(result.overhead).toBe(
      Math.round(result.subtotal * 0.03 * 100) / 100
    );
    expect(result.profitMargin).toBe(
      Math.round(result.subtotal * 0.15 * 100) / 100
    );
    expect(result.grandTotal).toBe(
      Math.round((result.subtotal + result.overhead + result.profitMargin) * 100) / 100
    );
  });

  it("handles empty line items", () => {
    const result = generateEstimateFromTemplate("porch", []);
    expect(result.lineItems).toEqual([]);
    expect(result.subtotal).toBe(0);
    expect(result.grandTotal).toBe(0);
  });

  it("uses default overhead and profit when not specified", () => {
    const result = generateEstimateFromTemplate("deck", ["General Conditions"]);
    // Default is 3% overhead, 15% profit
    expect(result.grandTotal).toBeGreaterThanOrEqual(result.subtotal);
  });
});

describe("generatePackageEstimate", () => {
  it("generates a package estimate for exterior_refresh", () => {
    const result = generatePackageEstimate("exterior_refresh");
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.bundleId).toBe("exterior_refresh");
    expect(result.bundleLabel).toBe("Exterior Refresh Package");
    expect(result.projectTypes).toContain("roofing");
    expect(result.projectTypes).toContain("painting");
    expect(result.discountPct).toBe(0.05);
  });

  it("applies bundle discount correctly", () => {
    const result = generatePackageEstimate("exterior_refresh");
    if (!result) return;

    expect(result.discountAmount).toBe(
      Math.round(result.subtotalBeforeDiscount * result.discountPct * 100) / 100
    );
    expect(result.subtotal).toBe(
      Math.round((result.subtotalBeforeDiscount - result.discountAmount) * 100) / 100
    );
  });

  it("deduplicates shared items", () => {
    const result = generatePackageEstimate("kitchen_bath_combo");
    if (!result) return;

    // General Conditions should appear only once in lineItems
    const gcCount = result.lineItems.filter(
      (li) => li.lineItemName === "General Conditions"
    ).length;
    expect(gcCount).toBeLessThanOrEqual(1);
    expect(result.deduplicatedItems.length).toBeGreaterThan(0);
  });

  it("includes bundle-specific line items", () => {
    const result = generatePackageEstimate("exterior_refresh");
    if (!result) return;

    expect(result.bundleSpecificItems.length).toBeGreaterThan(0);
    const bundleItemNames = result.bundleSpecificItems.map((i) => i.lineItemName);
    expect(bundleItemNames).toContain("Power Wash - Full Exterior");
  });

  it("returns null for unknown bundle ID", () => {
    expect(generatePackageEstimate("nonexistent")).toBeNull();
  });

  it("grand total = subtotal + overhead + profit", () => {
    const result = generatePackageEstimate("outdoor_living", 0.03, 0.15);
    if (!result) return;

    const expected = Math.round(
      (result.subtotal + result.overhead + result.profitMargin) * 100
    ) / 100;
    expect(result.grandTotal).toBe(expected);
  });
});

describe("getCategoryPricing", () => {
  it("returns array of pricing entries", () => {
    const results = getCategoryPricing("Framing");
    expect(Array.isArray(results)).toBe(true);
  });
});

describe("findSimilarLineItems", () => {
  it("returns results sorted by occurrence count", () => {
    const results = findSimilarLineItems("paint", 5);
    expect(results.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.occurrences).toBeGreaterThanOrEqual(results[i]!.occurrences);
    }
  });

  it("respects the limit parameter", () => {
    const results = findSimilarLineItems("material", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});
