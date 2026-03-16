import pino from 'pino';

const logger = pino({ name: 'rate-limiter' });

export interface RateLimiterConfig {
  minIntervalMs: number;
  maxJitterMs: number;
}

export const RETAILER_RATE_LIMITS: Record<string, RateLimiterConfig> = {
  home_depot: { minIntervalMs: 3000, maxJitterMs: 2000 },
  lowes: { minIntervalMs: 2000, maxJitterMs: 1500 },
};

export class RateLimiter {
  private lastRequestTime = 0;
  private queue: Array<{ resolve: () => void }> = [];
  private processing = false;

  constructor(private config: RateLimiterConfig) {}

  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.queue.push({ resolve });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      const jitter = Math.random() * this.config.maxJitterMs;
      const requiredWait = this.config.minIntervalMs + jitter;

      if (elapsed < requiredWait) {
        const waitTime = requiredWait - elapsed;
        logger.debug({ waitTime }, 'Rate limiter waiting');
        await new Promise((r) => setTimeout(r, waitTime));
      }

      this.lastRequestTime = Date.now();
      const item = this.queue.shift();
      item?.resolve();
    }

    this.processing = false;
  }
}
