# ProEstimate AI - Complete Codebase Outline

**Generated**: March 10, 2026
**Root**: `/Users/jameswalton/Desktop/WORK/MHPEstimate/`

---

## Root Directory Structure

```
MHPEstimate/
|
|-- .github/                              # CI/CD Configuration
|   +-- workflows/
|       |-- ci.yml                        # Build, test, typecheck, security audit, Vercel preview
|       +-- playwright.yml                # E2E tests (web & desktop)
|
|-- apps/                                 # Application targets
|   |-- web/                              # Next.js 15 SPA (PRIMARY)
|   |-- desktop/                          # Electron 33 + Vite
|   +-- mobile/                           # Expo 52 + React Native (early)
|
|-- packages/                             # Shared monorepo packages
|   |-- shared/                           # Types, constants, schemas
|   |-- estimation-engine/                # Pure calculation functions
|   |-- ui/                               # Shared React components + hooks
|   +-- tsconfig/                         # Shared TypeScript configs
|
|-- supabase/                             # Database & backend
|   |-- migrations/                       # 12 SQL migration files
|   |-- functions/                        # Edge Functions
|   |-- config.toml                       # Local Supabase config
|   +-- seed.sql                          # Database seed data
|
|-- tests/                                # E2E test suites
|   +-- e2e/
|       |-- web/                          # 3 Playwright specs
|       |-- desktop/                      # 1 Electron Playwright spec
|       +-- mobile/                       # 1 mobile spec
|
|-- docs/                                 # Documentation
|   |-- adr/                              # Architecture Decision Records (4)
|   |-- plans/                            # Design plans
|   |-- Alex_Moasure_Prompt_Addition.md
|   |-- Moasure_Integration_Proposal.md
|   +-- LAUNCH_CHECKLIST.md
|
|-- data/                                 # Analysis & reference data
|   |-- extracted_estimates.json          # 9MB sample estimates
|   |-- mhp_pricing_database.json        # 99,688 price points
|   |-- pricing_summary.json             # Aggregated pricing
|   |-- scope_analysis.json              # Scope breakdowns
|   |-- generate_full_house_estimate.ts
|   |-- extract_all_estimates.py
|   |-- analyze_docs.py
|   +-- explore_structure.py
|
|-- estimates/                            # Sample estimate files
|   |-- owner-review-estimates.md
|   |-- mhp-logo.png
|   +-- MHP-2026-BANDO-001/              # Sample project folder
|
|-- scripts/
|   +-- seed-estimates.mjs               # Database seeding script
|
|-- CLAUDE.md                             # Claude Code project instructions
|-- ANALYSIS.md                           # Competitive analysis
|-- FEATURES.md                           # Feature inventory (this companion doc)
|-- README.md                             # Project readme
|-- CONTRIBUTING.md                       # Contribution guide
|-- ProEstimate_AI_PRD.md                 # Product requirements document
|-- ProEstimate_AI_Pricing.html           # Pricing page mockup
|-- ProEstimate_AI_Pricing.pdf            # Pricing PDF
|-- ProEstimate_AI_Local_Voice_Agent_Hardware_Guide.docx
|
|-- package.json                          # Root monorepo config (pnpm 10.28.2)
|-- pnpm-workspace.yaml                   # Workspace: apps/*, packages/*
|-- pnpm-lock.yaml                        # Lockfile
|-- turbo.json                            # Turborepo build orchestration
|-- playwright.config.ts                  # E2E test config
+-- .changeset/config.json                # Release management
```

---

## apps/web/ (Next.js 15 SPA)

The primary application. Single-page app at `/` using component-state routing (not Next.js pages).

```
apps/web/
|
|-- next.config.ts                        # CSP headers, transpile shared packages, Sentry
|-- package.json                          # Dependencies: react 19, next 15, supabase, recharts, react-pdf
|-- tsconfig.json                         # Extends @proestimate/tsconfig/nextjs
|-- vercel.json                           # Vercel deployment (mhpestimate.cloud)
|-- vitest.config.ts                      # Unit test config
|-- tailwind.config.ts                    # Tailwind CSS config
|-- postcss.config.js                     # PostCSS config
|-- sentry.client.config.ts              # Sentry browser error tracking
|-- sentry.server.config.ts              # Sentry server error tracking
|
|-- src/
|   |
|   |-- app/                              # Next.js App Router (minimal usage)
|   |   |-- layout.tsx                    # Root HTML layout
|   |   |-- page.tsx                      # Renders <App /> SPA
|   |   |-- globals.css                   # Global styles + Tailwind directives
|   |   |
|   |   |-- api/                          # API Routes (17 endpoints)
|   |   |   |
|   |   |   |-- health/
|   |   |   |   +-- route.ts              # GET /api/health - Status, version, env checks
|   |   |   |
|   |   |   |-- audit-log/
|   |   |   |   +-- route.ts              # GET /api/audit-log - Fetch audit entries
|   |   |   |
|   |   |   |-- pricing/
|   |   |   |   +-- route.ts              # GET /api/pricing - Historical price suggestions
|   |   |   |
|   |   |   |-- estimates/
|   |   |   |   +-- [id]/
|   |   |   |       |-- send/
|   |   |   |       |   +-- route.ts      # POST - Email estimate PDF to client (Resend)
|   |   |   |       |-- share/
|   |   |   |       |   +-- route.ts      # POST - Generate public portal share link
|   |   |   |       |-- sign/
|   |   |   |       |   +-- route.ts      # POST - Capture client signature
|   |   |   |       |-- versions/
|   |   |   |       |   +-- route.ts      # GET/POST - Estimate versioning
|   |   |   |       |-- reminders/
|   |   |   |       |   +-- route.ts      # POST - Send estimate reminder email
|   |   |   |       |-- change-orders/
|   |   |   |       |   +-- route.ts      # POST/PATCH/DELETE - Change order CRUD
|   |   |   |       +-- payment-link/
|   |   |   |           +-- route.ts      # POST - Generate Stripe payment link
|   |   |   |
|   |   |   |-- calls/
|   |   |   |   |-- to-estimate/
|   |   |   |   |   +-- route.ts          # POST - Convert voice transcript to estimate
|   |   |   |   +-- analyze-photo/
|   |   |   |       +-- route.ts          # POST - OCR/AI analysis of site photos
|   |   |   |
|   |   |   |-- portal/
|   |   |   |   +-- [id]/
|   |   |   |       |-- route.ts          # GET - Fetch estimate by share token (public)
|   |   |   |       +-- sign/
|   |   |   |           +-- route.ts      # POST - Client signs via portal
|   |   |   |
|   |   |   |-- team/
|   |   |   |   +-- invite/
|   |   |   |       |-- route.ts          # POST - Send team member invite email
|   |   |   |       +-- resend/
|   |   |   |           +-- route.ts      # POST - Resend invite email
|   |   |   |
|   |   |   +-- integrations/
|   |   |       +-- quickbooks/
|   |   |           +-- export/
|   |   |               +-- route.ts      # POST - Export to QuickBooks Online
|   |   |
|   |   +-- portal/
|   |       +-- [id]/
|   |           +-- page.tsx              # Public customer portal page (1,700+ lines)
|   |
|   |-- middleware.ts                     # Auth guard: checks sb-*-auth-token cookie
|   |
|   |-- components/                       # 44 React components
|   |   |
|   |   |-- [FRAMEWORK]
|   |   |   |-- App.tsx                   # (221L) Main SPA router, state mgmt, auth lifecycle
|   |   |   |-- AppContext.tsx            # (22L) Context type: nav, modal, editor, signout
|   |   |   |-- Sidebar.tsx              # (250L) Nav sidebar, mobile collapsible, role-aware
|   |   |   |-- TopBar.tsx               # (258L) Header, search, user dropdown, notifications
|   |   |   |-- SplashScreen.tsx         # (106L) App startup animation
|   |   |   |-- ErrorBoundary.tsx        # (110L) Error catching + Sentry
|   |   |   |-- Modal.tsx               # (9L) Base modal wrapper (a11y)
|   |   |   +-- EmptyState.tsx           # (2L) Empty list UI
|   |   |
|   |   |-- [AUTH & ONBOARDING]
|   |   |   |-- AuthScreen.tsx            # (458L) Login/signup/reset, domain restriction
|   |   |   +-- OnboardingWizard.tsx      # (432L) First-user step-by-step guide
|   |   |
|   |   |-- [PAGES]
|   |   |   |-- Dashboard.tsx             # (305L) KPIs, quote of day, recent, activity, pipeline
|   |   |   |-- EstimatesList.tsx         # (490L) Table, search, filter, detail panel, actions
|   |   |   |-- AnalyticsPage.tsx         # (598L) KPIs, charts (Recharts), top clients
|   |   |   |-- ClientsPage.tsx           # (369L) CRUD, inline edit, search, source tracking
|   |   |   |-- MaterialsPage.tsx         # (407L) Product catalog, search, pricing
|   |   |   |-- InvoicesPage.tsx          # (386L) Upload, OCR status, list
|   |   |   |-- SettingsPage.tsx          # (408L) Company info, flags, integrations, notifications
|   |   |   |-- TeamMembersPage.tsx       # (282L) List, roles, invite, activate/deactivate
|   |   |   |-- Profile.tsx              # (109L) User profile display
|   |   |   +-- CallHistoryPage.tsx       # (77L) Voice call history + transcripts
|   |   |
|   |   |-- [ESTIMATE EDITOR]
|   |   |   |-- EstimateEditorModal.tsx   # (564L) Full editor: header, items, summary, CO, photos, sig
|   |   |   |-- EstimatePDF.tsx           # (606L) React-PDF professional estimate layout
|   |   |   |-- InvoicePDF.tsx            # (410L) Invoice PDF generation
|   |   |   +-- estimate-editor/
|   |   |       |-- EstimateHeaderSection.tsx    # (~80L) Type, client, tier, address, date
|   |   |       |-- EstimateLineItemsSection.tsx # (~150L) Tabbed material/labor/sub items
|   |   |       |-- EstimateSummarySection.tsx   # (~80L) Overhead, contingency, tax, totals
|   |   |       |-- EstimateValidationPanel.tsx  # (~60L) PASS/FAIL validation display
|   |   |       +-- types.ts                     # Editor shared types
|   |   |
|   |   |-- [MODALS]
|   |   |   |-- FormModals.tsx            # (7L) Barrel re-export of all modals
|   |   |   |-- NewEstimateModal.tsx       # (133L) Create new estimate
|   |   |   |-- AddClientModal.tsx         # (94L) Add client form
|   |   |   |-- EditProfileModal.tsx       # (71L) Edit user profile
|   |   |   |-- LogExpenseModal.tsx        # (106L) Log job expense (UI only, no backend)
|   |   |   |-- UploadInvoiceModal.tsx     # (102L) Upload supplier invoice
|   |   |   |-- JobActualsModal.tsx        # (254L) Track actual vs estimate costs
|   |   |   +-- InviteTeamMemberModal.tsx  # (145L) Invite team member via email
|   |   |
|   |   +-- [SPECIALIZED FEATURES]
|   |       |-- CallAlex.tsx              # (321L) Voice AI FAB, ElevenLabs agent
|   |       |-- ChangeOrders.tsx          # (471L) CO create/edit/approve/reject
|   |       |-- DigitalSignature.tsx      # (205L) Canvas signature capture
|   |       |-- PhotoCapture.tsx          # (120L) Webcam/file photo capture
|   |       |-- PaymentStatus.tsx         # (158L) Stripe payment link & status
|   |       |-- QuickBooksExport.tsx      # (103L) QB export button + status
|   |       |-- IntegrationSettings.tsx   # (170L) QB/Moasure API config
|   |       |-- MoasureImport.tsx         # (237L) Measurement file import
|   |       +-- PriceFreshnessBadge.tsx   # (28L) Price age color indicator
|   |
|   |-- lib/                              # Utilities & data layer
|   |   |-- store.ts                      # (800+L) All data hooks: useEstimates, useClients,
|   |   |                                 #   useProducts, useInvoices, useVoiceCalls,
|   |   |                                 #   useTeamMembers, useCompanySettings, useJobActuals,
|   |   |                                 #   useChangeOrders, useAuditLog
|   |   |-- supabase.ts                   # (~50L) Supabase client singleton (browser)
|   |   |-- supabase-server.ts            # (~30L) Service-role client (API routes)
|   |   |-- auth-helpers.ts               # (~50L) getAuthUser(), getSession()
|   |   |-- audit.ts                      # (52L) logAudit(), getClientIp()
|   |   |-- rate-limit.ts                 # (~80L) Token bucket rate limiter
|   |   |-- portal-token.ts              # (~50L) JWT-like share tokens
|   |   |-- sentry.ts                     # (~30L) setUserContext(), clearUserContext()
|   |   |-- env.ts                        # (~20L) Type-safe env var access
|   |   |-- usePersistedState.ts          # (~30L) localStorage persistence hook
|   |   |-- useDarkMode.ts               # (~30L) Dark mode toggle hook
|   |   +-- VirtualList.tsx               # Virtual scrolling for large lists
|   |
|   +-- __tests__/                        # Unit tests (Vitest)
|       |-- setup.ts                      # Test setup (mocks)
|       |-- env.test.ts                   # Environment validation tests
|       |-- estimation-engine.test.ts     # Engine integration tests
|       |-- feature-flags.test.ts         # Feature flag tests
|       |-- package-bundles.test.ts       # Bundle pricing tests
|       |-- shared-utils.test.ts          # Utility function tests
|       |-- store.test.ts                 # Data hook tests
|       |-- useDarkMode.test.ts           # Dark mode hook tests
|       |-- CallAlex.test.tsx             # Voice AI component tests
|       |-- ErrorBoundary.test.tsx        # Error boundary tests
|       |-- Modal.test.tsx               # Modal component tests
|       +-- PageSkeleton.test.tsx         # Loading skeleton tests
+-- .next-dev/                            # Dev build artifacts (gitignored)
```

---

## apps/desktop/ (Electron 33)

Desktop app sharing most components with web.

```
apps/desktop/
|
|-- electron-vite.config.ts               # Vite bundler config
|-- electron-builder.yml                  # Packaging: macOS (.dmg), Windows (.nsis), Linux (.AppImage)
|-- package.json                          # Electron 33, electron-vite, better-sqlite3
|-- tsconfig.json                         # Main process TS config
|-- tsconfig.node.json                    # Node.js TS config
|-- tailwind.config.ts                    # Tailwind CSS
|-- postcss.config.js                     # PostCSS
|
|-- src/
|   |-- main/
|   |   +-- index.ts                      # Electron main process
|   |                                     #   - Frameless BrowserWindow
|   |                                     #   - IPC: minimize, maximize, close, get-version
|   |                                     #   - Deep-link: proestimate:// auth callback
|   |
|   |-- preload/
|   |   +-- index.ts                      # contextBridge: typed window.api
|   |
|   +-- renderer/src/                     # Renderer (React)
|       |-- App.tsx                        # Desktop root (shares structure with web)
|       |-- main.tsx                       # ReactDOM entry
|       |-- env.d.ts                       # Environment type declarations
|       |
|       |-- components/                   # 22 components (shares 15+ with web)
|       |   |-- AuthScreen.tsx
|       |   |-- Dashboard.tsx
|       |   |-- EstimatesList.tsx
|       |   |-- EstimateEditorModal.tsx
|       |   |-- EstimatePDF.tsx
|       |   |-- AnalyticsPage.tsx
|       |   |-- ClientsPage.tsx
|       |   |-- InvoicesPage.tsx
|       |   |-- MaterialsPage.tsx
|       |   |-- SettingsPage.tsx
|       |   |-- CallAlex.tsx
|       |   |-- CallAlexPanel.tsx         # Desktop-specific voice panel
|       |   |-- SplashScreen.tsx          # Desktop-specific splash
|       |   |-- FormModals.tsx
|       |   |-- TopBar.tsx
|       |   |-- Sidebar.tsx
|       |   |-- Profile.tsx
|       |   |-- TitleBar.tsx              # Custom frameless title bar
|       |   |-- ErrorBoundary.tsx
|       |   |-- OnboardingWizard.tsx
|       |   +-- (more shared components)
|       |
|       |-- lib/
|       |   |-- store.ts                  # Data hooks (same pattern as web)
|       |   +-- supabase.ts              # VITE_SUPABASE_URL/KEY
|       |
|       +-- assets/                       # Desktop-specific assets
|
|-- out/                                  # Built Electron output
+-- release/
    +-- mac/
        +-- ProEstimate AI.app/           # macOS application bundle
```

---

## apps/mobile/ (Expo 52)

Early-stage mobile app.

```
apps/mobile/
|
|-- app.json                              # Expo config (scheme: proestimate)
|-- babel.config.js                       # Babel config
|-- eas.json                              # EAS Build config (dev, preview, production)
|-- metro.config.js                       # Metro bundler config
|-- package.json                          # expo 52, react-native, supabase
|-- tsconfig.json                         # TypeScript config
|-- expo-env.d.ts                         # Expo type declarations
|-- index.js                              # Entry point
|
|-- app/                                  # Expo Router (file-based)
|   |-- _layout.tsx                       # Root layout
|   |-- auth.tsx                          # Auth screen
|   +-- (tabs)/
|       |-- _layout.tsx                   # Tab navigation layout
|       |-- index.tsx                     # Dashboard (stub)
|       |-- estimates.tsx                 # Estimates list (stub)
|       |-- clients.tsx                   # Clients list (stub)
|       |-- invoices.tsx                  # Invoices (stub)
|       +-- settings.tsx                  # Settings (stub)
|
|-- components/
|   |-- StatusBadge.tsx                   # Shared status badge
|   +-- EmptyState.tsx                    # Empty state component
|
|-- lib/
|   |-- store.ts                          # Data hooks (minimal)
|   |-- supabase.ts                       # Supabase client
|   +-- theme.ts                          # Theme constants
|
+-- assets/                               # App icons, splash images
```

---

## packages/shared/

Source of truth for types, constants, validation schemas.

```
packages/shared/
|
|-- package.json                          # Exports: ., ./types, ./constants, ./validation, ./utils
|-- tsconfig.json                         # Extends base config
|-- vitest.config.ts                      # Test config
|
+-- src/
    |-- index.ts                          # Barrel export
    |-- utils.ts                          # formatCurrency, formatDate, etc.
    |-- feature-flags.ts                  # 10 feature flags with defaults
    |
    |-- types/
    |   |-- index.ts                      # Re-exports all types
    |   |-- database.ts                   # 21 type definitions:
    |   |                                 #   EstimateStatus (8 states)
    |   |                                 #   EstimateTier (good/better/best + budget/midrange/high_end)
    |   |                                 #   TeamRole (6 roles)
    |   |                                 #   LineItemCategory (material/labor/subcontractor)
    |   |                                 #   Estimate, EstimateLineItem, Client, Product,
    |   |                                 #   UnifiedPricing, Invoice, VoiceCall, TeamMember,
    |   |                                 #   CompanySettings, JobActual, EstimateChangeOrder,
    |   |                                 #   AuditLogEntry, EstimateVersion, EstimateReminder
    |   +-- validation.ts                 # ValidationResult, ValidationCheck interfaces
    |
    |-- constants/
    |   |-- index.ts                      # Barrel export
    |   |-- pricing.ts                    # MHP_PRICING_DATABASE: 99,688 entries
    |   |                                 #   1,200+ line item names, 3-year history
    |   |                                 #   Fields: median, min, max, occurrences
    |   |-- pricing-database.ts           # lookupPrice(), searchPricing() (fuzzy match)
    |   |-- margins.ts                    # Default margins by tier & project type
    |   |-- project-types.ts              # 20+ project type definitions
    |   |-- project-templates.ts          # Pre-populated line items per project type
    |   |-- package-bundles.ts            # Combined project bundles with discounts
    |   +-- validation-checks.ts          # Validation rule definitions (8+ checks)
    |
    |-- validation/
    |   |-- index.ts                      # Schema barrel export
    |   +-- schemas.ts                    # Zod schemas: validateEstimate(), validateLineItem()
    |
    +-- __tests__/                        # 11 test files
        |-- margins.test.ts
        |-- pricing-database.test.ts
        |-- project-templates.test.ts
        |-- project-types.test.ts
        |-- schemas.test.ts
        +-- validation-checks.test.ts
```

---

## packages/estimation-engine/

Pure calculation functions for estimating.

```
packages/estimation-engine/
|
|-- package.json                          # Exports: .
|-- tsconfig.json
|-- vitest.config.ts
|
+-- src/
    |-- index.ts                          # Main exports:
    |                                     #   suggestPrice(name) -> median + confidence
    |                                     #   generateEstimateFromTemplate(type, tier)
    |                                     #   generatePackageEstimate(bundleId)
    |                                     #   runValidation(estimate)
    |                                     #   calculateEstimateTotals(items, overhead, contingency, tax)
    |
    |-- calculations/
    |   |-- materials.ts                  # Material cost aggregation by category
    |   |-- labor.ts                      # Labor time + rate calculations
    |   |-- margins.ts                    # Overhead, contingency, gross margin
    |   +-- pricing.ts                    # Historical pricing engine (fuzzy match)
    |
    |-- validation/
    |   +-- runner.ts                     # Runs 8+ checks: margin, missing items, etc.
    |
    |-- importers/
    |   |-- index.ts                      # parseMoasureFile(), detectFormat()
    |   |-- moasure-parser.ts             # JSON/XML Moasure file parsing
    |   |-- moasure-mapper.ts             # Map measurements to estimate line items
    |   +-- moasure-validator.ts          # Validate Moasure data format
    |
    +-- __tests__/
        |-- index.test.ts                 # Main function tests
        |-- pricing.test.ts               # Historical pricing tests
        |-- validation.test.ts            # Validation rule tests
        |-- edge-cases.test.ts            # Boundary conditions
        +-- moasure-import.test.ts        # Moasure import tests
```

---

## packages/ui/

Shared React primitives and hooks.

```
packages/ui/
|
|-- package.json                          # Exports: ., ./*, ./realtime, ./components
|-- tsconfig.json
|
+-- src/
    |-- index.ts                          # Barrel export
    |-- realtime.ts                       # Supabase Realtime hooks:
    |                                     #   useTableSync(table, filters) -> {data, loading, refresh}
    |                                     #   useRealtimeRow(table, id) -> {data, loading}
    |                                     #   useRealtimePresence(channel) -> {users}
    |
    |-- EXTRACTION_PLAN.md                # UI component extraction plan
    |
    +-- components/
        |-- index.ts                      # Component barrel export
        |-- Button.tsx                    # Styled button (variants, sizes)
        |-- Badge.tsx                     # Label badge
        |-- Card.tsx                      # Card container
        |-- Modal.tsx                     # A11y-compliant modal overlay
        |-- EmptyState.tsx                # Empty state (icon + message + action)
        +-- StatusBadge.tsx               # Estimate status badge (color-coded)
```

---

## packages/tsconfig/

Shared TypeScript configurations.

```
packages/tsconfig/
|
|-- package.json
|-- base.json                             # Base strict config
|-- nextjs.json                           # For apps/web (jsx: preserve, module: esnext)
|-- electron.json                         # For apps/desktop (node types)
+-- react-library.json                    # For packages/ui (declaration output)
```

---

## supabase/

Database schema, migrations, and edge functions.

```
supabase/
|
|-- config.toml                           # Local Supabase config
|-- seed.sql                              # Seed data
|
|-- migrations/                           # 12 migrations (1,096 lines total)
|   |-- 20250301000001_initial_schema.sql       # (310L) 13 core tables:
|   |                                           #   team_members, clients, products,
|   |                                           #   pricing_history, unified_pricing,
|   |                                           #   invoices, estimates (21 cols, 8 statuses),
|   |                                           #   estimate_line_items, estimate_change_orders,
|   |                                           #   voice_calls, job_actuals, company_settings
|   |-- 20250301000002_anon_access.sql          # Anonymous access policies
|   |-- 20250301000003_enable_realtime.sql      # Enable Realtime on 5 tables
|   |-- 20250301000004_auth_rls_policies.sql    # (201L) Auth-based RLS policies
|   |-- 20250301000005_settings_realtime.sql    # Settings Realtime
|   |-- 20250301000006_revoke_anon_access.sql   # Revoke anon (security fix)
|   |-- 20250301000007_performance_indexes.sql  # Indexes on estimate_number, status, dates
|   |-- 20250301000008_role_based_rls.sql       # (190L) Role hierarchy RLS
|   |-- 20250301000009_constraints_and_vector_index.sql  # Unique constraints, pgvector
|   |-- 20260310_audit_log.sql                  # (80L) Audit log table + RLS
|   |-- 20260310_estimate_reminders.sql         # (49L) Reminder scheduling table
|   +-- 20260310_estimate_versions.sql          # (34L) Estimate snapshot versioning
|
+-- functions/
    +-- calculate-estimate/
        +-- index.ts                      # Supabase Edge Function for server-side calc
```

---

## CI/CD & Testing

```
.github/workflows/
|-- ci.yml                                # Triggers: push to main, PRs
|   |-- Jobs: install, build, typecheck, lint, test, security-audit
|   +-- Vercel preview deployment on PRs
|
+-- playwright.yml                        # Triggers: push to main, PRs
    |-- Jobs: web E2E, desktop E2E
    +-- Uses: playwright.config.ts

tests/e2e/
|-- web/
|   |-- auth.spec.ts                      # Login, logout, auth redirect tests
|   |-- home.spec.ts                      # Dashboard load, KPI visibility
|   +-- navigation.spec.ts               # Sidebar nav, page transitions
|
|-- desktop/
|   +-- electron.spec.ts                  # Electron window, IPC, deep links
|
+-- mobile/
    +-- app.spec.ts                       # Mobile app launch, nav
```

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL                  # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY             # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY                 # Server-side (API routes)

# ElevenLabs
NEXT_PUBLIC_ELEVENLABS_AGENT_ID           # Voice AI agent UUID

# Sentry
NEXT_PUBLIC_SENTRY_DSN                    # Error tracking DSN
NEXT_PUBLIC_SENTRY_ENVIRONMENT            # production/staging/dev
SENTRY_AUTH_TOKEN                         # CI/CD source maps

# Email
RESEND_API_KEY                            # Resend email service
RESEND_FROM_EMAIL                         # estimates@northmshomepros.com

# Stripe (planned)
STRIPE_SECRET_KEY                         # Payment processing
STRIPE_WEBHOOK_SECRET                     # Webhook verification

# Desktop (Vite)
VITE_SUPABASE_URL                         # Desktop Supabase URL
VITE_SUPABASE_ANON_KEY                    # Desktop Supabase key
```

---

## Key Data Flow

```
User Action
    |
    v
React Component (apps/web/src/components/)
    |
    v
Data Hook (apps/web/src/lib/store.ts)
    |
    +---> Supabase Client (lib/supabase.ts)
    |         |
    |         v
    |     Supabase Postgres (RLS enforced)
    |         |
    |         v
    |     Realtime Channel (useTableSync)
    |         |
    |         v
    |     Auto-sync back to component state
    |
    +---> API Route (apps/web/src/app/api/)
              |
              v
          Server Supabase Client (service-role)
              |
              +---> External: Resend (email)
              +---> External: Stripe (payments)
              +---> External: QuickBooks (export)
              +---> Audit Log (supabase audit_log table)
```

```
Estimation Engine Flow:

suggestPrice(name)
    |
    v
Fuzzy match against MHP_PRICING_DATABASE (99,688 entries)
    |
    v
Return: { median, min, max, confidence, occurrences }

generateEstimateFromTemplate(type, tier)
    |
    v
Lookup project-templates.ts -> Get line items for type
    |
    v
Apply tier-specific pricing from margins.ts
    |
    v
Return: { lineItems[], overhead%, contingency%, tax% }
```

---

## File Count Summary

| Directory | Files | Lines (approx) |
|-----------|-------|----------------|
| apps/web/src/components/ | 44 | ~9,600 |
| apps/web/src/lib/ | 12 | ~1,200 |
| apps/web/src/app/api/ | 17 routes | ~800 |
| apps/web/src/__tests__/ | 12 | ~600 |
| apps/desktop/src/ | ~30 | ~5,000 |
| apps/mobile/ | ~12 | ~500 |
| packages/shared/src/ | ~21 | ~2,000 |
| packages/estimation-engine/src/ | ~15 | ~1,500 |
| packages/ui/src/ | ~8 | ~300 |
| supabase/migrations/ | 12 | ~1,100 |
| tests/e2e/ | 5 | ~200 |
| **TOTAL** | **~190** | **~22,800** |
