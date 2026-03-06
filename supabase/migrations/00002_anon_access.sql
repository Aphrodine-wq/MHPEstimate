-- Migration: Allow anon role full access to all tables
-- This removes the auth requirement so the desktop app works without login.
-- Tighten these policies once a proper auth flow is added.

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
    -- Enable RLS (idempotent)
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);

    -- SELECT
    EXECUTE format(
      'CREATE POLICY anon_select_%1$s ON %1$I FOR SELECT TO anon USING (true)',
      tbl
    );

    -- INSERT
    EXECUTE format(
      'CREATE POLICY anon_insert_%1$s ON %1$I FOR INSERT TO anon WITH CHECK (true)',
      tbl
    );

    -- UPDATE
    EXECUTE format(
      'CREATE POLICY anon_update_%1$s ON %1$I FOR UPDATE TO anon USING (true) WITH CHECK (true)',
      tbl
    );

    -- DELETE
    EXECUTE format(
      'CREATE POLICY anon_delete_%1$s ON %1$I FOR DELETE TO anon USING (true)',
      tbl
    );
  END LOOP;
END
$$;

-- Seed a default team member so the app has someone to load
INSERT INTO team_members (full_name, email, role)
VALUES ('Walt', 'walt@mshomepros.com', 'owner')
ON CONFLICT (email) DO NOTHING;
