/**
 * Auto-Estimate Generator
 *
 * Generates a complete construction estimate from a project type, square
 * footage, geographic zip code, and quality tier — with zero user input
 * beyond those four fields.
 *
 * All functions are PURE — no I/O, no Supabase, no side effects.
 */

import {
  MHP_PROJECT_TEMPLATES,
} from "@proestimate/shared/constants";
import {
  SQFT_FORMULAS,
  computeQuantity,
} from "@proestimate/shared/constants/sqft-formulas";
import {
  getTierMultiplier,
  type EstimateTier,
} from "@proestimate/shared/constants/tier-multipliers";
import {
  getRegionalMultiplier,
} from "@proestimate/shared/constants/regional-pricing";
import {
  getTradeRateForCategory,
  CATEGORY_TO_TRADE,
} from "@proestimate/shared/constants/trade-labor-rates";
import {
  calculateCommodityAdjustment,
} from "@proestimate/shared/constants/commodity-indices";
import {
  getIndirectCostsForProject,
  calculateIndirectCost,
  type IndirectCost,
} from "@proestimate/shared/constants/indirect-costs";
import { suggestPrice } from "./pricing";
import { calculateMargins } from "./margins";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AutoEstimateInput {
  projectType: string;
  squareFootage: number;
  zipCode?: string;
  tier: EstimateTier;
  overheadPct?: number;
  contingencyPct?: number;
  specialRequests?: string[];
  commodityPrices?: Record<string, number>;
  liveTradeRates?: Record<string, number>;
}

export interface AutoEstimateLineItem {
  description: string;
  category: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  extendedPrice: number;
  materialCost: number;
  laborCost: number;
  retailPrice: number;
  pricingConfidence: "high" | "medium" | "low";
  priceSource: "historical" | "calculated" | "regional_adjusted" | "live_adjusted";
  commodityAdjustment?: number;
  tradeSlug?: string;
  laborRateSource?: "static" | "bls";
}

export interface AutoEstimateResult {
  lineItems: AutoEstimateLineItem[];
  materialsSubtotal: number;
  laborSubtotal: number;
  subcontractorTotal: number;
  overheadDollar: number;
  contingencyDollar: number;
  grandTotal: number;
  costPerSqft: number | null;
  grossMarginPct: number;
  marginAlerts: Array<{ type: string; message: string; severity: "warning" | "error" }>;
  regionalMultiplier: number;
  tierMultiplier: number;
  input: AutoEstimateInput;
  commodityDrivers?: Array<{ category: string; factor: number; drivers: Array<{ commodity: string; impact: number }> }>;
  liveTradeRateCount: number;
  indirectCosts: Array<{ id: string; name: string; cost: number; category: string }>;
  indirectCostChecklist: Array<{ id: string; name: string; estimatedCost: number; category: string; reason: string; triggerHint?: string }>;
  indirectCostTotal: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function deriveMaterialLaborSplit(totalPrice: number, laborAvg: number | undefined, materialAvg: number | undefined): { materialFraction: number; laborFraction: number } {
  if (!totalPrice || totalPrice <= 0) return { materialFraction: 0.5, laborFraction: 0.5 };
  if (laborAvg !== undefined && materialAvg !== undefined) { const sum = laborAvg + materialAvg; if (sum > 0) return { materialFraction: materialAvg / sum, laborFraction: laborAvg / sum }; }
  if (materialAvg !== undefined && materialAvg > 0) { const matFrac = Math.min(materialAvg / totalPrice, 0.95); return { materialFraction: matFrac, laborFraction: 1 - matFrac }; }
  if (laborAvg !== undefined && laborAvg > 0) { const labFrac = Math.min(laborAvg / totalPrice, 0.95); return { materialFraction: 1 - labFrac, laborFraction: labFrac }; }
  return { materialFraction: 0.5, laborFraction: 0.5 };
}

export function generateAutoEstimate(input: AutoEstimateInput): AutoEstimateResult {
  const { projectType, squareFootage, zipCode = "", tier, overheadPct = 0.15, commodityPrices, liveTradeRates } = input;

  const template = MHP_PROJECT_TEMPLATES[projectType];
  if (!template) throw new Error(`Unknown project type: "${projectType}". Valid types: ${Object.keys(MHP_PROJECT_TEMPLATES).join(", ")}`);

  const contingencyPct = input.contingencyPct ?? template.defaultContingency;
  const tierMults = getTierMultiplier(tier);
  const regionMults = getRegionalMultiplier(zipCode);
  const blendedTierMultiplier = (tierMults.material + tierMults.labor) / 2;
  const blendedRegionalMultiplier = (regionMults.material + regionMults.labor) / 2;

  const commodityAdjustmentCache = new Map<string, { adjustmentFactor: number; drivers: Array<{ commodity: string; impact: number }> }>();
  const commodityDrivers: Array<{ category: string; factor: number; drivers: Array<{ commodity: string; impact: number }> }> = [];
  let liveTradeRateCount = 0;

  const lineItems: AutoEstimateLineItem[] = template.standardLineItems.map((name) => {
    const suggestion = suggestPrice(name);
    const baseUnitPrice = suggestion.suggestedPrice;
    const retailPrice = baseUnitPrice;
    const { quantity, unit } = computeQuantity(name, squareFootage);
    const formula = SQFT_FORMULAS[name];
    const isFixed = formula?.isFixed ?? false;
    const category = suggestion.match?.category ?? "general";
    const { materialFraction, laborFraction } = deriveMaterialLaborSplit(baseUnitPrice, suggestion.laborEstimate, suggestion.materialEstimate);
    const wasteFactor = isFixed ? 0 : template.defaultWasteFactor;
    const materialWasteMultiplier = 1 + wasteFactor;
    const baseMatPrice = baseUnitPrice * materialFraction;
    let baseLabPrice = baseUnitPrice * laborFraction;
    let tradeSlug: string | undefined;
    let laborRateSource: "static" | "bls" = "static";
    const tradeRate = getTradeRateForCategory(category);
    if (tradeRate && liveTradeRates) {
      tradeSlug = CATEGORY_TO_TRADE[category];
      if (tradeSlug) {
        const liveRate = liveTradeRates[tradeSlug];
        if (liveRate && liveRate > 0) { baseLabPrice = baseLabPrice * (liveRate / tradeRate.hourlyRate); laborRateSource = "bls"; liveTradeRateCount++; }
      }
    }
    let tieredMatPrice = baseMatPrice * tierMults.material * materialWasteMultiplier;
    const tieredLabPrice = baseLabPrice * tierMults.labor;
    let commodityAdj = 1.0;
    if (commodityPrices && Object.keys(commodityPrices).length > 0) {
      if (!commodityAdjustmentCache.has(category)) {
        const adj = calculateCommodityAdjustment(category, commodityPrices);
        commodityAdjustmentCache.set(category, adj);
        if (adj.adjustmentFactor !== 1.0) commodityDrivers.push({ category, factor: adj.adjustmentFactor, drivers: adj.drivers });
      }
      commodityAdj = commodityAdjustmentCache.get(category)!.adjustmentFactor;
      tieredMatPrice = tieredMatPrice * commodityAdj;
    }
    const finalMatPrice = tieredMatPrice * regionMults.material;
    const finalLabPrice = laborRateSource === "bls" ? tieredLabPrice : tieredLabPrice * regionMults.labor;
    const unitPrice = round2(finalMatPrice + finalLabPrice);
    const extendedPrice = round2(unitPrice * quantity);
    const materialCost = round2(finalMatPrice * quantity);
    const laborCost = round2(finalLabPrice * quantity);
    const hasLiveData = commodityAdj !== 1.0 || laborRateSource === "bls";
    const priceSource: AutoEstimateLineItem["priceSource"] = hasLiveData ? "live_adjusted" : suggestion.confidence === "low" ? "calculated" : zipCode ? "regional_adjusted" : "historical";
    return { description: name, category, quantity: round2(quantity), unit, unitPrice, extendedPrice, materialCost, laborCost, retailPrice: round2(retailPrice), pricingConfidence: suggestion.confidence, priceSource, commodityAdjustment: commodityAdj !== 1.0 ? commodityAdj : undefined, tradeSlug, laborRateSource: laborRateSource === "bls" ? laborRateSource : undefined };
  });

  const materialsSubtotal = round2(lineItems.reduce((s, li) => s + li.materialCost, 0));
  const laborSubtotal = round2(lineItems.reduce((s, li) => s + li.laborCost, 0));
  const directSubtotal = materialsSubtotal + laborSubtotal;
  const overheadDollar = round2(directSubtotal * overheadPct);
  const contingencyDollar = round2(directSubtotal * contingencyPct);
  const preIndirectTotal = directSubtotal + overheadDollar + contingencyDollar;

  const { autoInclude, reviewChecklist } = getIndirectCostsForProject(projectType);
  const indirectCosts = autoInclude.map((ic) => ({ id: ic.id, name: ic.name, cost: round2(calculateIndirectCost(ic, squareFootage, preIndirectTotal)), category: ic.category }));
  const indirectCostTotal = round2(indirectCosts.reduce((s, ic) => s + ic.cost, 0));
  const indirectCostChecklist = reviewChecklist.map((ic) => ({ id: ic.id, name: ic.name, estimatedCost: round2(calculateIndirectCost(ic, squareFootage, preIndirectTotal)), category: ic.category, reason: ic.reason, triggerHint: ic.triggerHint }));
  const grandTotal = round2(preIndirectTotal + indirectCostTotal);

  const marginsResult = calculateMargins({ materialsCost: materialsSubtotal, laborCost: laborSubtotal, subcontractorCost: 0, permitsFees: 0, overheadProfit: overheadDollar, contingency: contingencyDollar });
  const marginAlerts: Array<{ type: string; message: string; severity: "warning" | "error" }> = marginsResult.alerts.map((alert) => ({ type: alert.metric, message: alert.message, severity: "warning" as const }));
  const grossMarginPct = marginsResult.grossMarginPct;
  if (grossMarginPct < 0.20) marginAlerts.push({ type: "Gross Margin Critical", message: `Gross margin ${(grossMarginPct * 100).toFixed(1)}% is critically low — review pricing before sending`, severity: "error" as const });
  const costPerSqft = squareFootage > 0 ? round2(grandTotal / squareFootage) : null;

  return { lineItems, materialsSubtotal, laborSubtotal, subcontractorTotal: 0, overheadDollar, contingencyDollar, grandTotal, costPerSqft, grossMarginPct: round2(grossMarginPct * 100) / 100, marginAlerts, regionalMultiplier: round2(blendedRegionalMultiplier), tierMultiplier: round2(blendedTierMultiplier), input, commodityDrivers: commodityDrivers.length > 0 ? commodityDrivers : undefined, liveTradeRateCount, indirectCosts, indirectCostChecklist, indirectCostTotal };
}
