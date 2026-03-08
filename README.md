# ProEstimate AI — AI-Powered Estimation Platform for MHP Construction

An intelligent estimation platform designed for residential home improvement and remodeling. Built as a monorepo with shared logic across web, desktop, and mobile platforms.

## Features

- **Voice AI Assistant** — Call Alex for instant estimation help via phone
- **Smart Estimation** — Calculation engine powered by historical MHP pricing data and ML suggestions
- **Multi-Platform** — Web app (Vercel), desktop app (Electron), and mobile (Expo)
- **Real-time Collaboration** — Multiple users estimating together
- **Document Export** — PDF and DOCX exports of estimates
- **Change Order Workflow** — Track estimate modifications and approvals
- **Analytics Dashboard** — Insights into estimation patterns and accuracy

## Project Structure

This is a **monorepo** managed with **pnpm 10.28.2** and **Turbo 2**.

```
MHPEstimate/
├── apps/
│   ├── web/                  # Next.js 15 web application
│   ├── desktop/              # Electron 33 desktop application
│   └── mobile/               # Expo 52 React Native mobile app
├── packages/
│   ├── shared/               # Shared types, constants, utils
│   ├── estimation-engine/    # Core estimation logic (client + server)
│   ├── ui/                   # Shared UI components
│   └── tsconfig/             # TypeScript configuration presets
├── docs/
│   └── adr/                  # Architecture Decision Records
├── supabase/                 # Database migrations and functions
├── data/                     # Seed data, pricing databases
├── tests/                    # Integration and E2E tests
└── turbo.json                # Turbo build configuration
```

## Prerequisites

- **Node.js** — v20.0.0 or later (see `.nvmrc` for pinned version)
- **pnpm** — v10.28.2 (install via `npm install -g pnpm@10.28.2`)
- **Git** — For version control
- **Supabase CLI** — For local database development (optional)

## Environment Variables

Create a `.env.local` file in the root and each app directory with the following:

### Root `.env.local`

```env
# Supabase (shared across all apps)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Feature Flags (optional - stored in Supabase)
# Leave empty to use defaults

# Voice AI (ElevenLabs + Twilio)
ELEVENLABS_API_KEY=your-api-key
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+1234567890
```

### Web App (`apps/web/.env.local`)

```env
# Public keys (visible in browser)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Secret keys (server-side only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

### Desktop App (`apps/desktop/.env.local`)

```env
# Electron main process
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Mobile App (`apps/mobile/.env.local`)

```env
# Expo configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/MHPEstimate.git
cd MHPEstimate
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all workspace dependencies and links packages locally.

### 3. Set Up Environment Variables

Copy template files and fill in your Supabase credentials:

```bash
cp .env.example .env.local
# Edit .env.local with your actual values

cp apps/web/.env.example apps/web/.env.local
cp apps/desktop/.env.example apps/desktop/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```

### 4. Initialize Supabase (Local Development)

```bash
# Start Supabase local environment
supabase start

# Apply migrations
supabase db push

# Seed initial data (optional)
pnpm run seed
```

### 5. Run Development Servers

**Web App**
```bash
pnpm dev:web
# Opens on http://localhost:3000
```

**Desktop App**
```bash
pnpm dev:desktop
# Opens Electron window in development mode
```

**Mobile App**
```bash
pnpm dev:mobile
# Opens Expo dev menu
# Use Expo Go app on mobile device to scan QR code
```

**All Apps (parallel)**
```bash
pnpm dev
```

## Build & Deployment

### Web (Vercel)

```bash
# Build
pnpm build:web

# Deploy to Vercel (connected to GitHub)
# Automatically triggers on push to main
```

### Desktop (Electron Builder)

```bash
# Build for distribution
pnpm build:desktop

# Creates .dmg (macOS), .exe (Windows), .AppImage (Linux)
# Installers in apps/desktop/dist/
```

### Mobile (Expo)

```bash
# Build for production
eas build --platform all

# Submit to app stores
eas submit
```

## Testing

```bash
# Run all tests (unit + integration)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run E2E tests (Playwright)
pnpm test:e2e

# Check code coverage
pnpm test:coverage
```

## Linting & Formatting

```bash
# Lint all packages
pnpm lint

# Format with Prettier
pnpm format

# Type check
pnpm type-check
```

## Database Schema

The Supabase database includes:

- **users** — User accounts (managed by Supabase Auth)
- **companies** — Organization accounts
- **company_members** — User-company membership with roles
- **company_settings** — Feature flags, configurations per company
- **estimates** — Estimation records
- **estimate_items** — Line items within estimates
- **pricing_history** — Historical pricing for ML training
- **change_orders** — Change order records
- **audit_log** — Compliance and audit trail

See `supabase/migrations/` for complete schema.

## Packages

### `@proestimate/shared`

Core types, constants, and utilities shared across all apps.

```bash
pnpm add @proestimate/shared
```

Key exports:
- Types: `Estimate`, `EstimateItem`, `User`, `Company`
- Constants: `PROJECT_TYPES`, `PRICE_FRESHNESS_THRESHOLDS`
- Utils: `calculateEstimate()`, `validateEstimate()`
- Feature flags: `resolveFlags()`, `isFeatureEnabled()`

### `@proestimate/estimation-engine`

The core estimation calculation engine. Can run on client (read-only) or server (with permission checks).

```bash
pnpm add @proestimate/estimation-engine
```

Key exports:
- `EstimationEngine` — Main class
- `calculateLineItem()` — Single line calculation
- `calculateEstimate()` — Full estimate calculation
- `applyMarginGuardrails()` — Safety constraints

### `@proestimate/ui`

Shared React UI components built with Shadcn/UI.

```bash
pnpm add @proestimate/ui
```

Key components:
- `EstimateForm`, `EstimateViewer` — Estimate UI
- `ProjectSelector`, `LineItemInput` — Input components
- `EstimateTable`, `SummaryCard` — Display components
- `LoadingSpinner`, `ErrorBoundary` — Utilities

### `@proestimate/tsconfig`

Shared TypeScript configuration.

```bash
pnpm add -D @proestimate/tsconfig
```

## Feature Flags

Feature flags are stored in `company_settings.feature_flags` (JSON) in Supabase. They enable gradual rollouts and A/B testing.

```typescript
import { resolveFlags, isFeatureEnabled } from '@proestimate/shared';

const flags = resolveFlags(remoteFlags);

if (isFeatureEnabled(flags, 'voice_ai')) {
  // Show "Call Alex" button
}
```

Available flags:
- `voice_ai` — Voice AI enabled
- `dark_mode` — Dark mode UI
- `ml_pricing` — ML pricing suggestions
- `ocr_invoices` — Invoice OCR processing
- `mobile_app` — Mobile app access
- `multi_tier` — Multi-tier estimates
- `realtime_collab` — Real-time collaboration
- `document_export` — PDF/DOCX export
- `analytics` — Analytics dashboard
- `change_orders` — Change order workflow

## Architecture Decision Records

See `docs/adr/` for detailed decisions on:

1. **Monorepo Strategy** — Why Turbo + pnpm
2. **Supabase Backend** — Why Postgres + RLS + pgvector
3. **Shared Estimation Engine** — Why extracting logic into a package
4. **Cross-Platform Approach** — Why web + desktop + mobile

## Contributing

1. **Branch naming** — `feature/`, `fix/`, `docs/`
2. **Commits** — Use conventional commits (`feat:`, `fix:`, `docs:`)
3. **Pull Requests** — Target `develop` branch, request review
4. **Code Style** — Prettier + ESLint (run `pnpm format && pnpm lint`)

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass (`pnpm test`)
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] Environment variables set (check Vercel/GitHub Secrets)
- [ ] Database migrations applied
- [ ] Feature flags configured in Supabase
- [ ] Changelog updated
- [ ] Version bumped in `package.json`

## Troubleshooting

### `pnpm install` fails

```bash
# Clear cache and reinstall
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Supabase connection error

```bash
# Verify credentials in .env.local
# Check Supabase project status: https://app.supabase.com

# For local development
supabase status
supabase start
```

### Turbo cache issues

```bash
# Clear Turbo cache
pnpm turbo prune --scope='*'

# Rebuild
pnpm build
```

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3001 pnpm dev:web
```

## Support

- **Documentation** — See `docs/` directory
- **Issues** — GitHub Issues for bugs and features
- **Discussion** — GitHub Discussions for questions
- **Team** — Slack channel #proestimate-dev

## License

Proprietary — MS Home Pros

---

**Last Updated** — March 2026
