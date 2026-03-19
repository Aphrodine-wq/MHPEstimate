/**
 * Claude Brain — Pricing Intelligence
 *
 * Market knowledge, pricing heuristics, and price staleness rules that
 * Claude uses when generating, reviewing, or adjusting estimates.
 * Focused on southeastern US residential and light commercial construction.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MaterialPriceCycle {
  material: string;
  peakMonths: number[];
  troughMonths: number[];
  typicalSwingPct: number;
  notes: string;
}

export interface PriceStalenessRule {
  category: string;
  /** Number of days before the price is considered stale */
  staleAfterDays: number;
  /** Number of days before the price should not be auto-populated at all */
  expiredAfterDays: number;
  /** Volatility rating affects how aggressively we warn */
  volatility: "low" | "moderate" | "high" | "extreme";
  notes: string;
}

export interface RegionalPriceVariation {
  material: string;
  cheapestRegion: string;
  mostExpensiveRegion: string;
  spreadPct: number;
  notes: string;
}

export interface InflationGuidance {
  category: string;
  annualizedPct: number;
  trend: "rising" | "stable" | "declining";
  lastUpdated: string;
  notes: string;
}

export interface RetailerComparison {
  retailer: string;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  proAccountDiscount: number;
  notes: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

export const PRICING_INTELLIGENCE = {
  /**
   * Seasonal and cyclical price patterns for major construction materials.
   * Months are 1-indexed (1 = January).
   */
  materialPriceCycles: [
    {
      material: "framing_lumber",
      peakMonths: [4, 5, 6],
      troughMonths: [11, 12, 1],
      typicalSwingPct: 20,
      notes:
        "Lumber peaks in spring as building season starts. Futures-driven market — " +
        "watch CME lumber futures for forward pricing. Hurricane season (Aug–Oct) can " +
        "cause secondary spikes in the SE if mills shut down.",
    },
    {
      material: "treated_lumber",
      peakMonths: [3, 4, 5],
      troughMonths: [10, 11, 12],
      typicalSwingPct: 15,
      notes:
        "Treated lumber follows framing lumber with a slight lead since deck and " +
        "fence projects kick off earlier in the season. Treatment chemical costs " +
        "add an additional volatility factor.",
    },
    {
      material: "copper_wire_pipe",
      peakMonths: [2, 3, 6, 7],
      troughMonths: [9, 10, 11],
      typicalSwingPct: 30,
      notes:
        "Copper is a global commodity. Price swings can be extreme — 30%+ within a " +
        "year is not unusual. Always quote copper items with a price-lock window. " +
        "Consider PEX substitution for budget-tier plumbing.",
    },
    {
      material: "concrete_ready_mix",
      peakMonths: [5, 6, 7, 8],
      troughMonths: [12, 1, 2],
      typicalSwingPct: 8,
      notes:
        "Concrete is less volatile than other materials but steadily trends up. " +
        "Prices are hyperlocal — driven by distance from the batch plant. In SE US, " +
        "summer demand from commercial pours drives peak pricing.",
    },
    {
      material: "roofing_shingles",
      peakMonths: [3, 4, 5, 9, 10],
      troughMonths: [12, 1],
      typicalSwingPct: 12,
      notes:
        "Spring ramp-up plus post-hurricane-season demand create two peaks. " +
        "Asphalt shingle pricing tracks crude oil loosely. GAF and Owens Corning " +
        "announce annual increases every January — buy ahead in December.",
    },
    {
      material: "drywall",
      peakMonths: [4, 5, 6],
      troughMonths: [11, 12, 1],
      typicalSwingPct: 10,
      notes:
        "Drywall pricing is regionally influenced by new construction starts. " +
        "SE US has tighter supply due to fewer regional gypsum plants. " +
        "Transportation cost is a significant component.",
    },
    {
      material: "steel_rebar",
      peakMonths: [3, 4, 5],
      troughMonths: [10, 11, 12],
      typicalSwingPct: 18,
      notes:
        "Rebar tracks scrap steel markets. Tariff policy can cause sudden price " +
        "jumps. For SE US residential, rebar is mainly used in foundations and " +
        "retaining walls.",
    },
    {
      material: "insulation",
      peakMonths: [3, 4, 5, 6],
      troughMonths: [9, 10, 11],
      typicalSwingPct: 10,
      notes:
        "Fiberglass insulation follows new-construction cycles. Spray foam pricing " +
        "is more stable but higher baseline. Energy code changes in SE US are " +
        "pushing demand for higher R-values.",
    },
    {
      material: "vinyl_windows",
      peakMonths: [3, 4, 5],
      troughMonths: [11, 12, 1],
      typicalSwingPct: 8,
      notes:
        "Window manufacturers announce annual increases in Q1. PVC resin pricing " +
        "affects vinyl windows. Lead times can stretch to 6-8 weeks during peak " +
        "season. Order early for spring builds.",
    },
    {
      material: "cabinets",
      peakMonths: [1, 2, 3],
      troughMonths: [7, 8, 9],
      typicalSwingPct: 6,
      notes:
        "Cabinetry pricing is relatively stable but lead times fluctuate wildly. " +
        "Semi-custom: 4-8 weeks. Custom: 8-16 weeks. Budget RTA cabinets have " +
        "minimal seasonal variation.",
    },
  ] as MaterialPriceCycle[],

  /**
   * Rules for when to flag pricing data as stale or expired.
   * Aligned with PRICE_FRESHNESS_THRESHOLDS but with per-category granularity.
   */
  priceStalenessRules: [
    {
      category: "lumber",
      staleAfterDays: 14,
      expiredAfterDays: 45,
      volatility: "high",
      notes: "Lumber can move 5-10% in a week. Always verify before finalizing.",
    },
    {
      category: "copper_electrical",
      staleAfterDays: 7,
      expiredAfterDays: 30,
      volatility: "extreme",
      notes: "Copper is the most volatile construction material. Daily price checks for large jobs.",
    },
    {
      category: "concrete",
      staleAfterDays: 60,
      expiredAfterDays: 120,
      volatility: "low",
      notes: "Ready-mix prices change quarterly at most. Verify pump truck surcharges separately.",
    },
    {
      category: "roofing",
      staleAfterDays: 30,
      expiredAfterDays: 75,
      volatility: "moderate",
      notes: "Check for manufacturer price increase announcements in January and mid-year.",
    },
    {
      category: "cabinets_countertops",
      staleAfterDays: 45,
      expiredAfterDays: 90,
      volatility: "moderate",
      notes: "Pricing is stable but lead times change frequently. Verify availability.",
    },
    {
      category: "plumbing_fixtures",
      staleAfterDays: 45,
      expiredAfterDays: 90,
      volatility: "low",
      notes: "Fixture pricing is relatively stable. Watch for discontinued models.",
    },
    {
      category: "flooring",
      staleAfterDays: 30,
      expiredAfterDays: 75,
      volatility: "moderate",
      notes: "LVP and hardwood can shift with supply chain. Tile is more stable.",
    },
    {
      category: "paint",
      staleAfterDays: 60,
      expiredAfterDays: 120,
      volatility: "low",
      notes: "Paint pricing adjusts 1-2x per year. Pro account discounts vary widely.",
    },
    {
      category: "hvac_equipment",
      staleAfterDays: 30,
      expiredAfterDays: 60,
      volatility: "moderate",
      notes: "HVAC equipment pricing changes with refrigerant regulations and seasonal demand.",
    },
    {
      category: "windows_doors",
      staleAfterDays: 30,
      expiredAfterDays: 75,
      volatility: "moderate",
      notes: "Annual manufacturer increases in Q1. Impact-rated for coastal SE US adds 40-60%.",
    },
  ] as PriceStalenessRule[],

  /**
   * Regional price variation awareness for the SE US market.
   */
  regionalVariations: [
    {
      material: "ready_mix_concrete",
      cheapestRegion: "Central MS / Rural AL",
      mostExpensiveRegion: "South FL (Miami-Dade)",
      spreadPct: 35,
      notes: "Driven entirely by batch plant proximity and local demand.",
    },
    {
      material: "framing_lumber",
      cheapestRegion: "MS / AL (near timber country)",
      mostExpensiveRegion: "South FL",
      spreadPct: 25,
      notes: "SE US is near major softwood timber sources — shipping distance is the differentiator.",
    },
    {
      material: "labor_general",
      cheapestRegion: "Rural MS / AR",
      mostExpensiveRegion: "Nashville / Atlanta metro",
      spreadPct: 40,
      notes: "Urban centers command 30-40% labor premium over rural areas. Travel time adds cost.",
    },
    {
      material: "roofing_shingles",
      cheapestRegion: "Central SE (MS/AL/LA)",
      mostExpensiveRegion: "Coastal FL (wind-rated required)",
      spreadPct: 45,
      notes: "Wind-rated shingles required in coastal zones add significant cost premium.",
    },
    {
      material: "insulation",
      cheapestRegion: "TN / NC (near Owens Corning plants)",
      mostExpensiveRegion: "Rural FL",
      spreadPct: 18,
      notes: "Transport cost is significant. Proximity to manufacturing matters.",
    },
  ] as RegionalPriceVariation[],

  /**
   * Current inflation and trend guidance for major cost categories.
   * Updated periodically — lastUpdated indicates when data was last verified.
   */
  inflationGuidance: [
    {
      category: "lumber_framing",
      annualizedPct: 3.5,
      trend: "stable",
      lastUpdated: "2026-01",
      notes: "Post-pandemic normalization. Prices are elevated vs. 2019 but stable quarter-over-quarter.",
    },
    {
      category: "labor_skilled_trades",
      annualizedPct: 5.5,
      trend: "rising",
      lastUpdated: "2026-01",
      notes:
        "Chronic skilled labor shortage in SE US. Electricians and plumbers seeing " +
        "fastest wage growth. No relief expected through 2027.",
    },
    {
      category: "concrete_masonry",
      annualizedPct: 4.0,
      trend: "rising",
      lastUpdated: "2026-01",
      notes: "Steady increases driven by energy costs for cement production and aggregate mining.",
    },
    {
      category: "roofing_materials",
      annualizedPct: 3.0,
      trend: "stable",
      lastUpdated: "2026-01",
      notes: "Asphalt shingle pricing tracks crude oil. Relatively stable in current energy market.",
    },
    {
      category: "plumbing_materials",
      annualizedPct: 2.5,
      trend: "stable",
      lastUpdated: "2026-01",
      notes: "PEX has stabilized. Copper remains volatile but PEX adoption reduces exposure.",
    },
    {
      category: "electrical_materials",
      annualizedPct: 4.0,
      trend: "rising",
      lastUpdated: "2026-01",
      notes: "Copper wire costs plus increased demand from EV infrastructure and solar installations.",
    },
    {
      category: "cabinets_millwork",
      annualizedPct: 3.0,
      trend: "stable",
      lastUpdated: "2026-01",
      notes: "Domestic cabinet manufacturing has expanded. Import tariffs affect RTA cabinets.",
    },
    {
      category: "flooring",
      annualizedPct: 2.0,
      trend: "declining",
      lastUpdated: "2026-01",
      notes: "LVP oversupply is keeping prices competitive. Hardwood remains flat.",
    },
  ] as InflationGuidance[],

  /**
   * Retailer/supplier comparison for the SE US market.
   * Helps Claude recommend where to source materials.
   */
  retailerComparisons: [
    {
      retailer: "Home Depot Pro",
      strengths: [
        "Consistent nationwide pricing",
        "Strong pro desk support",
        "Volume pricing programs",
        "Job-lot delivery",
      ],
      weaknesses: [
        "Premium pricing on commodity lumber",
        "Limited specialty items",
        "Pro desk quality varies by location",
      ],
      bestFor: ["general materials", "fixtures", "paint", "small-to-medium orders"],
      proAccountDiscount: 0.05,
      notes: "Pro Xtra program offers 2% rebate on top of pro pricing. Paint is usually cheapest here.",
    },
    {
      retailer: "Lowe's Pro",
      strengths: [
        "Competitive on appliances",
        "Good seasonal sales",
        "Strong in cabinetry (Shenandoah, KraftMaid)",
      ],
      weaknesses: [
        "Weaker pro infrastructure vs. HD",
        "Fewer distribution centers in rural SE",
      ],
      bestFor: ["appliances", "cabinets", "seasonal buys"],
      proAccountDiscount: 0.05,
      notes: "MVPs Pro Rewards is competitive with HD Pro Xtra. Better cabinet selection.",
    },
    {
      retailer: "84 Lumber",
      strengths: [
        "Best pricing on framing packages",
        "Will price full house framing packages",
        "Strong in SE US market",
      ],
      weaknesses: [
        "Limited finish materials",
        "Must buy in quantity",
        "Fewer locations",
      ],
      bestFor: ["framing lumber", "sheathing", "house packages", "trusses"],
      proAccountDiscount: 0.10,
      notes: "For new builds and additions, always get a framing package quote from 84 Lumber.",
    },
    {
      retailer: "Local Lumber Yards",
      strengths: [
        "Relationship pricing",
        "Flexible delivery",
        "Will hold materials",
        "Better lumber grading",
      ],
      weaknesses: [
        "Higher list prices",
        "Smaller inventory",
        "Variable hours",
      ],
      bestFor: ["trim lumber", "specialty wood", "small rush orders", "relationship accounts"],
      proAccountDiscount: 0.08,
      notes:
        "In MS/AL, establish a relationship with a local yard for trim and specialty. " +
        "They will often match big-box pricing for loyal accounts.",
    },
    {
      retailer: "Floor & Decor",
      strengths: [
        "Best pricing on tile and stone",
        "Wide selection of LVP",
        "Pro pricing program",
      ],
      weaknesses: [
        "Tile only — no general materials",
        "Limited locations in rural SE",
      ],
      bestFor: ["tile", "stone", "LVP", "bathroom materials"],
      proAccountDiscount: 0.10,
      notes: "For any project with significant flooring, get a Floor & Decor quote first.",
    },
    {
      retailer: "Ferguson / Winsupply",
      strengths: [
        "Professional-grade plumbing fixtures",
        "HVAC equipment",
        "Consistent quality",
      ],
      weaknesses: [
        "Not open to public",
        "Higher price point",
        "Requires account",
      ],
      bestFor: ["plumbing fixtures", "HVAC equipment", "high-end bathrooms"],
      proAccountDiscount: 0.15,
      notes: "For mid-range and high-end plumbing, Ferguson pricing beats retail by 15-25%.",
    },
  ] as RetailerComparison[],

  /**
   * General pricing heuristics Claude should apply when reviewing estimates.
   */
  heuristics: {
    /** If material cost is less than this % of total, something may be missing */
    materialFloorPct: 0.35,
    /** If material cost exceeds this % of total, labor may be underestimated */
    materialCeilingPct: 0.55,
    /** Typical material-to-labor ratio for residential remodels */
    typicalMaterialLaborRatio: { min: 0.6, max: 1.2 },
    /** Minimum viable estimate amount — anything below this is likely incomplete */
    minimumEstimateDollars: 500,
    /** Rule of thumb: permit costs run 1-3% of total project cost */
    permitCostPct: { min: 0.01, max: 0.03 },
    /** If line item count for a full remodel is below this, scope may be thin */
    minimumLineItemsByType: {
      kitchen_renovation: 25,
      bathroom_renovation: 15,
      addition_remodel: 30,
      new_build: 80,
      deck: 10,
      roofing: 8,
      painting: 5,
    } as Record<string, number>,
    /** Price-lock window recommendation by material volatility */
    priceLockWindowDays: {
      low: 60,
      moderate: 30,
      high: 14,
      extreme: 7,
    } as Record<string, number>,
  },
} as const;
