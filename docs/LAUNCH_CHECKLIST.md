# Monday Launch Checklist — MHP Estimate

## Before Deploy (You Do Locally)

### 1. Install Dependencies
```bash
pnpm install
```
This picks up all new deps added during the review pass:
- `zod` (env validation)
- `@sentry/nextjs` (error monitoring)
- `vitest`, `@testing-library/*`, `jsdom` (testing)
- `@vitejs/plugin-react` (test runner)
- `@changesets/cli` (versioning)

### 2. Run the Full Build
```bash
pnpm turbo build --filter=web
```
Fix any TypeScript errors that surface. The build must pass cleanly.

### 3. Run Tests
```bash
pnpm test
```
Should run Vitest for both `apps/web` and `packages/shared`. All tests must pass.

### 4. Run Linting + Type Check
```bash
pnpm lint
pnpm typecheck
```

### 5. Apply Database Migrations
```bash
# IMPORTANT: Back up your database first
pnpm supabase db push
```
Two new migrations will run:
- `20250301000008_role_based_rls.sql` — Adds role-based access control functions and tightened RLS policies + audit_log table
- `20250301000009_constraints_and_vector_index.sql` — Adds CHECK constraints on numeric fields + IVFFlat vector index

**Pre-flight check**: Before running migration 009, verify no existing estimates have negative `grand_total`, `materials_subtotal`, or `labor_subtotal`, or `gross_margin_pct` outside 0-100:
```sql
SELECT id, grand_total, materials_subtotal, labor_subtotal, gross_margin_pct
FROM estimates
WHERE grand_total < 0 OR materials_subtotal < 0 OR labor_subtotal < 0
   OR gross_margin_pct < 0 OR gross_margin_pct > 100;
```
If rows are returned, fix them before deploying.

### 6. Set Environment Variables
Make sure these are set in your production environment (Vercel, Railway, etc.):

**Required:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Recommended:**
- `NEXT_PUBLIC_SENTRY_DSN` — Get from sentry.io after creating a Next.js project
- `ELEVENLABS_API_KEY` — For voice AI features
- `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` — For voice AI "Alex" agent

### 7. Deploy Edge Functions
```bash
pnpm supabase functions deploy calculate-estimate
```

## Deploy

### 8. Push to Main
```bash
git add -A
git commit -m "feat: v1.0.0 launch — AI estimation platform"
git push origin main
```
CI will run: build → lint → typecheck → test → security audit.

### 9. Verify Production
After deploy completes:
- [ ] Visit `/api/health` — should return `{ status: "ok" }`
- [ ] Sign in with Supabase auth
- [ ] Create a test estimate
- [ ] Verify voice AI works (if ElevenLabs configured)
- [ ] Check Sentry dashboard for any errors (if DSN configured)
- [ ] Test on mobile viewport (responsive)

## Post-Launch

- [ ] Monitor Sentry for first 24 hours
- [ ] Check `/api/health` from uptime monitor
- [ ] Walk dad through the platform
- [ ] Collect feedback for v1.1
