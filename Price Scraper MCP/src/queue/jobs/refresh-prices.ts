import type { Job } from 'bullmq';
import type { QueueManager } from '../queue-manager.js';
import pino from 'pino';
import pg from 'pg';

const logger = pino({ name: 'job:refresh-prices' });

export interface RefreshPricesJobData {
  batchSize?: number;
}

export function createRefreshPricesProcessor(
  pool: pg.Pool,
  queueManager: QueueManager,
) {
  return async (job: Job<RefreshPricesJobData>) => {
    const batchSize = job.data.batchSize ?? 50;
    logger.info({ batchSize }, 'Refreshing stale prices');

    // Find products with prices older than 6 hours
    const { rows } = await pool.query(`
      SELECT DISTINCT p.id, p.retailer, p.product_url, pr.zip_code
      FROM products p
      JOIN LATERAL (
        SELECT zip_code, scraped_at
        FROM prices
        WHERE product_id = p.id
        ORDER BY scraped_at DESC
        LIMIT 1
      ) pr ON true
      WHERE pr.scraped_at < NOW() - INTERVAL '6 hours'
      LIMIT $1
    `, [batchSize]);

    for (const row of rows) {
      await queueManager.addJob('scrape-product', {
        retailer: row.retailer,
        productUrl: row.product_url,
        zipCode: row.zip_code,
      });
    }

    logger.info({ count: rows.length }, 'Queued stale products for refresh');
    return { queued: rows.length };
  };
}
