import type { Page } from 'playwright';
import { BaseAdapter } from './base-adapter.js';
import { HomeDepotSelectors as S } from './home-depot-selectors.js';
import type { RawProduct } from '../../types/product.js';
import type { RawInventory, RawCategory, SearchOptions } from '../../types/scraping.js';
import { ScrapingFailedError } from '../../types/errors.js';

/**
 * Home Depot adapter that uses a hybrid approach:
 * 1. Establish a browser session on the homepage (bypasses PerimeterX)
 * 2. Call HD's internal GraphQL API via page.evaluate(fetch(...))
 * 3. Fall back to DOM scraping if the API approach fails
 */
export class HomeDepotAdapter extends BaseAdapter {
  private static readonly GRAPHQL_ENDPOINT = '/federation-gateway/graphql?opname=searchModel';
  private static readonly HOMEPAGE = 'https://www.homedepot.com';

  constructor() {
    super('home_depot');
  }

  /**
   * Ensure the page has a valid HD session by loading the homepage.
   * The homepage consistently loads even with bot detection active.
   */
  private async ensureSession(page: Page): Promise<void> {
    const currentUrl = page.url();
    if (currentUrl.includes('homedepot.com') && !currentUrl.includes('Error')) {
      return; // Already have a session
    }

    this.logger.debug('Establishing Home Depot session...');
    await page.goto(HomeDepotAdapter.HOMEPAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.randomDelay(2000, 4000);

    const title = await page.title();
    if (title.includes('Error')) {
      throw new ScrapingFailedError('Failed to establish HD session', 'BLOCKED', 'home_depot', HomeDepotAdapter.HOMEPAGE);
    }
  }

  async setZipCode(page: Page, zipCode: string): Promise<void> {
    // ZIP is passed via the GraphQL API deliveryZip param, no UI interaction needed.
    // Store the zipCode on the page for later use.
    await page.evaluate((zip) => {
      (globalThis as any).__hdZipCode = zip;
    }, zipCode);
    this.logger.debug({ zipCode }, 'ZIP code stored for API calls');
  }

  async searchProducts(page: Page, options: SearchOptions): Promise<RawProduct[]> {
    await this.ensureSession(page);

    // Primary: Use GraphQL API from browser context
    const apiProducts = await this.searchViaApi(page, options);
    if (apiProducts.length > 0) {
      return apiProducts;
    }

    // Fallback: Try DOM scraping (may hit bot detection)
    this.logger.info('API search returned empty, falling back to DOM scraping');
    return this.searchViaDom(page, options);
  }

  private async searchViaApi(page: Page, options: SearchOptions): Promise<RawProduct[]> {
    const zipCode = await page.evaluate(() => (globalThis as any).__hdZipCode ?? null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await page.evaluate(async (params) => {
      const { query, category, limit, zipCode: zip } = params;
      try {
        const resp = await fetch('/federation-gateway/graphql?opname=searchModel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-experience-name': 'general-merchandise',
            'x-hd-dc': 'origin',
          },
          credentials: 'include',
          body: JSON.stringify({
            operationName: 'searchModel',
            variables: {
              keyword: query,
              navParam: category ?? null,
              storefilter: 'ALL',
              itemIds: [],
              channel: 'DESKTOP',
              additionalSearchParams: {
                ...(zip ? { deliveryZip: zip } : {}),
              },
              pageSize: limit,
              startIndex: 0,
            },
            query: `query searchModel($keyword: String, $navParam: String, $storefilter: StoreFilter, $channel: Channel, $pageSize: Int, $startIndex: Int, $additionalSearchParams: AdditionalParams, $itemIds: [String]) {
              searchModel(keyword: $keyword, navParam: $navParam, storefilter: $storefilter, itemIds: $itemIds, channel: $channel, additionalSearchParams: $additionalSearchParams) {
                id
                searchReport { totalProducts keyword correctedKeyword }
                products(pageSize: $pageSize, startIndex: $startIndex) {
                  itemId
                  identifiers {
                    productLabel
                    canonicalUrl
                    storeSkuNumber
                    brandName
                    modelNumber
                  }
                  pricing {
                    value
                    original
                    mapAboveOriginalPrice
                    message
                    promotion { dollarOff percentageOff savingsCenter }
                  }
                  media { images { url sizes } }
                  availabilityType { type buyable }
                }
              }
            }`,
          }),
        });

        if (!resp.ok) return { error: `HTTP ${resp.status}` };
        return await resp.json();
      } catch (e: any) {
        return { error: e.message };
      }
    }, { query: options.query, category: options.category, limit: options.limit, zipCode });

    if (result?.error) {
      this.logger.warn({ error: result.error }, 'GraphQL search failed');
      return [];
    }

    const apiProducts = result?.data?.searchModel?.products ?? [];
    const total = result?.data?.searchModel?.searchReport?.totalProducts ?? 0;
    this.logger.info({ total, returned: apiProducts.length }, 'GraphQL search results');

    return apiProducts.map((p: any) => {
      const imageUrl = p.media?.images?.[0]?.url ?? null;
      const canonicalUrl = p.identifiers?.canonicalUrl ?? '';
      const productUrl = canonicalUrl
        ? `https://www.homedepot.com${canonicalUrl}`
        : '';

      const promoFlag = !!(p.pricing?.promotion?.dollarOff || p.pricing?.promotion?.percentageOff);

      return {
        retailer: 'home_depot' as const,
        retailer_sku: p.identifiers?.storeSkuNumber ?? p.itemId ?? '',
        upc: null,
        name: p.identifiers?.productLabel ?? '',
        brand: p.identifiers?.brandName ?? null,
        category: options.category ?? null,
        image_url: imageUrl,
        product_url: productUrl,
        price_cents: p.pricing?.value != null ? Math.round(p.pricing.value * 100) : null,
        bulk_price_cents: null,
        promo_flag: promoFlag,
        promo_expiry: null,
        is_online: p.availabilityType?.buyable ?? true,
      };
    });
  }

  private async searchViaDom(page: Page, options: SearchOptions): Promise<RawProduct[]> {
    const url = `https://www.homedepot.com/s/${encodeURIComponent(options.query)}${options.category ? `?catId=${options.category}` : ''}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.randomDelay();

    if (await this.detectCaptcha(page)) {
      throw new ScrapingFailedError('CAPTCHA detected on search page', 'CAPTCHA', 'home_depot', url);
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
        const productUrl = href.startsWith('http') ? href : `https://www.homedepot.com${href}`;
        const skuMatch = productUrl.match(/\/(\d{9})\/?/);
        const sku = skuMatch?.[1] ?? '';

        if (!name || !sku) continue;

        products.push({
          retailer: 'home_depot',
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
    await this.ensureSession(page);

    // Extract item ID from URL
    const itemIdMatch = productUrl.match(/\/(\d{9})\/?/);
    const itemId = itemIdMatch?.[1];

    // Try API first if we have an item ID
    if (itemId) {
      const apiResult = await this.getProductViaApi(page, itemId);
      if (apiResult) return apiResult;
    }

    // Fallback to DOM scraping
    return this.getProductViaDom(page, productUrl);
  }

  private async getProductViaApi(page: Page, itemId: string): Promise<RawProduct | null> {
    const zipCode = await page.evaluate(() => (globalThis as any).__hdZipCode ?? null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await page.evaluate(async (params) => {
      const { itemId: id, zipCode: zip } = params;
      try {
        const resp = await fetch('/federation-gateway/graphql?opname=searchModel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-experience-name': 'general-merchandise',
            'x-hd-dc': 'origin',
          },
          credentials: 'include',
          body: JSON.stringify({
            operationName: 'searchModel',
            variables: {
              keyword: null,
              navParam: null,
              storefilter: 'ALL',
              itemIds: [id],
              channel: 'DESKTOP',
              additionalSearchParams: {
                ...(zip ? { deliveryZip: zip } : {}),
              },
              pageSize: 1,
              startIndex: 0,
            },
            query: `query searchModel($keyword: String, $navParam: String, $storefilter: StoreFilter, $channel: Channel, $pageSize: Int, $startIndex: Int, $additionalSearchParams: AdditionalParams, $itemIds: [String]) {
              searchModel(keyword: $keyword, navParam: $navParam, storefilter: $storefilter, itemIds: $itemIds, channel: $channel, additionalSearchParams: $additionalSearchParams) {
                products(pageSize: $pageSize, startIndex: $startIndex) {
                  itemId
                  identifiers { productLabel canonicalUrl storeSkuNumber brandName modelNumber }
                  pricing { value original promotion { dollarOff percentageOff } }
                  media { images { url } }
                  availabilityType { type buyable }
                }
              }
            }`,
          }),
        });

        if (!resp.ok) return null;
        return await resp.json();
      } catch {
        return null;
      }
    }, { itemId, zipCode });

    const product = result?.data?.searchModel?.products?.[0];
    if (!product) return null;

    return {
      retailer: 'home_depot',
      retailer_sku: product.identifiers?.storeSkuNumber ?? product.itemId ?? '',
      upc: null,
      name: product.identifiers?.productLabel ?? '',
      brand: product.identifiers?.brandName ?? null,
      category: null,
      image_url: product.media?.images?.[0]?.url ?? null,
      product_url: product.identifiers?.canonicalUrl
        ? `https://www.homedepot.com${product.identifiers.canonicalUrl}`
        : '',
      price_cents: product.pricing?.value != null ? Math.round(product.pricing.value * 100) : null,
      bulk_price_cents: null,
      promo_flag: !!(product.pricing?.promotion?.dollarOff || product.pricing?.promotion?.percentageOff),
      promo_expiry: null,
      is_online: product.availabilityType?.buyable ?? true,
    };
  }

  private async getProductViaDom(page: Page, productUrl: string): Promise<RawProduct> {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.randomDelay();

    if (await this.detectCaptcha(page)) {
      throw new ScrapingFailedError('CAPTCHA detected', 'CAPTCHA', 'home_depot', productUrl);
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
      sku = (jsonLd.sku as string) ?? '';
      brand = (jsonLd.brand as { name?: string })?.name ?? null;
      imageUrl = (jsonLd.image as string) ?? null;
      upc = (jsonLd.gtin13 as string) ?? (jsonLd.gtin12 as string) ?? null;
      const offers = jsonLd.offers as { price?: string | number } | undefined;
      if (offers?.price) {
        priceCents = Math.round(Number(offers.price) * 100);
      }
    }

    if (!name) name = await page.$eval(S.productName, (el) => el.textContent?.trim() ?? '').catch(() => '');
    if (!priceCents) {
      const priceText = await page.$eval(S.productPrice, (el) => el.textContent?.trim()).catch(() => null);
      priceCents = this.parsePriceToCents(priceText);
    }
    if (!brand) brand = await page.$eval(S.productBrand, (el) => el.textContent?.trim() ?? '').catch(() => null);
    if (!imageUrl) imageUrl = await page.$eval(S.productImage, (el) => el.getAttribute('src')).catch(() => null);
    if (!sku) {
      const skuMatch = productUrl.match(/\/(\d{9})\/?/);
      sku = skuMatch?.[1] ?? '';
    }

    const bulkPriceText = await page.$eval(S.productBulkPrice, (el) => el.textContent?.trim()).catch(() => null);
    const promoFlag = await page.$(S.promoFlag).then((el) => el !== null).catch(() => false);

    if (!name || !sku) {
      throw new ScrapingFailedError('Failed to extract product details', 'STRUCTURAL', 'home_depot', productUrl);
    }

    return {
      retailer: 'home_depot',
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
      throw new ScrapingFailedError('CAPTCHA detected', 'CAPTCHA', 'home_depot', productUrl);
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
    await this.ensureSession(page);

    const categories: RawCategory[] = [];
    const links = await page.$$(S.categoryLink);

    for (const link of links) {
      try {
        const name = await link.textContent() ?? '';
        const href = await link.getAttribute('href') ?? '';
        const url = href.startsWith('http') ? href : `https://www.homedepot.com${href}`;
        const idMatch = href.match(/\/b\/[^/]+\/N-([a-zA-Z0-9]+)/);
        const id = idMatch?.[1] ?? href;

        if (name.trim()) {
          categories.push({ id, name: name.trim(), parent_id: null, url });
        }
      } catch {
        // skip
      }
    }

    return categories;
  }
}
