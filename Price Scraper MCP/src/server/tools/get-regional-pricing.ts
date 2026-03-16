import type { ScraperEngine } from '../../scraping/scraper-engine.js';
import type { ProductRepository } from '../../db/repositories/product-repository.js';
import type { PriceRepository } from '../../db/repositories/price-repository.js';
import type { CacheManager } from '../../db/cache/cache-manager.js';
import { CacheKeys } from '../../db/cache/cache-keys.js';
import { normalizePriceRecord } from '../../pipeline/normalizer.js';
import { aggregateRegionalPrices } from '../../regions/aggregator.js';
import { getRegionByName } from '../../regions/region-definitions.js';
import type { GetRegionalPricingInput } from './schemas.js';
import type { RegionalPriceStats } from '../../types/price.js';
import type { RegionName } from '../../types/region.js';

interface RegionalPricingResult {
  product_id: string;
  product_name: string;
  retailer: string;
  region: string | null;
  stats: RegionalPriceStats;
  cached: boolean;
}

export async function getRegionalPricing(
  input: GetRegionalPricingInput,
  deps: {
    scraperEngine: ScraperEngine;
    productRepo: ProductRepository;
    priceRepo: PriceRepository;
    cache: CacheManager;
  },
): Promise<RegionalPricingResult> {
  // Resolve ZIP codes
  let zipCodes: string[];
  let regionLabel: string | null = null;

  if (input.region) {
    const region = getRegionByName(input.region as RegionName);
    zipCodes = region.zip_codes;
    regionLabel = region.display_name;
  } else {
    zipCodes = input.zip_codes!;
  }

  const cacheKey = CacheKeys.regionalPricing(input.product_id, input.region ?? zipCodes.join(','));

  const { data: stats, cached } = await deps.cache.getOrFetch<RegionalPriceStats>(
    cacheKey,
    async () => {
      // Check DB for existing regional prices
      const existingPrices = await deps.priceRepo.getRegionalPrices(input.product_id, zipCodes);

      // Find ZIPs we need to scrape
      const missingZips = zipCodes.filter((z) => !(z in existingPrices));

      if (missingZips.length > 0) {
        const product = await deps.productRepo.findById(input.product_id);
        if (!product) {
          throw new Error(`Product ${input.product_id} not found`);
        }

        // Scrape missing ZIPs
        for (const zip of missingZips) {
          const result = await deps.scraperEngine.getProductDetails(
            input.store,
            product.product_url,
            zip,
          );

          if (result.success && result.data && result.data.price_cents !== null) {
            existingPrices[zip] = result.data.price_cents;
            const priceRecord = normalizePriceRecord(result.data, input.product_id, null, zip);
            await deps.priceRepo.insert(priceRecord);
          }
        }
      }

      return aggregateRegionalPrices(existingPrices);
    },
    1800, // 30 min TTL for regional data
  );

  const product = await deps.productRepo.findById(input.product_id);

  return {
    product_id: input.product_id,
    product_name: product?.name ?? 'Unknown',
    retailer: input.store,
    region: regionLabel,
    stats,
    cached,
  };
}
