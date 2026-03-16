import type pg from 'pg';
import type { Store } from '../../types/store.js';
import type { Retailer } from '../../types/product.js';

export class StoreRepository {
  constructor(private pool: pg.Pool) {}

  async findById(id: string): Promise<Store | null> {
    const { rows } = await this.pool.query('SELECT * FROM stores WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async findByZip(zipCode: string, retailer?: Retailer): Promise<Store[]> {
    if (retailer) {
      const { rows } = await this.pool.query(
        'SELECT * FROM stores WHERE zip_code = $1 AND retailer = $2',
        [zipCode, retailer],
      );
      return rows;
    }
    const { rows } = await this.pool.query(
      'SELECT * FROM stores WHERE zip_code = $1',
      [zipCode],
    );
    return rows;
  }

  async upsert(store: Omit<Store, 'id'>): Promise<Store> {
    const { rows } = await this.pool.query(
      `INSERT INTO stores (retailer, store_number, name, address, zip_code, lat, lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (retailer, store_number) DO UPDATE SET
         name = EXCLUDED.name,
         address = EXCLUDED.address,
         zip_code = EXCLUDED.zip_code,
         lat = EXCLUDED.lat,
         lng = EXCLUDED.lng
       RETURNING *`,
      [store.retailer, store.store_number, store.name, store.address, store.zip_code, store.lat, store.lng],
    );
    return rows[0]!;
  }
}
