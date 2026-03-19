/**
 * Clone and Adjust Estimate
 *
 * Takes an existing estimate's line items and produces an updated version
 * that accounts for time inflation, market drift, regional shift, and sqft scaling.
 *
 * All functions are PURE — no I/O, no Supabase, no side effects.
 */

import { getRegionalMultiplier } from "@proestimate/shared/constants/regional-pricing";
import { SQFT_FORMULAS, computeQuantity } from "@proestimate/shared/constants/sqft-formulas";
import { suggestPrice } from "./pricing";

export interface OriginalLineItem { description: string; category: string; quantity: number; unit: string; unitPrice: number; extendedPrice: number; materialCost?: number; laborCost?: number; }
export interface CloneEstimateInput { originalLineItems: OriginalLineItem[]; originalDate: string | Date; originalSqft?: number; newSqft?: number; originalZipCode?: string; newZipCode?: string; monthlyInflationRate?: number; marketDriftThreshold?: number; }
export interface ClonedLineItem extends OriginalLineItem { adjustedQuantity: number; adjustedUnitPrice: number; adjustedExtendedPrice: number; monthsElapsed: number; inflationMultiplier: number; regionalRatio: number; usedCurrentMarketPrice: boolean; currentMarketMedian: number | null; adjustmentNote: string; }
export interface CloneEstimateResult { lineItems: ClonedLineItem[]; originalSubtotal: number; adjustedSubtotal: number; totalAdjustmentPct: number; monthsElapsed: number; inflationMultiplier: number; regionalRatio: number; sqftRatio: number; }

const round2 = (n: number) => Math.round(n * 100) / 100;
function monthsBetween(from: Date, to: Date): number { return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + (to.getDate() - from.getDate()) / 30; }
function compoundInflation(monthlyRate: number, months: number): number { return months <= 0 ? 1.0 : Math.pow(1 + monthlyRate, months); }

export function cloneAndAdjustEstimate(input: CloneEstimateInput): CloneEstimateResult {
  const { originalLineItems, originalDate, originalSqft, newSqft, originalZipCode = "", newZipCode = "", monthlyInflationRate = 0.003, marketDriftThreshold = 0.20 } = input;
  const now = new Date();
  const fromDate = originalDate instanceof Date ? originalDate : new Date(originalDate);
  const monthsElapsed = Math.max(0, monthsBetween(fromDate, now));
  const inflationMultiplier = compoundInflation(monthlyInflationRate, monthsElapsed);
  const origRegion = getRegionalMultiplier(originalZipCode);
  const newRegion = getRegionalMultiplier(newZipCode);
  const origBlended = (origRegion.material + origRegion.labor) / 2 || 1.0;
  const newBlended = (newRegion.material + newRegion.labor) / 2 || 1.0;
  const regionalRatio = origBlended > 0 ? newBlended / origBlended : 1.0;
  const sqftRatio = originalSqft && originalSqft > 0 && newSqft !== undefined ? newSqft / originalSqft : 1.0;
  let originalSubtotal = 0; let adjustedSubtotal = 0;

  const lineItems: ClonedLineItem[] = originalLineItems.map((item) => {
    originalSubtotal += item.extendedPrice;
    const formula = SQFT_FORMULAS[item.description];
    const isFixed = formula?.isFixed ?? false;
    let adjustedQuantity: number;
    if (isFixed || sqftRatio === 1.0) adjustedQuantity = item.quantity;
    else if (newSqft !== undefined && newSqft > 0) { const { quantity } = computeQuantity(item.description, newSqft); adjustedQuantity = round2(quantity); }
    else adjustedQuantity = round2(item.quantity * sqftRatio);
    const suggestion = suggestPrice(item.description);
    const currentMedian = suggestion.match && suggestion.suggestedPrice > 0 ? suggestion.suggestedPrice : null;
    let adjustedUnitPrice: number; let usedCurrentMarketPrice = false; let adjustmentNote: string;
    const inflatedPrice = round2(item.unitPrice * inflationMultiplier);
    if (currentMedian !== null && item.unitPrice > 0) {
      const drift = Math.abs(currentMedian - item.unitPrice) / item.unitPrice;
      if (drift > marketDriftThreshold) { adjustedUnitPrice = round2(currentMedian * regionalRatio); usedCurrentMarketPrice = true; adjustmentNote = `Current market price ($${currentMedian.toFixed(2)}) differs from original ($${item.unitPrice.toFixed(2)}) by ${(drift * 100).toFixed(1)}% — using market price`; }
      else { adjustedUnitPrice = round2(inflatedPrice * regionalRatio); adjustmentNote = `Inflation adjusted ${monthsElapsed.toFixed(1)} months at ${(monthlyInflationRate * 100).toFixed(2)}%/mo`; }
    } else { adjustedUnitPrice = round2(inflatedPrice * regionalRatio); adjustmentNote = monthsElapsed > 0 ? `Inflation adjusted ${monthsElapsed.toFixed(1)} months (no DB match for market comparison)` : "No time elapsed — original price retained"; }
    adjustedUnitPrice = Math.max(0, adjustedUnitPrice);
    const adjustedExtendedPrice = round2(adjustedUnitPrice * adjustedQuantity);
    adjustedSubtotal += adjustedExtendedPrice;
    const originalTotal = item.extendedPrice;
    const matFraction = originalTotal > 0 ? (item.materialCost ?? originalTotal * 0.5) / originalTotal : 0.5;
    return { ...item, materialCost: round2(adjustedExtendedPrice * matFraction), laborCost: round2(adjustedExtendedPrice * (1 - matFraction)), adjustedQuantity, adjustedUnitPrice, adjustedExtendedPrice, monthsElapsed: round2(monthsElapsed), inflationMultiplier: round2(inflationMultiplier * 10000) / 10000, regionalRatio: round2(regionalRatio * 10000) / 10000, usedCurrentMarketPrice, currentMarketMedian: currentMedian !== null ? round2(currentMedian) : null, adjustmentNote };
  });

  return { lineItems, originalSubtotal: round2(originalSubtotal), adjustedSubtotal: round2(adjustedSubtotal), totalAdjustmentPct: originalSubtotal > 0 ? round2(((adjustedSubtotal - originalSubtotal) / originalSubtotal) * 100) : 0, monthsElapsed: round2(monthsElapsed), inflationMultiplier: round2(inflationMultiplier * 10000) / 10000, regionalRatio: round2(regionalRatio * 10000) / 10000, sqftRatio: round2(sqftRatio * 10000) / 10000 };
}
