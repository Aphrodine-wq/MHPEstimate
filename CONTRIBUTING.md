# Contributing to MHP Estimate

## Getting Started

```bash
# 1. Clone and install
git clone <repo-url>
cd MHPEstimate
pnpm install

# 2. Set up environment
cp apps/web/.env.local.example apps/web/.env.local
# Fill in your Supabase credentials

# 3. Run the database migrations
pnpm supabase db push

# 4. Start dev servers
pnpm dev          # All apps in parallel
pnpm dev:web      # Web only
pnpm dev:desktop  # Desktop only
pnpm dev:mobile   # Mobile only
```

## Project Structure

```
MHPEstimate/
├── apps/
│   ├── web/          Next.js 15 (primary UI)
│   ├── desktop/      Electron 33 + Vite
│   └── mobile/       Expo 52 + React Native
├── packages/
│   ├── shared/       Types, constants, feature flags, utils
│   ├── estimation-engine/  Core pricing + estimation logic
│   ├── ui/           Shared React components
│   └── tsconfig/     Shared TypeScript configs
├── supabase/         Migrations, edge functions, seed data
└── docs/adr/         Architecture Decision Records
```

## Development Workflow

### Branch Naming
- `feat/description` — New features
- `fix/description` — Bug fixes
- `chore/description` — Tooling, deps, configs

### Commit Messages
Use conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`

### Testing
```bash
pnpm test           # Run all tests
pnpm test:web       # Web tests only (Vitest)
pnpm lint           # ESLint across all packages
pnpm typecheck      # TypeScript checks
```

### Changesets
We use [Changesets](https://github.com/changesets/changesets) for versioning:
```bash
pnpm changeset       # Create a changeset for your PR
pnpm changeset:version  # Bump versions (CI does this)
```

## Key Conventions

- **TypeScript strict mode** everywhere (`strict: true` + `noUncheckedIndexedAccess`)
- **Shared code** goes in `packages/shared` — never duplicate logic across apps
- **Feature flags** are defined in `packages/shared/src/feature-flags.ts` and stored in `company_settings`
- **CSS variables** for theming — never use hardcoded colors in the web app
- **Supabase RLS** on every table — test policies before deploying
- **Error boundaries** wrap all major UI sections

## Supabase

### Migrations
```bash
pnpm supabase migration new <name>   # Create a new migration
pnpm supabase db push                # Apply migrations
pnpm supabase db reset               # Reset and re-apply all
```

### Edge Functions
Edge functions live in `supabase/functions/`. Deploy with:
```bash
pnpm supabase functions deploy <name>
```

## Architecture Decisions
Check `docs/adr/` for major architectural decisions and their rationale.
