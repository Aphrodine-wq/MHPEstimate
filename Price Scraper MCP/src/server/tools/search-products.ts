import type { ScraperEngine } from '../../scraping/scraper-engine.js';
import type { ProductRepository } from '../../db/repositories/product-repository.js';
import type { PriceRepository } from '../../db/repositories/price-repository.js';
import type { CacheManager } from '../../db/cache/cache-manager.js';
import { CacheKeys } from '../../db/cache/cache-keys.js';
import { normalizeProduct, normalizePriceRecord } from '../../pipeline/normalizer.js';
import { validateRawProduct } from '../../pipeline/validators.js';
import type { SearchProductsInput } from './schemas.js';
import type { ProductSummary, Retailer } from '../../types/product.js';

export async function searchProducts(
  input: SearchProductsInput,
  deps: {
    scraperEngine: ScraperEngine;
    productRepo: ProductRepository;
    priceRepo: PriceRepository;
    cache: CacheManager;
  },
): Promise<{ products: ProductSummary[]; cached: boolean }> {
  const cacheKey = CacheKeys.productSearch(input.store, input.query, input.category);

  const { data, cached } = await deps.cache.getOrFetch<ProductSummary[]>(
    cacheKey,
    async () => {
      const retailer = input.store === 'both' ? 'both' as const : input.store as Retailer;
      const result = await deps.scraperEngine.searchProducts(
        retailer,
        { query: input.query, category: input.category, limit: input.limit },
      );

      if (!result.success || !result.data) {
        return [];
      }

      const summaries: ProductSummary[] = [];
      for (const raw of result.data) {
        const validation = validateRawProduct(raw);
        if (!validation.valid) continue;

        const product = await deps.productRepo.upsert(raw);

        if (raw.price_cents !== null) {
          const priceRecord = normalizePriceRecord(raw, product.id, null, '00000');
          await deps.priceRepo.insert(priceRecord);
        }

        summaries.push({
          id: product.id,
          retailer: raw.retailer,
          name: raw.name,
          brand: raw.brand,
          price_cents: raw.price_cents ?? 0,
          image_url: raw.image_url,
          product_url: raw.product_url,
        });
      }

      return summaries;
    },
  );

  return { products: data, cached };
}
