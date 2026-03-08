# ADR 001: Monorepo with Turbo + pnpm

**Status:** Accepted

**Date:** March 2025

## Context

ProEstimate needs to support three distinct platforms simultaneously:
- **Web application** (Next.js) — Office-based estimation
- **Desktop application** (Electron) — Field technician offline capability
- **Mobile application** (React Native/Expo) — On-site mobile access

Each platform requires shared business logic for estimation calculations, data types, and utilities. Duplicating this code across three applications creates maintenance burden, inconsistency, and drift.

We needed a solution that:
- Shares code across multiple applications
- Manages different package/workspace dependencies
- Provides fast builds and intelligent caching
- Minimizes configuration overhead
- Works with standard Node.js tooling

## Decision

We chose **Turbo + pnpm** for monorepo management, specifically:
- **pnpm 10.28.2** — Package manager with workspace support
- **Turbo 2** — Build orchestration with caching
- **Workspaces** — Multiple apps and packages in single repository

Structure:
```
apps/
  ├── web/           # Next.js 15
  ├── desktop/       # Electron 33
  └── mobile/        # Expo 52

packages/
  ├── shared/        # Types, constants, utils
  ├── estimation-engine/  # Core calculation logic
  ├── ui/            # Shared React components
  └── tsconfig/      # TypeScript presets
```

## Alternatives Considered

### Nx
- **Pros:** Sophisticated build graph, migration helpers, plugin ecosystem
- **Cons:** Steeper learning curve, requires more configuration, heavier footprint

### Lerna
- **Pros:** Works well with npm, popular in ecosystem
- **Cons:** Slow builds, limited caching, less maintained than Turbo

### Yarn Workspaces
- **Pros:** Good compatibility, hoisting algorithm
- **Cons:** Slower than pnpm, no native build caching

### Multiple Repositories (Polyrepo)
- **Pros:** Independent deployment cycles, clear separation
- **Cons:** Code duplication, synchronization headaches, release coordination complexity

## Consequences

### Positive
- **Shared Code** — Single source of truth for estimation engine
- **Fast Builds** — Turbo's content-addressable caching skips unnecessary rebuilds
- **Dependency Management** — pnpm's strict hoisting prevents phantom dependencies
- **Disk Space** — pnpm's content-addressable storage reduces duplication
- **Developer Experience** — Single `pnpm install`, consistent tooling across apps
- **Parallel Tasks** — Turbo runs independent tasks in parallel across packages
- **Incremental CI** — Affected packages only run in CI pipelines

### Negative
- **Setup Complexity** — New developers must understand monorepo structure
- **Workspace Dependency Management** — Cross-package versions must be coordinated
- **Release Process** — All packages share version number (versioning via Changesets)
- **Repository Size** — Single large repository instead of multiple smaller ones

## Implementation Details

### Key Files

- `pnpm-workspace.yaml` — Defines workspace packages
- `turbo.json` — Build pipeline configuration, caching rules
- Root `package.json` — Workspace dependencies and scripts
- Each app/package has its own `package.json`

### Running Tasks

```bash
# Run dev servers for all apps
pnpm dev

# Build specific app
pnpm build:web

# Run tests across all packages
pnpm test

# Turbo runs only affected packages (based on dependency graph)
```

### Caching

Turbo caches:
- Build outputs (`dist/`, `out/`, `.next/`)
- Test results (for CI)
- Lint reports

Cache is local by default; can be shared via Vercel.

## Related ADRs

- ADR 002: Supabase as Backend
- ADR 003: Shared Estimation Engine
- ADR 004: Cross-Platform Strategy

## References

- [Turbo Documentation](https://turbo.build/repo/docs)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Monorepo Patterns](https://monorepo.tools/)
