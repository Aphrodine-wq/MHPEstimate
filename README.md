# MHP Estimate — AI-Powered Estimation Platform

Construction estimation platform built for MHP Construction. Voice AI assistant, smart pricing engine, multi-platform (web, desktop, mobile). Deployed at [mhpestimate.cloud](https://mhpestimate.cloud).

## Features

- **Voice AI Assistant (Call Alex)** — ElevenLabs-powered voice estimation via phone and in-app
- **Smart Estimation Engine** — Calculation engine with historical MHP pricing data, template generation, and margin guardrails
- **Multi-Platform** — Web (Vercel), Desktop (Electron), Mobile (Expo)
- **Live Pricing** — Price Scraper MCP for Home Depot/Lowe's pricing with freshness tracking
- **Real-time Collaboration** — Supabase Realtime for multi-user estimating
- **PDF Export** — Estimate document packages with line items, payment schedules, terms
- **Change Order Workflow** — Track estimate modifications and approvals
- **Stripe Billing** — Subscription management and payment processing
- **Invoice OCR** — Parse supplier invoices with Anthropic AI
- **Analytics Dashboard** — Estimation patterns, accuracy insights, job actuals tracking

## Stack

| Layer | Technology |
|-------|-----------|
| Web | Next.js 15, React 19, Tailwind CSS 3.4 |
| Desktop | Electron 33, Vite, React 19 |
| Mobile | Expo 52, React Native 0.76 |
| Database | Supabase (PostgreSQL + pgvector + Realtime + Auth) |
| AI | Anthropic SDK, ElevenLabs |
| Payments | Stripe |
| Email | Resend |
| Voice | Twilio + ElevenLabs |
| PDF | @react-pdf/renderer |
| Testing | Vitest, Playwright |
| Monitoring | Sentry |
| Build | Turbo 2, pnpm 10.28 |

## Project Structure

```
MHPEstimate/
├── apps/
│   ├── web/                  # Next.js 15 SPA (32 API route dirs, 77 components)
│   ├── desktop/              # Electron 33 + Vite (frameless window, IPC, deep links)
│   └── mobile/               # Expo 52 React Native (file-based routing)
├── packages/
│   ├── shared/               # Types, constants, Zod validation schemas
│   ├── estimation-engine/    # Calculations, pricing, importers, validation
│   ├── ui/                   # Shared React components + Realtime hooks
│   └── tsconfig/             # TypeScript config presets
├── supabase/
│   ├── migrations/           # 15 SQL migration files
│   ├── functions/            # Edge functions
│   └── seed.sql              # Seed data (8 templates, 23 labor rates, 5 schedule templates)
├── tests/
│   └── e2e/                  # Playwright tests (web + desktop)
├── docs/
│   ├── adr/                  # Architecture Decision Records (4)
│   ├── plans/                # Design plans
│   └── LAUNCH_CHECKLIST.md   # Pre-launch verification
├── data/                     # Pricing databases
├── Price Scraper MCP/        # Live pricing microservice (Docker)
├── production-hardening/     # Security hardening scripts + docs
├── CLAUDE.md                 # Developer guide for Claude Code
├── CONTRIBUTING.md           # Contributing guidelines
├── FEATURES.md               # Feature inventory with completion %
├── turbo.json                # Turbo build configuration
└── pnpm-workspace.yaml       # Workspace config
```

## Prerequisites

- **Node.js** v20.0.0+ (see `.nvmrc`)
- **pnpm** v10.28.2 (`npm install -g pnpm@10.28.2`)
- **Supabase CLI** (for local database development)

## Setup

```bash
git clone https://github.com/Aphrodine-wq/MHPEstimate.git
cd MHPEstimate
pnpm install
```

### Environment Variables

Create `.env.local` in root and each app directory.

#### Required

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Root + Web | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Root + Web | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Root + Web | Supabase admin key (server-side) |
| `VITE_SUPABASE_URL` | Desktop | Supabase URL for Electron |
| `VITE_SUPABASE_ANON_KEY` | Desktop | Supabase anon key for Electron |

#### Voice AI & Telephony

| Variable | Purpose |
|----------|---------|
| `ELEVENLABS_API_KEY` | ElevenLabs API |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | Agent ID for Call Alex |
| `NEXT_PUBLIC_ELEVENLABS_API_KEY` | Client-side ElevenLabs |
| `TWILIO_ACCOUNT_SID` | Twilio voice |
| `TWILIO_AUTH_TOKEN` | Twilio auth |

#### Payments & Billing

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe server key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification |

#### AI & Email

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API for invoice OCR |
| `RESEND_API_KEY` | Email delivery |
| `RESEND_FROM_EMAIL` | Sender address |

#### Integrations

| Variable | Purpose |
|----------|---------|
| `QB_CLIENT_ID` | QuickBooks OAuth |
| `QB_CLIENT_SECRET` | QuickBooks OAuth |
| `QB_REDIRECT_URI` | QuickBooks callback URL |
| `BLS_API_KEY` | Bureau of Labor Statistics (commodity pricing) |
| `EIA_API_KEY` | Energy Information Admin (commodity pricing) |
| `FRED_API_KEY` | Federal Reserve data (commodity pricing) |
| `MCP_SCRAPER_URL` | Price Scraper MCP endpoint |
| `PRICE_SCRAPER_API_KEY` | Price Scraper auth |
| `INTEGRATION_ENCRYPTION_KEY` | Integration credential encryption |
| `PORTAL_TOKEN_SECRET` | Client portal token signing |

#### Monitoring

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry client DSN |
| `SENTRY_DSN` | Sentry server DSN |

### Database Setup

```bash
supabase start
supabase db push        # Apply migrations
pnpm db:seed            # Seed MHP data
```

## Development

```bash
pnpm dev                # All apps
pnpm dev:web            # Web only (localhost:3000)
pnpm dev:desktop        # Desktop only (Electron)
pnpm dev:mobile         # Mobile (Expo)
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all dev servers |
| `pnpm dev:web` | Web dev server |
| `pnpm dev:desktop` | Desktop dev (Electron) |
| `pnpm dev:mobile` | Mobile dev (Expo) |
| `pnpm build` | Build all apps (except mobile) |
| `pnpm build:all` | Build all apps including mobile |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | ESLint |
| `pnpm test` | All unit tests (Vitest) |
| `pnpm test:e2e` | All E2E tests (Playwright) |
| `pnpm test:e2e:web` | Web E2E only |
| `pnpm test:e2e:desktop` | Desktop E2E only |
| `pnpm test:e2e:ui` | Playwright interactive UI |
| `pnpm db:migrate` | Apply Supabase migrations |
| `pnpm db:reset` | Reset database |
| `pnpm db:seed` | Seed database |
| `pnpm clean` | Clean all build artifacts + node_modules |
| `pnpm changeset` | Create changeset for versioning |
| `pnpm version` | Bump versions from changesets |
| `pnpm release` | Build + publish packages |

## Database Schema

Supabase PostgreSQL with pgvector. 30+ tables across 15 migration files.

### Core Tables

| Table | Purpose |
|-------|---------|
| `estimates` | Estimation records (number, client, status, totals, tier) |
| `estimate_line_items` | Line items per estimate (qty, unit price, extended price) |
| `estimate_change_orders` | Change order tracking (cost impact, status) |
| `estimate_versions` | Estimate revision history |
| `estimate_reminders` | Follow-up notification scheduling |
| `estimate_templates` | Reusable estimate templates |
| `estimate_embeddings` | pgvector embeddings for similarity search |
| `clients` | Client contact records |
| `team_members` | Internal staff with roles |
| `products` | Material catalog (SKUs for HD/Lowe's, tiered pricing) |
| `pricing_history` | Historical pricing by source (hd/lowes/invoice) |
| `unified_pricing` | Latest price rollup with freshness |
| `invoices` | Supplier invoices (OCR, parsed data) |
| `voice_calls` | Call records (Twilio SID, transcript, extracted data) |
| `job_actuals` | Actual cost/duration vs estimate |
| `job_phases` | Project phase tracking |

### Organization & Billing

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant orgs |
| `org_members` | Org membership with roles |
| `subscriptions` | Stripe subscription state |
| `billing_plans` | Plan definitions |
| `company_settings` | Org config + feature flags (JSONB) |

### Operations

| Table | Purpose |
|-------|---------|
| `audit_log` | Activity tracking (entity, action, user, changes) |
| `subcontractors` | Sub contact records |
| `sub_bids` | Subcontractor bid tracking |
| `purchase_orders` | PO management |
| `po_line_items` | PO line items |
| `daily_logs` | Daily job logs |
| `time_entries` | Labor time tracking |
| `job_photos` | Job site photos |
| `labor_rate_presets` | Labor rate templates |
| `schedule_templates` | Schedule templates |
| `selection_sheets` | Material selection sheets |
| `selection_items` | Selection sheet items |
| `takeoff_measurements` | Moasure measurement imports |
| `warranty_items` | Warranty tracking |
| `integration_connections` | Third-party integration credentials |

See `supabase/migrations/` for complete schema.

## Packages

### `@proestimate/shared`

Types, constants, and Zod validation schemas shared across all apps.

- Types: `Estimate`, `EstimateLineItem`, `Client`, `Product`, `TeamMember`, `Organization`
- Constants: `PROJECT_TYPES`, `PRICE_FRESHNESS_THRESHOLDS`, margin configs, validation checks
- Validation: Zod schemas for all entities

### `@proestimate/estimation-engine`

Pure calculation functions for estimation.

- `calculateMaterials()`, `calculateLabor()`, `calculateMargins()` — core math
- `suggestPrice(name)` — fuzzy-match line item name to historical pricing
- `generateEstimateFromTemplate()`, `generatePackageEstimate()` — template-based generation
- `applyMarginGuardrails()` — safety constraints on margins
- Moasure/plans/takeoff importers
- Validation runner (15-point checklist)

### `@proestimate/ui`

Shared React components and Realtime hooks.

- Components: `Button`, `Badge`, `Card`, `Modal`, `EmptyState`, `StatusBadge`
- Realtime: `useTableSync`, `useRealtimeRow`, `useRealtimePresence` hooks

### `@proestimate/tsconfig`

Shared TypeScript configs for nextjs, electron, react-library, and base targets.

## Architecture Decisions

See `docs/adr/` for detailed records:

1. **Monorepo with Turbo + pnpm** — shared code across 3 platforms
2. **Supabase as Backend** — Postgres + RLS + pgvector + Realtime
3. **Shared Estimation Engine** — extracted calculation logic into a package
4. **Cross-Platform Strategy** — web + desktop + mobile approach

## Auth

Email/password via Supabase Auth. Domain restriction to `@northmshomepros.com` enforced client-side. Web middleware checks `sb-*-auth-token` cookie. Desktop handles auth callbacks via `proestimate://auth/callback` deep link.

## Testing

- **Unit tests**: 594+ tests (Vitest) across web app and packages
- **E2E tests**: Playwright for web + desktop
- All tests passing as of latest build

## Deployment

- **Web**: Vercel (auto-deploy on push to main) at mhpestimate.cloud
- **Desktop**: Electron Builder → macOS dmg
- **Mobile**: Expo EAS Build + Submit

## License

Proprietary — MHP Construction

---

**Last Updated** — March 2026
