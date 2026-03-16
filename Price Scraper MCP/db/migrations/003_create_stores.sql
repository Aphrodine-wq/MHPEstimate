CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retailer VARCHAR(20) NOT NULL CHECK (retailer IN ('home_depot', 'lowes')),
  store_number VARCHAR(20) NOT NULL,
  name VARCHAR(200) NOT NULL,
  address TEXT NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(retailer, store_number)
);
