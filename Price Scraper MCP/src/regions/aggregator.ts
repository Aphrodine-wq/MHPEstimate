import type { RegionalPriceStats } from '../types/price.js';

export function aggregateRegionalPrices(pricesByZip: Record<string, number>): RegionalPriceStats {
  const prices = Object.values(pricesByZip);

  if (prices.length === 0) {
    return {
      min_cents: 0,
      max_cents: 0,
      mean_cents: 0,
      median_cents: 0,
      prices_by_zip: pricesByZip,
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = Math.round(sum / sorted.length);

  let median: number;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    median = Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
  } else {
    median = sorted[mid]!;
  }

  return {
    min_cents: min,
    max_cents: max,
    mean_cents: mean,
    median_cents: median,
    prices_by_zip: pricesByZip,
  };
}
