import type { Page } from 'playwright';
import type { Retailer, RawProduct } from '../../types/product.js';
import type { RawInventory, RawCategory, SearchOptions } from '../../types/scraping.js';
import pino from 'pino';

export abstract class BaseAdapter {
  protected logger: pino.Logger;

  constructor(public readonly retailer: Retailer) {
    this.logger = pino({ name: `adapter:${this.retailer}` });
  }

  abstract setZipCode(page: Page, zipCode: string): Promise<void>;
  abstract searchProducts(page: Page, options: SearchOptions): Promise<RawProduct[]>;
  abstract getProductDetails(page: Page, productUrl: string): Promise<RawProduct>;
  abstract getStoreInventory(page: Page, productUrl: string, storeId: string): Promise<RawInventory>;
  abstract getCategories(page: Page): Promise<RawCategory[]>;

  protected async extractJsonLd(page: Page): Promise<Record<string, unknown> | null> {
    try {
      const jsonLdScripts = await page.$$eval(
        'script[type="application/ld+json"]',
        (scripts) => scripts.map((s) => s.textContent),
      );
      for (const content of jsonLdScripts) {
        if (!content) continue;
        try {
          const parsed = JSON.parse(content);
          if (parsed['@type'] === 'Product' || parsed['@type']?.includes('Product')) {
            return parsed;
          }
        } catch { /* skip invalid JSON */ }
      }
      return null;
    } catch {
      return null;
    }
  }

  protected parsePriceToCents(priceStr: string | null | undefined): number | null {
    if (!priceStr) return null;
    const cleaned = priceStr.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    return Math.round(num * 100);
  }

  protected async detectCaptcha(page: Page): Promise<boolean> {
    const captchaSelectors = [
      '#captcha-container',
      '.captcha-challenge',
      '[data-captcha]',
      'iframe[src*="captcha"]',
      'iframe[src*="recaptcha"]',
    ];
    for (const sel of captchaSelectors) {
      const found = await page.$(sel);
      if (found) return true;
    }
    return false;
  }

  protected async waitForSelector(page: Page, selector: string, timeout = 15000): Promise<void> {
    await page.waitForSelector(selector, { timeout });
  }

  protected async randomDelay(min = 500, max = 2000): Promise<void> {
    const delay = min + Math.random() * (max - min);
    await new Promise((r) => setTimeout(r, delay));
  }
}
