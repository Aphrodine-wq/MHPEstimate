import type RedisNs from 'ioredis';
import pino from 'pino';

const logger = pino({ name: 'cache' });

export class CacheManager {
  constructor(
    private redis: RedisNs.default,
    private defaultTtl: number,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      logger.warn({ err, key }, 'Cache get failed');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttl ?? this.defaultTtl, serialized);
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
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (err) {
      logger.warn({ err, pattern }, 'Cache invalidate failed');
    }
  }
}
