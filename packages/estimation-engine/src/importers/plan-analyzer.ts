/**
 * Building Plan Analyzer
 *
 * Converts AI-extracted data from building plans/blueprints into
 * structured takeoff data that can be mapped to estimate line items.
 *
 * Input: Raw analysis from Claude Vision API (rooms, dimensions, materials)
 * Output: Structured line items ready for the estimate editor
 */

import { suggestPrice, type PricingSuggestion } from "../calculations/pricing";

// ── Types ──────────────────────────────────────────────────────────────

export interface ExtractedRoom {
  /** Room name (e.g., "Master Bedroom", "Kitchen") */
  name: string;
  /** Length in feet */
  length_ft: number | null;
  /** Width in feet */
  width_ft: number | null;
  /** Height in feet (ceiling) */
  height_ft: number | null;
  /** Computed floor area in square feet */
  area_sqft: number | null;
  /** Perimeter in linear feet */
  perimeter_lft: number | null;
  /** Number of windows */
  window_count: number;
  /** Number of doors */
  door_count: number;
  /** Additional notes from the plan */
  notes: string | null;
}

export interface ExtractedOpening {
  type: "window" | "door" | "garage_door" | "sliding_door";
  width_ft: number | null;
  height_ft: number | null;
  count: number;
  location: string | null;
}

export interface ExtractedDimension {
  /** What is being measured */
  label: string;
  /** Numeric value */
  value: number;
  /** Unit of measurement */
  unit: string;
  /** Where on the plan this was found */
  location: string | null;
}

export interface PlanPageAnalysis {
  /** Page number or image index */
  page: number;
  /** What type of plan this page shows */
  plan_type: "floor_plan" | "elevation" | "roof_plan" | "foundation" | "site_plan" | "detail" | "electrical" | "plumbing" | "mechanical" | "other";
  /** Rooms extracted from this page */
  rooms: ExtractedRoom[];
  /** Openings (doors, windows) */
  openings: ExtractedOpening[];
  /** Raw dimensions found */
  dimensions: ExtractedDimension[];
  /** Overall building dimensions from this page */
  building_length_ft: number | null;
  building_width_ft: number | null;
  /** Total living area if stated */
  total_area_sqft: number | null;
  /** Roof details */
  roof_pitch: string | null;
  roof_type: string | null;
  /** Foundation type detected */
  foundation_type: string | null;
  /** Exterior materials noted */
  exterior_materials: string[];
  /** Raw description of what was found */
  raw_description: string;
  /** Confidence in the analysis (0-1) */
  confidence: number;
}

export interface PlanAnalysisResult {
  /** Analysis per page/image */
  pages: PlanPageAnalysis[];
  /** Aggregated building summary */
  summary: {
    total_area_sqft: number | null;
    total_rooms: number;
    total_bathrooms: number;
    total_bedrooms: number;
    stories: number;
    garage_bays: number;
    building_footprint_sqft: number | null;
    exterior_wall_lft: number | null;
    roof_squares: number | null;
  };
  /** Computed takeoff quantities */
  takeoff: PlanTakeoffItem[];
}

export interface PlanTakeoffItem {
  /** Category: material, labor, subcontractor */
  category: "material" | "labor" | "subcontractor";
  /** Line item description */
  description: string;
  /** Quantity */
  quantity: number;
  /** Unit of measure */
  unit: string;
  /** Suggested unit price from pricing engine (null if no match) */
  suggested_price: number | null;
  /** Confidence of the suggestion */
  price_confidence: "high" | "medium" | "low" | null;
  /** Which room or area this applies to */
  source: string;
  /** Whether this was directly from the plan or computed */
  derived: boolean;
}

// ── Main Mapper ────────────────────────────────────────────────────────

/**
 * Convert plan analysis results into estimate-ready takeoff line items.
 *
 * Uses extracted dimensions to compute quantities for common construction items:
 * - Framing (walls, roof, floor)
 * - Drywall (wall area minus openings)
 * - Flooring (floor area)
 * - Roofing (roof area from footprint + pitch)
 * - Paint (wall + ceiling area)
 * - Insulation (wall + ceiling area)
 * - Electrical (per room counts)
 * - Plumbing (per fixture counts)
 * - Windows & doors (from counts)
 */
export function generateTakeoffFromPlan(analysis: PlanAnalysisResult, projectType: string): PlanTakeoffItem[] {
  const items: PlanTakeoffItem[] = [];
  const summary = analysis.summary;

  // Aggregate room data across all pages
  const allRooms = analysis.pages.flatMap((p) => p.rooms);
  const allOpenings = analysis.pages.flatMap((p) => p.openings);

  // ── Total areas ──
  const totalFloorArea = summary.total_area_sqft ?? allRooms.reduce((sum, r) => sum + (r.area_sqft ?? 0), 0);
  const totalWallPerimeter = summary.exterior_wall_lft ?? allRooms.reduce((sum, r) => sum + (r.perimeter_lft ?? 0), 0);
  const avgCeilingHeight = 9; // Default assumption

  // Compute wall area (perimeter × height - openings)
  const totalWindowCount = allOpenings
    .filter((o) => o.type === "window")
    .reduce((sum, o) => sum + o.count, 0) || allRooms.reduce((sum, r) => sum + r.window_count, 0);
  const totalDoorCount = allOpenings
    .filter((o) => o.type === "door" || o.type === "sliding_door")
    .reduce((sum, o) => sum + o.count, 0) || allRooms.reduce((sum, r) => sum + r.door_count, 0);

  const windowAreaDeduction = totalWindowCount * 15; // ~15 sqft per window
  const doorAreaDeduction = totalDoorCount * 21; // ~21 sqft per door (3×7)

  const interiorWallArea = allRooms.reduce((sum, r) => {
    const perim = r.perimeter_lft ?? 0;
    const height = r.height_ft ?? avgCeilingHeight;
    return sum + perim * height;
  }, 0);

  const exteriorWallArea = totalWallPerimeter * avgCeilingHeight;
  const netInteriorWallArea = Math.max(0, interiorWallArea - windowAreaDeduction - doorAreaDeduction);

  // ── Roof calculation ──
  const roofPitchMultiplier = getRoofPitchMultiplier(analysis.pages.find((p) => p.roof_pitch)?.roof_pitch ?? null);
  const buildingFootprint = summary.building_footprint_sqft ?? totalFloorArea / Math.max(1, summary.stories);
  const roofArea = buildingFootprint * roofPitchMultiplier;
  const roofSquares = roofArea / 100;

  // ── Generate items ──

  // General conditions
  if (totalFloorArea > 0) {
    items.push(priceItem("material", "Building Permits", 1, "lot", "General"));
    items.push(priceItem("labor", "General Conditions", 1, "lot", "General"));
    items.push(priceItem("labor", "Project Coordination (Supervision)", 1, "lot", "General"));
    items.push(priceItem("labor", "Mobilization", 1, "lot", "General"));
  }

  // Foundation
  if (buildingFootprint > 0) {
    items.push(priceItem("material", "Concrete Forming Material (incl. rebar)", 1, "lot", "Foundation"));
    items.push(priceItem("material", "Slab Material — 4\" concrete", round2(buildingFootprint), "sq ft", "Foundation"));
    items.push(priceItem("labor", "Slab Labor — pour & finish", round2(buildingFootprint), "sq ft", "Foundation"));
    items.push(priceItem("subcontractor", "Pump Truck", 1, "lot", "Foundation"));
  }

  // Framing
  if (totalFloorArea > 0) {
    items.push(priceItem("material", "Framing Material (studs, plates, headers)", round2(totalFloorArea), "sq ft", "Framing"));
    items.push(priceItem("labor", "Framing Labor", round2(totalFloorArea), "sq ft", "Framing"));
  }

  // Roofing
  if (roofSquares > 0) {
    items.push(priceItem("material", "Shingle Roofing Material (30yr arch)", round2(roofSquares), "bundle", "Roofing"));
    items.push(priceItem("labor", "Shingle Roofing Labor", round2(roofSquares), "bundle", "Roofing"));
    items.push(priceItem("material", "Roof Decking / Sheathing (OSB)", round2(roofArea), "sq ft", "Roofing"));
    items.push(priceItem("material", "Roof Underlayment / Ice & Water Shield", round2(roofArea), "sq ft", "Roofing"));
  }

  // Exterior
  if (exteriorWallArea > 0) {
    const extMaterials = analysis.pages.flatMap((p) => p.exterior_materials);
    const sidingType = extMaterials.find((m) =>
      m.toLowerCase().includes("siding") || m.toLowerCase().includes("hardie") || m.toLowerCase().includes("vinyl"),
    ) ?? "Exterior Siding";
    items.push(priceItem("material", `${sidingType} Material`, round2(exteriorWallArea), "sq ft", "Exterior"));
    items.push(priceItem("labor", "Siding Installation Labor", round2(exteriorWallArea), "sq ft", "Exterior"));
    items.push(priceItem("material", "House Wrap / Weather Barrier", round2(exteriorWallArea), "sq ft", "Exterior"));
  }

  // Windows & Doors
  if (totalWindowCount > 0) {
    items.push(priceItem("material", "Windows (double-hung, Low-E)", totalWindowCount, "each", "Windows & Doors"));
    items.push(priceItem("labor", "Window Installation Labor", totalWindowCount, "each", "Windows & Doors"));
  }
  if (totalDoorCount > 0) {
    const extDoors = allOpenings.filter((o) => o.type === "door" && o.location?.toLowerCase().includes("ext")).length || Math.max(2, Math.floor(totalDoorCount * 0.2));
    const intDoors = totalDoorCount - extDoors;
    if (extDoors > 0) {
      items.push(priceItem("material", "Exterior Doors (fiberglass/steel)", extDoors, "each", "Windows & Doors"));
      items.push(priceItem("labor", "Exterior Door Installation Labor", extDoors, "each", "Windows & Doors"));
    }
    if (intDoors > 0) {
      items.push(priceItem("material", "Interior Doors (6-panel, pre-hung)", intDoors, "each", "Windows & Doors"));
      items.push(priceItem("labor", "Interior Door Installation Labor", intDoors, "each", "Windows & Doors"));
    }
  }

  // Drywall
  if (netInteriorWallArea > 0) {
    const drywallSheets = Math.ceil(netInteriorWallArea / 32); // 4×8 = 32 sqft per sheet
    items.push(priceItem("material", "Drywall (1/2\" standard + moisture-resistant)", round2(netInteriorWallArea), "sq ft", "Drywall"));
    items.push(priceItem("labor", "Drywall Hanging Labor", drywallSheets, "each", "Drywall"));
    items.push(priceItem("labor", "Drywall Finishing / Mud & Tape", round2(netInteriorWallArea), "sq ft", "Drywall"));
  }

  // Insulation
  if (exteriorWallArea > 0) {
    items.push(priceItem("material", "Wall Insulation (R-13 batts)", round2(exteriorWallArea), "sq ft", "Insulation"));
    items.push(priceItem("labor", "Insulation Installation Labor", round2(exteriorWallArea), "sq ft", "Insulation"));
  }
  if (buildingFootprint > 0) {
    items.push(priceItem("material", "Attic Insulation (R-38 blown)", round2(buildingFootprint), "sq ft", "Insulation"));
  }

  // Flooring
  if (totalFloorArea > 0) {
    items.push(priceItem("material", "Flooring Material (LVP / hardwood)", round2(totalFloorArea), "sq ft", "Flooring"));
    items.push(priceItem("labor", "Flooring Installation Labor", round2(totalFloorArea), "sq ft", "Flooring"));
    items.push(priceItem("material", "Flooring Underlayment", round2(totalFloorArea), "sq ft", "Flooring"));
  }

  // Tile (bathrooms)
  if (summary.total_bathrooms > 0) {
    const tileArea = summary.total_bathrooms * 80; // ~80 sqft avg bathroom floor
    const showerWallTile = summary.total_bathrooms * 100; // ~100 sqft avg shower walls
    items.push(priceItem("material", "Tile Material — bathroom floors", round2(tileArea), "sq ft", "Tile"));
    items.push(priceItem("labor", "Tile Labor — floors", round2(tileArea), "sq ft", "Tile"));
    items.push(priceItem("material", "Tile Material — shower walls", round2(showerWallTile), "sq ft", "Tile"));
    items.push(priceItem("labor", "Tile Labor — shower walls", round2(showerWallTile), "sq ft", "Tile"));
  }

  // Interior Paint
  if (netInteriorWallArea > 0 || totalFloorArea > 0) {
    const paintArea = netInteriorWallArea + totalFloorArea; // walls + ceilings
    items.push(priceItem("material", "Interior Paint Material", round2(paintArea), "sq ft", "Paint"));
    items.push(priceItem("labor", "Interior Paint Labor (walls & ceilings)", round2(paintArea), "sq ft", "Paint"));
    items.push(priceItem("labor", "Interior Paint Prep Labor", round2(paintArea * 0.6), "sq ft", "Paint"));
  }

  // Exterior Paint
  if (exteriorWallArea > 0) {
    items.push(priceItem("material", "Exterior Paint Material", round2(exteriorWallArea), "sq ft", "Paint"));
    items.push(priceItem("labor", "Exterior Paint Labor", round2(exteriorWallArea), "sq ft", "Paint"));
  }

  // Trim
  if (totalFloorArea > 0) {
    const trimLft = allRooms.reduce((sum, r) => sum + (r.perimeter_lft ?? 0), 0) || totalFloorArea * 0.15;
    items.push(priceItem("material", "Interior Trim Material (base, crown, casing)", round2(trimLft), "lin ft", "Trim"));
    items.push(priceItem("labor", "Interior Trim Installation Labor", round2(trimLft), "lin ft", "Trim"));
    items.push(priceItem("material", "Exterior Trim Material (fascia, soffit)", 1, "lot", "Trim"));
    items.push(priceItem("labor", "Exterior Trim Labor", 1, "lot", "Trim"));
  }

  // Electrical
  if (allRooms.length > 0) {
    items.push(priceItem("material", "Electrical Material (wiring, panels, boxes)", 1, "lot", "Electrical"));
    items.push(priceItem("labor", "Electrical Labor (rough-in + finish)", 1, "lot", "Electrical"));
    items.push(priceItem("material", "Lighting Fixtures", allRooms.length, "each", "Electrical"));
  }

  // Plumbing
  if (summary.total_bathrooms > 0) {
    items.push(priceItem("subcontractor", "Plumbing Material & Labor (rough + finish)", summary.total_bathrooms, "each", "Plumbing"));
    items.push(priceItem("material", "Plumbing Fixtures (toilet, faucets, showerhead)", summary.total_bathrooms, "lot", "Plumbing"));
  }

  // HVAC
  if (totalFloorArea > 0) {
    const hvacTons = Math.ceil(totalFloorArea / 600); // 1 ton per ~600 sqft
    items.push(priceItem("subcontractor", `HVAC System (${hvacTons}-ton split system)`, 1, "lot", "HVAC"));
    items.push(priceItem("material", "HVAC Ductwork", round2(totalFloorArea), "sq ft", "HVAC"));
  }

  // Gutters
  if (totalWallPerimeter > 0) {
    items.push(priceItem("material", "Gutter Material (seamless aluminum)", round2(totalWallPerimeter), "lin ft", "Gutters"));
    items.push(priceItem("labor", "Gutter Installation Labor", round2(totalWallPerimeter), "lin ft", "Gutters"));
  }

  // Cleanup
  items.push(priceItem("labor", "Waste Management / Dumpster", 1, "lot", "General"));
  items.push(priceItem("labor", "Final Cleaning", 1, "lot", "General"));

  return items;
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
    quantity,
    unit,
    suggested_price: suggestion?.suggestedPrice ?? null,
    price_confidence: suggestion?.confidence ?? null,
    source,
    derived: true,
  };
}

/**
 * Convert roof pitch string (e.g., "6/12", "8:12") to area multiplier.
 */
function getRoofPitchMultiplier(pitch: string | null): number {
  if (!pitch) return 1.118; // Default 4/12 pitch

  const match = pitch.match(/(\d+)\s*[/:]\s*(\d+)/);
  if (!match) return 1.118;

  const rise = parseFloat(match[1]!);
  const run = parseFloat(match[2]!);

  if (run === 0) return 1.118;

  // Pitch factor = sqrt(1 + (rise/run)^2)
  return round3(Math.sqrt(1 + (rise / run) ** 2));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
