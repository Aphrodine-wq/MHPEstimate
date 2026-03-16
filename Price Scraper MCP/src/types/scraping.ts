import type { Retailer, RawProduct } from './product.js';

export type ScrapingErrorType = 'TRANSIENT' | 'CAPTCHA' | 'BLOCKED' | 'NOT_FOUND' | 'STRUCTURAL' | 'PERMANENT';

export interface ScrapeResult<T> {
  success: boolean;
  data: T | null;
  error: ScrapingError | null;
  duration_ms: number;
  cached: boolean;
}

export interface ScrapingError {
  type: ScrapingErrorType;
  message: string;
  retailer: Retailer;
  url?: string;
  retryable: boolean;
}

export interface SearchOptions {
  query: string;
  category?: string;
  limit: number;
  page?: number;
}

export interface RawInventory {
  in_stock: boolean;
  quantity: number | null;
  unit_price_cents: number;
  aisle_location: string | null;
}

export interface RawCategory {
  id: string;
  name: string;
  parent_id: string | null;
  url: string;
}
