import type { Job } from 'bullmq';
import type { ScraperEngine } from '../../scraping/scraper-engine.js';
import type { ProductRepository } from '../../db/repositories/product-repository.js';
import type { Retailer } from '../../types/product.js';
import pino from 'pino';

const logger = pino({ name: 'job:scrape-inventory' });

export interface ScrapeInventoryJobData {
  retailer: Retailer;
  productId: string;
  productUrl: string;
  storeId: string;
  zipCode?: string;
}

export function createScrapeInventoryProcessor(
  scraperEngine: ScraperEngine,
  productRepo: ProductRepository,
) {
  return async (job: Job<ScrapeInventoryJobData>) => {
    const { retailer, productUrl, storeId, zipCode } = job.data;
    logger.info({ retailer, storeId }, 'Scraping inventory');

    const result = await scraperEngine.getStoreInventory(retailer, productUrl, storeId, zipCode);
    if (!result.success || !result.data) {
      throw new Error(`Inventory scrape failed: ${result.error?.message}`);
    }

    logger.info({ storeId, inStock: result.data.in_stock }, 'Inventory scraped');
    return result.data;
  };
}
