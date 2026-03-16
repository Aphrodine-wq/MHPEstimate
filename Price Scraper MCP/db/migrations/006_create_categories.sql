CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer VARCHAR(20) NOT NULL CHECK (retailer IN ('home_depot', 'lowes')),
  external_id VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  parent_id UUID REFERENCES categories(id),
  url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(retailer, external_id)
);
