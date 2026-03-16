CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer VARCHAR(20) NOT NULL CHECK (retailer IN ('home_depot', 'lowes')),
  retailer_sku VARCHAR(100) NOT NULL,
  upc VARCHAR(20),
  name TEXT NOT NULL,
  brand VARCHAR(200),
  category VARCHAR(200),
  image_url TEXT,
  product_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(retailer, retailer_sku)
);
