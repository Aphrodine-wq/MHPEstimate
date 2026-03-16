import type { ScraperEngine } from '../../scraping/scraper-engine.js';
import type { CacheManager } from '../../db/cache/cache-manager.js';
import { CacheKeys } from '../../db/cache/cache-keys.js';
import type { ListCategoriesInput } from './schemas.js';
import type { Retailer } from '../../types/product.js';
import type { RawCategory } from '../../types/scraping.js';

interface CategoriesResult {
  store: string;
  categories: RawCategory[];
  cached: boolean;
}

export async function listCategories(
  input: ListCategoriesInput,
  deps: {
    scraperEngine: ScraperEngine;
    cache: CacheManager;
  },
): Promise<CategoriesResult[]> {
  const retailers: Retailer[] = input.store === 'both'
    ? ['home_depot', 'lowes']
    : [input.store as Retailer];

  const results: CategoriesResult[] = [];

  for (const retailer of retailers) {
    const cacheKey = CacheKeys.categories(retailer);

    const { data, cached } = await deps.cache.getOrFetch<RawCategory[]>(
      cacheKey,
      async () => {
        const result = await deps.scraperEngine.getCategories(retailer);
        return result.data ?? [];
      },
      86400, // 24 hour TTL for categories
    );

    results.push({
      store: retailer,
      categories: data,
      cached,
    });
  }

  return results;
}
