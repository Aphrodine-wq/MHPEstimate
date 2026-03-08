# Component Extraction Plan

## Executive Summary

14 component files compared across `apps/web/src/components/` and `apps/desktop/src/renderer/src/components/`. The duplication is severe -- most components are 90-100% identical. Extraction is feasible for 11 of 14 with minimal risk.

## Categories of Differences

| Code | Pattern | Strategy |
|------|---------|----------|
| D1 | Responsive padding: `px-4 md:px-8` (web) vs `px-8` (desktop) | Use responsive classes everywhere |
| D2 | Responsive grid: `grid-cols-1 lg:grid-cols-7` vs fixed `grid-cols-7` | Same as D1 |
| D3 | `usePersistedState` (web) vs `useState` (desktop) | Move hook to `@proestimate/ui` |
| D4 | Web has `role`, `aria-*`, keyboard nav; desktop lacks them | Use web version (superset) |
| D5 | Web uses `react-hot-toast`; desktop silently proceeds | Add toast dep to desktop |
| D6 | `process.env.NEXT_PUBLIC_*` vs `import.meta.env.VITE_*` | Inject via prop or PlatformContext |
| D7 | Asset import: `"/mhp-logo.png"` vs `import mhpLogo` | Accept `logoSrc` prop |
| D8 | Desktop has window controls + drag regions | `platform` prop |
| D9 | Redirect URLs differ | Accept `redirectUrl` prop |
| D10 | Desktop uses `lazy()` for CallAlexPanel | Keep lazy pattern |
| D11 | Web has PDF generation; desktop doesn't | Optional `onGeneratePDF` prop |
| D12 | Web has "Clear filters"; desktop doesn't | Keep it (harmless) |

## Component Verdicts

| Component | Similarity | Risk | Priority |
|-----------|-----------|------|----------|
| CallHistoryPage | **100% IDENTICAL** | None | 1 |
| AnalyticsPage | **100% IDENTICAL** | None | 2 |
| Modal.tsx | Already shared (re-export) | N/A | N/A |
| EmptyState.tsx | Already shared (re-export) | N/A | N/A |
| Profile | 98% (a11y attrs only) | Low | 3 |
| SplashScreen | 95% (logo import + timing) | Low | 4 |
| Dashboard | 96% (responsive + a11y) | Low | 5 |
| FormModals | 93% (toast + error handling) | Low | 6 |
| ClientsPage | 92% (persisted state + a11y + toast) | Low | 7 |
| InvoicesPage | 90% (toast + PDF button) | Low | 8 |
| EstimatesList | 88% (persisted state + a11y + PDF + clear filters) | Low-Med | 9 |
| CallAlex/Panel | 75% (env var + file split + lazy) | Low-Med | 10 |
| AuthScreen | 82% (env var + logo + redirect + drag region) | Low-Med | 11 |
| TopBar | 70% (window controls, drag, height, hamburger, sizes, icons) | Medium | 12 |

## Recommended Pattern: PlatformContext

Create `@proestimate/ui/src/platform.ts`:

```ts
interface PlatformConfig {
  platform: "web" | "desktop" | "mobile";
  logoSrc: string;
  agentId: string;
  redirectUrl: string;
  isDev: boolean;
  onGeneratePDF?: (estimate: Estimate, lineItems: EstimateLineItem[], client: Client | null) => Promise<void>;
}
```

Each app provides the context at its root. Components use `usePlatform()` for the few things that differ.

## Prerequisites

1. Move `usePersistedState` to `@proestimate/ui`
2. Add `react-hot-toast` to desktop dependencies
3. Create `PlatformContext` in shared package
4. Ensure `@proestimate/ui` peer deps include `@elevenlabs/react`

## Extraction Phases

### Phase 1: Identical Components (~30 min, zero risk)
- CallHistoryPage.tsx
- AnalyticsPage.tsx

### Phase 2: Near-Identical (~3.5 hr, low risk)
- Profile.tsx
- SplashScreen.tsx
- Dashboard.tsx
- FormModals.tsx
- ClientsPage.tsx
- InvoicesPage.tsx

### Phase 3: Structural Differences (~4.5 hr, medium risk)
- EstimatesList.tsx
- CallAlex.tsx / CallAlexPanel.tsx
- AuthScreen.tsx
- TopBar.tsx

**Total estimated effort: ~8.5 hours** (excluding testing)
