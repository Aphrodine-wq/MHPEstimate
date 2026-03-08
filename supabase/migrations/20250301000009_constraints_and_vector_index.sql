-- ═══════════════════════════════════════
-- CHECK CONSTRAINTS & VECTOR INDEX
-- Adds data integrity constraints and vector search index
-- ═══════════════════════════════════════

-- ── Numeric check constraints ──

ALTER TABLE estimates
    ADD CONSTRAINT chk_estimates_grand_total_positive
    CHECK (grand_total >= 0);

ALTER TABLE estimates
    ADD CONSTRAINT chk_estimates_materials_positive
    CHECK (materials_subtotal >= 0);

ALTER TABLE estimates
    ADD CONSTRAINT chk_estimates_labor_positive
    CHECK (labor_subtotal >= 0);

ALTER TABLE estimates
    ADD CONSTRAINT chk_estimates_margin_range
    CHECK (gross_margin_pct IS NULL OR (gross_margin_pct >= 0 AND gross_margin_pct <= 100));

ALTER TABLE estimates
    ADD CONSTRAINT chk_estimates_version_positive
    CHECK (version >= 1);

ALTER TABLE estimate_line_items
    ADD CONSTRAINT chk_line_items_quantity_positive
    CHECK (quantity IS NULL OR quantity >= 0);

ALTER TABLE estimate_line_items
    ADD CONSTRAINT chk_line_items_unit_price_positive
    CHECK (unit_price IS NULL OR unit_price >= 0);

ALTER TABLE pricing_history
    ADD CONSTRAINT chk_pricing_history_price_positive
    CHECK (price > 0);

ALTER TABLE unified_pricing
    ADD CONSTRAINT chk_unified_pricing_price_positive
    CHECK (unified_price > 0);

ALTER TABLE estimate_change_orders
    ADD CONSTRAINT chk_change_orders_number_positive
    CHECK (change_number >= 1);

-- ── Vector search index (IVFFlat for pgvector) ──
-- This dramatically speeds up vector similarity queries
-- for the semantic search feature.

CREATE INDEX IF NOT EXISTS idx_estimate_embeddings_vector
    ON estimate_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ── Updated_at auto-trigger ──
-- Automatically update the updated_at column on any row modification.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_team_members
    BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_clients
    BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_estimates
    BEFORE UPDATE ON estimates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_updated_at_products
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
