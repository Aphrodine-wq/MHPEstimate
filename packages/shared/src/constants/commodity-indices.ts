/**
 * Commodity Price Indices
 *
 * Baseline commodity prices and their mapping to construction material
 * categories. Used to adjust material costs based on real-time commodity
 * market data (lumber futures, copper spot, etc.).
 *
 * The adjustment factor is calculated as:
 *   (currentCommodityPrice / baselinePrice) * weight
 *
 * where `weight` represents how much the commodity price influences the
 * final material cost (e.g., copper wire is ~60% copper, ~40% manufacturing).
 */

export interface CommodityIndex {
  id: string;
  name: string;
  unit: string;
  baselinePrice: number;
  baselineDate: string;
  weight: number;
  affectedCategories: string[];
  source: CommodityDataSource;
  priceRange: { min: number; max: number };
  volatility: "low" | "moderate" | "high" | "extreme";
}

export type CommodityDataSource =
  | { type: "fred"; seriesId: string }
  | { type: "eia"; seriesId: string }
  | { type: "usda"; endpoint: string }
  | { type: "custom"; url: string };

export const COMMODITY_INDICES: Record<string, CommodityIndex> = {
  lumber_futures: { id: "lumber_futures", name: "Random Lengths Framing Lumber Composite", unit: "$/MBF", baselinePrice: 450, baselineDate: "2026-01", weight: 0.65, affectedCategories: ["framing", "structural", "trim_carpentry", "deck", "fencing"], source: { type: "fred", seriesId: "WPU0811" }, priceRange: { min: 250, max: 1500 }, volatility: "high" },
  copper_spot: { id: "copper_spot", name: "Copper Spot Price (COMEX)", unit: "$/lb", baselinePrice: 4.20, baselineDate: "2026-01", weight: 0.60, affectedCategories: ["electrical", "plumbing"], source: { type: "fred", seriesId: "PCOPPUSDM" }, priceRange: { min: 2.50, max: 6.00 }, volatility: "extreme" },
  crude_oil: { id: "crude_oil", name: "WTI Crude Oil", unit: "$/barrel", baselinePrice: 72, baselineDate: "2026-01", weight: 0.25, affectedCategories: ["roofing", "insulation", "siding"], source: { type: "fred", seriesId: "DCOILWTICO" }, priceRange: { min: 40, max: 130 }, volatility: "moderate" },
  steel_scrap: { id: "steel_scrap", name: "Steel Scrap (No.1 HMS)", unit: "$/ton", baselinePrice: 380, baselineDate: "2026-01", weight: 0.50, affectedCategories: ["foundation", "concrete_hardscape", "structural"], source: { type: "fred", seriesId: "WPU101" }, priceRange: { min: 200, max: 700 }, volatility: "high" },
  pvc_resin: { id: "pvc_resin", name: "PVC Resin (Pipe Grade)", unit: "$/lb", baselinePrice: 0.68, baselineDate: "2026-01", weight: 0.40, affectedCategories: ["plumbing", "electrical", "siding"], source: { type: "fred", seriesId: "WPU0721" }, priceRange: { min: 0.40, max: 1.20 }, volatility: "moderate" },
  concrete_ppi: { id: "concrete_ppi", name: "Ready-Mix Concrete PPI", unit: "index", baselinePrice: 340, baselineDate: "2026-01", weight: 0.70, affectedCategories: ["concrete_hardscape", "foundation", "masonry"], source: { type: "fred", seriesId: "PCU32733273" }, priceRange: { min: 280, max: 420 }, volatility: "low" },
  gypsum: { id: "gypsum", name: "Gypsum Products PPI", unit: "index", baselinePrice: 290, baselineDate: "2026-01", weight: 0.55, affectedCategories: ["drywall"], source: { type: "fred", seriesId: "WPU1392" }, priceRange: { min: 220, max: 380 }, volatility: "moderate" },
  natural_gas: { id: "natural_gas", name: "Henry Hub Natural Gas Spot", unit: "$/MMBtu", baselinePrice: 2.80, baselineDate: "2026-01", weight: 0.15, affectedCategories: ["hvac", "insulation"], source: { type: "eia", seriesId: "NG.RNGWHHD.D" }, priceRange: { min: 1.50, max: 9.00 }, volatility: "high" },
};

export function calculateCommodityAdjustment(
  category: string,
  currentPrices: Record<string, number>,
): { adjustmentFactor: number; drivers: Array<{ commodity: string; impact: number }> } {
  const drivers: Array<{ commodity: string; impact: number }> = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [id, index] of Object.entries(COMMODITY_INDICES)) {
    if (!index.affectedCategories.includes(category)) continue;
    const currentPrice = currentPrices[id];
    if (currentPrice === undefined || currentPrice <= 0) continue;
    if (currentPrice < index.priceRange.min * 0.5 || currentPrice > index.priceRange.max * 2) continue;

    const ratio = currentPrice / index.baselinePrice;
    const impact = (ratio - 1.0) * index.weight;
    weightedSum += impact;
    totalWeight += index.weight;
    drivers.push({ commodity: index.name, impact: Math.round(impact * 1000) / 1000 });
  }

  if (totalWeight === 0) return { adjustmentFactor: 1.0, drivers: [] };

  const adjustmentFactor = 1.0 + weightedSum;
  const clamped = Math.max(0.70, Math.min(1.50, adjustmentFactor));

  return {
    adjustmentFactor: Math.round(clamped * 1000) / 1000,
    drivers: drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
  };
}

export function getCommodityIndicesForCategory(category: string): CommodityIndex[] {
  return Object.values(COMMODITY_INDICES).filter((idx) => idx.affectedCategories.includes(category));
}
