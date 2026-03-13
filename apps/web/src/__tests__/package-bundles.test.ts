import { describe, it, expect } from "vitest";
import {
  MHP_PACKAGE_BUNDLES,
  MHP_PROJECT_TEMPLATES,
  getPackageBundle,
  getAvailableBundles,
  findBundlesForProjectType,
} from "@proestimate/shared/constants";

describe("MHP_PACKAGE_BUNDLES", () => {
  it("has at least 5 bundles defined", () => {
    expect(Object.keys(MHP_PACKAGE_BUNDLES).length).toBeGreaterThanOrEqual(5);
  });

  it("every bundle has required fields", () => {
    for (const bundle of Object.values(MHP_PACKAGE_BUNDLES)) {
      expect(bundle.id).toBeTruthy();
      expect(bundle.label).toBeTruthy();
      expect(bundle.description).toBeTruthy();
      expect(bundle.projectTypes.length).toBeGreaterThanOrEqual(2);
      expect(bundle.bundleDiscount).toBeGreaterThan(0);
      expect(bundle.bundleDiscount).toBeLessThanOrEqual(0.15);
      expect(bundle.deduplicateItems.length).toBeGreaterThan(0);
      expect(["HIGH", "MEDIUM", "LOW"]).toContain(bundle.frequency);
    }
  });

  it("all projectTypes reference valid template keys", () => {
    const validTypes = Object.keys(MHP_PROJECT_TEMPLATES);
    for (const bundle of Object.values(MHP_PACKAGE_BUNDLES)) {
      for (const pt of bundle.projectTypes) {
        expect(validTypes).toContain(pt);
      }
    }
  });

  it("deduplicateItems always includes General Conditions", () => {
    for (const bundle of Object.values(MHP_PACKAGE_BUNDLES)) {
      expect(bundle.deduplicateItems).toContain("General Conditions");
    }
  });
});

describe("getPackageBundle", () => {
  it("returns a bundle by ID", () => {
    const bundle = getPackageBundle("exterior_refresh");
    expect(bundle).toBeDefined();
    expect(bundle!.label).toBe("Exterior Refresh Package");
  });

  it("returns undefined for unknown ID", () => {
    expect(getPackageBundle("nonexistent")).toBeUndefined();
  });
});

describe("getAvailableBundles", () => {
  it("returns all bundles with summary info", () => {
    const bundles = getAvailableBundles();
    expect(bundles.length).toBe(Object.keys(MHP_PACKAGE_BUNDLES).length);
    for (const b of bundles) {
      expect(b.id).toBeTruthy();
      expect(b.label).toBeTruthy();
      expect(b.description).toBeTruthy();
      expect(b.projectTypes.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("findBundlesForProjectType", () => {
  it("finds bundles containing roofing", () => {
    const bundles = findBundlesForProjectType("roofing");
    expect(bundles.length).toBeGreaterThanOrEqual(2);
    for (const b of bundles) {
      expect(b.projectTypes).toContain("roofing");
    }
  });

  it("finds bundles containing kitchen_renovation", () => {
    const bundles = findBundlesForProjectType("kitchen_renovation");
    expect(bundles.length).toBeGreaterThanOrEqual(2);
  });

  it("returns empty array for unknown type", () => {
    expect(findBundlesForProjectType("underwater_basket_weaving")).toEqual([]);
  });
});
