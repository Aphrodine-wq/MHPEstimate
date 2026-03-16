import type { RawProduct } from '../types/product.js';
import type { ProductRepository } from '../db/repositories/product-repository.js';
import type { PriceComparison, PriceComparisonEntry } from '../types/price.js';

export class Deduplicator {
  constructor(private productRepo: ProductRepository) {}

  async crossReference(
    homeDepotProducts: RawProduct[],
    lowesProducts: RawProduct[],
  ): Promise<PriceComparison[]> {
    const comparisons: PriceComparison[] = [];
    const matchedLowes = new Set<number>();

    for (const hdProduct of homeDepotProducts) {
      let bestMatch: { product: RawProduct; score: number; index: number } | null = null;

      // Try UPC match first (highest confidence)
      if (hdProduct.upc) {
        const idx = lowesProducts.findIndex((lp, i) => !matchedLowes.has(i) && lp.upc === hdProduct.upc);
        if (idx >= 0) {
          bestMatch = { product: lowesProducts[idx]!, score: 1.0, index: idx };
        }
      }

      // Fall back to fuzzy name matching
      if (!bestMatch) {
        for (let i = 0; i < lowesProducts.length; i++) {
          if (matchedLowes.has(i)) continue;
          const lp = lowesProducts[i]!;
          const score = nameSimilarity(hdProduct.name, lp.name);
          if (score > 0.6 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { product: lp, score, index: i };
          }
        }
      }

      const hdEntry: PriceComparisonEntry = {
        product_id: '',
        retailer_sku: hdProduct.retailer_sku,
        name: hdProduct.name,
        unit_price_cents: hdProduct.price_cents ?? 0,
        bulk_price_cents: hdProduct.bulk_price_cents,
        promo_flag: hdProduct.promo_flag,
        product_url: hdProduct.product_url,
      };

      if (bestMatch) {
        matchedLowes.add(bestMatch.index);
        const lp = bestMatch.product;
        const lowesEntry: PriceComparisonEntry = {
          product_id: '',
          retailer_sku: lp.retailer_sku,
          name: lp.name,
          unit_price_cents: lp.price_cents ?? 0,
          bulk_price_cents: lp.bulk_price_cents,
          promo_flag: lp.promo_flag,
          product_url: lp.product_url,
        };

        const hdPrice = hdProduct.price_cents ?? 0;
        const lowesPrice = lp.price_cents ?? 0;
        const savings = Math.abs(hdPrice - lowesPrice);

        comparisons.push({
          product_name: hdProduct.name,
          upc: hdProduct.upc ?? lp.upc ?? null,
          home_depot: hdEntry,
          lowes: lowesEntry,
          savings_cents: savings,
          cheaper_at: hdPrice < lowesPrice ? 'home_depot' : lowesPrice < hdPrice ? 'lowes' : 'same',
        });
      } else {
        comparisons.push({
          product_name: hdProduct.name,
          upc: hdProduct.upc,
          home_depot: hdEntry,
          lowes: null,
          savings_cents: 0,
          cheaper_at: 'same',
        });
      }
    }

    // Add unmatched Lowe's products
    for (let i = 0; i < lowesProducts.length; i++) {
      if (matchedLowes.has(i)) continue;
      const lp = lowesProducts[i]!;
      comparisons.push({
        product_name: lp.name,
        upc: lp.upc,
        home_depot: null,
        lowes: {
          product_id: '',
          retailer_sku: lp.retailer_sku,
          name: lp.name,
          unit_price_cents: lp.price_cents ?? 0,
          bulk_price_cents: lp.bulk_price_cents,
          promo_flag: lp.promo_flag,
          product_url: lp.product_url,
        },
        savings_cents: 0,
        cheaper_at: 'same',
      });
    }

    return comparisons;
  }
}

function nameSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  const wordsA = normalize(a);
  const wordsB = normalize(b);

  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const setA = new Set(wordsA);
  const setB = new Set(wordsB);

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}
