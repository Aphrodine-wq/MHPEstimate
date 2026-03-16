import type { ScraperEngine } from '../../scraping/scraper-engine.js';
import type { ProductRepository } from '../../db/repositories/product-repository.js';
import type { PriceRepository } from '../../db/repositories/price-repository.js';
import type { CacheManager } from '../../db/cache/cache-manager.js';
import { CacheKeys } from '../../db/cache/cache-keys.js';
import { normalizePriceRecord } from '../../pipeline/normalizer.js';
import type { GetProductPriceInput } from './schemas.js';
import type { PriceRecord, PriceHistoryEntry } from '../../types/price.js';

interface ProductPriceResult {
  product_id: string;
  product_name: string;
  retailer: string;
  zip_code: string;
  unit_price_cents: number;
  bulk_price_cents: number | null;
  promo_flag: boolean;
  promo_expiry: Date | null;
  is_online: boolean;
  scraped_at: Date;
  history?: PriceHistoryEntry[];
  cached: boolean;
}

export async function getProductPrice(
  input: GetProductPriceInput,
  deps: {
    scraperEngine: ScraperEngine;
    productRepo: ProductRepository;
    priceRepo: PriceRepository;
    cache: CacheManager;
  },
): Promise<ProductPriceResult> {
  const cacheKey = CacheKeys.productPrice(input.product_id, input.zip_code);

  const { data: price, cached } = await deps.cache.getOrFetch<PriceRecord>(
    cacheKey,
    async () => {
      // Check DB for recent price
      const existing = await deps.priceRepo.getLatest(input.product_id, input.zip_code);
      if (existing) {
        const age = Date.now() - new Date(existing.scraped_at).getTime();
        if (age < 6 * 60 * 60 * 1000) { // less than 6 hours old
          return existing;
        }
      }

      // Scrape fresh price
      const product = await deps.productRepo.findById(input.product_id);
      if (!product) {
        throw new Error(`Product ${input.product_id} not found`);
      }

      const result = await deps.scraperEngine.getProductDetails(
        input.store,
        product.product_url,
        input.zip_code,
      );

      if (!result.success || !result.data) {
        if (existing) return existing; // Return stale data as fallback
        throw new Error(`Failed to scrape price: ${result.error?.message}`);
      }

      const priceRecord = normalizePriceRecord(result.data, input.product_id, null, input.zip_code);
      await deps.priceRepo.insert(priceRecord);
      return priceRecord;
    },
  );

  const product = await deps.productRepo.findById(input.product_id);

  let history: PriceHistoryEntry[] | undefined;
  if (input.include_history) {
    history = await deps.priceRepo.getHistory(input.product_id, input.zip_code, 30);
  }

  return {
    product_id: input.product_id,
    product_name: product?.name ?? 'Unknown',
    retailer: input.store,
    zip_code: input.zip_code,
    unit_price_cents: price.unit_price_cents,
    bulk_price_cents: price.bulk_price_cents,
    promo_flag: price.promo_flag,
    promo_expiry: price.promo_expiry,
    is_online: price.is_online,
    scraped_at: price.scraped_at,
    history,
    cached,
  };
}
