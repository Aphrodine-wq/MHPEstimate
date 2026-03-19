/**
 * Indirect Costs Checklist
 *
 * The costs contractors forget — permits, dumpsters, porta-johns, temp power,
 * insurance, inspections, engineering, code upgrades. These are the items that
 * turn a profitable job into a loss when they show up on the invoice but weren't
 * in the estimate.
 *
 * Each cost is tagged as "auto" (included by default in estimates) or "review"
 * (surfaced as a checklist item for the contractor to accept/dismiss).
 *
 * Default costs are SE US baseline — apply regional multiplier on top.
 */

export interface IndirectCost {
  id: string;
  name: string;
  reason: string;
  defaultCost: number;
  costType: "fixed" | "per_sqft" | "percent_of_total";
  rate?: number;
  minCost?: number;
  maxCost?: number;
  inclusion: "auto" | "review";
  projectTypes: string[];
  excludeProjectTypes?: string[];
  category: "permits_fees" | "site_services" | "insurance" | "testing_inspections" | "equipment" | "temporary_facilities" | "professional_services";
  triggerHint?: string;
}

export const INDIRECT_COSTS: IndirectCost[] = [
  // ── Permits & Fees
  { id: "building_permit", name: "Building Permit", reason: "Required by code for structural, electrical, plumbing, and mechanical work", defaultCost: 350, costType: "fixed", inclusion: "auto", projectTypes: [], category: "permits_fees" },
  { id: "permit_inspection_fees", name: "Inspection Fees (Rough-in + Final)", reason: "Most jurisdictions charge separate inspection fees on top of the permit", defaultCost: 200, costType: "fixed", inclusion: "auto", projectTypes: [], excludeProjectTypes: ["painting", "fencing"], category: "permits_fees" },
  { id: "hoa_review_fee", name: "HOA Architectural Review Fee", reason: "Many HOAs charge $50-200 for exterior modification review", defaultCost: 100, costType: "fixed", inclusion: "review", projectTypes: ["deck", "porch", "fencing", "roofing", "siding", "addition_remodel", "garage_carport", "new_build"], category: "permits_fees", triggerHint: "Ask if the property is in an HOA" },
  { id: "utility_locate", name: "Utility Locate (811 / One-Call)", reason: "Free service but required before any excavation — delays project if not called ahead", defaultCost: 0, costType: "fixed", inclusion: "auto", projectTypes: ["deck", "porch", "fencing", "addition_remodel", "new_build", "garage_carport", "retaining_wall", "concrete_hardscape", "infrastructure"], category: "permits_fees" },
  { id: "plan_copies", name: "Blueprint / Plan Copies", reason: "Permit office needs 2-3 sets; subs each need a copy", defaultCost: 75, costType: "fixed", inclusion: "review", projectTypes: ["addition_remodel", "new_build", "garage_carport", "commercial"], category: "permits_fees" },

  // ── Site Services
  { id: "dumpster_rental", name: "Dumpster Rental (Roll-off)", reason: "20-yard dumpster for demo debris, packaging, and waste. Most jobs over $5K need one.", defaultCost: 450, costType: "fixed", inclusion: "auto", projectTypes: [], excludeProjectTypes: ["painting"], category: "site_services", triggerHint: "Size up to 30-yard for full renovation or addition" },
  { id: "portable_toilet", name: "Portable Toilet (Monthly)", reason: "Required on jobs lasting 2+ weeks. Crew can't use the homeowner's bathroom.", defaultCost: 175, costType: "fixed", inclusion: "review", projectTypes: ["addition_remodel", "new_build", "garage_carport", "commercial", "kitchen_renovation", "bathroom_renovation"], category: "site_services", triggerHint: "Include for jobs lasting over 2 weeks" },
  { id: "temporary_power", name: "Temporary Power Hookup", reason: "New construction or additions where main panel is offline during electrical work", defaultCost: 250, costType: "fixed", inclusion: "review", projectTypes: ["addition_remodel", "new_build", "garage_carport", "commercial"], category: "site_services" },
  { id: "debris_hauling", name: "Additional Debris Hauling", reason: "When the dumpster isn't enough — extra dump runs for concrete, dirt, or hazmat materials", defaultCost: 200, costType: "fixed", inclusion: "review", projectTypes: [], category: "site_services", triggerHint: "Common on demo-heavy jobs or when removing concrete/dirt" },
  { id: "site_protection", name: "Floor / Surface Protection", reason: "Ram board, plastic sheeting, carpet protection during interior work", defaultCost: 150, costType: "fixed", inclusion: "auto", projectTypes: ["kitchen_renovation", "bathroom_renovation", "painting", "flooring"], category: "site_services" },
  { id: "temporary_weatherproofing", name: "Temporary Weatherproofing", reason: "Tarps, temporary walls, or plastic to keep weather out during roof/wall openings", defaultCost: 300, costType: "fixed", inclusion: "review", projectTypes: ["roofing", "addition_remodel", "new_build", "door_window"], category: "site_services", triggerHint: "Critical during rainy season or if roof will be open overnight" },

  // ── Insurance
  { id: "builders_risk", name: "Builder's Risk Insurance", reason: "Covers materials and structure during construction. Lender may require it.", defaultCost: 0, costType: "percent_of_total", rate: 0.015, minCost: 250, maxCost: 2000, inclusion: "review", projectTypes: ["addition_remodel", "new_build", "garage_carport"], category: "insurance", triggerHint: "Required for projects over $50K or with construction loans" },
  { id: "additional_insured", name: "Additional Insured Certificate", reason: "HOA, property manager, or GC may require being listed as additional insured", defaultCost: 50, costType: "fixed", inclusion: "review", projectTypes: [], category: "insurance", triggerHint: "Common on commercial jobs or HOA properties" },

  // ── Testing & Inspections
  { id: "asbestos_testing", name: "Asbestos Testing", reason: "Required before disturbing materials in homes built before 1980. Popcorn ceilings, floor tiles, pipe insulation.", defaultCost: 350, costType: "fixed", inclusion: "review", projectTypes: ["kitchen_renovation", "bathroom_renovation", "addition_remodel", "roofing"], category: "testing_inspections", triggerHint: "Ask the year the home was built — pre-1980 requires testing" },
  { id: "lead_paint_testing", name: "Lead Paint Testing", reason: "EPA RRP rule requires testing in homes built before 1978 before disturbing painted surfaces", defaultCost: 250, costType: "fixed", inclusion: "review", projectTypes: ["painting", "kitchen_renovation", "bathroom_renovation", "addition_remodel", "door_window"], category: "testing_inspections", triggerHint: "Legally required for pre-1978 homes — EPA fines are $37,500/day" },
  { id: "soil_testing", name: "Soil / Geotechnical Testing", reason: "Required for foundations, retaining walls, and any structural footings. Engineer needs bearing capacity.", defaultCost: 500, costType: "fixed", inclusion: "review", projectTypes: ["new_build", "addition_remodel", "garage_carport", "retaining_wall"], category: "testing_inspections" },
  { id: "mold_remediation", name: "Mold Remediation Allowance", reason: "Found during demo in ~15% of bathroom and kitchen remodels. Budget an allowance or you eat the cost.", defaultCost: 750, costType: "fixed", inclusion: "review", projectTypes: ["bathroom_renovation", "kitchen_renovation"], category: "testing_inspections", triggerHint: "High risk in bathrooms with old tile showers or kitchens with dishwasher leaks" },
  { id: "termite_inspection", name: "Termite / WDI Inspection", reason: "Recommended before any structural work in the SE US. Finding termite damage mid-job is expensive.", defaultCost: 100, costType: "fixed", inclusion: "review", projectTypes: ["deck", "porch", "addition_remodel", "new_build"], category: "testing_inspections", triggerHint: "Especially important in Mississippi, Alabama, and Gulf Coast" },

  // ── Equipment
  { id: "equipment_rental", name: "Equipment Rental (Misc)", reason: "Scaffolding, lifts, compactors, concrete pump, trencher — whatever the job requires beyond hand tools", defaultCost: 0, costType: "percent_of_total", rate: 0.02, minCost: 150, maxCost: 3000, inclusion: "review", projectTypes: [], category: "equipment" },
  { id: "scaffolding", name: "Scaffolding Rental", reason: "Two-story exterior work, high ceilings, or chimney access", defaultCost: 300, costType: "fixed", inclusion: "review", projectTypes: ["roofing", "siding", "painting"], category: "equipment", triggerHint: "Required for 2+ story homes or steep-pitch roofs" },
  { id: "concrete_pump", name: "Concrete Pump Truck", reason: "Required when the mixer truck can't reach the pour location", defaultCost: 800, costType: "fixed", inclusion: "review", projectTypes: ["concrete_hardscape", "retaining_wall", "new_build", "addition_remodel"], category: "equipment", triggerHint: "Needed for backyard pours, elevated slabs, or pours over 5 yards" },

  // ── Temporary Facilities
  { id: "temporary_kitchen", name: "Temporary Kitchen Setup", reason: "Homeowner needs somewhere to cook during a full kitchen renovation. Microwave + mini fridge in another room.", defaultCost: 0, costType: "fixed", inclusion: "review", projectTypes: ["kitchen_renovation"], category: "temporary_facilities", triggerHint: "Discuss timeline with homeowner — 3+ week kitchen jobs need a plan" },
  { id: "appliance_storage", name: "Appliance Disconnect / Storage", reason: "Moving and protecting appliances during renovation. Reconnection after.", defaultCost: 150, costType: "fixed", inclusion: "auto", projectTypes: ["kitchen_renovation"], category: "temporary_facilities" },
  { id: "furniture_protection", name: "Furniture Moving / Protection", reason: "Move and protect homeowner furniture in work areas. Prevents damage claims.", defaultCost: 100, costType: "fixed", inclusion: "review", projectTypes: ["painting", "flooring", "kitchen_renovation", "bathroom_renovation"], category: "temporary_facilities" },

  // ── Professional Services
  { id: "engineering_plans", name: "Structural Engineering Plans", reason: "Required for load-bearing wall removal, additions, retaining walls over 4ft, and most commercial", defaultCost: 1500, costType: "fixed", inclusion: "review", projectTypes: ["addition_remodel", "new_build", "retaining_wall", "commercial"], category: "professional_services" },
  { id: "architectural_drawings", name: "Architectural Drawings", reason: "Required by permit office for additions and new construction", defaultCost: 2500, costType: "fixed", inclusion: "review", projectTypes: ["addition_remodel", "new_build", "garage_carport", "commercial"], category: "professional_services" },
  { id: "survey", name: "Property Survey", reason: "Required for fences, additions, and new builds to confirm property lines and setbacks", defaultCost: 400, costType: "fixed", inclusion: "review", projectTypes: ["fencing", "addition_remodel", "new_build", "garage_carport", "retaining_wall"], category: "professional_services", triggerHint: "Required if property pins aren't visible or survey is over 5 years old" },
  { id: "code_upgrades", name: "Code-Required Upgrades", reason: "Pulling a permit can trigger code compliance: GFCI outlets, smoke/CO detectors, egress windows, arc-fault breakers", defaultCost: 400, costType: "fixed", inclusion: "review", projectTypes: ["kitchen_renovation", "bathroom_renovation", "addition_remodel", "electrical"], category: "professional_services", triggerHint: "Older homes almost always need electrical code upgrades when permits are pulled" },
  { id: "tree_removal", name: "Tree Removal / Trimming", reason: "Trees in the way of the build, overhanging the roof, or too close to the foundation", defaultCost: 600, costType: "fixed", inclusion: "review", projectTypes: ["addition_remodel", "new_build", "roofing", "garage_carport", "fencing", "deck"], category: "professional_services", triggerHint: "Check the site — trees within 10ft of the work area may need trimming or removal" },
  { id: "utility_relocation", name: "Utility Relocation", reason: "Moving gas lines, water mains, or electrical service for additions or new builds", defaultCost: 1200, costType: "fixed", inclusion: "review", projectTypes: ["addition_remodel", "new_build", "garage_carport"], category: "professional_services", triggerHint: "Check where utilities enter the building — additions often conflict" },
];

export const INDIRECT_COST_CATEGORY_LABELS: Record<string, string> = {
  permits_fees: "Permits & Fees",
  site_services: "Site Services",
  insurance: "Insurance",
  testing_inspections: "Testing & Inspections",
  equipment: "Equipment Rental",
  temporary_facilities: "Temporary Facilities",
  professional_services: "Professional Services",
};

export function getIndirectCostsForProject(projectType: string): { autoInclude: IndirectCost[]; reviewChecklist: IndirectCost[] } {
  const applicable = INDIRECT_COSTS.filter((cost) => {
    if (cost.excludeProjectTypes?.includes(projectType)) return false;
    if (cost.projectTypes.length === 0) return true;
    return cost.projectTypes.includes(projectType);
  });
  return {
    autoInclude: applicable.filter((c) => c.inclusion === "auto"),
    reviewChecklist: applicable.filter((c) => c.inclusion === "review"),
  };
}

export function calculateIndirectCost(cost: IndirectCost, squareFootage: number, projectTotal: number): number {
  let amount: number;
  switch (cost.costType) {
    case "fixed": amount = cost.defaultCost; break;
    case "per_sqft": amount = (cost.rate ?? 0) * squareFootage; break;
    case "percent_of_total": amount = (cost.rate ?? 0) * projectTotal; break;
    default: amount = cost.defaultCost;
  }
  if (cost.minCost !== undefined && amount < cost.minCost) amount = cost.minCost;
  if (cost.maxCost !== undefined && amount > cost.maxCost) amount = cost.maxCost;
  return Math.round(amount * 100) / 100;
}
