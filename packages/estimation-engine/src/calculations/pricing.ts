/**
 * Historical Pricing Lookup Engine
 * Uses MHP's 3-year estimate database to suggest pricing for line items
 */

import {
  MHP_PRICING_DATABASE,
  lookupPrice,
  searchPricing,
  getPackageBundle,
  MHP_PROJECT_TEMPLATES,
  type HistoricalPriceEntry,
  type PackageBundle,
} from "@proestimate/shared/constants";

export interface PricingSuggestion {
  lineItemName: string;
  match: HistoricalPriceEntry | null;
  suggestedPrice: number;
  confidence: "high" | "medium" | "low";
  priceRange: { min: number; max: number };
  basedOn: number; // number of historical data points
  laborEstimate?: number;
  materialEstimate?: number;
}

export interface EstimateFromTemplate {
  lineItems: PricingSuggestion[];
  subtotal: number;
  overhead: number;
  profitMargin: number;
  grandTotal: number;
}

/**
 * Get pricing suggestion for a single line item
 */
export function suggestPrice(lineItemName: string): PricingSuggestion {
  // Try exact match first
  let match = lookupPrice(lineItemName);

  // If no exact match, try fuzzy search
  if (!match) {
    const results = searchPricing(lineItemName);
    if (results.length > 0) {
      match = results[0];
    }
  }

  if (!match) {
    return {
      lineItemName,
      match: null,
      suggestedPrice: 0,
      confidence: "low",
      priceRange: { min: 0, max: 0 },
      basedOn: 0,
    };
  }

  const confidence: "high" | "medium" | "low" =
    match.occurrences >= 50 ? "high" : match.occurrences >= 10 ? "medium" : "low";

  return {
    lineItemName,
    match,
    suggestedPrice: match.pricing.median,
    confidence,
    priceRange: { min: match.pricing.min, max: match.pricing.max },
    basedOn: match.occurrences,
    laborEstimate: match.labor?.avg,
    materialEstimate: match.material?.avg,
  };
}

/**
 * Generate a full estimate from a project type template
 * Uses historical median pricing as the baseline
 */
export function generateEstimateFromTemplate(
  projectType: string,
  lineItemNames: string[],
  overheadPct: number = 0.03,
  profitPct: number = 0.15,
): EstimateFromTemplate {
  const lineItems = lineItemNames.map((name) => suggestPrice(name));

  const subtotal = lineItems.reduce((sum, item) => sum + item.suggestedPrice, 0);
  const overhead = subtotal * overheadPct;
  const profitMargin = subtotal * profitPct;
  const grandTotal = subtotal + overhead + profitMargin;

  return {
    lineItems,
    subtotal: Math.round(subtotal * 100) / 100,
    overhead: Math.round(overhead * 100) / 100,
    profitMargin: Math.round(profitMargin * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
  };
}

/**
 * Get all pricing data for a specific category
 */
export function getCategoryPricing(category: string): HistoricalPriceEntry[] {
  return MHP_PRICING_DATABASE.filter((e) => e.category === category);
}

/**
 * Search for similar line items based on partial name match
 * Returns ranked results by relevance (occurrence count)
 */
export function findSimilarLineItems(
  query: string,
  limit: number = 10,
): HistoricalPriceEntry[] {
  const results = searchPricing(query);
  return results
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, limit);
}

/* ---- Package / Bundle Estimation ---- */

export interface PackageEstimate {
  bundleId: string;
  bundleLabel: string;
  projectTypes: string[];
  lineItems: PricingSuggestion[];
  /** Pre-discount subtotal */
  subtotalBeforeDiscount: number;
  /** Bundle discount amount */
  discountAmount: number;
  /** Discount percentage applied */
  discountPct: number;
  subtotal: number;
  overhead: number;
  profitMargin: number;
  grandTotal: number;
  /** Items that were deduplicated (only charged once) */
  deduplicatedItems: string[];
  /** Line items unique to this bundle (not in individual templates) */
  bundleSpecificItems: PricingSuggestion[];
}

/**
 * Generate a full package estimate by combining multiple project type templates.
 * This is the "full packages" capability — Alex uses this when a homeowner
 * wants a bundled deal (e.g., "Roofing + Gutters + Painting").
 *
 * How it works:
 * 1. Collects all standardLineItems from each project type template
 * 2. Deduplicates shared items (General Conditions, Mobilization, etc.) — only charges once
 * 3. Adds bundle-specific line items (scaffolding, power wash, etc.)
 * 4. Applies bundle discount to the combined subtotal
 * 5. Adds overhead and profit margin
 */
export function generatePackageEstimate(
  bundleId: string,
  overheadPct: number = 0.03,
  profitPct: number = 0.15,
): PackageEstimate | null {
  const bundle = getPackageBundle(bundleId);
  if (!bundle) return null;

  // Collect all line items from each project type template
  const allLineItemNames: string[] = [];
  const deduplicatedItems: string[] = [];

  for (const projectType of bundle.projectTypes) {
    const template = MHP_PROJECT_TEMPLATES[projectType];
    if (!template) continue;

    for (const item of template.standardLineItems) {
      // If this item should be deduplicated and we already have it, skip
      if (bundle.deduplicateItems.includes(item)) {
        if (allLineItemNames.includes(item)) {
          if (!deduplicatedItems.includes(item)) {
            deduplicatedItems.push(item);
          }
          continue;
        }
      }
      allLineItemNames.push(item);
    }
  }

  // Add bundle-specific line items
  for (const item of bundle.bundleSpecificLineItems) {
    if (!allLineItemNames.includes(item)) {
      allLineItemNames.push(item);
    }
  }

  // Price everything
  const lineItems = allLineItemNames.map((name) => suggestPrice(name));
  const bundleSpecificItems = bundle.bundleSpecificLineItems.map((name) => suggestPrice(name));

  const subtotalBeforeDiscount = lineItems.reduce((sum, item) => sum + item.suggestedPrice, 0);
  const discountAmount = subtotalBeforeDiscount * bundle.bundleDiscount;
  const subtotal = subtotalBeforeDiscount - discountAmount;
  const overhead = subtotal * overheadPct;
  const profitMargin = subtotal * profitPct;
  const grandTotal = subtotal + overhead + profitMargin;

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    bundleId: bundle.id,
    bundleLabel: bundle.label,
    projectTypes: bundle.projectTypes,
    lineItems,
    subtotalBeforeDiscount: round(subtotalBeforeDiscount),
    discountAmount: round(discountAmount),
    discountPct: bundle.bundleDiscount,
    subtotal: round(subtotal),
    overhead: round(overhead),
    profitMargin: round(profitMargin),
    grandTotal: round(grandTotal),
    deduplicatedItems,
    bundleSpecificItems,
  };
}
