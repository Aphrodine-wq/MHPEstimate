# ADR 003: Shared Estimation Engine Package

**Status:** Accepted

**Date:** March 2025

## Context

ProEstimate needs to perform the same estimation calculations across three platforms:
- **Web** — Office-based estimation (Next.js)
- **Desktop** — Field technician offline (Electron)
- **Mobile** — On-site estimation (React Native)

The estimation logic includes:
- **Line Item Calculations** — Material costs, labor, overhead
- **Pricing Lookups** — Database searches for current pricing
- **Margin Guardrails** — Safety constraints on pricing
- **Multi-Tier Estimates** — Premium/standard/budget variants
- **Change Order Logic** — Modifications and recalculations

### The Problem

**Option 1: Code Duplication**
- Copy estimation logic to each app
- Leads to drift, inconsistency, maintenance burden
- Different results on different platforms (unacceptable)

**Option 2: Backend-Only Calculation**
- Only calculate on server via API
- Requires network call for every calculation
- Cannot work offline (mobile/desktop)
- Slow user experience (no instant feedback)

**Option 3: Shared Package (Chosen)**
- Extract logic into npm package
- Use on client (read-only) and server (with permissions)
- Single source of truth
- Enables offline capability

## Decision

We created **`@proestimate/estimation-engine`** as a shared npm package containing:

### Core Exports

```typescript
// Main class for estimation
export class EstimationEngine {
  calculateLineItem(input: LineItemInput): LineItemResult
  calculateEstimate(estimate: Estimate): EstimateResult
  applyMarginGuardrails(margin: number): number
}

// Utility functions
export function validateLineItem(item: LineItemInput): ValidationResult
export function validateEstimate(estimate: Estimate): ValidationResult
export function applyMarginGuardrails(margin: number, project: ProjectType): number
```

### Key Features

- **No External Dependencies** — Only depends on `@proestimate/shared` (types/constants)
- **Client-Safe** — No database connections, pure calculations
- **Serializable** — Can be used in workers, serverless functions
- **Testable** — Comprehensive unit tests with fixtures
- **Typed** — Full TypeScript support with strict types

## Alternatives Considered

### 1. API-Only Approach
```
Client → API Request → Server Calculation → Response
```
- **Pros:** Centralized, easy to secure
- **Cons:** No offline, slow, depends on network
- **Rejected:** Breaks offline requirement

### 2. Code Generation
```
Write logic once → Generate code for web/desktop/mobile
```
- **Pros:** Shared source, platform-specific output
- **Cons:** Complex tooling, harder to debug
- **Rejected:** Overkill, npm package simpler

### 3. WebAssembly (WASM)
```
Write in Rust → Compile to WASM → Use in JS
```
- **Pros:** Performance, language agnostic
- **Cons:** Complex build, harder debugging
- **Rejected:** Premature optimization

## Consequences

### Positive
- **Single Source of Truth** — One version across all platforms
- **Offline Support** — Works without network (mobile/desktop)
- **Instant Feedback** — No API roundtrip for calculations
- **Type Safety** — Full TypeScript types shared
- **Testability** — All logic covered by unit tests
- **Performance** — In-process calculation, no network latency
- **Versioning** — Can pin versions per app

### Negative
- **Client Exposure** — Logic visible to end users (no secrets)
- **Consistency Risk** — If not careful, client/server versions can diverge
- **Package Size** — Increases bundle size for web (mitigated by tree-shaking)
- **Update Cycle** — All apps must update to use new logic

## Architecture

### Package Layout

```
packages/estimation-engine/
├── src/
│   ├── engine.ts           # Main EstimationEngine class
│   ├── calculators/
│   │   ├── line-item.ts    # Single item calculation
│   │   ├── estimate.ts     # Full estimate calculation
│   │   ├── margins.ts      # Margin guardrails
│   │   └── taxes.ts        # Tax calculations
│   ├── validators/
│   │   ├── line-item.ts
│   │   ├── estimate.ts
│   │   └── pricing.ts
│   ├── types.ts            # Internal types
│   └── index.ts            # Public API
├── __tests__/
│   ├── engine.test.ts
│   ├── calculators/
│   └── validators/
├── package.json
└── tsconfig.json
```

### Usage on Client

```typescript
// Web app (Next.js)
import { EstimationEngine } from '@proestimate/estimation-engine';

const engine = new EstimationEngine();
const result = engine.calculateLineItem({
  type: 'materials',
  quantity: 10,
  unitPrice: 50,
  markup: 1.25,
});

// React component updates instantly
setEstimate(result);
```

### Usage on Server

```typescript
// API route with permission checks
import { EstimationEngine } from '@proestimate/estimation-engine';
import { checkEstimatePermission } from '@/auth';

export async function POST(req: Request) {
  const estimate = await req.json();

  // Verify user owns this estimate
  const hasAccess = await checkEstimatePermission(estimate.id, user);
  if (!hasAccess) return new Response('Forbidden', { status: 403 });

  // Calculate (same logic as client)
  const engine = new EstimationEngine();
  const result = engine.calculateEstimate(estimate);

  // Save to database
  await saveEstimate(result);

  return Response.json(result);
}
```

### Usage on Mobile

```typescript
// React Native (Expo)
import { EstimationEngine } from '@proestimate/estimation-engine';

const engine = new EstimationEngine();
const offline = engine.calculateEstimate(estimate);
// Works completely offline, syncs when online
```

## Testing Strategy

### Unit Tests
```typescript
describe('EstimationEngine', () => {
  it('calculates line items correctly', () => {
    const engine = new EstimationEngine();
    const result = engine.calculateLineItem(/* ... */);
    expect(result.total).toBe(expected);
  });
});
```

### Snapshot Tests
- Verify calculation outputs against golden snapshots
- Catch unintended changes to algorithms

### Property Tests
- Generate random inputs, verify invariants
- Example: Total >= sum of parts

## Security Considerations

### What's Safe to Calculate on Client
- ✅ Pricing lookups (public data)
- ✅ Margin calculations
- ✅ Tax calculations
- ✅ Summary totals

### What Requires Server Validation
- ❌ Permission to access pricing (check on server)
- ❌ Discount codes (validate server-side)
- ❌ Special rates (stored encrypted, keyed)
- ❌ Audit requirements (logged on server)

### Implementation Pattern

```typescript
// Client calculates for UX feedback
const draft = engine.calculateEstimate(estimate);
setDraftEstimate(draft);

// Server validates and persists
const validated = await saveEstimate(estimate);
// Server also recalculates to verify client didn't cheat
```

## Version Coordination

Apps can pin different versions:
```json
{
  "dependencies": {
    "@proestimate/estimation-engine": "^1.2.3"
  }
}
```

Breaking changes use semver:
- `1.2.3` → `1.2.4` — Bug fix
- `1.2.3` → `1.3.0` — New feature (backward compatible)
- `1.2.3` → `2.0.0` — Breaking change

Changelog documents all changes for coordinated updates.

## Related ADRs

- ADR 001: Monorepo with Turbo + pnpm
- ADR 002: Supabase as Backend
- ADR 004: Cross-Platform Strategy

## References

- [npm Workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [Sharing Code in Monorepos](https://monorepo.tools/)
- [OWASP: Code Reuse](https://owasp.org/www-community/vulnerabilities/Code_Reuse)
