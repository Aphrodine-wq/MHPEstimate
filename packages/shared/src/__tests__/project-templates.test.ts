import { describe, it, expect } from "vitest";
import {
  MHP_PROJECT_TEMPLATES,
  getProjectTemplate,
  getProjectTypes,
} from "../constants/project-templates";

const EXPECTED_KEYS = ["porch", "deck", "kitchen_renovation", "bathroom_renovation", "new_build"];

describe("MHP_PROJECT_TEMPLATES", () => {
  it("has entries for expected project types", () => {
    for (const key of EXPECTED_KEYS) {
      expect(MHP_PROJECT_TEMPLATES).toHaveProperty(key);
    }
  });

  const entries = Object.entries(MHP_PROJECT_TEMPLATES);

  it.each(entries)("%s has all required fields", (_key, template) => {
    expect(template).toHaveProperty("type");
    expect(template).toHaveProperty("label");
    expect(template).toHaveProperty("frequency");
    expect(template).toHaveProperty("defaultWasteFactor");
    expect(template).toHaveProperty("defaultContingency");
    expect(template).toHaveProperty("standardScopeItems");
    expect(template).toHaveProperty("commonAllowanceItems");
    expect(template).toHaveProperty("standardLineItems");
    expect(template).toHaveProperty("commonChangeOrders");
    expect(template).toHaveProperty("contractTypes");
  });

  it.each(entries)("%s frequency is HIGH, MEDIUM, or LOW", (_key, template) => {
    expect(["HIGH", "MEDIUM", "LOW"]).toContain(template.frequency);
  });

  it.each(entries)("%s has non-empty standardScopeItems", (_key, template) => {
    expect(template.standardScopeItems.length).toBeGreaterThan(0);
  });

  it.each(entries)("%s has non-empty standardLineItems", (_key, template) => {
    expect(template.standardLineItems.length).toBeGreaterThan(0);
  });

  it.each(entries)("%s waste factor between 0 and 1", (_key, template) => {
    expect(template.defaultWasteFactor).toBeGreaterThanOrEqual(0);
    expect(template.defaultWasteFactor).toBeLessThanOrEqual(1);
  });

  it.each(entries)("%s contingency between 0 and 1", (_key, template) => {
    expect(template.defaultContingency).toBeGreaterThan(0);
    expect(template.defaultContingency).toBeLessThanOrEqual(1);
  });

  it.each(entries)("%s type matches its record key", (key, template) => {
    expect(template.type).toBe(key);
  });

  it.each(entries)("%s has non-empty label", (_key, template) => {
    expect(template.label.length).toBeGreaterThan(0);
  });
});

describe("getProjectTemplate", () => {
  it("returns porch template", () => {
    const template = getProjectTemplate("porch");
    expect(template).toBeDefined();
    expect(template!.type).toBe("porch");
    expect(template!.label).toContain("Porch");
  });

  it("returns undefined for nonexistent type", () => {
    const template = getProjectTemplate("nonexistent_type_xyz");
    expect(template).toBeUndefined();
  });
});

describe("getProjectTypes", () => {
  it("returns all template types with labels", () => {
    const types = getProjectTypes();
    const templateKeys = Object.keys(MHP_PROJECT_TEMPLATES);
    expect(types).toHaveLength(templateKeys.length);
    const typeNames = types.map((t) => t.type);
    expect(typeNames.sort()).toEqual(templateKeys.sort());
  });

  it("each entry has type and label", () => {
    const types = getProjectTypes();
    for (const entry of types) {
      expect(entry).toHaveProperty("type");
      expect(entry).toHaveProperty("label");
      expect(entry.type.length).toBeGreaterThan(0);
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it("returns non-empty array", () => {
    expect(getProjectTypes().length).toBeGreaterThan(0);
  });
});
