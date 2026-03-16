import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ScraperEngine } from '../scraping/scraper-engine.js';
import type { ProductRepository } from '../db/repositories/product-repository.js';
import type { PriceRepository } from '../db/repositories/price-repository.js';
import type { StoreRepository } from '../db/repositories/store-repository.js';
import type { CacheManager } from '../db/cache/cache-manager.js';
import {
  searchProductsSchema,
  getProductPriceSchema,
  comparePricesSchema,
  getRegionalPricingSchema,
  getPriceHistorySchema,
  listCategoriesSchema,
  getStoreInventorySchema,
} from './tools/schemas.js';
import { searchProducts } from './tools/search-products.js';
import { getProductPrice } from './tools/get-product-price.js';
import { comparePrices } from './tools/compare-prices.js';
import { getRegionalPricing } from './tools/get-regional-pricing.js';
import { getPriceHistory } from './tools/get-price-history.js';
import { listCategories } from './tools/list-categories.js';
import { getStoreInventory } from './tools/get-store-inventory.js';

export interface Dependencies {
  scraperEngine: ScraperEngine;
  productRepo: ProductRepository;
  priceRepo: PriceRepository;
  storeRepo: StoreRepository;
  cache: CacheManager;
}

export function createMcpServer(deps: Dependencies): McpServer {
  const server = new McpServer({
    name: 'price-scraper-mcp',
    version: '1.0.0',
  });

  server.tool(
    'search_products',
    'Search products by keyword across Home Depot and Lowes. Returns product names, prices, and URLs.',
    searchProductsSchema.shape,
    async (input) => {
      try {
        const parsed = searchProductsSchema.parse(input);
        const result = await searchProducts(parsed, deps);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_product_price',
    'Get current price for a specific product at a ZIP code. Optionally includes 30-day price history.',
    getProductPriceSchema.shape,
    async (input) => {
      try {
        const parsed = getProductPriceSchema.parse(input);
        const result = await getProductPrice(parsed, deps);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'compare_prices',
    'Compare prices for a product across Home Depot and Lowes. Shows side-by-side pricing with savings.',
    comparePricesSchema.shape,
    async (input) => {
      try {
        const parsed = comparePricesSchema.parse(input);
        const result = await comparePrices(parsed, deps);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_regional_pricing',
    'Get pricing across multiple ZIP codes or a predefined US region. Returns min/max/mean/median stats.',
    getRegionalPricingSchema._def.schema.shape,
    async (input) => {
      try {
        const parsed = getRegionalPricingSchema.parse(input);
        const result = await getRegionalPricing(parsed, deps);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_price_history',
    'Fetch historical price data for a product. Returns time-series data and trend analysis.',
    getPriceHistorySchema.shape,
    async (input) => {
      try {
        const parsed = getPriceHistorySchema.parse(input);
        const result = await getPriceHistory(parsed, deps);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'list_categories',
    'List product categories available at Home Depot and/or Lowes.',
    listCategoriesSchema.shape,
    async (input) => {
      try {
        const parsed = listCategoriesSchema.parse(input);
        const result = await listCategories(parsed, deps);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_store_inventory',
    'Check stock status and local price at a specific store location.',
    getStoreInventorySchema.shape,
    async (input) => {
      try {
        const parsed = getStoreInventorySchema.parse(input);
        const result = await getStoreInventory(parsed, deps);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (err) {
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          }],
          isError: true,
        };
      }
    },
  );

  return server;
}
