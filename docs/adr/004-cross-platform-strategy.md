# ADR 004: Cross-Platform Strategy (Web + Desktop + Mobile)

**Status:** Accepted

**Date:** March 2025

## Context

ProEstimate serves different user personas in the MHP industry:

1. **Office Staff** — Need web-based estimation and management
   - Access from any computer
   - Reliable internet connectivity
   - Collaborative workflows

2. **Field Technicians** — Need mobile and offline access
   - On-site estimation (in vehicles, outdoor)
   - Intermittent connectivity
   - Quick, focused workflows

3. **Management** — Need desktop app for daily work
   - Offline-first functionality
   - Integrated with local documents
   - Dedicated application experience

### The Challenge

Build for three platforms with:
- **Consistent UX** — Users recognize the same product
- **Shared Logic** — Estimation engine identical across all apps
- **Code Reuse** — Don't duplicate UI/business logic
- **Platform Features** — Leverage native capabilities (camera, offline storage, desktop menu)
- **Development Efficiency** — One team maintaining three apps
- **Cost** — Affordable development and deployment

## Decision

We chose a **multi-platform strategy** with a shared foundation:

```
┌─────────────────────────────────────────────────────┐
│         Shared Packages (@proestimate/*)             │
│  - Types, Constants, Utils                           │
│  - Estimation Engine (calculation logic)             │
│  - UI Components (React components)                  │
└─────────────────────────────────────────────────────┘
           ↓              ↓              ↓
    ┌─────────────┬──────────────┬──────────────┐
    │   Web App   │  Desktop App │ Mobile App   │
    │ (Next.js)   │ (Electron)   │ (Expo/RN)    │
    └─────────────┴──────────────┴──────────────┘
           ↓              ↓              ↓
    Browser, Vercel   OS Window    Mobile Device
```

### Framework Choices

| Platform | Framework | Why |
|----------|-----------|-----|
| **Web** | Next.js 15 | Server-side rendering, API routes, deployment |
| **Desktop** | Electron 33 | Proven, large ecosystem, Windows/Mac/Linux |
| **Mobile** | Expo 52 + React Native | JavaScript code sharing, over-the-air updates |

### Code Sharing

| Layer | Shared? | Method |
|-------|---------|--------|
| Business Logic | ✅ Yes | `@proestimate/estimation-engine` npm package |
| Types/Constants | ✅ Yes | `@proestimate/shared` npm package |
| UI Components | ✅ Partial | `@proestimate/ui` (web + mobile), custom desktop |
| Styling | ✅ Partial | TailwindCSS (web + mobile), custom (desktop) |
| API Client | ✅ Yes | Supabase JS SDK (all platforms) |

## Alternatives Considered

### 1. Web-Only with PWA
```
Single web app with offline support and home screen shortcut
```
- **Pros:** One codebase, one deployment
- **Cons:** Limited offline capability, no camera access, clunky UX, icon limitations
- **Rejected:** Field techs need robust offline and native feel

### 2. Native Per Platform
```
Native iOS (Swift) + Android (Kotlin) + macOS (Swift) + Windows (C#)
```
- **Pros:** Best performance, access to all native APIs
- **Cons:** 3-4 different codebases, huge engineering overhead, expensive
- **Rejected:** Not feasible for early-stage startup

### 3. React Native + React Native Web
```
Share React Native code across iOS, Android, web
```
- **Pros:** One React codebase for all
- **Cons:** Web support is second-class, design patterns differ, fragmented ecosystem
- **Rejected:** Web deserves first-class experience

### 4. Flutter for Mobile + Web
```
Flutter for mobile and web, separate web frontend
```
- **Pros:** Flutter has web support
- **Cons:** Dart-only (no JavaScript sharing), smaller ecosystem, learning curve
- **Rejected:** JavaScript ecosystem richer, team expertise

### 5. Tauri for Desktop + Web
```
Tauri for desktop, Expo for mobile, Next.js for web
```
- **Pros:** Lighter than Electron, Rust integration possible
- **Cons:** Smaller ecosystem, immature, fewer examples
- **Rejected:** Electron more proven, larger community

## Consequences

### Positive
- **Shared Logic** — Estimation engine identical across all platforms
- **Code Reuse** — ~60% code shared (business logic, types, API client)
- **Consistent UX** — Users recognize same product across devices
- **Native Features** — Each platform optimized for its environment
  - Web: No installation, instant access
  - Desktop: Offline, local file system, native menus
  - Mobile: Camera, geolocation, background sync
- **Development Efficiency** — One team, shared infrastructure
- **Scalability** — Can add platforms (web app → Slack app, CLI tool)
- **JavaScript Ecosystem** — Large community, many libraries

### Negative
- **Platform Differences** — UX/features may vary per platform
- **Maintenance** — Three different app stores/deployment processes
- **Testing** — Must test on three platforms
- **Learning Curve** — Team must learn Next.js, Electron, React Native
- **Performance Trade-off** — Not as fast as native, but acceptable for this domain
- **Electron Size** — Desktop app ~150MB (acceptable trade-off)

## Architecture

### Monorepo Structure
```
apps/
  ├── web/              # Next.js 15
  │   ├── pages/
  │   ├── components/
  │   ├── app/          # App router
  │   └── public/
  ├── desktop/          # Electron 33
  │   ├── src/
  │   ├── main.ts       # Electron main process
  │   ├── renderer/     # Electron renderer (React)
  │   └── preload.ts
  └── mobile/           # Expo 52
      ├── app/          # Expo Router
      ├── components/
      └── eas.json      # Expo config

packages/
  ├── shared/           # Types, constants, utils
  ├── estimation-engine/  # Calculation logic
  ├── ui/               # Shared components (React)
  └── tsconfig/         # TypeScript presets
```

### Component Sharing Strategy

**Fully Shared** (100% code reuse):
- Estimation calculations (`@proestimate/estimation-engine`)
- Data types and constants (`@proestimate/shared`)
- Utility functions

**Mostly Shared** (80% code reuse):
- Form validation
- API client initialization
- State management patterns
- Business logic hooks

**Platform-Specific** (custom implementations):
- UI components (web uses Shadcn/UI, mobile uses custom, desktop uses custom)
- Styling (TailwindCSS for web/mobile, CSS modules for desktop)
- Navigation (Next.js pages → Expo Router → Electron windows)

### Estimation Engine (Shared)

```typescript
// packages/estimation-engine/index.ts
export class EstimationEngine {
  calculateLineItem(input: LineItemInput): LineItemResult
  calculateEstimate(estimate: Estimate): EstimateResult
  validateEstimate(estimate: Estimate): ValidationResult
}

// All three apps use identical logic
import { EstimationEngine } from '@proestimate/estimation-engine';
const engine = new EstimationEngine();
const result = engine.calculateEstimate(estimate);
```

### UI Components (Partial Sharing)

**Shared Package** (`@proestimate/ui`):
- Built with React primitives
- Used by web and mobile
- Platform-agnostic

```typescript
// packages/ui/src/EstimateForm.tsx
import { Input, Button, Select } from '@proestimate/ui';

export function EstimateForm({ /* ... */ }) {
  return (
    <div>
      <Input label="Project Type" />
      <Button>Calculate</Button>
    </div>
  );
}
```

**Web-Specific:**
- Shadcn/UI + TailwindCSS
- Server-side features (streaming, middleware)
- Form optimization

**Mobile-Specific:**
- React Native primitives
- Mobile-optimized forms
- Gesture handling

**Desktop-Specific:**
- Native Electron components
- Desktop menus
- System integrations

### API Client (Shared)

```typescript
// Shared Supabase client setup
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Used identically in all three apps
const { data, error } = await supabase
  .from('estimates')
  .select('*');
```

## Platform-Specific Features

### Web (Next.js)
- Server-side rendering
- API routes (`/api/*`)
- Middleware (auth, logging)
- Static generation
- Streaming
- Search engine friendly

### Desktop (Electron)
- File system access
- Native menus and dialogs
- Tray integration
- Native notifications
- Hardware access (printers)
- Offline storage (SQLite)

### Mobile (React Native)
- Camera access (for invoice photos)
- Geolocation
- Push notifications
- Local storage
- Background sync
- App store distribution

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Run all dev servers
pnpm dev

# Or individual apps
pnpm dev:web      # http://localhost:3000
pnpm dev:desktop  # Electron window
pnpm dev:mobile   # Expo tunnel
```

### Building

```bash
# Web
pnpm build:web
# Output: .next/ for Next.js deployment

# Desktop
pnpm build:desktop
# Output: dmg/exe/AppImage in apps/desktop/dist/

# Mobile
pnpm build:mobile
# Output: IPA/APK via EAS Build
```

### Testing

```bash
# All tests
pnpm test

# Specific app
pnpm test:web
pnpm test:desktop
pnpm test:mobile
```

## Deployment

| Platform | Tool | Frequency | Audience |
|----------|------|-----------|----------|
| Web | Vercel | On every push | All users |
| Desktop | Electron Builder | Manual (monthly) | Windows/Mac/Linux |
| Mobile | EAS Build | Manual (monthly) | App stores |

## Offline Support

Each platform handles offline differently:

**Web:**
- Service Worker caching
- IndexedDB for local estimates
- Sync queue for pending changes

**Desktop:**
- Local SQLite database
- Background sync daemon
- Tray notification on sync status

**Mobile:**
- React Query offline mode
- Local async storage
- Background task for sync

## Scalability

This architecture supports future expansion:
- **Slack Bot** — Share estimation logic via Slack API
- **CLI Tool** — Command-line estimation tool
- **API Server** — Public API for integrations
- **Watch App** — Apple Watch estimation widget

All would reuse `@proestimate/estimation-engine` and shared types.

## Related ADRs

- ADR 001: Monorepo with Turbo + pnpm
- ADR 002: Supabase as Backend
- ADR 003: Shared Estimation Engine

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Electron Documentation](https://www.electronjs.org/docs)
- [React Native Documentation](https://reactnative.dev/docs)
- [Expo Documentation](https://docs.expo.dev/)
- [Monorepo Pattern: Code Sharing](https://monorepo.tools/)
