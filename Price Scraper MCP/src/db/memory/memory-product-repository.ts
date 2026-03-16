import { randomUUID } from 'node:crypto';
import type { Product, RawProduct, Retailer } from '../../types/product.js';

export class MemoryProductRepository {
  private products = new Map<string, Product>();

  async search(query: string, retailer?: Retailer, category?: string, limit = 20): Promise<Product[]> {
    const lowerQuery = query.toLowerCase();
    const results: Product[] = [];

    for (const product of this.products.values()) {
      if (retailer && product.retailer !== retailer) continue;
      if (category && product.category !== category) continue;
      if (!product.name.toLowerCase().includes(lowerQuery)) continue;
      results.push(product);
      if (results.length >= limit) break;
    }

    return results;
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null;
  }

  async findByRetailerSku(retailer: Retailer, sku: string): Promise<Product | null> {
    for (const product of this.products.values()) {
      if (product.retailer === retailer && product.retailer_sku === sku) {
        return product;
      }
    }
    return null;
  }

  async findByUpc(upc: string): Promise<Product[]> {
    const results: Product[] = [];
    for (const product of this.products.values()) {
      if (product.upc === upc) {
        results.push(product);
      }
    }
    return results;
  }

  async upsert(raw: RawProduct): Promise<Product> {
    // Check for existing by retailer + sku (same as ON CONFLICT key)
    for (const [id, existing] of this.products) {
      if (existing.retailer === raw.retailer && existing.retailer_sku === raw.retailer_sku) {
        const updated: Product = {
          ...existing,
          upc: raw.upc ?? existing.upc,
          name: raw.name,
          brand: raw.brand,
          category: raw.category,
          image_url: raw.image_url,
          product_url: raw.product_url,
          updated_at: new Date(),
        };
        this.products.set(id, updated);
        return updated;
      }
    }

    // Insert new
    const now = new Date();
    const product: Product = {
      id: randomUUID(),
      retailer: raw.retailer,
      retailer_sku: raw.retailer_sku,
      upc: raw.upc,
      name: raw.name,
      brand: raw.brand,
      category: raw.category,
      image_url: raw.image_url,
      product_url: raw.product_url,
      created_at: now,
      updated_at: now,
    };
    this.products.set(product.id, product);
    return product;
  }
}
