import type pg from 'pg';
import type { Product, RawProduct, Retailer } from '../../types/product.js';

export class ProductRepository {
  constructor(private pool: pg.Pool) {}

  async search(query: string, retailer?: Retailer, category?: string, limit = 20): Promise<Product[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Fuzzy text search using pg_trgm
    conditions.push(`similarity(name, $${paramIndex}) > 0.1`);
    params.push(query);
    paramIndex++;

    if (retailer) {
      conditions.push(`retailer = $${paramIndex}`);
      params.push(retailer);
      paramIndex++;
    }

    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    params.push(limit);

    const sql = `
      SELECT *, similarity(name, $1) AS rank
      FROM products
      WHERE ${conditions.join(' AND ')}
      ORDER BY rank DESC
      LIMIT $${paramIndex}
    `;

    const { rows } = await this.pool.query(sql, params);
    return rows;
  }

  async findById(id: string): Promise<Product | null> {
    const { rows } = await this.pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async findByRetailerSku(retailer: Retailer, sku: string): Promise<Product | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM products WHERE retailer = $1 AND retailer_sku = $2',
      [retailer, sku],
    );
    return rows[0] ?? null;
  }

  async findByUpc(upc: string): Promise<Product[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM products WHERE upc = $1',
      [upc],
    );
    return rows;
  }

  async upsert(raw: RawProduct): Promise<Product> {
    const { rows } = await this.pool.query(
      `INSERT INTO products (retailer, retailer_sku, upc, name, brand, category, image_url, product_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (retailer, retailer_sku) DO UPDATE SET
         upc = COALESCE(EXCLUDED.upc, products.upc),
         name = EXCLUDED.name,
         brand = EXCLUDED.brand,
         category = EXCLUDED.category,
         image_url = EXCLUDED.image_url,
         product_url = EXCLUDED.product_url,
         updated_at = NOW()
       RETURNING *`,
      [raw.retailer, raw.retailer_sku, raw.upc, raw.name, raw.brand, raw.category, raw.image_url, raw.product_url],
    );
    return rows[0]!;
  }
}
