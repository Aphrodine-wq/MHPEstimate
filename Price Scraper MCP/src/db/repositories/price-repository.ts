import type pg from 'pg';
import type { PriceRecord, PriceHistoryEntry } from '../../types/price.js';

export class PriceRepository {
  constructor(private pool: pg.Pool) {}

  async insert(record: PriceRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO prices (product_id, store_id, zip_code, unit_price_cents, bulk_price_cents, promo_flag, promo_expiry, is_online, scraped_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        record.product_id,
        record.store_id,
        record.zip_code,
        record.unit_price_cents,
        record.bulk_price_cents,
        record.promo_flag,
        record.promo_expiry,
        record.is_online,
        record.scraped_at,
      ],
    );
  }

  async getLatest(productId: string, zipCode: string): Promise<PriceRecord | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM prices
       WHERE product_id = $1 AND zip_code = $2
       ORDER BY scraped_at DESC
       LIMIT 1`,
      [productId, zipCode],
    );
    return rows[0] ?? null;
  }

  async getHistory(productId: string, zipCode: string, days: number): Promise<PriceHistoryEntry[]> {
    const { rows } = await this.pool.query(
      `SELECT unit_price_cents, bulk_price_cents, promo_flag, scraped_at
       FROM prices
       WHERE product_id = $1 AND zip_code = $2 AND scraped_at >= NOW() - $3::interval
       ORDER BY scraped_at ASC`,
      [productId, zipCode, `${days} days`],
    );
    return rows;
  }

  async getRegionalPrices(productId: string, zipCodes: string[]): Promise<Record<string, number>> {
    const { rows } = await this.pool.query(
      `SELECT DISTINCT ON (zip_code) zip_code, unit_price_cents
       FROM prices
       WHERE product_id = $1 AND zip_code = ANY($2)
       ORDER BY zip_code, scraped_at DESC`,
      [productId, zipCodes],
    );
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.zip_code] = row.unit_price_cents;
    }
    return result;
  }
}
