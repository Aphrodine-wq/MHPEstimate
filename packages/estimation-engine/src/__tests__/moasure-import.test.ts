import { describe, it, expect } from "vitest";
import {
  parseMoasureFile,
  detectFormat,
  MoasureParseError,
} from "../importers/moasure-parser";
import { mapMoasureToEstimate, getSupportedProjectTypes } from "../importers/moasure-mapper";
import { validateMoasureMeasurement } from "../importers/moasure-validator";

// ─── Format Detection ───────────────────────────────────────────────────

describe("detectFormat", () => {
  it("detects CSV from extension", () => {
    expect(detectFormat("anything", "measurement.csv")).toBe("csv");
  });

  it("detects DXF from extension", () => {
    expect(detectFormat("anything", "output.dxf")).toBe("dxf");
  });

  it("detects JSON from extension", () => {
    expect(detectFormat("anything", "data.json")).toBe("json");
  });

  it("detects JSON from content starting with {", () => {
    expect(detectFormat('{"area_sqft": 500}')).toBe("json");
  });

  it("detects JSON from content starting with [", () => {
    expect(detectFormat('[{"x": 0}]')).toBe("json");
  });

  it("detects DXF from content with SECTION header", () => {
    expect(detectFormat("0\nSECTION\n2\nHEADER")).toBe("dxf");
  });

  it("defaults to CSV for comma-separated content", () => {
    expect(detectFormat("Point,X,Y,Z\n1,0,0,0")).toBe("csv");
  });

  it("accepts explicit format string", () => {
    expect(detectFormat("anything", "csv")).toBe("csv");
    expect(detectFormat("anything", "json")).toBe("json");
    expect(detectFormat("anything", "dxf")).toBe("dxf");
  });
});

// ─── CSV Parser ─────────────────────────────────────────────────────────

describe("parseMoasureFile — CSV", () => {
  it("parses a basic CSV with area and perimeter", () => {
    const csv = [
      "Point,X,Y,Z,Area,Perimeter",
      "1,0,0,0,850,120",
    ].join("\n");

    const result = parseMoasureFile(csv, "test.csv");

    expect(result.source_format).toBe("csv");
    expect(result.area_sqft).toBe(850);
    expect(result.perimeter_lft).toBe(120);
  });

  it("parses CSV with segments (distance + bearing)", () => {
    const csv = [
      "Point,Distance,Bearing",
      "1,30.5,0",
      "2,20.2,90",
      "3,30.5,180",
      "4,20.2,270",
    ].join("\n");

    const result = parseMoasureFile(csv, "test.csv");

    expect(result.segments).toHaveLength(4);
    expect(result.segments[0]!.length_ft).toBe(30.5);
    expect(result.segments[0]!.bearing_deg).toBe(0);
    // Perimeter computed from segments
    expect(result.perimeter_lft).toBeCloseTo(101.4, 1);
  });

  it("parses CSV with coordinate points and computes area via shoelace", () => {
    // A 10x20 rectangle → area = 200 sq ft
    const csv = [
      "Point,X,Y",
      "1,0,0",
      "2,20,0",
      "3,20,10",
      "4,0,10",
    ].join("\n");

    const result = parseMoasureFile(csv, "test.csv");

    expect(result.points).toHaveLength(4);
    expect(result.area_sqft).toBe(200);
    expect(result.perimeter_lft).toBe(60);
  });

  it("parses CSV with elevation and volume", () => {
    const csv = [
      "Area,Perimeter,Elevation,Volume",
      "1200,145,3.5,85",
    ].join("\n");

    const result = parseMoasureFile(csv, "test.csv");

    expect(result.elevation_change_ft).toBe(3.5);
    expect(result.volume_cuyd).toBe(85);
  });

  it("parses CSV with layers", () => {
    const csv = [
      "Layer,Layer_Area,Area,Perimeter",
      "Front Yard,600,1200,145",
      "Back Yard,600,1200,145",
    ].join("\n");

    const result = parseMoasureFile(csv, "test.csv");

    expect(result.layers).toHaveLength(2);
    expect(result.layers[0]!.name).toBe("Front Yard");
    expect(result.layers[0]!.area_sqft).toBe(600);
  });

  it("throws on empty CSV", () => {
    expect(() => parseMoasureFile("", "test.csv")).toThrow(MoasureParseError);
  });

  it("throws on header-only CSV", () => {
    expect(() => parseMoasureFile("Point,X,Y", "test.csv")).toThrow(MoasureParseError);
  });

  it("handles quoted CSV fields", () => {
    const csv = [
      '"Point","Area","Perimeter"',
      '"1","500.5","92.3"',
    ].join("\n");

    const result = parseMoasureFile(csv, "test.csv");
    expect(result.area_sqft).toBe(500.5);
    expect(result.perimeter_lft).toBe(92.3);
  });
});

// ─── JSON Parser ────────────────────────────────────────────────────────

describe("parseMoasureFile — JSON", () => {
  it("parses a flat JSON measurement", () => {
    const json = JSON.stringify({
      device_model: "Moasure 2 PRO",
      area_sqft: 842,
      perimeter_lft: 118.4,
      elevation_change_ft: 2.1,
      volume_cuyd: null,
      segments: [
        { length_ft: 32, bearing_deg: 0 },
        { length_ft: 22, bearing_deg: 90 },
      ],
      layers: [
        { name: "Patio", area_sqft: 842 },
      ],
    });

    const result = parseMoasureFile(json, "test.json");

    expect(result.source_format).toBe("json");
    expect(result.device_model).toBe("Moasure 2 PRO");
    expect(result.area_sqft).toBe(842);
    expect(result.perimeter_lft).toBe(118.4);
    expect(result.elevation_change_ft).toBe(2.1);
    expect(result.segments).toHaveLength(2);
    expect(result.layers).toHaveLength(1);
    expect(result.layers[0]!.name).toBe("Patio");
  });

  it("parses JSON with nested data wrapper", () => {
    const json = JSON.stringify({
      device_model: "Moasure LX1",
      data: {
        area_sqft: 1200,
        perimeter_lft: 140,
      },
    });

    const result = parseMoasureFile(json, "test.json");
    expect(result.device_model).toBe("Moasure LX1");
    expect(result.area_sqft).toBe(1200);
  });

  it("parses JSON with measurement wrapper", () => {
    const json = JSON.stringify({
      measurement: {
        area_sqft: 500,
        perimeter_lft: 90,
        device_model: "Moasure 2",
      },
    });

    const result = parseMoasureFile(json);
    expect(result.area_sqft).toBe(500);
    expect(result.device_model).toBe("Moasure 2");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseMoasureFile("{broken", "test.json")).toThrow(MoasureParseError);
  });

  it("handles alternative field names", () => {
    const json = JSON.stringify({
      area: 750,
      perimeter: 110,
      elevation: 1.5,
      volume: 50,
    });

    const result = parseMoasureFile(json);
    expect(result.area_sqft).toBe(750);
    expect(result.perimeter_lft).toBe(110);
    expect(result.elevation_change_ft).toBe(1.5);
    expect(result.volume_cuyd).toBe(50);
  });
});

// ─── DXF Parser ─────────────────────────────────────────────────────────

describe("parseMoasureFile — DXF", () => {
  it("parses a simple LWPOLYLINE (10x20 rectangle)", () => {
    const dxf = [
      "0", "SECTION",
      "2", "ENTITIES",
      "0", "LWPOLYLINE",
      "10", "0.0",
      "20", "0.0",
      "10", "20.0",
      "20", "0.0",
      "10", "20.0",
      "20", "10.0",
      "10", "0.0",
      "20", "10.0",
      "0", "ENDSEC",
    ].join("\n");

    const result = parseMoasureFile(dxf, "test.dxf");

    expect(result.source_format).toBe("dxf");
    expect(result.points).toHaveLength(4);
    expect(result.area_sqft).toBe(200); // 10 × 20
    expect(result.perimeter_lft).toBe(60); // 2*(10+20)
    expect(result.segments).toHaveLength(3); // 4 points → 3 segments (not closing)
  });

  it("parses LWPOLYLINE with Z coordinates and computes elevation", () => {
    const dxf = [
      "0", "SECTION",
      "2", "ENTITIES",
      "0", "LWPOLYLINE",
      "10", "0.0",
      "20", "0.0",
      "30", "0.0",
      "10", "10.0",
      "20", "0.0",
      "30", "3.0",
      "10", "10.0",
      "20", "10.0",
      "30", "3.0",
      "0", "ENDSEC",
    ].join("\n");

    const result = parseMoasureFile(dxf, "test.dxf");

    expect(result.elevation_change_ft).toBe(3);
    expect(result.points[1]!.z).toBe(3);
  });

  it("throws on DXF with no polyline data", () => {
    const dxf = [
      "0", "SECTION",
      "2", "ENTITIES",
      "0", "ENDSEC",
    ].join("\n");

    expect(() => parseMoasureFile(dxf, "test.dxf")).toThrow(MoasureParseError);
  });
});

// ─── Mapper ─────────────────────────────────────────────────────────────

describe("mapMoasureToEstimate", () => {
  const baseMeasurement = {
    device_model: "Moasure 2 PRO" as const,
    area_sqft: 850,
    perimeter_lft: 120,
    elevation_change_ft: 2.5,
    volume_cuyd: null,
    segments: [],
    layers: [],
    points: [],
    paths: [],
    source_format: "json" as const,
    raw_content: "{}",
  };

  it("maps deck measurement with area, perimeter, and elevation", () => {
    const result = mapMoasureToEstimate(baseMeasurement, "deck");

    expect(result.project_type).toBe("deck");
    expect(result.fields.find((f) => f.field === "decking_area_sqft")?.value).toBe(850);
    expect(result.fields.find((f) => f.field === "railing_linear_ft")?.value).toBe(120);
    expect(result.fields.find((f) => f.field === "elevation_change_ft")?.value).toBe(2.5);
  });

  it("maps fencing with computed post and panel counts", () => {
    const result = mapMoasureToEstimate(baseMeasurement, "fencing");

    const fenceLF = result.fields.find((f) => f.field === "fence_linear_ft");
    const postCount = result.fields.find((f) => f.field === "post_count");
    const panelCount = result.fields.find((f) => f.field === "panel_count");

    expect(fenceLF?.value).toBe(120);
    expect(postCount?.value).toBe(16); // ceil(120/8) + 1
    expect(panelCount?.value).toBe(15); // ceil(120/8)
    expect(postCount?.source).toBe("computed");
  });

  it("maps roofing with squares calculation", () => {
    const roofMeasurement = { ...baseMeasurement, area_sqft: 2400 };
    const result = mapMoasureToEstimate(roofMeasurement, "roofing");

    expect(result.fields.find((f) => f.field === "roofing_squares")?.value).toBe(24);
  });

  it("maps painting with gallons calculation", () => {
    const result = mapMoasureToEstimate(baseMeasurement, "painting");

    expect(result.fields.find((f) => f.field === "paint_area_sqft")?.value).toBe(850);
    // 850 / 350 = 2.43 → ceil = 3
    expect(result.fields.find((f) => f.field === "paint_gallons")?.value).toBe(3);
  });

  it("maps concrete with area, volume, and form perimeter", () => {
    const concreteMeasurement = { ...baseMeasurement, volume_cuyd: 45 };
    const result = mapMoasureToEstimate(concreteMeasurement, "concrete_hardscape");

    expect(result.fields.find((f) => f.field === "surface_area_sqft")?.value).toBe(850);
    expect(result.fields.find((f) => f.field === "concrete_volume_cuyd")?.value).toBe(45);
    expect(result.fields.find((f) => f.field === "form_linear_ft")?.value).toBe(120);
  });

  it("maps kitchen with layer zones", () => {
    const kitchenMeasurement = {
      ...baseMeasurement,
      layers: [
        { name: "Kitchen Main", area_sqft: 600 },
        { name: "Pantry", area_sqft: 80 },
      ],
    };
    const result = mapMoasureToEstimate(kitchenMeasurement, "kitchen_renovation");

    expect(result.fields.find((f) => f.field === "zone_kitchen_main_sqft")?.value).toBe(600);
    expect(result.fields.find((f) => f.field === "zone_pantry_sqft")?.value).toBe(80);
  });

  it("falls back to generic mapping for unknown project types", () => {
    const result = mapMoasureToEstimate(baseMeasurement, "custom_project" as any);

    expect(result.fields.find((f) => f.field === "area_sqft")?.value).toBe(850);
    expect(result.fields.find((f) => f.field === "perimeter_lft")?.value).toBe(120);
    expect(result.fields.every((f) => f.confidence === "medium")).toBe(true);
  });

  it("includes metadata in every mapping", () => {
    const result = mapMoasureToEstimate(baseMeasurement, "deck");

    expect(result.metadata.device_model).toBe("Moasure 2 PRO");
    expect(result.metadata.source_format).toBe("json");
    expect(result.metadata.has_elevation).toBe(true);
    expect(result.metadata.has_volume).toBe(false);
  });

  it("getSupportedProjectTypes returns all project types with rules", () => {
    const types = getSupportedProjectTypes();

    expect(types).toContain("deck");
    expect(types).toContain("fencing");
    expect(types).toContain("roofing");
    expect(types).toContain("painting");
    expect(types).toContain("concrete_hardscape");
    expect(types).toContain("kitchen_renovation");
    expect(types).toContain("bathroom_renovation");
    expect(types.length).toBeGreaterThanOrEqual(10);
  });
});

// ─── Validator ──────────────────────────────────────────────────────────

describe("validateMoasureMeasurement", () => {
  const validMeasurement = {
    device_model: "Moasure 2 PRO" as const,
    area_sqft: 850,
    perimeter_lft: 120,
    elevation_change_ft: 2.5,
    volume_cuyd: null,
    segments: [
      { length_ft: 30, bearing_deg: 0 },
      { length_ft: 30, bearing_deg: 180 },
    ],
    layers: [],
    points: [],
    paths: [],
    source_format: "json" as const,
    raw_content: "{}",
  };

  it("passes valid measurement", () => {
    const result = validateMoasureMeasurement(validMeasurement);

    expect(result.valid).toBe(true);
    expect(result.counts.errors).toBe(0);
  });

  it("fails on empty measurement (no usable data)", () => {
    const empty = {
      ...validMeasurement,
      area_sqft: null,
      perimeter_lft: null,
      elevation_change_ft: null,
      volume_cuyd: null,
      segments: [],
      points: [],
    };

    const result = validateMoasureMeasurement(empty);

    expect(result.valid).toBe(false);
    const noDataCheck = result.results.find((r) => r.check === "has_usable_data");
    expect(noDataCheck?.passed).toBe(false);
    expect(noDataCheck?.severity).toBe("error");
  });

  it("fails on area below minimum", () => {
    const tiny = { ...validMeasurement, area_sqft: 0.5 };
    const result = validateMoasureMeasurement(tiny);

    expect(result.valid).toBe(false);
    expect(result.results.find((r) => r.check === "area_bounds")?.passed).toBe(false);
  });

  it("warns on area exceeding residential max", () => {
    const huge = { ...validMeasurement, area_sqft: 500_000 };
    const result = validateMoasureMeasurement(huge);

    // Warnings don't fail validation
    expect(result.valid).toBe(true);
    expect(result.counts.warnings).toBeGreaterThan(0);
  });

  it("warns on geometrically impossible area/perimeter", () => {
    // Area of 10,000 with perimeter of 10 is geometrically impossible
    const impossible = { ...validMeasurement, area_sqft: 10_000, perimeter_lft: 10 };
    const result = validateMoasureMeasurement(impossible);

    const check = result.results.find((r) => r.check === "area_perimeter_consistency");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("warning");
  });

  it("warns on out-of-range segments", () => {
    const badSegments = {
      ...validMeasurement,
      segments: [
        { length_ft: 0.01, bearing_deg: 0 }, // too small
        { length_ft: 2000, bearing_deg: 90 }, // too large
      ],
    };
    const result = validateMoasureMeasurement(badSegments);

    const check = result.results.find((r) => r.check === "segment_integrity");
    expect(check?.passed).toBe(false);
  });

  it("warns on negative volume", () => {
    const negVol = { ...validMeasurement, volume_cuyd: -5 };
    const result = validateMoasureMeasurement(negVol);

    expect(result.valid).toBe(false);
    const check = result.results.find((r) => r.check === "volume_bounds");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("error");
  });

  it("passes with unknown device model (info only)", () => {
    const unknown = { ...validMeasurement, device_model: "FutureMoasure 5" };
    const result = validateMoasureMeasurement(unknown);

    expect(result.valid).toBe(true);
    const check = result.results.find((r) => r.check === "device_model");
    expect(check?.passed).toBe(true); // Unknown model is not an error
  });

  it("warns on layer area mismatch", () => {
    const mismatch = {
      ...validMeasurement,
      area_sqft: 1000,
      layers: [{ name: "Zone A", area_sqft: 100 }], // 100 vs 1000 total
    };
    const result = validateMoasureMeasurement(mismatch);

    const check = result.results.find((r) => r.check === "layer_consistency");
    expect(check?.passed).toBe(false);
    expect(check?.severity).toBe("warning");
  });
});

// ─── Real Moasure CSV Format ─────────────────────────────────────────────

describe("parseMoasureFile — Real Moasure CSV format", () => {
  // This matches the actual CSV export from a Moasure device (Boutwell House Pad)
  const realCsv = [
    '"Layer","Path","Point","X:ft","Y:ft","Z:ft","Layer-Name","Path-Type","Point-Name","Point-Type","Area:ft²",',
    '"1","1","1","0.00","0.00","0.00","Base Layer","Dot2Dot","","Default","",',
    '"1","1","2","8.11","-0.00","-0.10","Base Layer","Dot2Dot","","Default","",',
    '"1","1","3","21.92","-0.65","-0.14","Base Layer","Dot2Dot","","Default","",',
    '"1","1","4","32.78","-1.15","-0.37","Base Layer","Dot2Dot","","Default","",',
    '"1","1","5","43.12","-1.70","-0.77","Base Layer","Dot2Dot","","Default","",',
    '"1","1","6","42.37","7.57","-0.61","Base Layer","Dot2Dot","","Default","",',
    '"1","1","7","40.85","16.57","-0.59","Base Layer","Dot2Dot","","Default","",',
    '"1","1","8","40.87","28.04","-0.39","Base Layer","Dot2Dot","","Default","",',
    '"1","1","9","42.10","44.56","-0.02","Base Layer","Dot2Dot","","Default","",',
    '"1","1","10","42.17","44.85","-0.01","Base Layer","Dot2Dot","","Default","",',
    '"1","1","11","27.38","46.99","0.01","Base Layer","Dot2Dot","","Default","",',
    '"1","1","12","12.75","47.38","-0.08","Base Layer","Dot2Dot","","Default","",',
    '"1","1","13","-1.74","47.51","0.44","Base Layer","Dot2Dot","","Default","",',
    '"1","1","14","-8.07","48.84","0.48","Base Layer","Dot2Dot","","Default","",',
    '"1","1","15","-8.15","48.69","0.47","Base Layer","Dot2Dot","","Default","",',
    '"1","1","16","-8.06","36.92","0.06","Base Layer","Dot2Dot","","Default","",',
    '"1","1","17","-8.03","22.92","0.03","Base Layer","Dot2Dot","","Default","",',
    '"1","1","18","-7.09","8.28","-0.02","Base Layer","Dot2Dot","","Default","",',
    '"1","1","19","-7.99","-2.45","0.10","Base Layer","Dot2Dot","","Default","",',
    '"1","2","1","-7.99","-2.45","0.10","Base Layer","PointsPath","","Default","",',
    '"1","2","2","-5.14","0.15","0.05","Base Layer","PointsPath","","Default","",',
    '"1","2","3","1.31","0.01","-0.08","Base Layer","PointsPath","","Default","",',
  ].join("\n");

  it("parses real Moasure CSV headers with unit suffixes", () => {
    const result = parseMoasureFile(realCsv, "Boutwell House Pad.csv");

    expect(result.source_format).toBe("csv");
    // Should have all 22 points (19 Dot2Dot + 3 PointsPath)
    expect(result.points.length).toBe(22);
  });

  it("separates Dot2Dot (perimeter) from PointsPath (interior) points", () => {
    const result = parseMoasureFile(realCsv, "Boutwell House Pad.csv");

    expect(result.paths.length).toBe(2);

    const dot2dot = result.paths.find((p) => p.type === "Dot2Dot");
    const pointsPath = result.paths.find((p) => p.type === "PointsPath");

    expect(dot2dot).toBeDefined();
    expect(dot2dot!.points.length).toBe(19);
    expect(pointsPath).toBeDefined();
    expect(pointsPath!.points.length).toBe(3);
  });

  it("computes area from Dot2Dot perimeter points (not all points)", () => {
    const result = parseMoasureFile(realCsv, "Boutwell House Pad.csv");

    // Area should be computed from the 19 Dot2Dot perimeter points only
    // For a ~50x50 irregular house pad, area should be roughly 2300-2600 sq ft
    expect(result.area_sqft).toBeGreaterThan(2000);
    expect(result.area_sqft).toBeLessThan(3000);
  });

  it("computes perimeter from Dot2Dot points", () => {
    const result = parseMoasureFile(realCsv, "Boutwell House Pad.csv");

    // Perimeter of ~50x50 irregular shape should be roughly 150-220 LF
    expect(result.perimeter_lft).toBeGreaterThan(140);
    expect(result.perimeter_lft).toBeLessThan(250);
  });

  it("extracts elevation change from Z coordinates", () => {
    const result = parseMoasureFile(realCsv, "Boutwell House Pad.csv");

    // Z values range from about -0.77 to 0.48 across all points
    expect(result.elevation_change_ft).toBeGreaterThan(0);
    expect(result.elevation_change_ft).toBeLessThan(2);
  });

  it("extracts layer name from Layer-Name column (not numeric Layer)", () => {
    const result = parseMoasureFile(realCsv, "Boutwell House Pad.csv");

    // Should have "Base Layer", NOT "1"
    expect(result.layers.length).toBe(1);
    expect(result.layers[0]!.name).toBe("Base Layer");
  });

  it("validates and maps to new_build project type", () => {
    const result = parseMoasureFile(realCsv, "Boutwell House Pad.csv");
    const validation = validateMoasureMeasurement(result);
    expect(validation.valid).toBe(true);

    const mapping = mapMoasureToEstimate(result, "new_build");
    expect(mapping.fields.find((f) => f.field === "pad_area_sqft")).toBeDefined();
    expect(mapping.fields.find((f) => f.field === "foundation_linear_ft")).toBeDefined();
    expect(mapping.fields.find((f) => f.field === "site_elevation_change_ft")).toBeDefined();
  });
});

// ─── End-to-End: Parse → Validate → Map ────────────────────────────────

describe("End-to-end import flow", () => {
  it("parses JSON, validates, and maps to deck estimate", () => {
    const json = JSON.stringify({
      device_model: "Moasure 2 PRO",
      area_sqft: 480,
      perimeter_lft: 88,
      elevation_change_ft: 1.5,
      segments: [
        { length_ft: 24, bearing_deg: 0 },
        { length_ft: 20, bearing_deg: 90 },
        { length_ft: 24, bearing_deg: 180 },
        { length_ft: 20, bearing_deg: 270 },
      ],
    });

    // 1. Parse
    const measurement = parseMoasureFile(json);
    expect(measurement.area_sqft).toBe(480);

    // 2. Validate
    const validation = validateMoasureMeasurement(measurement);
    expect(validation.valid).toBe(true);

    // 3. Map
    const mapping = mapMoasureToEstimate(measurement, "deck");
    expect(mapping.fields.find((f) => f.field === "decking_area_sqft")?.value).toBe(480);
    expect(mapping.fields.find((f) => f.field === "railing_linear_ft")?.value).toBe(88);
    expect(mapping.fields.find((f) => f.field === "elevation_change_ft")?.value).toBe(1.5);
    expect(mapping.metadata.device_model).toBe("Moasure 2 PRO");
  });

  it("parses CSV, validates, and maps to fencing estimate", () => {
    const csv = [
      "Point,Distance,Bearing,Perimeter",
      "1,50,0,200",
      "2,50,90,200",
      "3,50,180,200",
      "4,50,270,200",
    ].join("\n");

    const measurement = parseMoasureFile(csv, "fence_measurement.csv");
    const validation = validateMoasureMeasurement(measurement);
    expect(validation.valid).toBe(true);

    const mapping = mapMoasureToEstimate(measurement, "fencing");
    expect(mapping.fields.find((f) => f.field === "fence_linear_ft")?.value).toBe(200);
    expect(mapping.fields.find((f) => f.field === "post_count")?.value).toBe(26); // ceil(200/8)+1
    expect(mapping.fields.find((f) => f.field === "panel_count")?.value).toBe(25); // ceil(200/8)
  });
});
