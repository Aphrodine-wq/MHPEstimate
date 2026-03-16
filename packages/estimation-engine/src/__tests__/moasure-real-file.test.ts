import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseMoasureFile } from "../importers/moasure-parser";
import { validateMoasureMeasurement } from "../importers/moasure-validator";
import { mapMoasureToEstimate } from "../importers/moasure-mapper";
import { generateEstimateFromPad } from "../importers/pad-estimate-generator";

describe("Real Moasure file: Boutwell House Pad", () => {
  const csvPath = join(__dirname, "fixtures", "boutwell-house-pad.csv");
  const content = readFileSync(csvPath, "utf8");

  it("parses the full file correctly", () => {
    const result = parseMoasureFile(content, "Boutwell House Pad.csv");

    console.log("\n=== BOUTWELL HOUSE PAD ===");
    console.log("Area:", result.area_sqft, "sq ft");
    console.log("Perimeter:", result.perimeter_lft, "LF");
    console.log("Elevation change:", result.elevation_change_ft, "ft");
    console.log("Total points:", result.points.length);
    console.log("Paths:", result.paths.length);
    result.paths.forEach((p) =>
      console.log("  Path", p.index, ":", p.type, "-", p.points.length, "pts"),
    );
    console.log("Layers:", result.layers.map((l) => l.name));

    // 90 total points: 19 Dot2Dot + 71 PointsPath
    expect(result.points.length).toBe(90);
    expect(result.paths.length).toBe(2);
    expect(result.paths.find((p) => p.type === "Dot2Dot")!.points.length).toBe(19);
    expect(result.paths.find((p) => p.type === "PointsPath")!.points.length).toBe(71);

    // Area computed from Dot2Dot perimeter (house pad ~2400 sq ft)
    expect(result.area_sqft).toBeGreaterThan(2000);
    expect(result.area_sqft).toBeLessThan(3000);

    // Perimeter of irregular ~50x50 shape
    expect(result.perimeter_lft).toBeGreaterThan(140);
    expect(result.perimeter_lft).toBeLessThan(250);

    // Layer should be "Base Layer" not "1"
    expect(result.layers.length).toBe(1);
    expect(result.layers[0]!.name).toBe("Base Layer");
  });

  it("validates correctly", () => {
    const result = parseMoasureFile(content, "Boutwell House Pad.csv");
    const validation = validateMoasureMeasurement(result);

    console.log("\nValidation:", validation.valid ? "PASS" : "FAIL");
    validation.results
      .filter((r) => !r.passed)
      .forEach((r) => console.log("  ", r.severity, "-", r.check, ":", r.message));

    expect(validation.valid).toBe(true);
  });

  it("maps to new_build with correct fields", () => {
    const result = parseMoasureFile(content, "Boutwell House Pad.csv");
    const mapping = mapMoasureToEstimate(result, "new_build");

    console.log("\n=== Mapped to new_build ===");
    mapping.fields.forEach((f) =>
      console.log("  ", f.field, "=", f.value, f.unit, `(${f.confidence})`),
    );

    const padArea = mapping.fields.find((f) => f.field === "pad_area_sqft");
    const foundationLF = mapping.fields.find((f) => f.field === "foundation_linear_ft");
    const elevation = mapping.fields.find((f) => f.field === "site_elevation_change_ft");

    expect(padArea).toBeDefined();
    expect(padArea!.value).toBeGreaterThan(2000);
    expect(foundationLF).toBeDefined();
    expect(foundationLF!.value).toBeGreaterThan(140);
    expect(elevation).toBeDefined();
  });

  it("generates full house estimate from pad measurement", () => {
    const result = parseMoasureFile(content, "Boutwell House Pad.csv");
    const estimate = generateEstimateFromPad(result, {
      stories: 1,
      foundation_type: "raised_slab",
      block_courses: 3,
      roof_pitch: "6/12",
      exterior_material: "hardie_board",
      roofing_material: "architectural_shingle",
    });

    console.log("\n=== BOUTWELL HOUSE — FULL ESTIMATE ===");
    console.log(`Living area: ${estimate.summary.living_area_sqft} sq ft`);
    console.log(`Pad area: ${estimate.summary.pad_area_sqft} sq ft`);
    console.log(`Perimeter: ${estimate.summary.perimeter_lft} LF`);
    console.log(`Roof area: ${estimate.summary.roof_area_sqft} sq ft`);
    console.log(`Slab concrete: ${estimate.summary.slab_concrete_cuyd} cu yd`);
    console.log(`Fill volume: ${estimate.summary.fill_volume_cuyd} cu yd`);

    console.log("\n--- Grading Analysis ---");
    const g = estimate.grading_analysis;
    console.log(`  Data points: ${g.data_points}`);
    console.log(`  Elevation range: ${g.min_elevation_ft} to ${g.max_elevation_ft} ft`);
    console.log(`  Average grade: ${g.avg_elevation_ft} ft`);
    console.log(`  Target elevation: ${g.target_elevation_ft} ft`);
    console.log(`  Avg fill depth: ${g.avg_fill_depth_ft} ft`);
    console.log(`  Fill needed: ${g.fill_volume_cuyd} cu yd`);
    console.log(`  Cut available: ${g.cut_volume_cuyd} cu yd`);
    console.log(`  Net fill: ${g.net_fill_cuyd} cu yd (~${g.truckloads} truckloads)`);

    console.log("\n--- Divisions ---");
    estimate.divisions.forEach((d) => {
      console.log(`  ${d.name}: ${d.items.length} items, subtotal $${d.subtotal.toLocaleString()}`);
    });

    console.log(`\nTotal line items: ${estimate.takeoff.length}`);
    console.log(`Estimated total: $${estimate.summary.total_estimated_cost.toLocaleString()}`);
    console.log(`Cost per sq ft: $${estimate.summary.cost_per_sqft}`);

    // Structural assertions
    expect(estimate.divisions.length).toBeGreaterThanOrEqual(15);
    expect(estimate.takeoff.length).toBeGreaterThan(50);
    expect(estimate.summary.pad_area_sqft).toBeGreaterThan(2000);
    expect(estimate.summary.slab_concrete_cuyd).toBeGreaterThan(20);
    expect(estimate.grading_analysis.data_points).toBe(90);
    expect(estimate.grading_analysis.fill_volume_cuyd).toBeGreaterThan(0);
  });
});
