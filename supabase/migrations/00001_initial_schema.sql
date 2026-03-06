-- ProEstimate AI — Initial Database Schema
-- Based on PRD v1.0.0

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ═══════════════════════════════════════
-- TEAM & AUTH
-- ═══════════════════════════════════════

CREATE TABLE team_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id         UUID REFERENCES auth.users(id),
    full_name       TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    phone           TEXT,
    role            TEXT CHECK (role IN ('estimator','pm','field_tech','sales','admin','owner')),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- CLIENTS
-- ═══════════════════════════════════════

CREATE TABLE clients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    address_line1   TEXT,
    address_line2   TEXT,
    city            TEXT,
    state           TEXT,
    zip             TEXT,
    notes           TEXT,
    source          TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- PRICING & PRODUCTS (created before estimates for FK)
-- ═══════════════════════════════════════

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    subcategory     TEXT,
    brand           TEXT,
    sku_hd          TEXT,
    sku_lowes       TEXT,
    sku_internal    TEXT,
    unit            TEXT NOT NULL,
    specifications  JSONB DEFAULT '{}',
    tier            TEXT CHECK (tier IN ('budget','mid','premium')),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- INVOICES (created before pricing_history for FK)
-- ═══════════════════════════════════════

CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name   TEXT,
    invoice_number  TEXT,
    invoice_date    DATE,
    file_path       TEXT NOT NULL,
    ocr_raw_text    TEXT,
    parsed_data     JSONB,
    status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','processing','review','confirmed','error')),
    uploaded_by     UUID REFERENCES team_members(id),
    reviewed_by     UUID REFERENCES team_members(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE pricing_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID REFERENCES products(id),
    source          TEXT NOT NULL CHECK (source IN ('home_depot','lowes','invoice','manual')),
    price           NUMERIC(10,2) NOT NULL,
    unit            TEXT,
    store_location  TEXT,
    supplier_name   TEXT,
    invoice_id      UUID REFERENCES invoices(id),
    observed_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE unified_pricing (
    product_id      UUID PRIMARY KEY REFERENCES products(id),
    unified_price   NUMERIC(10,2) NOT NULL,
    hd_price        NUMERIC(10,2),
    lowes_price     NUMERIC(10,2),
    invoice_price   NUMERIC(10,2),
    freshness       TEXT CHECK (freshness IN ('green','yellow','orange','red')),
    last_updated    TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- ESTIMATES
-- ═══════════════════════════════════════

CREATE TABLE estimates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_number TEXT UNIQUE NOT NULL,
    client_id       UUID REFERENCES clients(id),
    estimator_id    UUID REFERENCES team_members(id),
    reviewer_id     UUID REFERENCES team_members(id),
    project_type    TEXT NOT NULL,
    project_address TEXT,
    status          TEXT DEFAULT 'draft'
                    CHECK (status IN ('draft','in_review','revision_requested',
                                      'approved','sent','accepted','declined','expired')),
    scope_inclusions    JSONB DEFAULT '[]',
    scope_exclusions    JSONB DEFAULT '[]',
    site_conditions     TEXT,
    materials_subtotal  NUMERIC(12,2) DEFAULT 0,
    labor_subtotal      NUMERIC(12,2) DEFAULT 0,
    subcontractor_total NUMERIC(12,2) DEFAULT 0,
    permits_fees        NUMERIC(12,2) DEFAULT 0,
    overhead_profit     NUMERIC(12,2) DEFAULT 0,
    contingency         NUMERIC(12,2) DEFAULT 0,
    tax                 NUMERIC(12,2) DEFAULT 0,
    grand_total         NUMERIC(12,2) DEFAULT 0,
    gross_margin_pct    NUMERIC(5,2),
    estimated_start     DATE,
    estimated_end       DATE,
    valid_through       DATE,
    tier                TEXT DEFAULT 'better'
                        CHECK (tier IN ('good','better','best')),
    source              TEXT DEFAULT 'manual'
                        CHECK (source IN ('manual','voice','template')),
    call_id             UUID,
    validation_results  JSONB,
    validation_passed   BOOLEAN DEFAULT false,
    pdf_path            TEXT,
    docx_path           TEXT,
    version             INT DEFAULT 1,
    parent_estimate_id  UUID REFERENCES estimates(id),
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now(),
    sent_at             TIMESTAMPTZ,
    accepted_at         TIMESTAMPTZ,
    declined_at         TIMESTAMPTZ
);

CREATE TABLE estimate_line_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id     UUID REFERENCES estimates(id) ON DELETE CASCADE,
    line_number     INT NOT NULL,
    category        TEXT NOT NULL,
    description     TEXT NOT NULL,
    quantity        NUMERIC(10,2),
    unit            TEXT,
    unit_price      NUMERIC(10,2),
    extended_price  NUMERIC(12,2),
    notes           TEXT,
    product_id      UUID REFERENCES products(id),
    price_source    TEXT,
    price_date      DATE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE estimate_change_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id     UUID REFERENCES estimates(id),
    change_number   INT NOT NULL,
    description     TEXT NOT NULL,
    cost_impact     NUMERIC(12,2) NOT NULL,
    timeline_impact TEXT,
    status          TEXT DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
    client_signed   BOOLEAN DEFAULT false,
    signed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- VOICE CALLS
-- ═══════════════════════════════════════

CREATE TABLE voice_calls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id       UUID REFERENCES team_members(id),
    twilio_call_sid TEXT,
    source          TEXT CHECK (source IN ('twilio','in_app')),
    duration_sec    INT,
    transcript      TEXT,
    extracted_data  JSONB,
    recording_path  TEXT,
    estimates_created UUID[],
    started_at      TIMESTAMPTZ DEFAULT now(),
    ended_at        TIMESTAMPTZ
);

-- ═══════════════════════════════════════
-- LEARNING SYSTEM
-- ═══════════════════════════════════════

CREATE TABLE job_actuals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id     UUID REFERENCES estimates(id),
    actual_materials    NUMERIC(12,2),
    actual_labor        NUMERIC(12,2),
    actual_subs         NUMERIC(12,2),
    actual_total        NUMERIC(12,2),
    actual_duration_days INT,
    actual_margin_pct   NUMERIC(5,2),
    variance_materials  NUMERIC(5,2),
    variance_labor      NUMERIC(5,2),
    variance_total      NUMERIC(5,2),
    notes               TEXT,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE estimate_embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id     UUID REFERENCES estimates(id),
    embedding       vector(1536),
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- COMPANY SETTINGS
-- ═══════════════════════════════════════

CREATE TABLE company_settings (
    key             TEXT PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════

CREATE INDEX idx_estimates_client ON estimates(client_id);
CREATE INDEX idx_estimates_estimator ON estimates(estimator_id);
CREATE INDEX idx_estimates_status ON estimates(status);
CREATE INDEX idx_estimates_project_type ON estimates(project_type);
CREATE INDEX idx_line_items_estimate ON estimate_line_items(estimate_id);
CREATE INDEX idx_pricing_history_product ON pricing_history(product_id);
CREATE INDEX idx_pricing_history_observed ON pricing_history(observed_at);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_voice_calls_caller ON voice_calls(caller_id);
CREATE INDEX idx_job_actuals_estimate ON job_actuals(estimate_id);

-- ═══════════════════════════════════════
-- ROW-LEVEL SECURITY
-- ═══════════════════════════════════════

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_actuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (all authenticated team members can read)
-- More granular policies per role will be added in subsequent migrations

CREATE POLICY "Team members can read all team members"
    ON team_members FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team members can read all clients"
    ON clients FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team members can read all estimates"
    ON estimates FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team members can read all line items"
    ON estimate_line_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team members can read all products"
    ON products FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team members can read unified pricing"
    ON unified_pricing FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Team members can read company settings"
    ON company_settings FOR SELECT
    TO authenticated
    USING (true);
