import type { ScraperEngine } from '../../scraping/scraper-engine.js';
import type { ProductRepository } from '../../db/repositories/product-repository.js';
import type { StoreRepository } from '../../db/repositories/store-repository.js';
import type { CacheManager } from '../../db/cache/cache-manager.js';
import { CacheKeys } from '../../db/cache/cache-keys.js';
import type { GetStoreInventoryInput } from './schemas.js';
import type { StoreInventory } from '../../types/store.js';

interface StoreInventoryResult {
  product_id: string;
  product_name: string;
  store_id: string;
  store_name: string;
  retailer: string;
  in_stock: boolean;
  quantity: number | null;
  unit_price_cents: number;
  aisle_location: string | null;
  cached: boolean;
}

export async function getStoreInventory(
  input: GetStoreInventoryInput,
  deps: {
    scraperEngine: ScraperEngine;
    productRepo: ProductRepository;
    storeRepo: StoreRepository;
    cache: CacheManager;
  },
): Promise<StoreInventoryResult> {
  const cacheKey = CacheKeys.storeInventory(input.product_id, input.store_id);

  const { data, cached } = await deps.cache.getOrFetch(
    cacheKey,
    async () => {
      const product = await deps.productRepo.findById(input.product_id);
      if (!product) {
        throw new Error(`Product ${input.product_id} not found`);
      }

      const store = await deps.storeRepo.findById(input.store_id);

      const result = await deps.scraperEngine.getStoreInventory(
        input.store,
        product.product_url,
        input.store_id,
        store?.zip_code,
      );

      if (!result.success || !result.data) {
        throw new Error(`Inventory check failed: ${result.error?.message}`);
      }

      return {
        product_id: input.product_id,
        product_name: product.name,
        store_id: input.store_id,
        store_name: store?.name ?? 'Unknown',
        retailer: input.store,
        in_stock: result.data.in_stock,
        quantity: result.data.quantity,
        unit_price_cents: result.data.unit_price_cents,
        aisle_location: result.data.aisle_location,
      };
    },
    300, // 5 min TTL for inventory
  );

  return { ...data, cached };
}
