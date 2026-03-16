import type { RawProduct } from '../types/product.js';
import type { PriceRecord } from '../types/price.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRawProduct(product: RawProduct): ValidationResult {
  const errors: string[] = [];

  if (!product.name || product.name.trim().length === 0) {
    errors.push('Product name is required');
  }

  if (!product.retailer_sku || product.retailer_sku.trim().length === 0) {
    errors.push('Retailer SKU is required');
  }

  if (!product.product_url || product.product_url.trim().length === 0) {
    errors.push('Product URL is required');
  }

  if (product.price_cents !== null && product.price_cents !== undefined) {
    if (product.price_cents < 0) {
      errors.push('Price cannot be negative');
    }
    if (product.price_cents > 10_000_000) { // $100,000
      errors.push('Price exceeds maximum threshold ($100,000)');
    }
  }

  if (product.bulk_price_cents !== null && product.bulk_price_cents !== undefined) {
    if (product.bulk_price_cents < 0) {
      errors.push('Bulk price cannot be negative');
    }
  }

  if (product.promo_expiry && product.promo_expiry < new Date()) {
    errors.push('Promo expiry is in the past');
  }

  return { valid: errors.length === 0, errors };
}

export function validatePriceRecord(record: PriceRecord): ValidationResult {
  const errors: string[] = [];

  if (!record.product_id) {
    errors.push('Product ID is required');
  }

  if (!record.zip_code || !/^\d{5}$/.test(record.zip_code)) {
    errors.push('Valid 5-digit ZIP code is required');
  }

  if (record.unit_price_cents < 0) {
    errors.push('Unit price cannot be negative');
  }

  if (record.unit_price_cents > 10_000_000) {
    errors.push('Unit price exceeds maximum threshold');
  }

  if (record.bulk_price_cents !== null && record.bulk_price_cents !== undefined) {
    if (record.bulk_price_cents < 0) {
      errors.push('Bulk price cannot be negative');
    }
    if (record.bulk_price_cents >= record.unit_price_cents) {
      errors.push('Bulk price should be less than unit price');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateZipCode(zipCode: string): boolean {
  return /^\d{5}$/.test(zipCode);
}
