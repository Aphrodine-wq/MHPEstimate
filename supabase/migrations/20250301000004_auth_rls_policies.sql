-- ═══════════════════════════════════════
-- AUTH & RLS — Full policy coverage
-- Adds INSERT/UPDATE/DELETE policies for all tables
-- ═══════════════════════════════════════

-- ── Team Members ──

CREATE POLICY "Authenticated users can insert team members"
    ON team_members FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update own team member record"
    ON team_members FOR UPDATE
    TO authenticated
    USING (auth_id = auth.uid());

-- ── Clients ──

CREATE POLICY "Authenticated users can insert clients"
    ON clients FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
    ON clients FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete clients"
    ON clients FOR DELETE
    TO authenticated
    USING (true);

-- ── Estimates ──

CREATE POLICY "Authenticated users can insert estimates"
    ON estimates FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update estimates"
    ON estimates FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete estimates"
    ON estimates FOR DELETE
    TO authenticated
    USING (true);

-- ── Estimate Line Items ──

CREATE POLICY "Authenticated users can insert line items"
    ON estimate_line_items FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update line items"
    ON estimate_line_items FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete line items"
    ON estimate_line_items FOR DELETE
    TO authenticated
    USING (true);

-- ── Estimate Change Orders ──

CREATE POLICY "Team members can read change orders"
    ON estimate_change_orders FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert change orders"
    ON estimate_change_orders FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update change orders"
    ON estimate_change_orders FOR UPDATE
    TO authenticated
    USING (true);

-- ── Products ──

CREATE POLICY "Authenticated users can insert products"
    ON products FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
    ON products FOR UPDATE
    TO authenticated
    USING (true);

-- ── Pricing History ──

CREATE POLICY "Team members can read pricing history"
    ON pricing_history FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert pricing history"
    ON pricing_history FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ── Unified Pricing ──

CREATE POLICY "Authenticated users can upsert unified pricing"
    ON unified_pricing FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update unified pricing"
    ON unified_pricing FOR UPDATE
    TO authenticated
    USING (true);

-- ── Invoices ──

CREATE POLICY "Team members can read invoices"
    ON invoices FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert invoices"
    ON invoices FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update invoices"
    ON invoices FOR UPDATE
    TO authenticated
    USING (true);

-- ── Voice Calls ──

CREATE POLICY "Team members can read voice calls"
    ON voice_calls FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert voice calls"
    ON voice_calls FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update voice calls"
    ON voice_calls FOR UPDATE
    TO authenticated
    USING (true);

-- ── Job Actuals ──

CREATE POLICY "Team members can read job actuals"
    ON job_actuals FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert job actuals"
    ON job_actuals FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update job actuals"
    ON job_actuals FOR UPDATE
    TO authenticated
    USING (true);

-- ── Estimate Embeddings ──

CREATE POLICY "Team members can read embeddings"
    ON estimate_embeddings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert embeddings"
    ON estimate_embeddings FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- ── Company Settings ──

CREATE POLICY "Authenticated users can insert company settings"
    ON company_settings FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update company settings"
    ON company_settings FOR UPDATE
    TO authenticated
    USING (true);

-- ═══════════════════════════════════════
-- Add index on team_members.auth_id for fast lookups
-- ═══════════════════════════════════════

CREATE INDEX idx_team_members_auth_id ON team_members(auth_id);
