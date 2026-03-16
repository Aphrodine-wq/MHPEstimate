import type { BrowserManager } from './browser-manager.js';
import type { BaseAdapter } from './adapters/base-adapter.js';
import type { RawProduct, Retailer } from '../types/product.js';
import type { RawInventory, RawCategory, SearchOptions, ScrapeResult } from '../types/scraping.js';
import { RateLimiter, RETAILER_RATE_LIMITS } from '../resilience/rate-limiter.js';
import { CircuitBreaker } from '../resilience/circuit-breaker.js';
import { withRetry } from '../resilience/retry.js';
import pino from 'pino';

const logger = pino({ name: 'scraper-engine' });

export class ScraperEngine {
  private adapters = new Map<Retailer, BaseAdapter>();
  private rateLimiters = new Map<string, RateLimiter>();
  private circuitBreakers = new Map<string, CircuitBreaker>();

  constructor(private browserManager: BrowserManager) {
    // Initialize rate limiters
    for (const [retailer, config] of Object.entries(RETAILER_RATE_LIMITS)) {
      this.rateLimiters.set(retailer, new RateLimiter(config));
    }
  }

  registerAdapter(adapter: BaseAdapter): void {
    this.adapters.set(adapter.retailer, adapter);
    this.circuitBreakers.set(adapter.retailer, new CircuitBreaker(adapter.retailer));
  }

  async searchProducts(
    retailer: Retailer | 'both',
    options: SearchOptions,
    zipCode?: string,
  ): Promise<ScrapeResult<RawProduct[]>> {
    const start = Date.now();

    if (retailer === 'both') {
      const retailers: Retailer[] = ['home_depot', 'lowes'];
      const results = await Promise.allSettled(
        retailers.map((r) => this.searchSingle(r, options, zipCode)),
      );

      const allProducts: RawProduct[] = [];
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.data) {
          allProducts.push(...result.value.data);
        }
      }

      return {
        success: allProducts.length > 0,
        data: allProducts,
        error: null,
        duration_ms: Date.now() - start,
        cached: false,
      };
    }

    return this.searchSingle(retailer, options, zipCode);
  }

  private async searchSingle(
    retailer: Retailer,
    options: SearchOptions,
    zipCode?: string,
  ): Promise<ScrapeResult<RawProduct[]>> {
    const start = Date.now();
    const adapter = this.adapters.get(retailer);
    if (!adapter) {
      return { success: false, data: null, error: { type: 'PERMANENT', message: `No adapter for ${retailer}`, retailer, retryable: false }, duration_ms: 0, cached: false };
    }

    const circuitBreaker = this.circuitBreakers.get(retailer)!;
    const rateLimiter = this.rateLimiters.get(retailer)!;

    try {
      const data = await circuitBreaker.execute(async () => {
        await rateLimiter.acquire();
        const contextKey = `${retailer}:${zipCode ?? 'default'}`;
        const context = await this.browserManager.getContext(contextKey);
        const page = await context.newPage();

        try {
          if (zipCode) {
            await adapter.setZipCode(page, zipCode);
          }
          return await withRetry(() => adapter.searchProducts(page, options));
        } finally {
          await page.close();
        }
      });

      return { success: true, data, error: null, duration_ms: Date.now() - start, cached: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ retailer, err: message }, 'Search failed');
      return { success: false, data: null, error: { type: 'TRANSIENT', message, retailer, retryable: true }, duration_ms: Date.now() - start, cached: false };
    }
  }

  async getProductDetails(
    retailer: Retailer,
    productUrl: string,
    zipCode?: string,
  ): Promise<ScrapeResult<RawProduct>> {
    const start = Date.now();
    const adapter = this.adapters.get(retailer);
    if (!adapter) {
      return { success: false, data: null, error: { type: 'PERMANENT', message: `No adapter for ${retailer}`, retailer, retryable: false }, duration_ms: 0, cached: false };
    }

    const circuitBreaker = this.circuitBreakers.get(retailer)!;
    const rateLimiter = this.rateLimiters.get(retailer)!;

    try {
      const data = await circuitBreaker.execute(async () => {
        await rateLimiter.acquire();
        const contextKey = `${retailer}:${zipCode ?? 'default'}`;
        const context = await this.browserManager.getContext(contextKey);
        const page = await context.newPage();

        try {
          if (zipCode) {
            await adapter.setZipCode(page, zipCode);
          }
          return await withRetry(() => adapter.getProductDetails(page, productUrl));
        } finally {
          await page.close();
        }
      });

      return { success: true, data, error: null, duration_ms: Date.now() - start, cached: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ retailer, productUrl, err: message }, 'Product details fetch failed');
      return { success: false, data: null, error: { type: 'TRANSIENT', message, retailer, retryable: true }, duration_ms: Date.now() - start, cached: false };
    }
  }

  async getStoreInventory(
    retailer: Retailer,
    productUrl: string,
    storeId: string,
    zipCode?: string,
  ): Promise<ScrapeResult<RawInventory>> {
    const start = Date.now();
    const adapter = this.adapters.get(retailer);
    if (!adapter) {
      return { success: false, data: null, error: { type: 'PERMANENT', message: `No adapter for ${retailer}`, retailer, retryable: false }, duration_ms: 0, cached: false };
    }

    const circuitBreaker = this.circuitBreakers.get(retailer)!;
    const rateLimiter = this.rateLimiters.get(retailer)!;

    try {
      const data = await circuitBreaker.execute(async () => {
        await rateLimiter.acquire();
        const contextKey = `${retailer}:${zipCode ?? 'default'}`;
        const context = await this.browserManager.getContext(contextKey);
        const page = await context.newPage();

        try {
          if (zipCode) {
            await adapter.setZipCode(page, zipCode);
          }
          return await withRetry(() => adapter.getStoreInventory(page, productUrl, storeId));
        } finally {
          await page.close();
        }
      });

      return { success: true, data, error: null, duration_ms: Date.now() - start, cached: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ retailer, storeId, err: message }, 'Inventory check failed');
      return { success: false, data: null, error: { type: 'TRANSIENT', message, retailer, retryable: true }, duration_ms: Date.now() - start, cached: false };
    }
  }

  async getCategories(retailer: Retailer): Promise<ScrapeResult<RawCategory[]>> {
    const start = Date.now();
    const adapter = this.adapters.get(retailer);
    if (!adapter) {
      return { success: false, data: null, error: { type: 'PERMANENT', message: `No adapter for ${retailer}`, retailer, retryable: false }, duration_ms: 0, cached: false };
    }

    const circuitBreaker = this.circuitBreakers.get(retailer)!;
    const rateLimiter = this.rateLimiters.get(retailer)!;

    try {
      const data = await circuitBreaker.execute(async () => {
        await rateLimiter.acquire();
        const context = await this.browserManager.getContext(`${retailer}:default`);
        const page = await context.newPage();

        try {
          return await withRetry(() => adapter.getCategories(page));
        } finally {
          await page.close();
        }
      });

      return { success: true, data, error: null, duration_ms: Date.now() - start, cached: false };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ retailer, err: message }, 'Categories fetch failed');
      return { success: false, data: null, error: { type: 'TRANSIENT', message, retailer, retryable: true }, duration_ms: Date.now() - start, cached: false };
    }
  }
}
