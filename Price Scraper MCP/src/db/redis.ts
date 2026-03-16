import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({ name: 'redis' });

let client: Redis.default | null = null;

export function getRedis(redisUrl: string): Redis.default {
  if (!client) {
    client = new Redis.default(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
    });
    client.on('error', (err: Error) => {
      logger.error({ err }, 'Redis error');
    });
    client.on('connect', () => {
      logger.info('Redis connected');
    });
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
