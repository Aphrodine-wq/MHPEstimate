import pino from 'pino';

const logger = pino({ name: 'memory-cache' });

interface CacheEntry {
  data: string;
  expiresAt: number;
}

export class MemoryCacheManager {
  private store = new Map<string, CacheEntry>();

  constructor(private defaultTtl: number) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this.store.get(key);
      if (!entry) return null;

      if (Date.now() > entry.expiresAt) {
        this.store.delete(key);
        return null;
      }

      return JSON.parse(entry.data) as T;
    } catch (err) {
      logger.warn({ err, key }, 'Cache get failed');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      const ttlSeconds = ttl ?? this.defaultTtl;
      this.store.set(key, {
        data: serialized,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    } catch (err) {
      logger.warn({ err, key }, 'Cache set failed');
    }
  }

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<{ data: T; cached: boolean }> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return { data: cached, cached: true };
    }

    const data = await fetcher();
    await this.set(key, data, ttl);
    return { data, cached: false };
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      // Convert Redis-style glob pattern to a simple matcher
      // Supports * as wildcard (most common usage)
      const regex = new RegExp(
        '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
      );

      for (const key of this.store.keys()) {
        if (regex.test(key)) {
          this.store.delete(key);
        }
      }
    } catch (err) {
      logger.warn({ err, pattern }, 'Cache invalidate failed');
    }
  }
}
