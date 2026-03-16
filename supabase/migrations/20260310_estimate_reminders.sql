-- ═══════════════════════════════════════
-- ESTIMATE REMINDERS — Follow-up and expiry reminders for estimates
-- ═══════════════════════════════════════

CREATE TABLE public.estimate_reminders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id     UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
    reminder_type   TEXT NOT NULL CHECK (reminder_type IN ('follow_up', 'expiry_warning', 'custom')),
    scheduled_for   TIMESTAMPTZ NOT NULL,
    sent_at         TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'sent', 'cancelled', 'failed')),
    message         TEXT,
    created_by      UUID NOT NULL REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.estimate_reminders ENABLE ROW LEVEL SECURITY;

-- All authenticated team members can read reminders (single-company setup)
CREATE POLICY "Authenticated users can read estimate reminders"
    ON estimate_reminders FOR SELECT
    TO authenticated
    USING (true);

-- Any authenticated user can create reminders
CREATE POLICY "Authenticated users can insert estimate reminders"
    ON estimate_reminders FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Any authenticated user can update reminders (cancel, mark sent, etc.)
CREATE POLICY "Authenticated users can update estimate reminders"
    ON estimate_reminders FOR UPDATE
    TO authenticated
    USING (true);

-- Any authenticated user can delete reminders
CREATE POLICY "Authenticated users can delete estimate reminders"
    ON estimate_reminders FOR DELETE
    TO authenticated
    USING (true);

-- Indexes
CREATE INDEX idx_estimate_reminders_estimate_id ON estimate_reminders(estimate_id);
CREATE INDEX idx_estimate_reminders_status ON estimate_reminders(status);
CREATE INDEX idx_estimate_reminders_scheduled_for ON estimate_reminders(scheduled_for);
CREATE INDEX idx_estimate_reminders_pending ON estimate_reminders(scheduled_for)
    WHERE status = 'scheduled';
