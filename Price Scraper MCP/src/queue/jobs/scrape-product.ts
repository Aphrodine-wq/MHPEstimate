import type { Job } from 'bullmq';
import type { ScraperEngine } from '../../scraping/scraper-engine.js';
import type { ProductRepository } from '../../db/repositories/product-repository.js';
import type { PriceRepository } from '../../db/repositories/price-repository.js';
import type { Retailer } from '../../types/product.js';
import { normalizeProduct, normalizePriceRecord } from '../../pipeline/normalizer.js';
import { validateRawProduct } from '../../pipeline/validators.js';
import pino from 'pino';

const logger = pino({ name: 'job:scrape-product' });

export interface ScrapeProductJobData {
  retailer: Retailer;
  productUrl: string;
  zipCode: string;
}

export function createScrapeProductProcessor(
  scraperEngine: ScraperEngine,
  productRepo: ProductRepository,
  priceRepo: PriceRepository,
) {
  return async (job: Job<ScrapeProductJobData>) => {
    const { retailer, productUrl, zipCode } = job.data;
    logger.info({ retailer, productUrl, zipCode }, 'Scraping product');

    const result = await scraperEngine.getProductDetails(retailer, productUrl, zipCode);
    if (!result.success || !result.data) {
      throw new Error(`Scrape failed: ${result.error?.message}`);
    }

    const validation = validateRawProduct(result.data);
    if (!validation.valid) {
      logger.warn({ errors: validation.errors }, 'Validation failed');
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const normalized = normalizeProduct(result.data);
    const product = await productRepo.upsert(result.data);

    const priceRecord = normalizePriceRecord(result.data, product.id, null, zipCode);
    await priceRepo.insert(priceRecord);

    logger.info({ productId: product.id }, 'Product scraped and stored');
    return { productId: product.id };
  };
}
