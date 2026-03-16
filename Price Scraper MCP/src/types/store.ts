import type { Retailer } from './product.js';

export interface Store {
  id: string;
  retailer: Retailer;
  store_number: string;
  name: string;
  address: string;
  zip_code: string;
  lat: number | null;
  lng: number | null;
}

export interface StoreInventory {
  store: Store;
  product_id: string;
  in_stock: boolean;
  quantity: number | null;
  unit_price_cents: number;
  aisle_location: string | null;
}
