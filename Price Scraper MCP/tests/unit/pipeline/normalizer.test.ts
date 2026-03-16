import { describe, it, expect } from 'vitest';
import { normalizeProduct, normalizePriceRecord } from '../../../src/pipeline/normalizer.js';
import type { RawProduct } from '../../../src/types/product.js';

describe('normalizeProduct', () => {
  const baseRaw: RawProduct = {
    retailer: 'home_depot',
    retailer_sku: ' ABC123 ',
    upc: ' 012345678901 ',
    name: '2x4x8  Kiln-Dried  Whitewood &amp; Lumber',
    brand: ' Generic Brand ',
    category: ' Lumber ',
    image_url: ' https://example.com/image.jpg ',
    product_url: ' https://www.homedepot.com/p/123456789 ',
    price_cents: 398,
    bulk_price_cents: null,
    promo_flag: false,
    promo_expiry: null,
    is_online: true,
  };

  it('should trim all string fields', () => {
    const result = normalizeProduct(baseRaw);
    expect(result.retailer_sku).toBe('ABC123');
    expect(result.upc).toBe('012345678901');
    expect(result.brand).toBe('Generic Brand');
    expect(result.category).toBe('Lumber');
    expect(result.image_url).toBe('https://example.com/image.jpg');
    expect(result.product_url).toBe('https://www.homedepot.com/p/123456789');
  });

  it('should clean HTML entities from name', () => {
    const result = normalizeProduct(baseRaw);
    expect(result.name).toBe('2x4x8 Kiln-Dried Whitewood & Lumber');
  });

  it('should handle null UPC', () => {
    const raw = { ...baseRaw, upc: null };
    const result = normalizeProduct(raw);
    expect(result.upc).toBeNull();
  });

  it('should preserve retailer', () => {
    const result = normalizeProduct(baseRaw);
    expect(result.retailer).toBe('home_depot');
  });
});

describe('normalizePriceRecord', () => {
  const baseRaw: RawProduct = {
    retailer: 'lowes',
    retailer_sku: '456789',
    upc: null,
    name: 'Test Product',
    brand: null,
    category: null,
    image_url: null,
    product_url: 'https://www.lowes.com/pd/test/456789',
    price_cents: 1299,
    bulk_price_cents: 1099,
    promo_flag: true,
    promo_expiry: new Date('2026-04-01'),
    is_online: false,
  };

  it('should create a proper price record', () => {
    const result = normalizePriceRecord(baseRaw, 'prod-123', 'store-456', '10001');
    expect(result.product_id).toBe('prod-123');
    expect(result.store_id).toBe('store-456');
    expect(result.zip_code).toBe('10001');
    expect(result.unit_price_cents).toBe(1299);
    expect(result.bulk_price_cents).toBe(1099);
    expect(result.promo_flag).toBe(true);
    expect(result.is_online).toBe(false);
    expect(result.scraped_at).toBeInstanceOf(Date);
  });

  it('should default price to 0 when null', () => {
    const raw = { ...baseRaw, price_cents: null };
    const result = normalizePriceRecord(raw, 'prod-123', null, '90001');
    expect(result.unit_price_cents).toBe(0);
    expect(result.store_id).toBeNull();
  });
});
