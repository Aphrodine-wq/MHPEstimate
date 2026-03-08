-- ═══════════════════════════════════════
-- SECURITY: Revoke wide-open anon access
-- Migration 00002 granted full CRUD to anon role on all tables.
-- This migration drops those policies so only authenticated users
-- can access data (per policies in 00001 and 00004).
-- ═══════════════════════════════════════

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'team_members',
      'clients',
      'estimates',
      'estimate_line_items',
      'estimate_change_orders',
      'products',
      'pricing_history',
      'unified_pricing',
      'invoices',
      'voice_calls',
      'job_actuals',
      'estimate_embeddings',
      'company_settings'
    ])
  LOOP
    -- Drop all anon policies created in 00002
    EXECUTE format('DROP POLICY IF EXISTS anon_select_%1$s ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS anon_insert_%1$s ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS anon_update_%1$s ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS anon_delete_%1$s ON %1$I', tbl);
  END LOOP;
END
$$;
