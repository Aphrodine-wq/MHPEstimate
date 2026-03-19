/**
 * Sqft-to-Quantity Conversion Formulas
 *
 * Each entry maps a standard line item name to the ratio and unit used
 * when computing quantity from a project's square footage.
 *
 * Baseline: Mississippi / Southeast US residential construction practice.
 * Derived from MHP's 3-year estimate history (2023-2026).
 */

export interface SqftFormula {
  perSqft?: number;
  unit: string;
  minQuantity?: number;
  isFixed?: boolean;
  fixedQuantity?: number;
}

export const SQFT_FORMULAS: Record<string, SqftFormula> = {
  "General Conditions": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Project Coordination (Supervision)": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Building Permits": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Mobilization": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Temporary Power": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Temporary Water": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Temporary Power Pole": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Sanitary Facilities (Port-A-Johns)": { isFixed: true, fixedQuantity: 1, unit: "month", minQuantity: 1 }, "Erosion Control": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Soil/Perc Testing": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Architectural Plans": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Engineering (Site Surveys)": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Construction Staking": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Termite Pre-Treat": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Septic Design/Permit": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Final Cleaning": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Progess Cleaning": { isFixed: true, fixedQuantity: 1, unit: "lot" },
  "Waste Management": { perSqft: 1 / 500, unit: "dumpster", minQuantity: 1 },
  "Site Prep/Grading": { perSqft: 1.0, unit: "sq ft", minQuantity: 100 }, "Land Clearing": { perSqft: 1.0, unit: "sq ft", minQuantity: 500 }, "Land Clearing Labor": { perSqft: 1.0, unit: "sq ft", minQuantity: 500 }, "Grading/Earthwork": { perSqft: 1.0, unit: "sq ft", minQuantity: 200 }, "Grading/Earthwork Labor": { perSqft: 1.0, unit: "sq ft", minQuantity: 200 }, "Fill Dirt/Hauling": { perSqft: 0.037, unit: "cu yd", minQuantity: 1 }, "Structure Demolition": { perSqft: 1.0, unit: "sq ft", minQuantity: 50 }, "Masonry Sand": { perSqft: 0.037, unit: "cu yd", minQuantity: 1 },
  "Slab Material": { perSqft: 1.0, unit: "sq ft", minQuantity: 50 }, "Slab Labor": { perSqft: 1.0, unit: "sq ft", minQuantity: 50 }, "Concrete Forming Material (Includes Reinforcement)": { perSqft: 1.0, unit: "sq ft", minQuantity: 50 }, "Pump Truck": { isFixed: true, fixedQuantity: 1, unit: "each" }, "Concrete Floor Staining/Scoring Labor": { perSqft: 1.0, unit: "sq ft", minQuantity: 50 },
  "Framing Material": { perSqft: 1.0, unit: "sq ft", minQuantity: 50 }, "Framing Labor": { perSqft: 1.0, unit: "sq ft", minQuantity: 50 },
  "Shingle Roofing Material": { perSqft: 1.15, unit: "sq ft", minQuantity: 100 }, "Shingle Roofing Labor": { perSqft: 1.15, unit: "sq ft", minQuantity: 100 },
  "Exterior Brick Material": { perSqft: 0.40, unit: "sq ft wall", minQuantity: 50 }, "Exterior Brick Labor": { perSqft: 0.40, unit: "sq ft wall", minQuantity: 50 }, "Exterior Trim Material": { perSqft: 0.25, unit: "lin ft", minQuantity: 20 }, "Exterior Trim Labor": { perSqft: 0.25, unit: "lin ft", minQuantity: 20 }, "Exterior Doors": { isFixed: true, fixedQuantity: 1, unit: "each" }, "Garage Door": { isFixed: true, fixedQuantity: 1, unit: "each" }, "Gutter Material": { perSqft: 0.30, unit: "lin ft", minQuantity: 20 }, "Gutter Labor": { perSqft: 0.30, unit: "lin ft", minQuantity: 20 },
  "Windows": { perSqft: 1 / 100, unit: "each", minQuantity: 1 },
  "Insulation Material": { perSqft: 1.0, unit: "sq ft", minQuantity: 50 }, "Insulation Labor": { perSqft: 1.0, unit: "sq ft", minQuantity: 50 },
  "Drywall": { perSqft: 3.5, unit: "sq ft board", minQuantity: 200 },
  "Interior Trim Material": { perSqft: 1.5, unit: "lin ft", minQuantity: 30 }, "Interior Trim Labor": { perSqft: 1.5, unit: "lin ft", minQuantity: 30 }, "Interior Doors": { perSqft: 1 / 150, unit: "each", minQuantity: 1 }, "Door Hardware": { perSqft: 1 / 150, unit: "set", minQuantity: 1 },
  "Stair Material": { isFixed: true, fixedQuantity: 1, unit: "flight" }, "Stair Labor": { isFixed: true, fixedQuantity: 1, unit: "flight" },
  "Interior Paint Material": { perSqft: 3.0, unit: "sq ft wall", minQuantity: 100 }, "Interior Paint Labor": { perSqft: 3.0, unit: "sq ft wall", minQuantity: 100 }, "Painting": { perSqft: 3.0, unit: "sq ft wall", minQuantity: 100 }, "Exterior Paint Material": { perSqft: 0.40, unit: "sq ft wall", minQuantity: 50 }, "Exterior Paint Labor": { perSqft: 0.40, unit: "sq ft wall", minQuantity: 50 },
  "Carpet Material": { perSqft: 1.0, unit: "sq ft", minQuantity: 50 }, "Carpet Labor": { perSqft: 1.0, unit: "sq ft", minQuantity: 50 }, "Tile Material&Labor": { perSqft: 1.0, unit: "sq ft", minQuantity: 20 }, "Concrete Floor Staining": { perSqft: 1.0, unit: "sq ft", minQuantity: 50 },
  "Kitchen Cabinets": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Bathroom Vanities": { isFixed: true, fixedQuantity: 1, unit: "each" }, "Cabinet & Drawer Hardware": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Countertop Material": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Countertop Labor": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Closet Shelving Material": { perSqft: 0.15, unit: "lin ft", minQuantity: 4 }, "Closet Shelving Labor": { perSqft: 0.15, unit: "lin ft", minQuantity: 4 }, "Mantel/Wood Beam Material": { isFixed: true, fixedQuantity: 1, unit: "each" }, "Mantel/Wood Beam Labor": { isFixed: true, fixedQuantity: 1, unit: "each" },
  "Shower Door (Included Material & Labor)": { isFixed: true, fixedQuantity: 1, unit: "each" },
  "Fireplace Material": { isFixed: true, fixedQuantity: 1, unit: "each" }, "Fireplace Labor": { isFixed: true, fixedQuantity: 1, unit: "each" },
  "Plumbing Material & Labor": { perSqft: 1 / 100, unit: "fixture", minQuantity: 1 }, "Plumbing Fixtures": { perSqft: 1 / 100, unit: "each", minQuantity: 1 }, "Plumbing Gas Materials and Labor": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Water Heaters": { isFixed: true, fixedQuantity: 1, unit: "each" }, "Underground Plumbing Material": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Underground Plumbing Labor": { isFixed: true, fixedQuantity: 1, unit: "lot" },
  "Electrical Material": { perSqft: 1 / 200, unit: "circuit", minQuantity: 1 }, "Electrical Labor": { perSqft: 1 / 200, unit: "circuit", minQuantity: 1 }, "Electrical Conduit": { perSqft: 0.25, unit: "lin ft", minQuantity: 10 }, "Lighting Fixtures": { perSqft: 1 / 150, unit: "each", minQuantity: 1 }, "Electrical Service/Meter Base": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Electrical Trenching": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Underground Electrical Material": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Underground Electrical Labor": { isFixed: true, fixedQuantity: 1, unit: "lot" },
  "HVAC Material": { isFixed: true, fixedQuantity: 1, unit: "system" },
  "Kitchen Appliances": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Laundry Appliances": { isFixed: true, fixedQuantity: 1, unit: "lot" },
  "Driveway Material": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Driveway Labor": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Landscaping/Sodding": { perSqft: 1.0, unit: "sq ft", minQuantity: 100 },
  "Well Drilling": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Well Pump & Pressure Tank": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Well Plumbing Material": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Well Plumbing Labor": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Septic Tank": { isFixed: true, fixedQuantity: 1, unit: "each" }, "Septic Drain Field Material": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Septic Installation Labor": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Gas Line Material": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Gas Line Labor": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Stormwater/Drainage Material": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Stormwater/Drainage Labor": { isFixed: true, fixedQuantity: 1, unit: "lot" }, "Water Service": { isFixed: true, fixedQuantity: 1, unit: "lot" },
};

export function computeQuantity(lineItemName: string, squareFootage: number): { quantity: number; unit: string } {
  const formula = SQFT_FORMULAS[lineItemName];
  if (!formula) return { quantity: 1, unit: "lot" };
  if (formula.isFixed) return { quantity: formula.fixedQuantity ?? 1, unit: formula.unit };
  const raw = (formula.perSqft ?? 0) * squareFootage;
  const quantity = Math.max(raw, formula.minQuantity ?? 0);
  return { quantity, unit: formula.unit };
}
