import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { HomeDepotAdapter } from '../../../src/scraping/adapters/home-depot-adapter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('HomeDepotAdapter', () => {
  let adapter: HomeDepotAdapter;

  beforeAll(() => {
    adapter = new HomeDepotAdapter();
  });

  it('should have correct retailer', () => {
    expect(adapter.retailer).toBe('home_depot');
  });

  it('should parse price strings to cents', () => {
    // Access protected method via adapter instance
    const parse = (adapter as unknown as { parsePriceToCents: (s: string | null) => number | null }).parsePriceToCents.bind(adapter);

    expect(parse('$3.98')).toBe(398);
    expect(parse('$12.49')).toBe(1249);
    expect(parse('$1,299.99')).toBe(129999);
    expect(parse('')).toBeNull();
    expect(parse(null)).toBeNull();
    expect(parse('free')).toBeNull();
  });

  // Note: Full scraping integration tests require a browser
  // These tests validate parsing logic using fixture HTML files
  it('should have fixture files available', () => {
    const searchHtml = readFileSync(join(__dirname, '../../fixtures/home-depot-search.html'), 'utf-8');
    expect(searchHtml).toContain('browse-search__pod');

    const productHtml = readFileSync(join(__dirname, '../../fixtures/home-depot-product.html'), 'utf-8');
    expect(productHtml).toContain('application/ld+json');
  });
});
