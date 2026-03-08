import { describe, it, expect } from "vitest";
import {
  MHP_PRICING_DATABASE,
  lookupPrice,
  searchPricing,
  getPricingByCategory,
  getCategories,
} from "../constants/pricing-database";

describe("MHP_PRICING_DATABASE", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(MHP_PRICING_DATABASE)).toBe(true);
    expect(MHP_PRICING_DATABASE.length).toBeGreaterThan(0);
  });

  it("every entry has required fields", () => {
    for (const entry of MHP_PRICING_DATABASE) {
      expect(entry).toHaveProperty("name");
      expect(entry).toHaveProperty("category");
      expect(entry).toHaveProperty("occurrences");
      expect(entry).toHaveProperty("projectsUsed");
      expect(entry).toHaveProperty("projectTypes");
      expect(entry).toHaveProperty("pricing");
      expect(typeof entry.name).toBe("string");
      expect(typeof entry.category).toBe("string");
      expect(typeof entry.occurrences).toBe("number");
      expect(typeof entry.projectsUsed).toBe("number");
      expect(Array.isArray(entry.projectTypes)).toBe(true);
    }
  });

  it("every pricing object has avg, min, max, median", () => {
    for (const entry of MHP_PRICING_DATABASE) {
      expect(entry.pricing).toHaveProperty("avg");
      expect(entry.pricing).toHaveProperty("min");
      expect(entry.pricing).toHaveProperty("max");
      expect(entry.pricing).toHaveProperty("median");
    }
  });

  it("min <= median <= max for every entry", () => {
    for (const entry of MHP_PRICING_DATABASE) {
      expect(entry.pricing.min).toBeLessThanOrEqual(entry.pricing.median);
      expect(entry.pricing.median).toBeLessThanOrEqual(entry.pricing.max);
    }
  });

  it("occurrences and projectsUsed are positive", () => {
    for (const entry of MHP_PRICING_DATABASE) {
      expect(entry.occurrences).toBeGreaterThan(0);
      expect(entry.projectsUsed).toBeGreaterThan(0);
    }
  });

  it("labor and material objects have avg, min, max when present", () => {
    for (const entry of MHP_PRICING_DATABASE) {
      if (entry.labor) {
        expect(entry.labor).toHaveProperty("avg");
        expect(entry.labor).toHaveProperty("min");
        expect(entry.labor).toHaveProperty("max");
      }
      if (entry.material) {
        expect(entry.material).toHaveProperty("avg");
        expect(entry.material).toHaveProperty("min");
        expect(entry.material).toHaveProperty("max");
      }
    }
  });
});

describe("lookupPrice", () => {
  it("returns a match for 'General Conditions'", () => {
    const result = lookupPrice("General Conditions");
    expect(result).not.toBeUndefined();
    expect(result).not.toBeNull();
    expect(result!.name).toBe("General Conditions");
  });

  it("is case-insensitive", () => {
    const result = lookupPrice("general conditions");
    expect(result).not.toBeNull();
  });

  it("returns undefined/null for nonexistent item", () => {
    const result = lookupPrice("nonexistent xyz 999 qqq");
    expect(result).toBeFalsy();
  });

  it("returns correct pricing data for known item", () => {
    const result = lookupPrice("General Conditions");
    expect(result!.pricing.avg).toBeGreaterThan(0);
    expect(result!.occurrences).toBeGreaterThan(0);
  });
});

describe("searchPricing", () => {
  it("returns results for 'Labor'", () => {
    const results = searchPricing("Labor");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns empty array for nonexistent search", () => {
    const results = searchPricing("zzzzzznonexistent12345");
    expect(results).toEqual([]);
  });

  it("results contain matching names", () => {
    const results = searchPricing("Framing");
    for (const r of results) {
      expect(r.name.toLowerCase()).toContain("framing");
    }
  });
});

describe("getPricingByCategory", () => {
  it("returns items for 'general_conditions'", () => {
    const results = getPricingByCategory("general_conditions");
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.category).toBe("general_conditions");
    }
  });

  it("returns empty array for unknown category", () => {
    const results = getPricingByCategory("nonexistent_category_xyz");
    expect(results).toEqual([]);
  });
});

describe("getCategories", () => {
  it("returns non-empty array of strings", () => {
    const categories = getCategories();
    expect(categories.length).toBeGreaterThan(0);
    for (const c of categories) {
      expect(typeof c).toBe("string");
    }
  });

  it("includes 'general_conditions'", () => {
    const categories = getCategories();
    expect(categories).toContain("general_conditions");
  });

  it("returns unique values", () => {
    const categories = getCategories();
    const unique = new Set(categories);
    expect(unique.size).toBe(categories.length);
  });
});
