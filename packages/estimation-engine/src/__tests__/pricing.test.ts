import { describe, it, expect } from "vitest";
import {
  suggestPrice,
  generateEstimateFromTemplate,
  getCategoryPricing,
  findSimilarLineItems,
} from "../calculations/pricing";

// ─── suggestPrice ───────────────────────────────────────────────────

describe("suggestPrice", () => {
  it("returns a match for a known line item (exact name)", () => {
    const result = suggestPrice("General Conditions");
    expect(result.match).not.toBeNull();
    expect(result.suggestedPrice).toBeGreaterThan(0);
    expect(result.lineItemName).toBe("General Conditions");
  });

  it("returns high confidence for items with >= 50 occurrences", () => {
    const result = suggestPrice("General Conditions");
    expect(result.match).not.toBeNull();
    expect(result.match!.occurrences).toBeGreaterThanOrEqual(50);
    expect(result.confidence).toBe("high");
  });

  it("returns price range with min <= median <= max", () => {
    const result = suggestPrice("General Conditions");
    expect(result.priceRange.min).toBeLessThanOrEqual(result.suggestedPrice);
    expect(result.suggestedPrice).toBeLessThanOrEqual(result.priceRange.max);
  });

  it("uses median as the suggested price", () => {
    const result = suggestPrice("General Conditions");
    expect(result.suggestedPrice).toBe(result.match!.pricing.median);
  });

  it("returns basedOn equal to occurrences", () => {
    const result = suggestPrice("General Conditions");
    expect(result.basedOn).toBe(result.match!.occurrences);
  });

  it("returns labor and material estimates when available", () => {
    const result = suggestPrice("General Conditions");
    // General Conditions has both labor and material data
    expect(result.laborEstimate).toBeDefined();
    expect(result.materialEstimate).toBeDefined();
  });

  it("returns undefined labor/material when entry lacks them", () => {
    // "Interior Trim Material" has material but no labor in some entries.
    // Let's find one that lacks labor.
    const result = suggestPrice("Interior Trim Material");
    // This entry has no labor data -> laborEstimate should be undefined
    expect(result.materialEstimate).toBeDefined();
    expect(result.laborEstimate).toBeUndefined();
  });

  it("returns zero/low confidence for unknown line items", () => {
    const result = suggestPrice("Completely Nonexistent Item XYZ 12345");
    expect(result.match).toBeNull();
    expect(result.suggestedPrice).toBe(0);
    expect(result.confidence).toBe("low");
    expect(result.priceRange.min).toBe(0);
    expect(result.priceRange.max).toBe(0);
    expect(result.basedOn).toBe(0);
  });

  it("case-insensitive exact match works", () => {
    const result = suggestPrice("general conditions");
    expect(result.match).not.toBeNull();
    expect(result.suggestedPrice).toBeGreaterThan(0);
  });

  it("falls back to fuzzy search on partial match", () => {
    // "Final Cleaning" is in the database; searching "Final Clean" should match via fuzzy
    const result = suggestPrice("Final Clean");
    expect(result.match).not.toBeNull();
    expect(result.suggestedPrice).toBeGreaterThan(0);
  });
});

// ─── generateEstimateFromTemplate ───────────────────────────────────

describe("generateEstimateFromTemplate", () => {
  it("generates an estimate with correct subtotals", () => {
    const items = ["General Conditions", "Final Cleaning"];
    const result = generateEstimateFromTemplate("porch", items);

    expect(result.lineItems).toHaveLength(2);
    const expectedSubtotal = result.lineItems.reduce(
      (sum, li) => sum + li.suggestedPrice,
      0,
    );
    expect(result.subtotal).toBe(Math.round(expectedSubtotal * 100) / 100);
  });

  it("applies default overhead (3%) and profit (15%)", () => {
    const items = ["General Conditions"];
    const result = generateEstimateFromTemplate("deck", items);

    expect(result.overhead).toBe(
      Math.round(result.subtotal * 0.03 * 100) / 100,
    );
    expect(result.profitMargin).toBe(
      Math.round(result.subtotal * 0.15 * 100) / 100,
    );
  });

  it("grand total = subtotal + overhead + profit", () => {
    const items = ["General Conditions", "Building Permits"];
    const result = generateEstimateFromTemplate("new_build", items);

    const expected = Math.round(
      (result.subtotal + result.overhead + result.profitMargin) * 100,
    ) / 100;
    expect(result.grandTotal).toBe(expected);
  });

  it("uses custom overhead and profit percentages", () => {
    const items = ["General Conditions"];
    const result = generateEstimateFromTemplate("porch", items, 0.05, 0.20);

    expect(result.overhead).toBe(
      Math.round(result.subtotal * 0.05 * 100) / 100,
    );
    expect(result.profitMargin).toBe(
      Math.round(result.subtotal * 0.20 * 100) / 100,
    );
  });

  it("handles empty line item list", () => {
    const result = generateEstimateFromTemplate("deck", []);
    expect(result.lineItems).toHaveLength(0);
    expect(result.subtotal).toBe(0);
    expect(result.overhead).toBe(0);
    expect(result.profitMargin).toBe(0);
    expect(result.grandTotal).toBe(0);
  });

  it("handles unknown line items gracefully (0 price)", () => {
    const result = generateEstimateFromTemplate("deck", [
      "Nonexistent Item ABC",
    ]);
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0]!.suggestedPrice).toBe(0);
    expect(result.subtotal).toBe(0);
    expect(result.grandTotal).toBe(0);
  });

  it("handles mix of known and unknown items", () => {
    const result = generateEstimateFromTemplate("porch", [
      "General Conditions",
      "Unknown Widget XYZ",
    ]);
    expect(result.lineItems).toHaveLength(2);
    // Should include price from General Conditions but 0 from unknown
    expect(result.subtotal).toBe(result.lineItems[0]!.suggestedPrice);
  });
});

// ─── getCategoryPricing ─────────────────────────────────────────────

describe("getCategoryPricing", () => {
  it("returns items for a known category", () => {
    const results = getCategoryPricing("general_conditions");
    expect(results.length).toBeGreaterThan(0);
    results.forEach((item) => {
      expect(item.category).toBe("general_conditions");
    });
  });

  it("returns empty array for unknown category", () => {
    const results = getCategoryPricing("nonexistent_category_xyz");
    expect(results).toEqual([]);
  });
});

// ─── findSimilarLineItems ───────────────────────────────────────────

describe("findSimilarLineItems", () => {
  it("returns results for a broad query", () => {
    const results = findSimilarLineItems("Labor");
    expect(results.length).toBeGreaterThan(0);
  });

  it("respects the limit parameter", () => {
    const results = findSimilarLineItems("Labor", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("results are sorted by occurrences descending", () => {
    const results = findSimilarLineItems("Material", 10);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.occurrences).toBeGreaterThanOrEqual(
        results[i]!.occurrences,
      );
    }
  });

  it("returns empty array for no matches", () => {
    const results = findSimilarLineItems("zzzzzznonexistent12345");
    expect(results).toEqual([]);
  });

  it("default limit is 10", () => {
    const results = findSimilarLineItems("a");
    expect(results.length).toBeLessThanOrEqual(10);
  });
});
