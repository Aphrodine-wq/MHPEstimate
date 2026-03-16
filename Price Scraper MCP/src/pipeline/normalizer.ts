import type { RawProduct, Product, Retailer } from '../types/product.js';
import type { PriceRecord } from '../types/price.js';

export function normalizeProduct(raw: RawProduct): Omit<Product, 'id' | 'created_at' | 'updated_at'> {
  return {
    retailer: raw.retailer,
    retailer_sku: raw.retailer_sku.trim(),
    upc: raw.upc?.trim() ?? null,
    name: cleanHtmlEntities(raw.name.trim()),
    brand: raw.brand?.trim() ?? null,
    category: raw.category?.trim() ?? null,
    image_url: raw.image_url?.trim() ?? null,
    product_url: raw.product_url.trim(),
  };
}

export function normalizePriceRecord(
  raw: RawProduct,
  productId: string,
  storeId: string | null,
  zipCode: string,
): PriceRecord {
  return {
    product_id: productId,
    store_id: storeId,
    zip_code: zipCode,
    unit_price_cents: raw.price_cents ?? 0,
    bulk_price_cents: raw.bulk_price_cents ?? null,
    promo_flag: raw.promo_flag,
    promo_expiry: raw.promo_expiry,
    is_online: raw.is_online,
    scraped_at: new Date(),
  };
}

function cleanHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
