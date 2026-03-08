-- Performance indexes for common query patterns

-- Estimates: sort by date, filter by tier
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimates_tier ON estimates(tier);

-- Estimate line items: filter by category, composite for ordered retrieval
CREATE INDEX IF NOT EXISTS idx_line_items_category ON estimate_line_items(category);
CREATE INDEX IF NOT EXISTS idx_line_items_estimate_line ON estimate_line_items(estimate_id, line_number);

-- Clients: lookup by email, sort by date, search by name
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_full_name ON clients(full_name);

-- Invoices: filter by status, sort by date, composite for status+date queries
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status_created ON invoices(status, created_at DESC);

-- Products: search by name, filter by tier, partial index for active products
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_tier ON products(tier);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;

-- Pricing history: composite for product price lookups ordered by date
CREATE INDEX IF NOT EXISTS idx_pricing_history_product_date ON pricing_history(product_id, observed_at DESC);

-- Unified pricing: filter by freshness, sort by last update
CREATE INDEX IF NOT EXISTS idx_unified_pricing_freshness ON unified_pricing(freshness);
CREATE INDEX IF NOT EXISTS idx_unified_pricing_updated ON unified_pricing(last_updated DESC);
