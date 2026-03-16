import type { ScraperEngine } from '../../scraping/scraper-engine.js';
import type { ProductRepository } from '../../db/repositories/product-repository.js';
import type { CacheManager } from '../../db/cache/cache-manager.js';
import { CacheKeys } from '../../db/cache/cache-keys.js';
import { Deduplicator } from '../../pipeline/deduplicator.js';
import type { ComparePricesInput } from './schemas.js';
import type { PriceComparison } from '../../types/price.js';

interface ComparePricesResult {
  comparisons: PriceComparison[];
  zip_codes: string[];
  cached: boolean;
}

export async function comparePrices(
  input: ComparePricesInput,
  deps: {
    scraperEngine: ScraperEngine;
    productRepo: ProductRepository;
    cache: CacheManager;
  },
): Promise<ComparePricesResult> {
  const cacheKey = CacheKeys.priceComparison(input.product_name, input.zip_codes);

  const { data, cached } = await deps.cache.getOrFetch<PriceComparison[]>(
    cacheKey,
    async () => {
      const zipCode = input.zip_codes[0]!;

      // Search both retailers in parallel
      const [hdResult, lowesResult] = await Promise.all([
        deps.scraperEngine.searchProducts(
          'home_depot',
          { query: input.product_name, category: input.category, limit: 5 },
          zipCode,
        ),
        deps.scraperEngine.searchProducts(
          'lowes',
          { query: input.product_name, category: input.category, limit: 5 },
          zipCode,
        ),
      ]);

      const hdProducts = hdResult.data ?? [];
      const lowesProducts = lowesResult.data ?? [];

      const deduplicator = new Deduplicator(deps.productRepo);
      return deduplicator.crossReference(hdProducts, lowesProducts);
    },
  );

  return {
    comparisons: data,
    zip_codes: input.zip_codes,
    cached,
  };
}
