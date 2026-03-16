export const CacheKeys = {
  productSearch: (retailer: string, query: string, category?: string) =>
    `search:${retailer}:${query}${category ? `:${category}` : ''}`,

  productPrice: (productId: string, zipCode: string) =>
    `price:${productId}:${zipCode}`,

  priceComparison: (productName: string, zipCodes: string[]) =>
    `compare:${productName}:${zipCodes.sort().join(',')}`,

  regionalPricing: (productId: string, region: string) =>
    `regional:${productId}:${region}`,

  priceHistory: (productId: string, zipCode: string, days: number) =>
    `history:${productId}:${zipCode}:${days}`,

  categories: (retailer: string) =>
    `categories:${retailer}`,

  storeInventory: (productId: string, storeId: string) =>
    `inventory:${productId}:${storeId}`,
};
