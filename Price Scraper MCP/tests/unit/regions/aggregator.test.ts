import { describe, it, expect } from 'vitest';
import { aggregateRegionalPrices } from '../../../src/regions/aggregator.js';

describe('aggregateRegionalPrices', () => {
  it('should compute correct stats for multiple prices', () => {
    const prices = {
      '10001': 1000,
      '90001': 1500,
      '60601': 1200,
      '75201': 800,
      '94102': 1800,
    };

    const result = aggregateRegionalPrices(prices);

    expect(result.min_cents).toBe(800);
    expect(result.max_cents).toBe(1800);
    expect(result.mean_cents).toBe(1260);
    expect(result.median_cents).toBe(1200);
    expect(result.prices_by_zip).toEqual(prices);
  });

  it('should handle single price', () => {
    const prices = { '10001': 999 };
    const result = aggregateRegionalPrices(prices);

    expect(result.min_cents).toBe(999);
    expect(result.max_cents).toBe(999);
    expect(result.mean_cents).toBe(999);
    expect(result.median_cents).toBe(999);
  });

  it('should handle two prices (even count median)', () => {
    const prices = { '10001': 1000, '90001': 2000 };
    const result = aggregateRegionalPrices(prices);

    expect(result.min_cents).toBe(1000);
    expect(result.max_cents).toBe(2000);
    expect(result.mean_cents).toBe(1500);
    expect(result.median_cents).toBe(1500);
  });

  it('should return zeros for empty input', () => {
    const result = aggregateRegionalPrices({});

    expect(result.min_cents).toBe(0);
    expect(result.max_cents).toBe(0);
    expect(result.mean_cents).toBe(0);
    expect(result.median_cents).toBe(0);
  });
});
