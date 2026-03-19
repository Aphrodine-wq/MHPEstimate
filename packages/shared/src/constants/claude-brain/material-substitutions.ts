/**
 * Claude Brain — Material Substitutions
 *
 * Common material substitution options for residential construction.
 * Each entry describes the swap, cost impact, quality impact, and
 * which project types it applies to. Claude uses this when adjusting
 * tier pricing, value-engineering an estimate, or suggesting alternatives
 * when a material is unavailable or over budget.
 *
 * costImpactPct is relative to the original material:
 *   positive = substitute is MORE expensive
 *   negative = substitute is CHEAPER
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MaterialSubstitution {
  original: string;
  substitute: string;
  costImpactPct: number;
  qualityImpact: "equivalent" | "downgrade" | "upgrade";
  notes: string;
  categories: string[];
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export const MATERIAL_SUBSTITUTIONS: MaterialSubstitution[] = [
  // ── Countertops ─────────────────────────────────────────────────────────
  {
    original: "Granite countertops",
    substitute: "Quartz countertops (engineered stone)",
    costImpactPct: 10,
    qualityImpact: "upgrade",
    notes:
      "Quartz is more uniform, non-porous (no sealing needed), and more consistent in " +
      "appearance. Slightly more expensive but lower lifetime maintenance cost. " +
      "Preferred for kitchens and bathrooms.",
    categories: ["kitchen_renovation", "bathroom_renovation"],
  },
  {
    original: "Granite countertops",
    substitute: "Laminate countertops (Formica/Wilsonart)",
    costImpactPct: -65,
    qualityImpact: "downgrade",
    notes:
      "Dramatic cost savings. Modern laminates look much better than 20 years ago. " +
      "Not heat-resistant — use trivets. Good for budget tier and investment properties.",
    categories: ["kitchen_renovation", "bathroom_renovation"],
  },
  {
    original: "Quartz countertops",
    substitute: "Butcher block countertops",
    costImpactPct: -40,
    qualityImpact: "downgrade",
    notes:
      "Beautiful and warm but requires regular oiling and is susceptible to water damage. " +
      "Best used as an accent section, not the primary kitchen work surface. " +
      "Popular for farmhouse-style kitchens.",
    categories: ["kitchen_renovation"],
  },
  {
    original: "Marble countertops",
    substitute: "Quartzite countertops",
    costImpactPct: -10,
    qualityImpact: "equivalent",
    notes:
      "Quartzite offers the look of marble with significantly better durability and " +
      "stain resistance. Natural stone with unique veining. Slightly cheaper than " +
      "premium marble slabs.",
    categories: ["kitchen_renovation", "bathroom_renovation"],
  },

  // ── Flooring ────────────────────────────────────────────────────────────
  {
    original: "Hardwood flooring (solid)",
    substitute: "Luxury vinyl plank (LVP)",
    costImpactPct: -55,
    qualityImpact: "downgrade",
    notes:
      "LVP is waterproof, scratch-resistant, and dramatically cheaper to install. " +
      "Modern LVP is visually convincing. Excellent for SE US humidity. Does not add " +
      "resale value like real hardwood. Best for budget and midrange tiers.",
    categories: ["kitchen_renovation", "bathroom_renovation", "addition_remodel", "new_build", "bonus_room"],
  },
  {
    original: "Hardwood flooring (solid)",
    substitute: "Engineered hardwood",
    costImpactPct: -15,
    qualityImpact: "equivalent",
    notes:
      "Real wood veneer over plywood core. More dimensionally stable than solid hardwood " +
      "in SE US humidity. Can be refinished 1-2 times. Excellent choice for slab " +
      "construction where solid hardwood is risky.",
    categories: ["kitchen_renovation", "addition_remodel", "new_build", "bonus_room"],
  },
  {
    original: "Natural stone tile (travertine/marble)",
    substitute: "Porcelain tile (stone look)",
    costImpactPct: -45,
    qualityImpact: "equivalent",
    notes:
      "Modern porcelain tile convincingly mimics natural stone. Harder, more water-resistant, " +
      "and lower maintenance than natural stone. No sealing required. " +
      "Recommended over natural stone for wet areas.",
    categories: ["bathroom_renovation", "kitchen_renovation", "concrete_hardscape"],
  },
  {
    original: "Ceramic tile",
    substitute: "Peel-and-stick vinyl tile",
    costImpactPct: -70,
    qualityImpact: "downgrade",
    notes:
      "Extreme budget option. Not suitable for wet areas or high-traffic floors. " +
      "Acceptable for closets, laundry rooms, and investment property bathrooms. " +
      "Lifespan: 3-5 years vs. 20+ for ceramic.",
    categories: ["bathroom_renovation", "bonus_room"],
  },

  // ── Plumbing ────────────────────────────────────────────────────────────
  {
    original: "Copper pipe (supply lines)",
    substitute: "PEX tubing",
    costImpactPct: -45,
    qualityImpact: "equivalent",
    notes:
      "PEX is the modern standard for residential supply lines. Faster to install, " +
      "freeze-resistant, and no soldering required. Accepted by all SE US jurisdictions. " +
      "Copper is only preferred for exposed runs where aesthetics matter.",
    categories: ["kitchen_renovation", "bathroom_renovation", "addition_remodel", "new_build"],
  },
  {
    original: "Cast iron drain pipe",
    substitute: "PVC drain pipe",
    costImpactPct: -60,
    qualityImpact: "equivalent",
    notes:
      "PVC is the standard for new residential drain/waste/vent lines. Cast iron is quieter " +
      "(less pipe noise) and may be required in some condo/commercial applications. " +
      "For residential, PVC is the cost-effective and code-compliant choice.",
    categories: ["bathroom_renovation", "kitchen_renovation", "addition_remodel", "new_build"],
  },
  {
    original: "Standard tank water heater",
    substitute: "Tankless water heater",
    costImpactPct: 80,
    qualityImpact: "upgrade",
    notes:
      "Higher upfront cost but 20+ year lifespan (vs. 8-12 for tank). Continuous hot " +
      "water and lower energy bills. Requires gas line sizing verification and proper venting. " +
      "May require electrical upgrade for electric models. ROI in 5-8 years.",
    categories: ["kitchen_renovation", "bathroom_renovation", "new_build", "addition_remodel"],
  },

  // ── Cabinetry ───────────────────────────────────────────────────────────
  {
    original: "Custom cabinets (shop-built)",
    substitute: "Semi-custom cabinets (KraftMaid, Waypoint)",
    costImpactPct: -40,
    qualityImpact: "downgrade",
    notes:
      "Semi-custom offers 80% of custom quality at 60% of the cost. Wide range of " +
      "door styles, finishes, and sizes. Lead time: 4-8 weeks. Good for midrange tier.",
    categories: ["kitchen_renovation", "bathroom_renovation"],
  },
  {
    original: "Semi-custom cabinets",
    substitute: "RTA cabinets (ready-to-assemble)",
    costImpactPct: -55,
    qualityImpact: "downgrade",
    notes:
      "Significant cost savings. Quality has improved dramatically — brands like " +
      "Lily Ann and RTA Store offer solid wood doors with dovetail drawers. " +
      "Available in 1-2 weeks vs. 4-8 for semi-custom. Best for budget tier.",
    categories: ["kitchen_renovation", "bathroom_renovation"],
  },
  {
    original: "Full overlay cabinet doors",
    substitute: "Partial overlay cabinet doors",
    costImpactPct: -15,
    qualityImpact: "downgrade",
    notes:
      "Partial overlay shows more face frame and looks more traditional. " +
      "Full overlay is the modern standard and hides the frame. Minor cost difference " +
      "but significant visual impact. Discuss aesthetic preference with client.",
    categories: ["kitchen_renovation", "bathroom_renovation"],
  },

  // ── Roofing ─────────────────────────────────────────────────────────────
  {
    original: "Architectural shingles (30-year)",
    substitute: "3-tab shingles (20-year)",
    costImpactPct: -20,
    qualityImpact: "downgrade",
    notes:
      "3-tab is thinner, lighter, and less wind-resistant. Flat appearance vs. dimensional. " +
      "Acceptable for investment properties and budget tier. Most roofers now default " +
      "to architectural. Check wind rating for coastal SE US.",
    categories: ["roofing"],
  },
  {
    original: "Architectural shingles (30-year)",
    substitute: "Standing seam metal roofing",
    costImpactPct: 100,
    qualityImpact: "upgrade",
    notes:
      "50+ year lifespan, excellent wind resistance, and energy-efficient (reflects heat). " +
      "High upfront cost but lowest lifetime cost. Great for SE US climate. " +
      "Insurance discounts available in some SE states for metal roofs.",
    categories: ["roofing", "new_build"],
  },
  {
    original: "Asphalt shingles",
    substitute: "Synthetic slate (DaVinci, Brava)",
    costImpactPct: 150,
    qualityImpact: "upgrade",
    notes:
      "Looks like natural slate at 60% of the weight and cost. 50-year warranty, " +
      "Class 4 impact rating, Class A fire rating. Premium option for high-end tier.",
    categories: ["roofing", "new_build"],
  },

  // ── Siding & Exterior ──────────────────────────────────────────────────
  {
    original: "James Hardie fiber cement siding",
    substitute: "Vinyl siding",
    costImpactPct: -45,
    qualityImpact: "downgrade",
    notes:
      "Vinyl is cheaper and maintenance-free but less durable and less fire-resistant. " +
      "Hardie board is the gold standard for SE US — resists humidity, termites, and rot. " +
      "Insurance companies in some SE states discount for fiber cement.",
    categories: ["addition_remodel", "new_build"],
  },
  {
    original: "Brick veneer exterior",
    substitute: "Manufactured stone veneer (Cultured Stone)",
    costImpactPct: -30,
    qualityImpact: "equivalent",
    notes:
      "Lighter than real brick, easier to install, and available in more styles. " +
      "Excellent for accent walls and foundations. Full exterior application is less " +
      "common but viable. Properly installed with drainage plane, it performs well.",
    categories: ["addition_remodel", "new_build"],
  },

  // ── Windows & Doors ────────────────────────────────────────────────────
  {
    original: "Wood-frame windows",
    substitute: "Vinyl-frame windows",
    costImpactPct: -40,
    qualityImpact: "downgrade",
    notes:
      "Vinyl is maintenance-free and energy-efficient. Does not need painting. " +
      "Wood looks better but requires regular maintenance in SE US humidity. " +
      "Vinyl is the value choice; fiberglass is the premium alternative.",
    categories: ["door_window", "addition_remodel", "new_build"],
  },
  {
    original: "Wood-frame windows",
    substitute: "Fiberglass-frame windows (Marvin, Pella)",
    costImpactPct: -10,
    qualityImpact: "equivalent",
    notes:
      "Fiberglass offers wood-like aesthetics with vinyl-like maintenance. Strongest " +
      "frame material, best thermal performance, and paintable. " +
      "Best choice for high-end tier when real wood is not desired.",
    categories: ["door_window", "addition_remodel", "new_build"],
  },
  {
    original: "Solid wood interior doors",
    substitute: "Hollow-core interior doors",
    costImpactPct: -60,
    qualityImpact: "downgrade",
    notes:
      "Significant cost savings — $40-$60 per door vs. $150-$400. Sound attenuation is " +
      "much worse. Acceptable for closets and secondary rooms. " +
      "Use solid core for bedrooms and bathrooms.",
    categories: ["addition_remodel", "new_build", "bonus_room"],
  },

  // ── Insulation ──────────────────────────────────────────────────────────
  {
    original: "Spray foam insulation (closed cell)",
    substitute: "Fiberglass batt insulation",
    costImpactPct: -65,
    qualityImpact: "downgrade",
    notes:
      "Spray foam is superior in every performance metric — R-value per inch, air sealing, " +
      "moisture barrier. But fiberglass is adequate for code compliance in SE US climate zones " +
      "(Zone 2-3). Spray foam is recommended for attics and crawlspaces in SE US humidity.",
    categories: ["addition_remodel", "new_build", "roofing"],
  },
  {
    original: "Spray foam insulation (closed cell)",
    substitute: "Blown-in cellulose",
    costImpactPct: -50,
    qualityImpact: "downgrade",
    notes:
      "Good attic insulation option. Fills gaps better than batts. Treated for fire and " +
      "pest resistance. Settles over time — over-fill by 15%. Not suitable for walls " +
      "in new construction (use batts or spray foam for walls).",
    categories: ["addition_remodel", "new_build", "roofing"],
  },

  // ── Electrical ──────────────────────────────────────────────────────────
  {
    original: "Recessed can lights (IC rated)",
    substitute: "Surface-mount LED disc lights",
    costImpactPct: -35,
    qualityImpact: "equivalent",
    notes:
      "LED disc lights mount to a junction box — no can housing needed. Easier to install, " +
      "thinner profile, and no IC rating concerns. Same light output. Excellent for " +
      "renovation work where ceiling access is limited.",
    categories: ["kitchen_renovation", "bathroom_renovation", "addition_remodel", "bonus_room"],
  },

  // ── Deck Materials ──────────────────────────────────────────────────────
  {
    original: "Composite decking (Trex, TimberTech)",
    substitute: "Pressure-treated lumber decking",
    costImpactPct: -50,
    qualityImpact: "downgrade",
    notes:
      "Treated lumber is less expensive upfront but requires annual sealing/staining. " +
      "Composite is maintenance-free but 2x the material cost. In SE US humidity, " +
      "treated lumber decks that are not maintained will gray and splinter within 3 years.",
    categories: ["deck", "porch"],
  },
  {
    original: "Composite decking (Trex, TimberTech)",
    substitute: "PVC decking (Azek, TimberTech Advanced)",
    costImpactPct: 25,
    qualityImpact: "upgrade",
    notes:
      "PVC decking is fully synthetic — no wood fibers. More stain-resistant, lighter, " +
      "and better in wet environments. Best choice for SE US pool decks and docks. " +
      "Premium price point for high-end tier.",
    categories: ["deck", "porch"],
  },

  // ── Drywall ─────────────────────────────────────────────────────────────
  {
    original: "Standard drywall (1/2 inch)",
    substitute: "Moisture-resistant drywall (greenboard)",
    costImpactPct: 15,
    qualityImpact: "upgrade",
    notes:
      "Required for bathroom and kitchen walls near water sources. NOT suitable for " +
      "direct water exposure (use cement board for that). Minor cost increase that " +
      "prevents major moisture problems. Should be standard in all SE US wet areas.",
    categories: ["bathroom_renovation", "kitchen_renovation"],
  },

  // ── Concrete ────────────────────────────────────────────────────────────
  {
    original: "Stamped concrete patio",
    substitute: "Brushed concrete with exposed aggregate border",
    costImpactPct: -40,
    qualityImpact: "downgrade",
    notes:
      "Stamped concrete looks great but costs significantly more than standard finishes. " +
      "A brushed finish with exposed aggregate borders provides visual interest at lower cost. " +
      "Stamped concrete also requires periodic resealing in SE US climate.",
    categories: ["concrete_hardscape"],
  },
  {
    original: "Poured concrete retaining wall",
    substitute: "Segmental retaining wall (Allan Block, Versa-Lok)",
    costImpactPct: -20,
    qualityImpact: "equivalent",
    notes:
      "Segmental (interlocking block) walls are easier to install, require less formwork, " +
      "and are code-approved for walls up to 4 feet without engineering. " +
      "For walls over 4 feet, engineering is required for either type.",
    categories: ["retaining_wall", "concrete_hardscape"],
  },
];

/**
 * Find substitutions for a given material name (fuzzy match by keyword).
 */
export function findSubstitutions(materialName: string): MaterialSubstitution[] {
  const lower = materialName.toLowerCase();
  return MATERIAL_SUBSTITUTIONS.filter(
    (s) =>
      s.original.toLowerCase().includes(lower) ||
      s.substitute.toLowerCase().includes(lower),
  );
}

/**
 * Find substitutions applicable to a given project type.
 */
export function getSubstitutionsForProjectType(
  projectType: string,
): MaterialSubstitution[] {
  return MATERIAL_SUBSTITUTIONS.filter((s) =>
    s.categories.includes(projectType),
  );
}

/**
 * Find cheaper alternatives (negative costImpactPct).
 */
export function getCheaperAlternatives(
  projectType?: string,
): MaterialSubstitution[] {
  let subs = MATERIAL_SUBSTITUTIONS.filter((s) => s.costImpactPct < 0);
  if (projectType) {
    subs = subs.filter((s) => s.categories.includes(projectType));
  }
  return subs.sort((a, b) => a.costImpactPct - b.costImpactPct);
}
