/**
 * Win Probability Predictor
 *
 * Weighted logistic scoring (no ML library) that estimates the probability
 * a contractor will win a bid, given contextual factors.
 *
 * All functions are PURE — no I/O, no Supabase, no side effects.
 */

import { MARGIN_GUARDRAILS } from "@proestimate/shared/constants";
import { getRegionalMultiplier } from "@proestimate/shared/constants/regional-pricing";
import { type EstimateTier } from "@proestimate/shared/constants/tier-multipliers";

export interface HistoricalWinRates { byProjectType: Record<string, number>; overall: number; }
export interface WinPredictionInput { projectType: string; bidTotal: number; directCostTotal: number; tier: EstimateTier; zipCode?: string; daysSinceCreated?: number; isRepeatClient?: boolean; regionalMarketMedian?: number; }
export interface PriceAdjustmentSuggestion { discountPct: number; newBidTotal: number; newWinProbability: number; newGrossMarginPct: number; isFeasible: boolean; label: string; }
export type PriceSuggestion = PriceAdjustmentSuggestion;
export interface WinPredictionScoreBreakdown { base: number; projectTypeRate: number; priceCompetitiveness: number; tierPreference: number; recency: number; repeatClient: number; sweetSpot: number; rawScore: number; clampedScore: number; }
export interface WinPredictionResult { winProbability: number; scoreBreakdown: WinPredictionScoreBreakdown; priceAdjustments: PriceAdjustmentSuggestion[]; currentGrossMarginPct: number; marginFloor: number; isAboveMarginFloor: boolean; }

const round2 = (n: number) => Math.round(n * 100) / 100;
function clampProbability(rawScore: number): number { return Math.max(5, Math.min(95, Math.round(rawScore))); }
function grossMargin(bidTotal: number, directCostTotal: number): number { return bidTotal <= 0 ? 0 : (bidTotal - directCostTotal) / bidTotal; }
function priceCompetitivenessScore(bidTotal: number, marketMedian: number): number { if (!marketMedian || marketMedian <= 0) return 0; return Math.max(-20, Math.min(20, Math.round(((marketMedian - bidTotal) / marketMedian) * 100))); }

const DISCOUNT_LEVELS = [0.03, 0.05, 0.08, 0.10];

function buildPriceAdjustments(input: WinPredictionInput, currentScore: number, historicalRates: HistoricalWinRates, marketMedian: number): PriceAdjustmentSuggestion[] {
  return DISCOUNT_LEVELS.map((discountPct) => {
    const newBidTotal = round2(input.bidTotal * (1 - discountPct));
    const newMarginPct = grossMargin(newBidTotal, input.directCostTotal);
    const isFeasible = newMarginPct >= MARGIN_GUARDRAILS.grossMargin.min;
    const scoreDelta = priceCompetitivenessScore(newBidTotal, marketMedian) - priceCompetitivenessScore(input.bidTotal, marketMedian);
    const newWinProbability = clampProbability(currentScore + scoreDelta);
    return { discountPct, newBidTotal, newWinProbability, newGrossMarginPct: round2(newMarginPct * 100) / 100, isFeasible, label: `${(discountPct * 100).toFixed(0)}% discount -> $${newBidTotal.toLocaleString()} (${newWinProbability}% win, ${(newMarginPct * 100).toFixed(1)}% margin)${isFeasible ? "" : " — below margin floor"}` };
  });
}

export function predictWinProbability(input: WinPredictionInput, historicalRates: HistoricalWinRates): WinPredictionResult {
  const { projectType, bidTotal, directCostTotal, tier, zipCode = "", daysSinceCreated = 0, isRepeatClient = false, regionalMarketMedian } = input;
  const regionMults = getRegionalMultiplier(zipCode);
  const blendedRegion = (regionMults.material + regionMults.labor) / 2 || 1.0;
  const marketMedian = regionalMarketMedian ?? directCostTotal * blendedRegion * 1.35;
  const base = 50;
  const typeRate = historicalRates.byProjectType[projectType] ?? historicalRates.overall;
  const overallRate = historicalRates.overall || 0.5;
  const projectTypeRateScore = Math.max(-15, Math.min(15, Math.round((typeRate - overallRate) * 75)));
  const priceCompScore = priceCompetitivenessScore(bidTotal, marketMedian);
  const tierScore: Record<EstimateTier, number> = { budget: -5, midrange: 5, high_end: -3 };
  const tierPreferenceScore = tierScore[tier] ?? 0;
  let recencyScore: number;
  if (daysSinceCreated < 7) recencyScore = 10; else if (daysSinceCreated < 14) recencyScore = 5; else if (daysSinceCreated < 30) recencyScore = 0; else recencyScore = -5;
  const repeatClientScore = isRepeatClient ? 15 : 0;
  let sweetSpotScore: number;
  if (bidTotal < 5_000) sweetSpotScore = -5; else if (bidTotal <= 100_000) sweetSpotScore = 5; else if (bidTotal <= 500_000) sweetSpotScore = 0; else sweetSpotScore = -5;
  const rawScore = base + projectTypeRateScore + priceCompScore + tierPreferenceScore + recencyScore + repeatClientScore + sweetSpotScore;
  const clampedScore = clampProbability(rawScore);
  const currentGrossMarginPct = round2(grossMargin(bidTotal, directCostTotal) * 100) / 100;
  const marginFloor = MARGIN_GUARDRAILS.grossMargin.min;
  return { winProbability: clampedScore, scoreBreakdown: { base, projectTypeRate: projectTypeRateScore, priceCompetitiveness: priceCompScore, tierPreference: tierPreferenceScore, recency: recencyScore, repeatClient: repeatClientScore, sweetSpot: sweetSpotScore, rawScore, clampedScore }, priceAdjustments: buildPriceAdjustments(input, rawScore, historicalRates, marketMedian), currentGrossMarginPct, marginFloor, isAboveMarginFloor: currentGrossMarginPct >= marginFloor };
}
