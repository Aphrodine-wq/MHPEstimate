import { describe, it, expect } from "vitest";
import { PROJECT_TYPES, type ProjectType } from "../constants/project-types";

const ALL_PROJECT_TYPES: ProjectType[] = [
  "porch",
  "deck",
  "kitchen_renovation",
  "bathroom_renovation",
  "addition_remodel",
  "guest_house",
  "new_build",
  "garage_carport",
  "retaining_wall",
  "fencing",
  "roofing",
  "concrete_hardscape",
  "door_window",
  "painting",
  "bonus_room",
  "commercial",
];

describe("PROJECT_TYPES", () => {
  it("contains all 16 expected project types", () => {
    const keys = Object.keys(PROJECT_TYPES);
    expect(keys).toHaveLength(16);
    for (const type of ALL_PROJECT_TYPES) {
      expect(PROJECT_TYPES).toHaveProperty(type);
    }
  });

  it.each(ALL_PROJECT_TYPES)("%s has label, defaultWasteFactor, defaultContingency", (type) => {
    const entry = PROJECT_TYPES[type];
    expect(entry).toHaveProperty("label");
    expect(entry).toHaveProperty("defaultWasteFactor");
    expect(entry).toHaveProperty("defaultContingency");
  });

  it.each(ALL_PROJECT_TYPES)("%s has non-empty label", (type) => {
    expect(PROJECT_TYPES[type].label.length).toBeGreaterThan(0);
  });

  it.each(ALL_PROJECT_TYPES)("%s waste factor is between 0 and 1", (type) => {
    const wf = PROJECT_TYPES[type].defaultWasteFactor;
    expect(wf).toBeGreaterThanOrEqual(0);
    expect(wf).toBeLessThanOrEqual(1);
  });

  it.each(ALL_PROJECT_TYPES)("%s contingency is between 0 and 1", (type) => {
    const c = PROJECT_TYPES[type].defaultContingency;
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThanOrEqual(1);
  });

  it("door_window has 0 waste factor", () => {
    expect(PROJECT_TYPES.door_window.defaultWasteFactor).toBe(0);
  });

  it("bathroom_renovation has highest waste factor (15%)", () => {
    expect(PROJECT_TYPES.bathroom_renovation.defaultWasteFactor).toBe(0.15);
  });

  it("fencing has lowest non-zero waste factor (5%)", () => {
    expect(PROJECT_TYPES.fencing.defaultWasteFactor).toBe(0.05);
  });
});
