import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { LowesAdapter } from '../../../src/scraping/adapters/lowes-adapter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('LowesAdapter', () => {
  let adapter: LowesAdapter;

  beforeAll(() => {
    adapter = new LowesAdapter();
  });

  it('should have correct retailer', () => {
    expect(adapter.retailer).toBe('lowes');
  });

  it('should parse price strings to cents', () => {
    const parse = (adapter as unknown as { parsePriceToCents: (s: string | null) => number | null }).parsePriceToCents.bind(adapter);

    expect(parse('$3.78')).toBe(378);
    expect(parse('$15.97')).toBe(1597);
    expect(parse('$2,499.00')).toBe(249900);
    expect(parse('')).toBeNull();
    expect(parse(null)).toBeNull();
  });

  it('should have fixture files available', () => {
    const searchHtml = readFileSync(join(__dirname, '../../fixtures/lowes-search.html'), 'utf-8');
    expect(searchHtml).toContain('splp-prd-lst');

    const productHtml = readFileSync(join(__dirname, '../../fixtures/lowes-product.html'), 'utf-8');
    expect(productHtml).toContain('application/ld+json');
  });
});
