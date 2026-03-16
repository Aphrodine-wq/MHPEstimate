/**
 * Pad-to-Estimate Generator
 *
 * Takes a Moasure pad measurement (footprint + elevation grid) and generates
 * a complete new construction estimate with all divisions. Uses the elevation
 * data from interior PointsPath points to compute dirtwork/grading volumes.
 *
 * This is the "I walked the pad with Moasure, now give me a full estimate" flow.
 */

import { suggestPrice } from "../calculations/pricing";
import type { MoasureMeasurement, MoasurePoint } from "./moasure-parser";
import type { PlanTakeoffItem } from "./plan-analyzer";

// ── Configuration ──────────────────────────────────────────────────────

export interface PadEstimateConfig {
  /** Number of stories (default 1) */
  stories?: number;
  /** Ceiling height in feet (default 9) */
  ceiling_height_ft?: number;
  /** Roof pitch as rise/run string (default "6/12") */
  roof_pitch?: string;
  /** Foundation type (default "raised_slab") */
  foundation_type?: "raised_slab" | "monolithic_slab" | "crawlspace" | "pier_beam";
  /** CMU block height in courses (default 3, typical MS is 2-4) */
  block_courses?: number;
  /** Slab thickness in inches (default 4) */
  slab_thickness_in?: number;
  /** Target pad elevation above highest point in feet (default 0.5) */
  pad_elevation_above_ft?: number;
  /** Number of bedrooms (default estimated from sq ft) */
  bedrooms?: number;
  /** Number of bathrooms (default estimated from sq ft) */
  bathrooms?: number;
  /** Garage bays (default 2) */
  garage_bays?: number;
  /** Include garage in estimate (default true) */
  include_garage?: boolean;
  /** Exterior material */
  exterior_material?: "vinyl_siding" | "hardie_board" | "brick" | "stone";
  /** Roofing material */
  roofing_material?: "architectural_shingle" | "metal" | "standing_seam";
}

export interface PadEstimateResult {
  /** All line items grouped by division */
  divisions: PadDivision[];
  /** Flat list of all takeoff items */
  takeoff: PlanTakeoffItem[];
  /** Summary metrics */
  summary: {
    pad_area_sqft: number;
    living_area_sqft: number;
    perimeter_lft: number;
    fill_volume_cuyd: number;
    slab_concrete_cuyd: number;
    roof_area_sqft: number;
    exterior_wall_area_sqft: number;
    total_estimated_cost: number;
    cost_per_sqft: number;
  };
  /** Dirtwork analysis from elevation data */
  grading_analysis: GradingAnalysis;
}

export interface PadDivision {
  name: string;
  items: PlanTakeoffItem[];
  subtotal: number;
}

export interface GradingAnalysis {
  /** Number of elevation data points used */
  data_points: number;
  /** Lowest elevation in measurement */
  min_elevation_ft: number;
  /** Highest elevation in measurement */
  max_elevation_ft: number;
  /** Average existing grade elevation */
  avg_elevation_ft: number;
  /** Target pad elevation */
  target_elevation_ft: number;
  /** Average fill depth needed */
  avg_fill_depth_ft: number;
  /** Estimated fill volume in cubic yards */
  fill_volume_cuyd: number;
  /** Estimated cut volume (areas above target) */
  cut_volume_cuyd: number;
  /** Net fill needed (fill - cut) */
  net_fill_cuyd: number;
  /** Estimated truckloads (15 cu yd per load typical) */
  truckloads: number;
}

// ── Main Generator ─────────────────────────────────────────────────────

export function generateEstimateFromPad(
  measurement: MoasureMeasurement,
  config: PadEstimateConfig = {},
): PadEstimateResult {
  const {
    stories = 1,
    ceiling_height_ft = 9,
    roof_pitch = "6/12",
    foundation_type = "raised_slab",
    block_courses = 3,
    slab_thickness_in = 4,
    pad_elevation_above_ft = 0.5,
    exterior_material = "hardie_board",
    roofing_material = "architectural_shingle",
    include_garage = true,
    garage_bays = 2,
  } = config;

  const padArea = measurement.area_sqft ?? 0;
  const perimeter = measurement.perimeter_lft ?? 0;

  // Estimate bedroom/bathroom counts from sq ft if not provided
  const bedrooms = config.bedrooms ?? estimateBedrooms(padArea * stories);
  const bathrooms = config.bathrooms ?? estimateBathrooms(bedrooms);

  // Garage area (standard 2-car = ~576 sq ft, 1-car = ~288)
  const garageArea = include_garage ? garage_bays * 288 : 0;
  const livingArea = padArea * stories;

  // Compute grading analysis from elevation points
  const gradingAnalysis = analyzeGrading(measurement, padArea, pad_elevation_above_ft);

  // Roof calculations
  const roofPitchMultiplier = getRoofPitchMultiplier(roof_pitch);
  const roofArea = round2(padArea * roofPitchMultiplier);
  const roofSquares = Math.ceil(roofArea / 100);

  // Wall calculations
  const exteriorWallArea = round2(perimeter * ceiling_height_ft * stories);
  const windowCount = estimateWindowCount(livingArea, bedrooms, bathrooms);
  const extDoorCount = 2 + (include_garage ? 1 : 0); // front, back, garage entry
  const intDoorCount = bedrooms + bathrooms + 3; // bedrooms + baths + closets/utility
  const windowAreaDeduction = windowCount * 15;
  const doorAreaDeduction = (extDoorCount + intDoorCount) * 21;
  const netWallArea = Math.max(0, exteriorWallArea - windowAreaDeduction - doorAreaDeduction);

  // Interior wall linear footage (roughly 0.8× perimeter per floor for interior partitions)
  const interiorWallLF = round2(perimeter * 0.8 * stories);
  const interiorWallArea = round2(interiorWallLF * ceiling_height_ft);
  const totalDrywallArea = round2(netWallArea + interiorWallArea + livingArea); // walls + ceilings

  // CMU stem wall
  const blockHeight = block_courses * (8 / 12); // 8" per course in feet
  const stemWallSqft = round2(perimeter * blockHeight);

  // Slab concrete
  const slabThicknessFt = slab_thickness_in / 12;
  const slabVolumeCuyd = round2((padArea * slabThicknessFt) / 27);

  // Footing concrete (continuous footing: 16" wide × 8" deep typical)
  const footingVolumeCuyd = round2((perimeter * (16 / 12) * (8 / 12)) / 27);

  // ── Build divisions ──

  const divisions: PadDivision[] = [];

  // 1. SITE WORK / DIRTWORK
  const siteWork = buildDivision("Site Work / Dirtwork", [
    priceItem("labor", "Clear & Grub Lot", 1, "lot", "Site Work"),
    priceItem("labor", "Silt Fence / Erosion Control", round2(perimeter * 1.2), "lin ft", "Site Work"),
    priceItem("labor", "Rough Grading", padArea, "sq ft", "Site Work"),
    ...(gradingAnalysis.net_fill_cuyd > 0
      ? [
          priceItem("material", "Fill Dirt (delivered)", Math.ceil(gradingAnalysis.net_fill_cuyd), "cu yd", "Site Work"),
          priceItem("labor", "Fill Dirt — Placement & Compaction", Math.ceil(gradingAnalysis.net_fill_cuyd), "cu yd", "Site Work"),
        ]
      : []),
    ...(gradingAnalysis.cut_volume_cuyd > 5
      ? [priceItem("labor", "Cut / Excavation", Math.ceil(gradingAnalysis.cut_volume_cuyd), "cu yd", "Site Work")]
      : []),
    priceItem("labor", "Compaction Testing", 1, "lot", "Site Work"),
    priceItem("labor", "Final Grade & Drainage Slope", padArea, "sq ft", "Site Work"),
    priceItem("material", "Gravel Driveway Base (6\" depth)", 80, "cu yd", "Site Work"),
  ]);
  divisions.push(siteWork);

  // 2. FOUNDATION
  const foundation = buildDivision("Foundation", [
    priceItem("labor", "Layout & Staking", 1, "lot", "Foundation"),
    priceItem("labor", "Footing Excavation", perimeter, "lin ft", "Foundation"),
    priceItem("material", "Footing Rebar (#4 continuous)", round2(perimeter * 2), "lin ft", "Foundation"),
    priceItem("material", "Footing Concrete", footingVolumeCuyd, "cu yd", "Foundation"),
    priceItem("labor", "Footing Pour & Form Labor", perimeter, "lin ft", "Foundation"),
    ...(foundation_type === "raised_slab"
      ? [
          priceItem("material", `CMU Block (${block_courses}-course stem wall)`, round2(stemWallSqft), "sq ft", "Foundation"),
          priceItem("labor", "Block Laying Labor", round2(stemWallSqft), "sq ft", "Foundation"),
          priceItem("material", "Mortar & Grout", Math.ceil(stemWallSqft / 100), "bag", "Foundation"),
          priceItem("material", "Stem Wall Rebar (vertical + horizontal)", round2(perimeter * 1.5), "lin ft", "Foundation"),
        ]
      : []),
    priceItem("material", "Vapor Barrier (6 mil poly)", padArea, "sq ft", "Foundation"),
    priceItem("material", "Gravel Base (4\" crushed stone)", round2((padArea * (4 / 12)) / 27), "cu yd", "Foundation"),
    priceItem("material", "Wire Mesh / Rebar Grid", padArea, "sq ft", "Foundation"),
    priceItem("material", `Slab Concrete (${slab_thickness_in}\" slab)`, slabVolumeCuyd, "cu yd", "Foundation"),
    priceItem("labor", "Slab Pour & Finish Labor", padArea, "sq ft", "Foundation"),
    priceItem("subcontractor", "Concrete Pump Truck", 1, "lot", "Foundation"),
    priceItem("material", "Anchor Bolts & Straps", Math.ceil(perimeter / 4), "each", "Foundation"),
    priceItem("material", "Termite Pre-Treatment", padArea, "sq ft", "Foundation"),
  ]);
  divisions.push(foundation);

  // 3. FRAMING
  const framing = buildDivision("Framing", [
    priceItem("material", "Framing Lumber Package (studs, plates, headers)", livingArea, "sq ft", "Framing"),
    priceItem("material", "Wall Sheathing (OSB / ZIP)", exteriorWallArea, "sq ft", "Framing"),
    priceItem("material", "Roof Trusses (engineered)", Math.ceil(padArea / 24), "each", "Framing"),
    priceItem("material", "Roof Decking / Sheathing (OSB)", roofArea, "sq ft", "Framing"),
    priceItem("material", "Structural Hardware (hangers, clips, straps)", 1, "lot", "Framing"),
    priceItem("labor", "Framing Labor — Walls", livingArea, "sq ft", "Framing"),
    priceItem("labor", "Framing Labor — Roof / Truss Set", roofArea, "sq ft", "Framing"),
    priceItem("material", "Subfloor Sheathing (3/4\" T&G)", livingArea, "sq ft", "Framing"),
  ]);
  divisions.push(framing);

  // 4. ROOFING
  const extMaterial = roofing_material === "architectural_shingle" ? "30yr Architectural Shingle"
    : roofing_material === "metal" ? "Metal Roofing Panel (29ga)"
    : "Standing Seam Metal";
  const roofing = buildDivision("Roofing", [
    priceItem("material", "Roof Underlayment (synthetic)", roofArea, "sq ft", "Roofing"),
    priceItem("material", "Ice & Water Shield (eaves + valleys)", round2(perimeter * 3), "sq ft", "Roofing"),
    priceItem("material", `${extMaterial} Material`, roofSquares, "square", "Roofing"),
    priceItem("labor", `${extMaterial} Labor`, roofSquares, "square", "Roofing"),
    priceItem("material", "Ridge Vent", round2(padArea > 2000 ? 60 : 40), "lin ft", "Roofing"),
    priceItem("material", "Drip Edge", round2(perimeter * 1.1), "lin ft", "Roofing"),
    priceItem("material", "Flashing (step, valley, pipe boots)", 1, "lot", "Roofing"),
  ]);
  divisions.push(roofing);

  // 5. EXTERIOR
  const sidingLabel = exterior_material === "hardie_board" ? "HardiePlank Siding"
    : exterior_material === "vinyl_siding" ? "Vinyl Siding"
    : exterior_material === "brick" ? "Brick Veneer"
    : "Stone Veneer";
  const exterior = buildDivision("Exterior", [
    priceItem("material", "House Wrap / Weather Barrier", exteriorWallArea, "sq ft", "Exterior"),
    priceItem("material", `${sidingLabel} Material`, exteriorWallArea, "sq ft", "Exterior"),
    priceItem("labor", `${sidingLabel} Installation`, exteriorWallArea, "sq ft", "Exterior"),
    priceItem("material", "Exterior Trim (fascia, soffit, rake)", 1, "lot", "Exterior"),
    priceItem("labor", "Exterior Trim Installation", 1, "lot", "Exterior"),
    priceItem("material", "Soffit & Fascia (aluminum)", round2(perimeter * 2), "lin ft", "Exterior"),
  ]);
  divisions.push(exterior);

  // 6. WINDOWS & DOORS
  const windowsDoors = buildDivision("Windows & Doors", [
    priceItem("material", "Windows (vinyl, double-hung, Low-E)", windowCount, "each", "Windows & Doors"),
    priceItem("labor", "Window Installation Labor", windowCount, "each", "Windows & Doors"),
    priceItem("material", "Exterior Doors (fiberglass, pre-hung)", extDoorCount, "each", "Windows & Doors"),
    priceItem("labor", "Exterior Door Installation", extDoorCount, "each", "Windows & Doors"),
    priceItem("material", "Interior Doors (6-panel, pre-hung)", intDoorCount, "each", "Windows & Doors"),
    priceItem("labor", "Interior Door Installation", intDoorCount, "each", "Windows & Doors"),
    ...(include_garage ? [priceItem("material", "Garage Door (insulated, 16×7)", garage_bays > 1 ? 1 : 1, "each", "Windows & Doors")] : []),
  ]);
  divisions.push(windowsDoors);

  // 7. ELECTRICAL
  const electrical = buildDivision("Electrical", [
    priceItem("subcontractor", "Electrical Service (200A panel, meter base)", 1, "lot", "Electrical"),
    priceItem("subcontractor", "Electrical Rough-In (wiring, boxes, circuits)", livingArea, "sq ft", "Electrical"),
    priceItem("subcontractor", "Electrical Finish (devices, plates, connections)", 1, "lot", "Electrical"),
    priceItem("material", "Lighting Fixtures (LED recessed + decorative)", bedrooms + bathrooms + 6, "each", "Electrical"),
    priceItem("material", "Ceiling Fans", bedrooms + 1, "each", "Electrical"),
    priceItem("material", "Smoke / CO Detectors (hardwired)", bedrooms + 2, "each", "Electrical"),
  ]);
  divisions.push(electrical);

  // 8. PLUMBING
  const plumbing = buildDivision("Plumbing", [
    priceItem("subcontractor", "Plumbing Rough-In (supply + DWV)", bathrooms, "bath", "Plumbing"),
    priceItem("subcontractor", "Plumbing Finish (fixtures + connections)", 1, "lot", "Plumbing"),
    priceItem("material", "Water Heater (50 gal, gas or electric)", 1, "each", "Plumbing"),
    priceItem("material", "Toilets (elongated, comfort height)", bathrooms, "each", "Plumbing"),
    priceItem("material", "Bathroom Faucets (vanity)", bathrooms, "each", "Plumbing"),
    priceItem("material", "Kitchen Sink (stainless, undermount)", 1, "each", "Plumbing"),
    priceItem("material", "Kitchen Faucet (pull-down sprayer)", 1, "each", "Plumbing"),
    priceItem("material", "Shower/Tub Units", bathrooms, "each", "Plumbing"),
  ]);
  divisions.push(plumbing);

  // 9. HVAC
  const hvacTons = Math.ceil(livingArea / 600);
  const hvac = buildDivision("HVAC", [
    priceItem("subcontractor", `HVAC System (${hvacTons}-ton split, 14+ SEER)`, 1, "lot", "HVAC"),
    priceItem("material", "Ductwork (flex + rigid)", livingArea, "sq ft", "HVAC"),
    priceItem("material", "Thermostat (programmable)", 1, "each", "HVAC"),
    priceItem("material", "Bath Exhaust Fans", bathrooms, "each", "HVAC"),
    priceItem("material", "Range Hood / Kitchen Exhaust", 1, "each", "HVAC"),
  ]);
  divisions.push(hvac);

  // 10. INSULATION
  const insulation = buildDivision("Insulation", [
    priceItem("material", "Wall Insulation (R-13 batts, exterior walls)", exteriorWallArea, "sq ft", "Insulation"),
    priceItem("labor", "Wall Insulation Installation", exteriorWallArea, "sq ft", "Insulation"),
    priceItem("material", "Attic Insulation (R-38 blown)", padArea, "sq ft", "Insulation"),
    priceItem("labor", "Attic Insulation Installation", padArea, "sq ft", "Insulation"),
  ]);
  divisions.push(insulation);

  // 11. DRYWALL
  const drywall = buildDivision("Drywall", [
    priceItem("material", "Drywall (1/2\" standard)", round2(totalDrywallArea), "sq ft", "Drywall"),
    priceItem("material", "Drywall (moisture-resistant, baths)", round2(bathrooms * 200), "sq ft", "Drywall"),
    priceItem("labor", "Drywall Hanging Labor", Math.ceil(totalDrywallArea / 32), "sheet", "Drywall"),
    priceItem("labor", "Drywall Finishing (mud, tape, sand)", totalDrywallArea, "sq ft", "Drywall"),
  ]);
  divisions.push(drywall);

  // 12. INTERIOR FINISHES
  const interiorFinishes = buildDivision("Interior Finishes", [
    priceItem("material", "Interior Trim (base, crown, casing)", round2(interiorWallLF + perimeter), "lin ft", "Interior Finishes"),
    priceItem("labor", "Interior Trim Installation", round2(interiorWallLF + perimeter), "lin ft", "Interior Finishes"),
    priceItem("material", "Closet Shelving Package", bedrooms + 1, "each", "Interior Finishes"),
    priceItem("material", "Interior Hardware (knobs, hinges, stops)", intDoorCount + extDoorCount, "set", "Interior Finishes"),
  ]);
  divisions.push(interiorFinishes);

  // 13. FLOORING
  const tileArea = round2(bathrooms * 80);
  const lvpArea = round2(livingArea - tileArea);
  const flooring = buildDivision("Flooring", [
    priceItem("material", "LVP / Hardwood Flooring Material", lvpArea, "sq ft", "Flooring"),
    priceItem("labor", "LVP / Hardwood Installation", lvpArea, "sq ft", "Flooring"),
    priceItem("material", "Flooring Underlayment", lvpArea, "sq ft", "Flooring"),
    priceItem("material", "Tile — Bathroom Floors", tileArea, "sq ft", "Flooring"),
    priceItem("labor", "Tile Installation — Floors", tileArea, "sq ft", "Flooring"),
    priceItem("material", "Tile — Shower Walls", round2(bathrooms * 100), "sq ft", "Flooring"),
    priceItem("labor", "Tile Installation — Shower Walls", round2(bathrooms * 100), "sq ft", "Flooring"),
  ]);
  divisions.push(flooring);

  // 14. PAINTING
  const paintWallArea = round2(netWallArea + interiorWallArea);
  const painting = buildDivision("Painting", [
    priceItem("material", "Interior Paint Material (walls + ceilings)", round2(paintWallArea + livingArea), "sq ft", "Painting"),
    priceItem("labor", "Interior Paint Labor (2 coats)", round2(paintWallArea + livingArea), "sq ft", "Painting"),
    priceItem("material", "Exterior Paint / Stain Material", exteriorWallArea, "sq ft", "Painting"),
    priceItem("labor", "Exterior Paint Labor", exteriorWallArea, "sq ft", "Painting"),
  ]);
  divisions.push(painting);

  // 15. CABINETS & COUNTERTOPS
  const kitchenWallLF = round2(livingArea > 2000 ? 25 : 18);
  const cabinets = buildDivision("Cabinets & Countertops", [
    priceItem("material", "Kitchen Cabinets (stock/semi-custom)", kitchenWallLF, "lin ft", "Cabinets & Countertops"),
    priceItem("labor", "Cabinet Installation", kitchenWallLF, "lin ft", "Cabinets & Countertops"),
    priceItem("material", "Countertops (granite / quartz)", round2(kitchenWallLF * 2), "sq ft", "Cabinets & Countertops"),
    priceItem("labor", "Countertop Installation", 1, "lot", "Cabinets & Countertops"),
    priceItem("material", "Bathroom Vanity Cabinets", bathrooms, "each", "Cabinets & Countertops"),
    priceItem("material", "Bathroom Vanity Tops", bathrooms, "each", "Cabinets & Countertops"),
  ]);
  divisions.push(cabinets);

  // 16. APPLIANCES
  const appliances = buildDivision("Appliances", [
    priceItem("material", "Refrigerator", 1, "each", "Appliances"),
    priceItem("material", "Range / Oven", 1, "each", "Appliances"),
    priceItem("material", "Dishwasher", 1, "each", "Appliances"),
    priceItem("material", "Microwave (over-range)", 1, "each", "Appliances"),
    priceItem("material", "Washer & Dryer Hookups", 1, "lot", "Appliances"),
  ]);
  divisions.push(appliances);

  // 17. GUTTERS & DRAINAGE
  const gutters = buildDivision("Gutters & Drainage", [
    priceItem("material", "Seamless Gutters (5\" aluminum)", round2(perimeter * 0.75), "lin ft", "Gutters"),
    priceItem("labor", "Gutter Installation", round2(perimeter * 0.75), "lin ft", "Gutters"),
    priceItem("material", "Downspouts", Math.ceil(perimeter / 40), "each", "Gutters"),
    priceItem("material", "Gutter Guards", round2(perimeter * 0.75), "lin ft", "Gutters"),
  ]);
  divisions.push(gutters);

  // 18. GENERAL CONDITIONS
  const general = buildDivision("General Conditions", [
    priceItem("material", "Building Permits & Fees", 1, "lot", "General"),
    priceItem("labor", "Project Supervision / Management", 1, "lot", "General"),
    priceItem("labor", "Mobilization & Site Setup", 1, "lot", "General"),
    priceItem("material", "Temporary Utilities (power, water, toilet)", 1, "lot", "General"),
    priceItem("labor", "Waste Management / Dumpster", 3, "each", "General"),
    priceItem("labor", "Final Cleaning", livingArea, "sq ft", "General"),
    priceItem("material", "Builder's Risk Insurance", 1, "lot", "General"),
    priceItem("labor", "Survey & Staking", 1, "lot", "General"),
  ]);
  divisions.push(general);

  // ── Compute summary ──

  const allItems = divisions.flatMap((d) => d.items);
  const totalCost = allItems.reduce((sum, item) => {
    const price = item.suggested_price ?? 0;
    return sum + price * item.quantity;
  }, 0);

  return {
    divisions,
    takeoff: allItems,
    summary: {
      pad_area_sqft: padArea,
      living_area_sqft: livingArea,
      perimeter_lft: perimeter,
      fill_volume_cuyd: gradingAnalysis.net_fill_cuyd,
      slab_concrete_cuyd: slabVolumeCuyd,
      roof_area_sqft: roofArea,
      exterior_wall_area_sqft: exteriorWallArea,
      total_estimated_cost: round2(totalCost),
      cost_per_sqft: livingArea > 0 ? round2(totalCost / livingArea) : 0,
    },
    grading_analysis: gradingAnalysis,
  };
}

// ── Grading / Dirtwork Analysis ────────────────────────────────────────

/**
 * Analyze elevation data from Moasure measurement to compute cut/fill volumes.
 *
 * Uses the interior PointsPath points as an elevation grid across the pad.
 * Computes how much fill (or cut) is needed to bring the pad to a level target
 * elevation above the highest point (for drainage).
 *
 * Volume estimation uses the average-depth method:
 *   fill_volume = pad_area × avg_fill_depth / 27 (convert cu ft → cu yd)
 */
function analyzeGrading(
  measurement: MoasureMeasurement,
  padArea: number,
  padElevationAbove: number,
): GradingAnalysis {
  // Use all points for elevation analysis (perimeter + interior)
  const allPoints = measurement.points;

  if (allPoints.length === 0) {
    return {
      data_points: 0,
      min_elevation_ft: 0,
      max_elevation_ft: 0,
      avg_elevation_ft: 0,
      target_elevation_ft: 0,
      avg_fill_depth_ft: 0,
      fill_volume_cuyd: 0,
      cut_volume_cuyd: 0,
      net_fill_cuyd: 0,
      truckloads: 0,
    };
  }

  const zValues = allPoints.map((p) => p.z);
  const minZ = Math.min(...zValues);
  const maxZ = Math.max(...zValues);
  const avgZ = zValues.reduce((a, b) => a + b, 0) / zValues.length;

  // Target: level pad at highest point + buffer for drainage
  const targetZ = maxZ + padElevationAbove;

  // Compute fill and cut for each point's "zone"
  // Each point represents roughly (padArea / numPoints) sq ft of coverage
  let totalFillDepth = 0;
  let totalCutDepth = 0;
  let fillPoints = 0;
  let cutPoints = 0;

  for (const z of zValues) {
    const diff = targetZ - z;
    if (diff > 0) {
      totalFillDepth += diff;
      fillPoints++;
    } else if (diff < 0) {
      totalCutDepth += Math.abs(diff);
      cutPoints++;
    }
  }

  const avgFillDepth = fillPoints > 0 ? totalFillDepth / fillPoints : 0;
  const avgCutDepth = cutPoints > 0 ? totalCutDepth / cutPoints : 0;

  // Volume = (area fraction × avg depth) / 27 cu ft per cu yd
  const fillFraction = fillPoints / zValues.length;
  const cutFraction = cutPoints / zValues.length;
  const fillVolume = round2((padArea * fillFraction * avgFillDepth) / 27);
  const cutVolume = round2((padArea * cutFraction * avgCutDepth) / 27);
  const netFill = round2(Math.max(0, fillVolume - cutVolume));

  return {
    data_points: allPoints.length,
    min_elevation_ft: round2(minZ),
    max_elevation_ft: round2(maxZ),
    avg_elevation_ft: round2(avgZ),
    target_elevation_ft: round2(targetZ),
    avg_fill_depth_ft: round2(avgFillDepth),
    fill_volume_cuyd: fillVolume,
    cut_volume_cuyd: cutVolume,
    net_fill_cuyd: netFill,
    truckloads: Math.ceil(netFill / 15), // ~15 cu yd per tandem dump truck
  };
}

// ── Helpers ────────────────────────────────────────────────────────────

function priceItem(
  category: "material" | "labor" | "subcontractor",
  description: string,
  quantity: number,
  unit: string,
  source: string,
): PlanTakeoffItem {
  const suggestion = suggestPrice(description);
  return {
    category,
    description,
    quantity: round2(quantity),
    unit,
    suggested_price: suggestion?.suggestedPrice ?? null,
    price_confidence: suggestion?.confidence ?? null,
    source,
    derived: true,
  };
}

function estimateBedrooms(livingAreaSqft: number): number {
  if (livingAreaSqft < 1200) return 2;
  if (livingAreaSqft < 1800) return 3;
  if (livingAreaSqft < 2800) return 4;
  return 5;
}

function estimateBathrooms(bedrooms: number): number {
  if (bedrooms <= 2) return 2;
  if (bedrooms <= 3) return 2;
  return bedrooms - 1; // master + one per 2 bedrooms roughly
}

function estimateWindowCount(livingArea: number, bedrooms: number, bathrooms: number): number {
  // Code requirement: 2 egress windows per bedroom, 1 per bath, plus kitchen/living
  return bedrooms * 2 + bathrooms + 4;
}

function getRoofPitchMultiplier(pitch: string): number {
  const match = pitch.match(/(\d+)\s*[/:]\s*(\d+)/);
  if (!match) return 1.118; // default 4/12

  const rise = parseFloat(match[1]!);
  const run = parseFloat(match[2]!);
  if (run === 0) return 1.118;

  return round3(Math.sqrt(1 + (rise / run) ** 2));
}

function buildDivision(name: string, items: PlanTakeoffItem[]): PadDivision {
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.suggested_price ?? 0) * item.quantity;
  }, 0);
  return { name, items, subtotal: round2(subtotal) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
