import { describe, it, expect } from "vitest";
import { VALIDATION_CHECKS } from "../constants/validation-checks";

describe("VALIDATION_CHECKS", () => {
  it("has exactly 15 checks", () => {
    expect(VALIDATION_CHECKS).toHaveLength(15);
  });

  it("every check has required fields", () => {
    for (const check of VALIDATION_CHECKS) {
      expect(check).toHaveProperty("id");
      expect(check).toHaveProperty("name");
      expect(check).toHaveProperty("description");
      expect(check).toHaveProperty("severity");
      expect(check).toHaveProperty("category");
    }
  });

  it("IDs are 1 through 15 in order", () => {
    for (let i = 0; i < VALIDATION_CHECKS.length; i++) {
      expect(VALIDATION_CHECKS[i]!.id).toBe(i + 1);
    }
  });

  it("severity is FAIL or WARN for every check", () => {
    for (const check of VALIDATION_CHECKS) {
      expect(["FAIL", "WARN"]).toContain(check.severity);
    }
  });

  it("names are non-empty strings", () => {
    for (const check of VALIDATION_CHECKS) {
      expect(typeof check.name).toBe("string");
      expect(check.name.length).toBeGreaterThan(0);
    }
  });

  it("descriptions are non-empty strings", () => {
    for (const check of VALIDATION_CHECKS) {
      expect(typeof check.description).toBe("string");
      expect(check.description.length).toBeGreaterThan(0);
    }
  });

  it("categories are valid strings", () => {
    const validCategories = ["costs", "materials", "labor", "timeline", "pricing", "scope"];
    for (const check of VALIDATION_CHECKS) {
      expect(validCategories).toContain(check.category);
    }
  });

  it("has expected FAIL checks (demo, permits, contingency, disposal, exclusions)", () => {
    const failChecks = VALIDATION_CHECKS.filter((c) => c.severity === "FAIL");
    expect(failChecks.length).toBe(5);
    const failIds = failChecks.map((c) => c.id);
    expect(failIds).toContain(1);  // Demo
    expect(failIds).toContain(4);  // Permits
    expect(failIds).toContain(7);  // Contingency
    expect(failIds).toContain(10); // Disposal
    expect(failIds).toContain(15); // Exclusions
  });

  it("has 10 WARN checks", () => {
    const warnChecks = VALIDATION_CHECKS.filter((c) => c.severity === "WARN");
    expect(warnChecks.length).toBe(10);
  });
});
