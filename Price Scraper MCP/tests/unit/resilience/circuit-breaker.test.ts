import { describe, it, expect, beforeEach } from 'vitest';
import { CircuitBreaker } from '../../../src/resilience/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker('test', 3, 100, 2); // 3 failures, 100ms reset, 2 half-open attempts
  });

  it('should start in CLOSED state', () => {
    expect(cb.currentState).toBe('CLOSED');
  });

  it('should execute successfully in CLOSED state', async () => {
    const result = await cb.execute(() => Promise.resolve(42));
    expect(result).toBe(42);
    expect(cb.currentState).toBe('CLOSED');
  });

  it('should open after threshold failures', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    expect(cb.currentState).toBe('OPEN');
  });

  it('should reject calls when OPEN', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }

    await expect(cb.execute(() => Promise.resolve(42))).rejects.toThrow('Circuit breaker test is OPEN');
  });

  it('should transition to HALF_OPEN after reset timeout', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    expect(cb.currentState).toBe('OPEN');

    // Wait for reset timeout
    await new Promise((r) => setTimeout(r, 150));
    expect(cb.currentState).toBe('HALF_OPEN');
  });

  it('should close after successful half-open attempts', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }

    await new Promise((r) => setTimeout(r, 150));
    expect(cb.currentState).toBe('HALF_OPEN');

    await cb.execute(() => Promise.resolve('ok'));
    await cb.execute(() => Promise.resolve('ok'));
    expect(cb.currentState).toBe('CLOSED');
  });

  it('should re-open on failure during HALF_OPEN', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }

    await new Promise((r) => setTimeout(r, 150));
    expect(cb.currentState).toBe('HALF_OPEN');

    await cb.execute(() => Promise.reject(new Error('fail again'))).catch(() => {});
    expect(cb.currentState).toBe('OPEN');
  });

  it('should reset state', async () => {
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error('fail'))).catch(() => {});
    }
    expect(cb.currentState).toBe('OPEN');

    cb.reset();
    expect(cb.currentState).toBe('CLOSED');
  });
});
