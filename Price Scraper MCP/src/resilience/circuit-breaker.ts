import pino from 'pino';

const logger = pino({ name: 'circuit-breaker' });

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;

  constructor(
    private readonly name: string,
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 60000,
    private readonly halfOpenMaxAttempts: number = 2,
  ) {}

  get currentState(): CircuitState {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info({ name: this.name }, 'Circuit breaker transitioning to HALF_OPEN');
      }
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.currentState;

    if (state === 'OPEN') {
      throw new Error(`Circuit breaker ${this.name} is OPEN`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMaxAttempts) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        logger.info({ name: this.name }, 'Circuit breaker CLOSED after successful half-open attempts');
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      logger.warn({ name: this.name }, 'Circuit breaker re-OPENED from HALF_OPEN');
    } else if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      logger.warn({ name: this.name, failureCount: this.failureCount }, 'Circuit breaker OPENED');
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
  }
}
