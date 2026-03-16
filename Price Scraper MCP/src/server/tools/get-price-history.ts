import type { ScraperEngine } from '../../scraping/scraper-engine.js';
import type { ProductRepository } from '../../db/repositories/product-repository.js';
import type { PriceRepository } from '../../db/repositories/price-repository.js';
import type { CacheManager } from '../../db/cache/cache-manager.js';
import { CacheKeys } from '../../db/cache/cache-keys.js';
import type { GetPriceHistoryInput } from './schemas.js';
import type { PriceHistoryEntry } from '../../types/price.js';

interface PriceHistoryResult {
  product_id: string;
  product_name: string;
  retailer: string;
  zip_code: string;
  days: number;
  history: PriceHistoryEntry[];
  trend: {
    direction: 'up' | 'down' | 'stable';
    change_cents: number;
    change_percent: number;
  };
  cached: boolean;
}

export async function getPriceHistory(
  input: GetPriceHistoryInput,
  deps: {
    scraperEngine: ScraperEngine;
    productRepo: ProductRepository;
    priceRepo: PriceRepository;
    cache: CacheManager;
  },
): Promise<PriceHistoryResult> {
  const cacheKey = CacheKeys.priceHistory(input.product_id, input.zip_code, input.days);

  const { data: history, cached } = await deps.cache.getOrFetch<PriceHistoryEntry[]>(
    cacheKey,
    async () => {
      return deps.priceRepo.getHistory(input.product_id, input.zip_code, input.days);
    },
    900, // 15 min TTL for history
  );

  const product = await deps.productRepo.findById(input.product_id);

  // Calculate trend
  let trend: PriceHistoryResult['trend'] = { direction: 'stable', change_cents: 0, change_percent: 0 };
  if (history.length >= 2) {
    const oldest = history[0]!;
    const newest = history[history.length - 1]!;
    const changeCents = newest.unit_price_cents - oldest.unit_price_cents;
    const changePercent = oldest.unit_price_cents > 0
      ? (changeCents / oldest.unit_price_cents) * 100
      : 0;

    trend = {
      direction: changeCents > 0 ? 'up' : changeCents < 0 ? 'down' : 'stable',
      change_cents: changeCents,
      change_percent: Math.round(changePercent * 100) / 100,
    };
  }

  return {
    product_id: input.product_id,
    product_name: product?.name ?? 'Unknown',
    retailer: input.store,
    zip_code: input.zip_code,
    days: input.days,
    history,
    trend,
    cached,
  };
}
