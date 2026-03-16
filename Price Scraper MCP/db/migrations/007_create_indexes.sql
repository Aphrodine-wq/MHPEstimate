-- Product search indexes
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_retailer ON products (retailer);
CREATE INDEX IF NOT EXISTS idx_products_upc ON products (upc) WHERE upc IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category) WHERE category IS NOT NULL;

-- Price query indexes
CREATE INDEX IF NOT EXISTS idx_prices_product_id ON prices (product_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_prices_zip_code ON prices (zip_code, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_prices_product_zip ON prices (product_id, zip_code, scraped_at DESC);

-- Store indexes
CREATE INDEX IF NOT EXISTS idx_stores_zip_code ON stores (zip_code);
CREATE INDEX IF NOT EXISTS idx_stores_retailer ON stores (retailer);

-- Category indexes
CREATE INDEX IF NOT EXISTS idx_categories_retailer ON categories (retailer);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id);
