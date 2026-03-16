import { z } from 'zod';

export const RetailerEnum = z.enum(['home_depot', 'lowes']);
export const StoreEnum = z.enum(['home_depot', 'lowes', 'both']);
export const RegionEnum = z.enum(['northeast', 'southeast', 'midwest', 'south', 'west', 'pacific']);

export const searchProductsSchema = z.object({
  query: z.string().min(1).describe('Search query for products'),
  store: StoreEnum.default('both').describe('Retailer to search'),
  category: z.string().optional().describe('Optional category filter'),
  limit: z.number().int().min(1).max(50).default(20).describe('Max results to return'),
});
export type SearchProductsInput = z.infer<typeof searchProductsSchema>;

export const getProductPriceSchema = z.object({
  product_id: z.string().min(1).describe('Product ID'),
  store: RetailerEnum.describe('Retailer'),
  zip_code: z.string().regex(/^\d{5}$/, 'Must be a 5-digit ZIP code').describe('ZIP code for pricing'),
  include_history: z.boolean().default(false).describe('Include 30-day price history'),
});
export type GetProductPriceInput = z.infer<typeof getProductPriceSchema>;

export const comparePricesSchema = z.object({
  product_name: z.string().min(1).describe('Product name to compare across retailers'),
  zip_codes: z.array(z.string().regex(/^\d{5}$/)).min(1).max(10).describe('ZIP codes to compare'),
  category: z.string().optional().describe('Optional category filter'),
});
export type ComparePricesInput = z.infer<typeof comparePricesSchema>;

export const getRegionalPricingSchema = z.object({
  product_id: z.string().min(1).describe('Product ID'),
  store: RetailerEnum.describe('Retailer'),
  zip_codes: z.array(z.string().regex(/^\d{5}$/)).optional().describe('Custom ZIP codes'),
  region: RegionEnum.optional().describe('Predefined region'),
}).refine(
  (data) => data.zip_codes || data.region,
  { message: 'Either zip_codes or region must be provided' },
);
export type GetRegionalPricingInput = z.infer<typeof getRegionalPricingSchema>;

export const getPriceHistorySchema = z.object({
  product_id: z.string().min(1).describe('Product ID'),
  store: RetailerEnum.describe('Retailer'),
  zip_code: z.string().regex(/^\d{5}$/).describe('ZIP code'),
  days: z.number().int().min(1).max(365).default(30).describe('Number of days of history'),
});
export type GetPriceHistoryInput = z.infer<typeof getPriceHistorySchema>;

export const listCategoriesSchema = z.object({
  store: StoreEnum.default('both').describe('Retailer to get categories for'),
});
export type ListCategoriesInput = z.infer<typeof listCategoriesSchema>;

export const getStoreInventorySchema = z.object({
  product_id: z.string().min(1).describe('Product ID'),
  store_id: z.string().min(1).describe('Store ID'),
  store: RetailerEnum.describe('Retailer'),
});
export type GetStoreInventoryInput = z.infer<typeof getStoreInventorySchema>;
