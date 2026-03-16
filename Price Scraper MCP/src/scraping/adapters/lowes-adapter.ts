import type { Page } from 'playwright';
import { BaseAdapter } from './base-adapter.js';
import { LowesSelectors as S } from './lowes-selectors.js';
import type { RawProduct } from '../../types/product.js';
import type { RawInventory, RawCategory, SearchOptions } from '../../types/scraping.js';
import { ScrapingFailedError } from '../../types/errors.js';

export class LowesAdapter extends BaseAdapter {
  constructor() {
    super('lowes');
  }

  async setZipCode(page: Page, zipCode: string): Promise<void> {
    try {
      await page.click(S.storeSelector);
      await this.randomDelay(300, 800);
      const input = await page.waitForSelector(S.storeSelectorInput, { timeout: 5000 });
      await input!.fill('');
      await input!.type(zipCode, { delay: 50 });
      await this.randomDelay(200, 500);
      await page.click(S.storeSelectorSubmit);
      await page.waitForSelector(S.storeSelectorResult, { timeout: 10000 });
      await page.click(S.storeSelectorResult);
      await this.randomDelay(500, 1000);
      this.logger.debug({ zipCode }, 'ZIP code set');
    } catch (err) {
      this.logger.warn({ zipCode, err }, 'Failed to set ZIP code via UI, continuing with default');
    }
  }

  async searchProducts(page: Page, options: SearchOptions): Promise<RawProduct[]> {
    const url = `https://www.lowes.com/search?searchTerm=${encodeURIComponent(options.query)}${options.category ? `&refinement=4294967291|${options.category}` : ''}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.randomDelay();

    if (await this.detectCaptcha(page)) {
      throw new ScrapingFailedError('CAPTCHA detected on search page', 'CAPTCHA', 'lowes', url);
    }

    try {
      await this.waitForSelector(page, S.searchGrid, 15000);
    } catch {
      this.logger.warn('Search grid not found, returning empty results');
      return [];
    }

    const cards = await page.$$(S.searchCard);
    const products: RawProduct[] = [];

    for (const card of cards.slice(0, options.limit)) {
      try {
        const name = await card.$eval(S.searchCardName, (el) => el.textContent?.trim() ?? '').catch(() => '');
        const priceText = await card.$eval(S.searchCardPrice, (el) => el.textContent?.trim() ?? '').catch(() => '');
        const imageUrl = await card.$eval(S.searchCardImage, (el) => el.getAttribute('src')).catch(() => null);
        const linkEl = await card.$(S.searchCardLink);
        const href = await linkEl?.getAttribute('href') ?? '';
        const productUrl = href.startsWith('http') ? href : `https://www.lowes.com${href}`;

        // Extract item number from URL: /pd/product-name/1234567
        const skuMatch = productUrl.match(/\/pd\/[^/]+\/(\d+)/);
        const sku = skuMatch?.[1] ?? '';

        if (!name || !sku) continue;

        products.push({
          retailer: 'lowes',
          retailer_sku: sku,
          upc: null,
          name,
          brand: null,
          category: options.category ?? null,
          image_url: imageUrl,
          product_url: productUrl,
          price_cents: this.parsePriceToCents(priceText),
          bulk_price_cents: null,
          promo_flag: false,
          promo_expiry: null,
          is_online: true,
        });
      } catch (err) {
        this.logger.debug({ err }, 'Failed to parse search card');
      }
    }

    return products;
  }

  async getProductDetails(page: Page, productUrl: string): Promise<RawProduct> {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.randomDelay();

    if (await this.detectCaptcha(page)) {
      throw new ScrapingFailedError('CAPTCHA detected', 'CAPTCHA', 'lowes', productUrl);
    }

    const jsonLd = await this.extractJsonLd(page);

    let name = '';
    let priceCents: number | null = null;
    let sku = '';
    let brand: string | null = null;
    let imageUrl: string | null = null;
    let upc: string | null = null;

    if (jsonLd) {
      name = (jsonLd.name as string) ?? '';
      sku = (jsonLd.sku as string) ?? (jsonLd.productID as string) ?? '';
      brand = (jsonLd.brand as { name?: string })?.name ?? null;
      imageUrl = (jsonLd.image as string) ?? null;
      upc = (jsonLd.gtin13 as string) ?? (jsonLd.gtin12 as string) ?? null;
      const offers = jsonLd.offers as { price?: string | number } | undefined;
      if (offers?.price) {
        priceCents = Math.round(Number(offers.price) * 100);
      }
    }

    if (!name) {
      name = await page.$eval(S.productName, (el) => el.textContent?.trim() ?? '').catch(() => '');
    }
    if (!priceCents) {
      const priceText = await page.$eval(S.productPrice, (el) => el.textContent?.trim()).catch(() => null);
      priceCents = this.parsePriceToCents(priceText);
    }
    if (!brand) {
      brand = await page.$eval(S.productBrand, (el) => el.textContent?.trim() ?? '').catch(() => null);
    }
    if (!imageUrl) {
      imageUrl = await page.$eval(S.productImage, (el) => el.getAttribute('src')).catch(() => null);
    }
    if (!sku) {
      const skuMatch = productUrl.match(/\/pd\/[^/]+\/(\d+)/);
      sku = skuMatch?.[1] ?? '';
    }

    const bulkPriceText = await page.$eval(S.productBulkPrice, (el) => el.textContent?.trim()).catch(() => null);
    const promoFlag = await page.$(S.promoFlag).then((el) => el !== null).catch(() => false);

    if (!name || !sku) {
      throw new ScrapingFailedError('Failed to extract product details', 'STRUCTURAL', 'lowes', productUrl);
    }

    return {
      retailer: 'lowes',
      retailer_sku: sku,
      upc,
      name,
      brand,
      category: null,
      image_url: imageUrl,
      product_url: productUrl,
      price_cents: priceCents,
      bulk_price_cents: this.parsePriceToCents(bulkPriceText),
      promo_flag: promoFlag,
      promo_expiry: null,
      is_online: true,
    };
  }

  async getStoreInventory(page: Page, productUrl: string, _storeId: string): Promise<RawInventory> {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.randomDelay();

    if (await this.detectCaptcha(page)) {
      throw new ScrapingFailedError('CAPTCHA detected', 'CAPTCHA', 'lowes', productUrl);
    }

    const statusText = await page.$eval(S.inventoryStatus, (el) => el.textContent?.trim() ?? '').catch(() => '');
    const quantityText = await page.$eval(S.inventoryQuantity, (el) => el.textContent?.trim() ?? '').catch(() => null);
    const aisleText = await page.$eval(S.inventoryAisle, (el) => el.textContent?.trim() ?? '').catch(() => null);
    const priceText = await page.$eval(S.productPrice, (el) => el.textContent?.trim() ?? '').catch(() => null);

    const inStock = statusText.toLowerCase().includes('in stock') || statusText.toLowerCase().includes('available');
    const quantity = quantityText ? parseInt(quantityText.replace(/\D/g, ''), 10) : null;

    return {
      in_stock: inStock,
      quantity: isNaN(quantity ?? NaN) ? null : quantity,
      unit_price_cents: this.parsePriceToCents(priceText) ?? 0,
      aisle_location: aisleText,
    };
  }

  async getCategories(page: Page): Promise<RawCategory[]> {
    await page.goto('https://www.lowes.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.randomDelay();

    const categories: RawCategory[] = [];
    const links = await page.$$(S.categoryLink);

    for (const link of links) {
      try {
        const name = await link.textContent() ?? '';
        const href = await link.getAttribute('href') ?? '';
        const url = href.startsWith('http') ? href : `https://www.lowes.com${href}`;
        const idMatch = href.match(/\/c\/[^/]+\/([^/?]+)/);
        const id = idMatch?.[1] ?? href;

        if (name.trim()) {
          categories.push({
            id,
            name: name.trim(),
            parent_id: null,
            url,
          });
        }
      } catch {
        // skip
      }
    }

    return categories;
  }
}
