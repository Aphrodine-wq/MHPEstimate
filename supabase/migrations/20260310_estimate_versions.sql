-- ═══════════════════════════════════════
-- ESTIMATE VERSIONS — Version history snapshots for estimates
-- ═══════════════════════════════════════

CREATE TABLE public.estimate_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id     UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    version_number  INT NOT NULL,
    snapshot        JSONB NOT NULL,
    change_summary  TEXT,
    created_by      UUID NOT NULL REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ DEFAULT now(),

    -- Each estimate can only have one entry per version number
    UNIQUE (estimate_id, version_number)
);

ALTER TABLE public.estimate_versions ENABLE ROW LEVEL SECURITY;

-- All authenticated team members can read version history (single-company setup)
CREATE POLICY "Authenticated users can read estimate versions"
    ON estimate_versions FOR SELECT
    TO authenticated
    USING (true);

-- Any authenticated user can create version snapshots
CREATE POLICY "Authenticated users can insert estimate versions"
    ON estimate_versions FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Indexes
CREATE INDEX idx_estimate_versions_estimate_id ON estimate_versions(estimate_id);
CREATE INDEX idx_estimate_versions_created_at ON estimate_versions(created_at DESC);
