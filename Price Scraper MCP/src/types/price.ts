export interface PriceRecord {
  id?: string;
  product_id: string;
  store_id: string | null;
  zip_code: string;
  unit_price_cents: number;
  bulk_price_cents: number | null;
  promo_flag: boolean;
  promo_expiry: Date | null;
  is_online: boolean;
  scraped_at: Date;
}

export interface PriceHistoryEntry {
  unit_price_cents: number;
  bulk_price_cents: number | null;
  promo_flag: boolean;
  scraped_at: Date;
}

export interface PriceComparison {
  product_name: string;
  upc: string | null;
  home_depot: PriceComparisonEntry | null;
  lowes: PriceComparisonEntry | null;
  savings_cents: number;
  cheaper_at: 'home_depot' | 'lowes' | 'same';
}

export interface PriceComparisonEntry {
  product_id: string;
  retailer_sku: string;
  name: string;
  unit_price_cents: number;
  bulk_price_cents: number | null;
  promo_flag: boolean;
  product_url: string;
}

export interface RegionalPriceStats {
  min_cents: number;
  max_cents: number;
  mean_cents: number;
  median_cents: number;
  prices_by_zip: Record<string, number>;
}
