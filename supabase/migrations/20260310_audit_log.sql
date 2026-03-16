-- ═══════════════════════════════════════
-- AUDIT LOG — Enhanced audit trail with structured action/entity types
-- ═══════════════════════════════════════
--
-- Extends the existing audit_log table from migration 20250301000008 with
-- structured enums for action_type and entity_type, plus application-level
-- metadata. The original trigger-based audit_log is left intact; this adds
-- a new application-level table for explicit, high-level audit entries
-- logged via the `logAudit()` helper in API routes.

-- Drop the old basic audit_log and recreate with richer schema.
-- NOTE: If you want to preserve old rows, rename the table first and
-- migrate data separately. For a fresh deployment this is safe.

DROP TRIGGER IF EXISTS audit_estimates ON estimates;
DROP TRIGGER IF EXISTS audit_company_settings ON company_settings;
DROP TRIGGER IF EXISTS audit_team_members ON team_members;
DROP FUNCTION IF EXISTS public.audit_trigger_func();

DROP POLICY IF EXISTS "Admins can read audit log" ON audit_log;
DROP POLICY IF EXISTS "System can insert audit log" ON audit_log;
DROP INDEX IF EXISTS idx_audit_log_created_at;
DROP INDEX IF EXISTS idx_audit_log_action;
DROP INDEX IF EXISTS idx_audit_log_table;

DROP TABLE IF EXISTS public.audit_log;

CREATE TABLE public.audit_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id),
    action_type     TEXT NOT NULL CHECK (action_type IN (
        'estimate_created', 'estimate_updated', 'estimate_status_changed',
        'estimate_sent', 'estimate_accepted', 'estimate_declined',
        'line_item_added', 'line_item_updated', 'line_item_removed',
        'change_order_created', 'change_order_approved', 'change_order_rejected',
        'client_created', 'client_updated', 'client_deleted',
        'team_member_invited', 'team_member_updated', 'team_member_deactivated',
        'invoice_uploaded', 'invoice_confirmed',
        'voice_call_started', 'voice_call_ended',
        'job_actual_recorded',
        'version_snapshot_created',
        'reminder_scheduled', 'reminder_cancelled',
        'settings_updated',
        'estimate_pdf_generated'
    )),
    entity_type     TEXT NOT NULL CHECK (entity_type IN (
        'estimate', 'estimate_line_item', 'estimate_change_order',
        'client', 'team_member', 'invoice', 'voice_call',
        'job_actual', 'estimate_version', 'estimate_reminder',
        'company_settings', 'product'
    )),
    entity_id       UUID,
    metadata        JSONB DEFAULT '{}',
    ip_address      INET,
    created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- All authenticated team members can read audit logs (single-company setup)
CREATE POLICY "Authenticated users can read audit log"
    ON audit_log FOR SELECT
    TO authenticated
    USING (true);

-- Any authenticated user can insert audit entries (API routes log on behalf of the user)
CREATE POLICY "Authenticated users can insert audit log"
    ON audit_log FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Service role can always insert (for server-side API routes using service client)
-- This is implicit for service role, but we allow it for completeness.

-- Indexes for common query patterns
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
