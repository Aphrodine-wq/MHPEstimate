-- MHP Estimate — Missing Tables Migration
-- Adds 20 tables referenced by API routes and components
-- Also adds organization_id to estimates for multi-tenancy

-- ═══════════════════════════════════════
-- ORGANIZATIONS & MULTI-TENANCY
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS organizations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    owner_id        UUID NOT NULL REFERENCES auth.users(id),
    phone           TEXT,
    email           TEXT,
    address_line1   TEXT,
    address_line2   TEXT,
    city            TEXT,
    state           TEXT,
    zip             TEXT,
    website         TEXT,
    logo_url        TEXT,
    stripe_customer_id    TEXT,
    stripe_subscription_id TEXT,
    billing_email   TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id),
    role            TEXT CHECK (role IN ('owner','admin','estimator','pm','field_tech','sales')) NOT NULL,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, user_id)
);

-- Add organization_id to estimates
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- ═══════════════════════════════════════
-- BILLING & SUBSCRIPTIONS
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS billing_plans (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    stripe_price_id TEXT,
    max_team_members INTEGER,
    max_estimates_per_month INTEGER,
    call_hunter_minutes_per_month INTEGER,
    price_monthly_cents INTEGER NOT NULL,
    features        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    plan_id         TEXT REFERENCES billing_plans(id),
    stripe_subscription_id TEXT,
    status          TEXT CHECK (status IN ('trialing','active','past_due','canceled','unpaid','incomplete')) NOT NULL,
    current_period_start TIMESTAMPTZ,
    current_period_end   TIMESTAMPTZ,
    trial_end       TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- SCHEDULING
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS schedule_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    project_type    TEXT NOT NULL,
    phases          JSONB NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_phases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    estimate_id     UUID REFERENCES estimates(id) ON DELETE CASCADE,
    phase_name      TEXT NOT NULL,
    sort_order      INTEGER NOT NULL,
    start_date      DATE,
    end_date        DATE,
    duration_days   INTEGER,
    status          TEXT CHECK (status IN ('not_started','in_progress','completed','blocked','skipped','pending')) DEFAULT 'pending',
    crew_assigned   TEXT[] DEFAULT '{}',
    notes           TEXT,
    milestone_id    UUID,
    color           TEXT,
    dependencies    TEXT[] DEFAULT '{}',
    actual_start    DATE,
    actual_end      DATE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- ESTIMATE TEMPLATES
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS estimate_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    project_type    TEXT NOT NULL,
    description     TEXT,
    line_items      JSONB DEFAULT '[]',
    template_data   JSONB,
    is_default      BOOLEAN DEFAULT false,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- LABOR RATES
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS labor_rate_presets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    trade           TEXT NOT NULL,
    role            TEXT DEFAULT 'journeyman' NOT NULL,
    hourly_rate     NUMERIC(10,2) NOT NULL,
    overtime_rate   NUMERIC(10,2),
    is_default      BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- SUBCONTRACTORS & BIDS
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS subcontractors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    company_name    TEXT NOT NULL,
    contact_name    TEXT,
    email           TEXT,
    phone           TEXT,
    trades          TEXT[] DEFAULT '{}',
    license_number  TEXT,
    insurance_expiry DATE,
    rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes           TEXT,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sub_bids (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    estimate_id     UUID REFERENCES estimates(id) ON DELETE CASCADE,
    subcontractor_id UUID REFERENCES subcontractors(id),
    trade           TEXT NOT NULL,
    scope_description TEXT,
    due_date        DATE,
    bid_amount      NUMERIC,
    status          TEXT CHECK (status IN ('draft','requested','received','accepted','rejected','expired')) DEFAULT 'draft',
    requested_at    TIMESTAMPTZ,
    received_at     TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- PURCHASE ORDERS
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS purchase_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    estimate_id     UUID REFERENCES estimates(id) ON DELETE CASCADE,
    po_number       TEXT UNIQUE NOT NULL,
    vendor_name     TEXT NOT NULL,
    vendor_contact  TEXT,
    vendor_phone    TEXT,
    vendor_email    TEXT,
    status          TEXT CHECK (status IN ('draft','sent','confirmed','partial','fulfilled','cancelled')) DEFAULT 'draft',
    subtotal        NUMERIC(12,2) DEFAULT 0,
    tax             NUMERIC(12,2) DEFAULT 0,
    shipping        NUMERIC(12,2) DEFAULT 0,
    total           NUMERIC(12,2) DEFAULT 0,
    order_date      DATE,
    expected_delivery DATE,
    delivery_address TEXT,
    notes           TEXT,
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS po_line_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    estimate_line_item_id UUID REFERENCES estimate_line_items(id),
    description     TEXT NOT NULL,
    quantity        NUMERIC NOT NULL,
    unit            TEXT DEFAULT 'each',
    unit_price      NUMERIC NOT NULL,
    received_qty    NUMERIC DEFAULT 0,
    status          TEXT CHECK (status IN ('pending','received')) DEFAULT 'pending',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- TIME TRACKING
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS time_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    estimate_id     UUID REFERENCES estimates(id) ON DELETE CASCADE,
    phase_id        UUID REFERENCES job_phases(id),
    worker_name     TEXT NOT NULL,
    trade           TEXT CHECK (trade IN ('general','framing','electrical','plumbing','hvac','drywall','painting','flooring','roofing','concrete','demolition','finish_carpentry','tile','insulation','landscaping','siding','gutters','windows_doors','other')),
    hourly_rate     NUMERIC(10,2),
    clock_in        TIMESTAMPTZ NOT NULL,
    clock_out       TIMESTAMPTZ,
    break_minutes   INTEGER DEFAULT 0,
    total_hours     NUMERIC,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- FIELD OPERATIONS
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS job_photos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    estimate_id     UUID REFERENCES estimates(id) ON DELETE CASCADE,
    phase_id        UUID REFERENCES job_phases(id),
    storage_path    TEXT NOT NULL,
    thumbnail_path  TEXT,
    file_name       TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type       TEXT DEFAULT 'image/jpeg',
    category        TEXT CHECK (category IN ('before','during','after','issue','progress','material','inspection','safety','other')) DEFAULT 'progress',
    caption         TEXT,
    tags            TEXT[] DEFAULT '{}',
    room            TEXT,
    gps_lat         NUMERIC,
    gps_lng         NUMERIC,
    taken_by        UUID REFERENCES auth.users(id),
    taken_by_name   TEXT,
    taken_at        TIMESTAMPTZ DEFAULT now(),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    estimate_id     UUID REFERENCES estimates(id) ON DELETE CASCADE,
    log_date        DATE NOT NULL,
    weather         TEXT CHECK (weather IN ('clear','cloudy','rain','snow','wind','extreme_heat','extreme_cold')),
    temperature_f   INTEGER,
    crew_count      INTEGER DEFAULT 0,
    hours_on_site   NUMERIC,
    work_performed  TEXT,
    materials_used  TEXT,
    deliveries      TEXT,
    visitors        TEXT,
    issues          TEXT,
    safety_notes    TEXT,
    delay_reason    TEXT,
    delay_hours     NUMERIC,
    created_by      UUID REFERENCES auth.users(id),
    created_by_name TEXT,
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, estimate_id, log_date)
);

-- ═══════════════════════════════════════
-- TAKEOFF & SELECTIONS
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS takeoff_measurements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    estimate_id     UUID REFERENCES estimates(id) ON DELETE CASCADE,
    page_number     INTEGER DEFAULT 1,
    plan_image_path TEXT,
    measurement_type TEXT CHECK (measurement_type IN ('linear','area','count','volume')),
    label           TEXT NOT NULL,
    value           NUMERIC NOT NULL,
    unit            TEXT DEFAULT 'ft',
    color           TEXT DEFAULT '#991b1b',
    points          JSONB DEFAULT '[]',
    linked_line_item_id UUID REFERENCES estimate_line_items(id),
    notes           TEXT,
    created_by      UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS selection_sheets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    estimate_id     UUID REFERENCES estimates(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    status          TEXT CHECK (status IN ('draft','sent','in_progress','completed','approved')) DEFAULT 'draft',
    due_date        DATE,
    notes           TEXT,
    sent_at         TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS selection_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sheet_id        UUID REFERENCES selection_sheets(id) ON DELETE CASCADE,
    category        TEXT NOT NULL,
    item_name       TEXT NOT NULL,
    room            TEXT,
    budget_amount   NUMERIC,
    options         JSONB NOT NULL DEFAULT '[]',
    selected_option INTEGER,
    actual_amount   NUMERIC,
    status          TEXT CHECK (status IN ('pending','selected','ordered','installed')) DEFAULT 'pending',
    sort_order      INTEGER,
    client_notes    TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- WARRANTY
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS warranty_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    estimate_id     UUID REFERENCES estimates(id) ON DELETE CASCADE,
    client_id       UUID REFERENCES clients(id),
    item_description TEXT NOT NULL,
    category        TEXT CHECK (category IN ('labor','material','structural','plumbing','electrical','hvac','roofing','flooring','painting','appliance','other')),
    warranty_start  DATE NOT NULL,
    warranty_end    DATE NOT NULL,
    status          TEXT CHECK (status IN ('active','claimed','in_progress','resolved','expired','voided')) DEFAULT 'active',
    claim_description TEXT,
    resolution      TEXT,
    cost_to_repair  NUMERIC,
    callback_date   DATE,
    callback_notes  TEXT,
    photos          TEXT[] DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- INTEGRATIONS
-- ═══════════════════════════════════════

CREATE TABLE IF NOT EXISTS integration_connections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id),
    provider        TEXT CHECK (provider IN ('quickbooks','stripe','twilio')) NOT NULL,
    realm_id        TEXT,
    access_token_encrypted  TEXT NOT NULL,
    refresh_token_encrypted TEXT,
    token_expires_at        TIMESTAMPTZ,
    refresh_token_expires_at TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT true,
    connected_at    TIMESTAMPTZ DEFAULT now(),
    disconnected_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, provider)
);

-- ═══════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_rate_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE takeoff_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies: allow authenticated users full access (tighten per-org later)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'organizations', 'org_members', 'billing_plans', 'subscriptions',
        'schedule_templates', 'job_phases', 'estimate_templates', 'labor_rate_presets',
        'subcontractors', 'sub_bids', 'purchase_orders', 'po_line_items',
        'time_entries', 'job_photos', 'daily_logs', 'takeoff_measurements',
        'selection_sheets', 'selection_items', 'warranty_items', 'integration_connections'
    ]
    LOOP
        EXECUTE format(
            'CREATE POLICY "auth_all_%1$s" ON %1$I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
            tbl
        );
    END LOOP;
END $$;

-- ═══════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_job_phases_estimate ON job_phases(estimate_id);
CREATE INDEX IF NOT EXISTS idx_job_phases_org ON job_phases(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_estimate ON time_entries(estimate_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org ON time_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_estimate ON job_photos(estimate_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_estimate ON daily_logs(estimate_id);
CREATE INDEX IF NOT EXISTS idx_sub_bids_estimate ON sub_bids(estimate_id);
CREATE INDEX IF NOT EXISTS idx_sub_bids_sub ON sub_bids(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_estimate ON purchase_orders(estimate_id);
CREATE INDEX IF NOT EXISTS idx_po_line_items_po ON po_line_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_takeoff_estimate ON takeoff_measurements(estimate_id);
CREATE INDEX IF NOT EXISTS idx_selection_sheets_estimate ON selection_sheets(estimate_id);
CREATE INDEX IF NOT EXISTS idx_selection_items_sheet ON selection_items(sheet_id);
CREATE INDEX IF NOT EXISTS idx_warranty_estimate ON warranty_items(estimate_id);
CREATE INDEX IF NOT EXISTS idx_warranty_client ON warranty_items(client_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_user ON integration_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_org ON estimates(organization_id);

-- Seed default billing plans
INSERT INTO billing_plans (id, name, price_monthly_cents, max_team_members, max_estimates_per_month, features) VALUES
    ('free',        'Free',        0,     1,  5,   '{"basic_estimates": true}'),
    ('apprentice',  'Apprentice',  2900,  3,  25,  '{"basic_estimates": true, "voice_ai": true}'),
    ('journeyman',  'Journeyman',  7900,  10, 100, '{"basic_estimates": true, "voice_ai": true, "portal": true, "scheduling": true}'),
    ('master',      'Master',      14900, 25, null, '{"basic_estimates": true, "voice_ai": true, "portal": true, "scheduling": true, "integrations": true}'),
    ('gc',          'General Contractor', 24900, null, null, '{"basic_estimates": true, "voice_ai": true, "portal": true, "scheduling": true, "integrations": true, "multi_project": true}')
ON CONFLICT (id) DO NOTHING;
