-- Migration: Infrastructure estimates, dual pricing, foundation types, material/labor split
-- Date: 2026-03-11

-- Add new columns to estimates table
ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS estimate_category TEXT NOT NULL DEFAULT 'building'
    CHECK (estimate_category IN ('building', 'infrastructure')),
  ADD COLUMN IF NOT EXISTS foundation_type TEXT
    CHECK (foundation_type IS NULL OR foundation_type IN ('raised_slab', 'monolithic_slab', 'crawlspace', 'pier_beam')),
  ADD COLUMN IF NOT EXISTS foundation_block_height INTEGER
    CHECK (foundation_block_height IS NULL OR (foundation_block_height >= 2 AND foundation_block_height <= 6)),
  ADD COLUMN IF NOT EXISTS square_footage NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS retail_total NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_total NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_per_sqft NUMERIC(8,2);

-- Add material/labor cost split and retail price to line items
ALTER TABLE estimate_line_items
  ADD COLUMN IF NOT EXISTS material_cost NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retail_price NUMERIC(10,2);

-- Backfill: set retail_price = unit_price for existing line items
UPDATE estimate_line_items
  SET retail_price = unit_price
  WHERE retail_price IS NULL AND unit_price IS NOT NULL;

-- Index for filtering by estimate category
CREATE INDEX IF NOT EXISTS idx_estimates_category ON estimates(estimate_category);

-- Comment on new columns for documentation
COMMENT ON COLUMN estimates.estimate_category IS 'building = structure/finishes, infrastructure = land/utility/well/septic';
COMMENT ON COLUMN estimates.foundation_type IS 'Foundation type — raised_slab is default for MS builds (2-4 block courses)';
COMMENT ON COLUMN estimates.foundation_block_height IS 'Number of CMU block courses for raised slab stem wall (2-6)';
COMMENT ON COLUMN estimates.square_footage IS 'Total heated square footage for $/sqft calculation';
COMMENT ON COLUMN estimates.retail_total IS 'Client-facing total (selling price)';
COMMENT ON COLUMN estimates.actual_total IS 'Internal actual cost (material + labor at cost)';
COMMENT ON COLUMN estimates.cost_per_sqft IS 'Grand total / square footage — target $185-$205';
COMMENT ON COLUMN estimate_line_items.material_cost IS 'Actual material cost (internal, not shown to client)';
COMMENT ON COLUMN estimate_line_items.labor_cost IS 'Actual labor cost (internal, not shown to client)';
COMMENT ON COLUMN estimate_line_items.retail_price IS 'Client-facing selling price per unit';
