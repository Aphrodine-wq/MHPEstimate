/**
 * Claude Brain — Knowledge System for ProEstimate
 *
 * A structured knowledge base that Claude uses when generating estimates,
 * reviewing scope, advising on pricing, and communicating with clients.
 * All data is focused on residential and light commercial construction
 * in the southeastern United States.
 *
 * Usage:
 *   import { getBrainContext } from "@proestimate/shared/constants/claude-brain";
 *   const context = getBrainContext("pricing");
 *   // Returns relevant brain sections for pricing operations
 */

// ── Re-exports ────────────────────────────────────────────────────────────────

export {
  PRICING_INTELLIGENCE,
  type MaterialPriceCycle,
  type PriceStalenessRule,
  type RegionalPriceVariation,
  type InflationGuidance,
  type RetailerComparison,
} from "./pricing-intelligence";

export {
  PSYCHOLOGY_FRAMEWORKS,
  getFrameworksForContext,
  getFramework,
  type PsychologyContext,
  type PsychologyFramework,
} from "./psychology-frameworks";

export {
  CONSTRUCTION_BEST_PRACTICES,
  type ScopeMistake,
  type TradeSequence,
  type PermitRequirement,
  type ProjectDuration,
  type ChangeOrderPractice,
} from "./construction-best-practices";

export {
  MATERIAL_SUBSTITUTIONS,
  findSubstitutions,
  getSubstitutionsForProjectType,
  getCheaperAlternatives,
  type MaterialSubstitution,
} from "./material-substitutions";

export {
  SEASONAL_PATTERNS,
  getDemandRating,
  getWeatherForMonth,
  getQuarterlyAdvice,
  type MonthlyDemandPattern,
  type MaterialSeasonality,
  type LaborAvailability,
  type WeatherImpact,
  type HolidayScheduling,
} from "./seasonal-patterns";

// ── Static imports for resolveModule ─────────────────────────────────────────

import { PRICING_INTELLIGENCE } from "./pricing-intelligence";
import { PSYCHOLOGY_FRAMEWORKS } from "./psychology-frameworks";
import { CONSTRUCTION_BEST_PRACTICES } from "./construction-best-practices";
import { MATERIAL_SUBSTITUTIONS } from "./material-substitutions";
import { SEASONAL_PATTERNS } from "./seasonal-patterns";

// ── Brain Context System ──────────────────────────────────────────────────────

export type BrainContextKey =
  | "pricing"
  | "scope"
  | "client_communication"
  | "win_prediction"
  | "material_selection"
  | "scheduling"
  | "tier_presentation"
  | "change_order"
  | "value_engineering"
  | "estimate_review";

interface BrainSection {
  module: string;
  description: string;
  data: unknown;
}

interface BrainContextResult {
  context: BrainContextKey;
  description: string;
  sections: BrainSection[];
}

const CONTEXT_MAP: Record<BrainContextKey, { description: string; modules: string[] }> = {
  pricing: {
    description: "Generating or reviewing price estimates",
    modules: ["pricing_intelligence", "material_substitutions", "seasonal_patterns.materialSeasonality", "construction_best_practices.permitRequirements"],
  },
  scope: {
    description: "Generating or reviewing project scope",
    modules: ["construction_best_practices.commonScopeMistakes", "construction_best_practices.tradeSequencing", "construction_best_practices.permitRequirements", "construction_best_practices.projectDurations", "material_substitutions"],
  },
  client_communication: {
    description: "Drafting client-facing language for estimates, proposals, and follow-ups",
    modules: ["psychology_frameworks", "construction_best_practices.warrantyGuidance", "construction_best_practices.changeOrderPractices", "pricing_intelligence.heuristics"],
  },
  win_prediction: {
    description: "Predicting likelihood of winning a bid",
    modules: ["psychology_frameworks", "seasonal_patterns.demandByProjectType", "seasonal_patterns.laborAvailability", "pricing_intelligence.retailerComparisons"],
  },
  material_selection: {
    description: "Choosing materials, substitutions, and sourcing strategies",
    modules: ["material_substitutions", "pricing_intelligence.materialPriceCycles", "pricing_intelligence.retailerComparisons", "pricing_intelligence.regionalVariations", "seasonal_patterns.materialSeasonality"],
  },
  scheduling: {
    description: "Planning project timelines and scheduling",
    modules: ["seasonal_patterns", "construction_best_practices.tradeSequencing", "construction_best_practices.projectDurations", "construction_best_practices.permitRequirements"],
  },
  tier_presentation: {
    description: "Presenting Good/Better/Best tier options to clients",
    modules: ["psychology_frameworks", "material_substitutions", "pricing_intelligence.heuristics"],
  },
  change_order: {
    description: "Handling change orders and scope adjustments",
    modules: ["construction_best_practices.changeOrderPractices", "psychology_frameworks", "pricing_intelligence.priceStalenessRules", "material_substitutions"],
  },
  value_engineering: {
    description: "Reducing project cost without sacrificing critical quality",
    modules: ["material_substitutions", "pricing_intelligence.retailerComparisons", "pricing_intelligence.materialPriceCycles", "seasonal_patterns.materialSeasonality", "construction_best_practices.commonScopeMistakes"],
  },
  estimate_review: {
    description: "Reviewing an estimate for completeness, accuracy, and competitiveness",
    modules: ["pricing_intelligence", "construction_best_practices.commonScopeMistakes", "construction_best_practices.tradeSequencing", "construction_best_practices.permitRequirements", "material_substitutions", "seasonal_patterns.laborAvailability"],
  },
};

function resolveModule(modulePath: string): BrainSection | null {
  const pricing = PRICING_INTELLIGENCE;
  const psychology = PSYCHOLOGY_FRAMEWORKS;
  const bestPractices = CONSTRUCTION_BEST_PRACTICES;
  const substitutions = MATERIAL_SUBSTITUTIONS;
  const seasonal = SEASONAL_PATTERNS;

  const moduleMap: Record<string, { description: string; data: unknown }> = {
    pricing_intelligence: { description: "Market pricing knowledge, staleness rules, inflation guidance, and retailer comparisons", data: pricing },
    "pricing_intelligence.materialPriceCycles": { description: "Seasonal material price cycle patterns", data: pricing.materialPriceCycles },
    "pricing_intelligence.priceStalenessRules": { description: "Rules for when pricing data is stale or expired", data: pricing.priceStalenessRules },
    "pricing_intelligence.retailerComparisons": { description: "Retailer and supplier comparison for SE US", data: pricing.retailerComparisons },
    "pricing_intelligence.regionalVariations": { description: "Regional price variation awareness", data: pricing.regionalVariations },
    "pricing_intelligence.inflationGuidance": { description: "Current inflation trends by material category", data: pricing.inflationGuidance },
    "pricing_intelligence.heuristics": { description: "Pricing heuristics and sanity checks", data: pricing.heuristics },
    psychology_frameworks: { description: "Behavioral economics frameworks for estimate presentation and client communication", data: psychology },
    construction_best_practices: { description: "Full construction best practices knowledge base", data: bestPractices },
    "construction_best_practices.commonScopeMistakes": { description: "Common scope mistakes by project type", data: bestPractices.commonScopeMistakes },
    "construction_best_practices.tradeSequencing": { description: "Standard trade sequencing and dependencies", data: bestPractices.tradeSequencing },
    "construction_best_practices.permitRequirements": { description: "Permit requirements by project type", data: bestPractices.permitRequirements },
    "construction_best_practices.projectDurations": { description: "Typical project durations by type and size", data: bestPractices.projectDurations },
    "construction_best_practices.warrantyGuidance": { description: "Warranty language and coverage recommendations", data: bestPractices.warrantyGuidance },
    "construction_best_practices.changeOrderPractices": { description: "Change order best practices", data: bestPractices.changeOrderPractices },
    "construction_best_practices.safetyAndLiability": { description: "Safety disclosures and liability notes", data: bestPractices.safetyAndLiability },
    material_substitutions: { description: "Material substitution options with cost and quality impact", data: substitutions },
    seasonal_patterns: { description: "Full seasonal patterns including demand, weather, labor, and scheduling", data: seasonal },
    "seasonal_patterns.demandByProjectType": { description: "Monthly demand patterns by project type", data: seasonal.demandByProjectType },
    "seasonal_patterns.materialSeasonality": { description: "Best and worst times to buy materials", data: seasonal.materialSeasonality },
    "seasonal_patterns.laborAvailability": { description: "Labor availability by trade and month", data: seasonal.laborAvailability },
    "seasonal_patterns.weatherBySoutheastMonth": { description: "Monthly weather conditions for SE US", data: seasonal.weatherBySoutheastMonth },
    "seasonal_patterns.holidayScheduling": { description: "Holiday scheduling impact on construction", data: seasonal.holidayScheduling },
    "seasonal_patterns.quarterlyAdvice": { description: "Quarterly scheduling and buying advice", data: seasonal.quarterlyAdvice },
  };

  const entry = moduleMap[modulePath];
  if (!entry) return null;

  return { module: modulePath, description: entry.description, data: entry.data };
}

export function getBrainContext(context: BrainContextKey): BrainContextResult {
  const mapping = CONTEXT_MAP[context];
  if (!mapping) {
    return { context, description: `Unknown context: ${context}`, sections: [] };
  }

  const sections: BrainSection[] = [];
  for (const modulePath of mapping.modules) {
    const section = resolveModule(modulePath);
    if (section) {
      sections.push(section);
    }
  }

  return { context, description: mapping.description, sections };
}

export function getAvailableContexts(): BrainContextKey[] {
  return Object.keys(CONTEXT_MAP) as BrainContextKey[];
}

export function getContextMap(): Record<BrainContextKey, { description: string; modules: string[] }> {
  return { ...CONTEXT_MAP };
}
