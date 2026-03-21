# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                  # All apps (web + desktop)
pnpm dev:web              # Web only (Next.js on localhost:3000)
pnpm dev:desktop          # Desktop only (Electron + Vite)

# Build
pnpm build                # All apps (excludes mobile)
pnpm build:all            # All apps including mobile

# Type checking & linting
pnpm typecheck
pnpm lint

# Tests
pnpm test                 # All unit tests (vitest)
pnpm --filter web test    # Web unit tests only
pnpm --filter web test:watch          # Watch mode
pnpm --filter web test:coverage       # Coverage report

# E2E tests (Playwright)
pnpm test:e2e
pnpm test:e2e:web
pnpm test:e2e:desktop

# Desktop packaging
pnpm --filter desktop package:mac

# Database
pnpm db:migrate           # supabase db push
pnpm db:reset
```

## Architecture

**Monorepo** managed with pnpm workspaces + Turborepo.

### Apps
- `apps/web` — Next.js 15 + React 19, deployed to mhpestimate.cloud. Single-page SPA at `/` that renders `<App />`, which handles auth/routing internally via component state (not Next.js routing). Route protection is done in `src/middleware.ts` by checking for a Supabase auth cookie.
- `apps/desktop` — Electron 33 + Vite + React 19. Uses `electron-vite` for the build. Custom frameless window with IPC for minimize/maximize/close. Deep-link protocol `proestimate://` for Supabase auth callbacks.
- `apps/mobile` — Expo 52 + React Native 0.76. File-based routing via Expo Router. Zustand for state. Minimal — 15% complete.

### Packages
- `packages/shared` — Types (`database.ts`, `validation.ts`), constants (`pricing.ts`, `margins.ts`, `validation-checks.ts`), and Zod schemas. Source of truth for all DB entity types.
- `packages/estimation-engine` — Pure calculation functions (materials, labor, margins), validation runner, historical pricing lookup (`suggestPrice`, `generateEstimateFromTemplate`, `generatePackageEstimate`), and Moasure file importers.
- `packages/ui` — Shared React primitives (`Button`, `Badge`, `Card`), shared components (`Modal`, `EmptyState`, `StatusBadge`), and the `useTableSync` / `useRealtimeRow` / `useRealtimePresence` hooks in `realtime.ts`.
- `packages/tsconfig` — Shared TypeScript configs for each target (nextjs, electron, react-library, base).

### Data Layer

**Supabase** is the backend (auth + Postgres + Realtime). The client is a nullable singleton:
- Web: `apps/web/src/lib/supabase.ts` — reads `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Desktop: `apps/desktop/src/renderer/src/lib/supabase.ts` — reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`

All data hooks live in `lib/store.ts` in each app. They use `useTableSync` from `@proestimate/ui/realtime` for Supabase Realtime subscriptions. The pattern is: hooks return `{ data, loading, refresh }` and keep local state in sync with the DB automatically.

**Tables** (30+): Core — `estimates`, `estimate_line_items`, `estimate_change_orders`, `estimate_versions`, `estimate_reminders`, `estimate_templates`, `estimate_embeddings`, `clients`, `products`, `unified_pricing`, `pricing_history`, `invoices`, `voice_calls`, `team_members`, `company_settings`, `job_actuals`, `job_phases`. Org/billing — `organizations`, `org_members`, `subscriptions`, `billing_plans`. Operations — `subcontractors`, `sub_bids`, `purchase_orders`, `daily_logs`, `time_entries`, `job_photos`, `labor_rate_presets`, `schedule_templates`, `selection_sheets`, `takeoff_measurements`, `warranty_items`, `integration_connections`, `audit_log`. Migrations in `supabase/migrations/` (15 files).

### Tier naming
- DB schema uses `good / better / best` — UI maps these to `budget / midrange / high_end`. Both values appear in `EstimateTier`.

### Auth
- Email/password via Supabase Auth. Domain restriction to `@northmshomepros.com` is enforced client-side only in `AuthScreen`.
- Web middleware (`src/middleware.ts`) checks for `sb-*-auth-token` cookie; redirects unauthenticated users to `/`.
- Desktop handles Supabase auth callbacks via `proestimate://auth/callback` deep link.

### Voice / AI
- ElevenLabs agent ("Call Alex") via `@elevenlabs/react` — agent ID must be provided via env var.
- `CallAlex.tsx` component handles the in-app voice conversation flow.

### Pricing Engine
- Historical pricing database in `packages/shared/src/constants/pricing.ts` (MHP's 3-year estimate history).
- `suggestPrice(name)` → fuzzy-matches line item name → returns median price + confidence level.
- `generatePackageEstimate(bundleId)` → combines templates, deduplicates shared line items, applies bundle discount.

### Desktop-specific
- Main process: `apps/desktop/src/main/index.ts` — creates frameless `BrowserWindow`, registers IPC handlers (get-version, window-minimize, window-maximize, window-close), handles `proestimate://` deep links.
- Preload: `apps/desktop/src/preload/index.ts` — exposes a typed `window.api` to the renderer via `contextBridge`.
- Local offline storage: `better-sqlite3` available in main process for offline-capable features.

### Testing
- Unit tests: Vitest (`apps/web/src/__tests__/`). Test setup in `src/__tests__/setup.ts`.
- E2E tests: Playwright (`tests/e2e/`), configured in `playwright.config.ts`.
