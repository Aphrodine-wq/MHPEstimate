export type Retailer = 'home_depot' | 'lowes';

export interface Product {
  id: string;
  retailer: Retailer;
  retailer_sku: string;
  upc: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  product_url: string;
  created_at: Date;
  updated_at: Date;
}

export interface ProductSummary {
  id: string;
  retailer: Retailer;
  name: string;
  brand: string | null;
  price_cents: number;
  image_url: string | null;
  product_url: string;
}

export interface RawProduct {
  retailer: Retailer;
  retailer_sku: string;
  upc: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  image_url: string | null;
  product_url: string;
  price_cents: number | null;
  bulk_price_cents: number | null;
  promo_flag: boolean;
  promo_expiry: Date | null;
  is_online: boolean;
}
