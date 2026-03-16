import type { Job } from 'bullmq';
import type { ScraperEngine } from '../../scraping/scraper-engine.js';
import type { ProductRepository } from '../../db/repositories/product-repository.js';
import type { PriceRepository } from '../../db/repositories/price-repository.js';
import type { Retailer } from '../../types/product.js';
import { normalizeProduct, normalizePriceRecord } from '../../pipeline/normalizer.js';
import { validateRawProduct } from '../../pipeline/validators.js';
import pino from 'pino';

const logger = pino({ name: 'job:scrape-search' });

export interface ScrapeSearchJobData {
  retailer: Retailer | 'both';
  query: string;
  category?: string;
  limit: number;
  zipCode?: string;
}

export function createScrapeSearchProcessor(
  scraperEngine: ScraperEngine,
  productRepo: ProductRepository,
  priceRepo: PriceRepository,
) {
  return async (job: Job<ScrapeSearchJobData>) => {
    const { retailer, query, category, limit, zipCode } = job.data;
    logger.info({ retailer, query, limit }, 'Scraping search results');

    const result = await scraperEngine.searchProducts(retailer, { query, category, limit }, zipCode);
    if (!result.success || !result.data) {
      throw new Error(`Search scrape failed: ${result.error?.message}`);
    }

    const products = [];
    for (const raw of result.data) {
      const validation = validateRawProduct(raw);
      if (!validation.valid) {
        logger.debug({ sku: raw.retailer_sku, errors: validation.errors }, 'Skipping invalid product');
        continue;
      }

      const product = await productRepo.upsert(raw);
      if (raw.price_cents !== null && zipCode) {
        const priceRecord = normalizePriceRecord(raw, product.id, null, zipCode);
        await priceRepo.insert(priceRecord);
      }
      products.push(product);
    }

    logger.info({ count: products.length }, 'Search results stored');
    return { count: products.length };
  };
}
