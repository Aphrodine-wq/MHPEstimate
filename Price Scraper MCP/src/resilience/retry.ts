import pino from 'pino';
import type { ScrapingErrorType } from '../types/scraping.js';

const logger = pino({ name: 'retry' });

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  multiplier: number;
  maxDelayMs: number;
  retryableErrors: ScrapingErrorType[];
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 2000,
  multiplier: 2,
  maxDelayMs: 30000,
  retryableErrors: ['TRANSIENT'],
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === opts.maxRetries) break;

      // Check if error is retryable
      const errorType = (err as { errorType?: ScrapingErrorType }).errorType;
      if (errorType && !opts.retryableErrors.includes(errorType)) {
        logger.debug({ attempt, errorType }, 'Non-retryable error, giving up');
        break;
      }

      const delay = Math.min(
        opts.baseDelayMs * Math.pow(opts.multiplier, attempt),
        opts.maxDelayMs,
      );
      // Add jitter: 0-50% of delay
      const jitter = Math.random() * delay * 0.5;
      const totalDelay = delay + jitter;

      logger.debug({ attempt: attempt + 1, delay: totalDelay }, 'Retrying after delay');
      await sleep(totalDelay);
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
