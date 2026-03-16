CREATE TABLE IF NOT EXISTS prices (
  id UUID DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  store_id UUID REFERENCES stores(id),
  zip_code VARCHAR(10) NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  bulk_price_cents INTEGER,
  promo_flag BOOLEAN NOT NULL DEFAULT false,
  promo_expiry TIMESTAMPTZ,
  is_online BOOLEAN NOT NULL DEFAULT false,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT create_hypertable('prices', 'scraped_at', if_not_exists => TRUE);
