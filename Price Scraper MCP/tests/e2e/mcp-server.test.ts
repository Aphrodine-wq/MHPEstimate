import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createMcpServer, type Dependencies } from '../../src/server/mcp-server.js';

// Stub dependencies for e2e test
function createStubDeps(): Dependencies {
  return {
    scraperEngine: {
      searchProducts: async () => ({
        success: true,
        data: [{
          retailer: 'home_depot' as const,
          retailer_sku: '123456789',
          upc: null,
          name: '2x4x8 Lumber',
          brand: 'Generic',
          category: 'Lumber',
          image_url: null,
          product_url: 'https://www.homedepot.com/p/123456789',
          price_cents: 398,
          bulk_price_cents: null,
          promo_flag: false,
          promo_expiry: null,
          is_online: true,
        }],
        error: null,
        duration_ms: 100,
        cached: false,
      }),
      getProductDetails: async () => ({
        success: true,
        data: {
          retailer: 'home_depot' as const,
          retailer_sku: '123456789',
          upc: null,
          name: '2x4x8 Lumber',
          brand: 'Generic',
          category: 'Lumber',
          image_url: null,
          product_url: 'https://www.homedepot.com/p/123456789',
          price_cents: 398,
          bulk_price_cents: null,
          promo_flag: false,
          promo_expiry: null,
          is_online: true,
        },
        error: null,
        duration_ms: 100,
        cached: false,
      }),
      getCategories: async () => ({
        success: true,
        data: [{ id: '1', name: 'Lumber', parent_id: null, url: '/c/lumber' }],
        error: null,
        duration_ms: 50,
        cached: false,
      }),
      getStoreInventory: async () => ({
        success: true,
        data: { in_stock: true, quantity: 42, unit_price_cents: 398, aisle_location: 'Aisle 21' },
        error: null,
        duration_ms: 80,
        cached: false,
      }),
    } as unknown as Dependencies['scraperEngine'],
    productRepo: {
      upsert: async (raw: unknown) => ({ id: 'prod-001', ...(raw as object), created_at: new Date(), updated_at: new Date() }),
      findById: async () => ({ id: 'prod-001', name: '2x4x8 Lumber', retailer: 'home_depot', retailer_sku: '123456789', product_url: 'https://www.homedepot.com/p/123456789', upc: null, brand: 'Generic', category: 'Lumber', image_url: null, created_at: new Date(), updated_at: new Date() }),
      search: async () => [],
      findByRetailerSku: async () => null,
      findByUpc: async () => [],
    } as unknown as Dependencies['productRepo'],
    priceRepo: {
      insert: async () => {},
      getLatest: async () => ({ product_id: 'prod-001', store_id: null, zip_code: '10001', unit_price_cents: 398, bulk_price_cents: null, promo_flag: false, promo_expiry: null, is_online: true, scraped_at: new Date() }),
      getHistory: async () => [
        { unit_price_cents: 450, bulk_price_cents: null, promo_flag: false, scraped_at: new Date('2026-02-01') },
        { unit_price_cents: 398, bulk_price_cents: null, promo_flag: false, scraped_at: new Date('2026-03-01') },
      ],
      getRegionalPrices: async () => ({ '10001': 398, '90001': 425, '60601': 410 }),
    } as unknown as Dependencies['priceRepo'],
    storeRepo: {
      findById: async () => ({ id: 'store-001', retailer: 'home_depot', store_number: '0123', name: 'HD Store #123', address: '123 Main St', zip_code: '10001', lat: 40.7, lng: -74.0 }),
      findByZip: async () => [],
      upsert: async () => ({}),
    } as unknown as Dependencies['storeRepo'],
    cache: {
      get: async () => null,
      set: async () => {},
      getOrFetch: async <T>(_key: string, fetcher: () => Promise<T>) => ({ data: await fetcher(), cached: false }),
      invalidate: async () => {},
    } as unknown as Dependencies['cache'],
  };
}

describe('MCP Server E2E', () => {
  let client: Client;
  let server: McpServer;

  beforeAll(async () => {
    const deps = createStubDeps();
    server = createMcpServer(deps);
    client = new Client({ name: 'test-client', version: '1.0.0' });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([
      client.connect(clientTransport),
      server.connect(serverTransport),
    ]);
  });

  afterAll(async () => {
    await client.close();
    await server.close();
  });

  it('should list all 7 tools', async () => {
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name).sort();
    expect(toolNames).toEqual([
      'compare_prices',
      'get_price_history',
      'get_product_price',
      'get_regional_pricing',
      'get_store_inventory',
      'list_categories',
      'search_products',
    ]);
  });

  it('should execute search_products', async () => {
    const result = await client.callTool({
      name: 'search_products',
      arguments: { query: '2x4 lumber', store: 'home_depot', limit: 5 },
    });
    const content = result.content as Array<{ type: string; text: string }>;
    expect(content).toHaveLength(1);
    const text = content[0]!.text;
    const parsed = JSON.parse(text);
    expect(parsed.products).toBeDefined();
    expect(Array.isArray(parsed.products)).toBe(true);
  });

  it('should execute get_product_price', async () => {
    const result = await client.callTool({
      name: 'get_product_price',
      arguments: { product_id: 'prod-001', store: 'home_depot', zip_code: '10001' },
    });
    const text = (result.content as Array<{ text: string }>)[0]!.text;
    const parsed = JSON.parse(text);
    expect(parsed.unit_price_cents).toBe(398);
  });

  it('should execute list_categories', async () => {
    const result = await client.callTool({
      name: 'list_categories',
      arguments: { store: 'home_depot' },
    });
    const text = (result.content as Array<{ text: string }>)[0]!.text;
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].categories).toBeDefined();
  });

  it('should execute get_price_history', async () => {
    const result = await client.callTool({
      name: 'get_price_history',
      arguments: { product_id: 'prod-001', store: 'home_depot', zip_code: '10001', days: 30 },
    });
    const text = (result.content as Array<{ text: string }>)[0]!.text;
    const parsed = JSON.parse(text);
    expect(parsed.history).toBeDefined();
    expect(parsed.trend).toBeDefined();
    expect(parsed.trend.direction).toBe('down');
  });

  it('should execute get_store_inventory', async () => {
    const result = await client.callTool({
      name: 'get_store_inventory',
      arguments: { product_id: 'prod-001', store_id: 'store-001', store: 'home_depot' },
    });
    const text = (result.content as Array<{ text: string }>)[0]!.text;
    const parsed = JSON.parse(text);
    expect(parsed.in_stock).toBe(true);
    expect(parsed.quantity).toBe(42);
  });
});
