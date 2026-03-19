/**
 * Estimate Tier Multipliers
 *
 * Three tiers map to the DB schema values good / better / best,
 * which the UI labels budget / midrange / high_end.
 *
 * Multipliers are applied separately to material and labor components
 * so that high-end finishes can inflate material costs more than labor.
 *
 * Baseline (midrange / better): 1.0x — standard residential construction
 * in the SE US using typical builder-grade materials and journeyman labor.
 */

export type EstimateTier = "budget" | "midrange" | "high_end";
export type EstimateTierDb = "good" | "better" | "best";

export interface TierMultiplierEntry {
  label: string;
  dbValue: EstimateTierDb;
  material: number;
  labor: number;
  description: string;
}

export type TierMultipliers = Record<EstimateTier, TierMultiplierEntry>;

export const TIER_MULTIPLIERS: TierMultipliers = {
  budget: {
    label: "Budget",
    dbValue: "good",
    material: 0.75,
    labor: 0.90,
    description:
      "Economy materials and standard finishes. Suitable for investment properties, " +
      "landlord renovations, or cost-sensitive homeowners. Labor savings come from " +
      "reduced complexity and faster install times.",
  },
  midrange: {
    label: "Mid-Range",
    dbValue: "better",
    material: 1.0,
    labor: 1.0,
    description:
      "Standard builder-grade materials and journeyman labor. Matches MHP's " +
      "historical pricing baseline. The default tier for most residential estimates.",
  },
  high_end: {
    label: "High-End / Designer",
    dbValue: "best",
    material: 1.45,
    labor: 1.25,
    description:
      "Premium and designer materials — stone countertops, custom cabinetry, " +
      "hardwood floors, high-end fixtures. Labor premium reflects increased complexity, " +
      "precision finish work, and coordination with specialty subcontractors.",
  },
} as const;

export const DB_TIER_TO_UI_TIER: Record<EstimateTierDb, EstimateTier> = {
  good: "budget",
  better: "midrange",
  best: "high_end",
};

export function getTierMultiplier(tier: EstimateTier | EstimateTierDb): { material: number; labor: number } {
  const uiTier: EstimateTier = tier in TIER_MULTIPLIERS ? (tier as EstimateTier) : DB_TIER_TO_UI_TIER[tier as EstimateTierDb] ?? "midrange";
  const entry = TIER_MULTIPLIERS[uiTier];
  return { material: entry.material, labor: entry.labor };
}
