import type { PriceRecord, PriceHistoryEntry } from '../../types/price.js';

export class MemoryPriceRepository {
  private prices: PriceRecord[] = [];

  async insert(record: PriceRecord): Promise<void> {
    this.prices.push({ ...record });
  }

  async getLatest(productId: string, zipCode: string): Promise<PriceRecord | null> {
    let latest: PriceRecord | null = null;
    let latestTime = -Infinity;

    for (const p of this.prices) {
      if (p.product_id === productId && p.zip_code === zipCode) {
        const t = p.scraped_at.getTime();
        if (t > latestTime) {
          latestTime = t;
          latest = p;
        }
      }
    }

    return latest;
  }

  async getHistory(productId: string, zipCode: string, days: number): Promise<PriceHistoryEntry[]> {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    return this.prices
      .filter(
        (p) =>
          p.product_id === productId &&
          p.zip_code === zipCode &&
          p.scraped_at >= cutoff,
      )
      .sort((a, b) => a.scraped_at.getTime() - b.scraped_at.getTime())
      .map((p) => ({
        unit_price_cents: p.unit_price_cents,
        bulk_price_cents: p.bulk_price_cents,
        promo_flag: p.promo_flag,
        scraped_at: p.scraped_at,
      }));
  }

  async getRegionalPrices(productId: string, zipCodes: string[]): Promise<Record<string, number>> {
    const zipSet = new Set(zipCodes);
    // For each zip, find the latest price
    const latestByZip = new Map<string, { price: number; time: number }>();

    for (const p of this.prices) {
      if (p.product_id !== productId || !zipSet.has(p.zip_code)) continue;

      const t = p.scraped_at.getTime();
      const current = latestByZip.get(p.zip_code);
      if (!current || t > current.time) {
        latestByZip.set(p.zip_code, { price: p.unit_price_cents, time: t });
      }
    }

    const result: Record<string, number> = {};
    for (const [zip, entry] of latestByZip) {
      result[zip] = entry.price;
    }
    return result;
  }
}
