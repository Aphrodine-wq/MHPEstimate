import type { ScrapingErrorType } from './scraping.js';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ScrapingFailedError extends AppError {
  constructor(
    message: string,
    public readonly errorType: ScrapingErrorType,
    public readonly retailer: string,
    public readonly url?: string,
  ) {
    super(message, 'SCRAPING_FAILED', 502);
    this.name = 'ScrapingFailedError';
  }

  get retryable(): boolean {
    return this.errorType === 'TRANSIENT';
  }
}

export class CacheError extends AppError {
  constructor(message: string) {
    super(message, 'CACHE_ERROR', 500);
    this.name = 'CacheError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class CircuitOpenError extends AppError {
  constructor(retailer: string) {
    super(`Circuit breaker open for ${retailer}`, 'CIRCUIT_OPEN', 503);
    this.name = 'CircuitOpenError';
  }
}

export class RateLimitError extends AppError {
  constructor(retailer: string) {
    super(`Rate limit exceeded for ${retailer}`, 'RATE_LIMITED', 429);
    this.name = 'RateLimitError';
  }
}
