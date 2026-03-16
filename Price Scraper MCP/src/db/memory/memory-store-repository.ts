import { randomUUID } from 'node:crypto';
import type { Store } from '../../types/store.js';
import type { Retailer } from '../../types/product.js';

export class MemoryStoreRepository {
  private stores = new Map<string, Store>();

  async findById(id: string): Promise<Store | null> {
    return this.stores.get(id) ?? null;
  }

  async findByZip(zipCode: string, retailer?: Retailer): Promise<Store[]> {
    const results: Store[] = [];
    for (const store of this.stores.values()) {
      if (store.zip_code !== zipCode) continue;
      if (retailer && store.retailer !== retailer) continue;
      results.push(store);
    }
    return results;
  }

  async upsert(store: Omit<Store, 'id'>): Promise<Store> {
    // Check for existing by retailer + store_number (same as ON CONFLICT key)
    for (const [id, existing] of this.stores) {
      if (existing.retailer === store.retailer && existing.store_number === store.store_number) {
        const updated: Store = {
          ...existing,
          name: store.name,
          address: store.address,
          zip_code: store.zip_code,
          lat: store.lat,
          lng: store.lng,
        };
        this.stores.set(id, updated);
        return updated;
      }
    }

    // Insert new
    const newStore: Store = {
      id: randomUUID(),
      ...store,
    };
    this.stores.set(newStore.id, newStore);
    return newStore;
  }
}
