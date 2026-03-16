# Production Hardening — MHPEstimate

## What was done

### New files created (ready to use)

| File | Purpose |
|------|---------|
| `apps/web/src/lib/api-validation.ts` | Zod schemas for all API request bodies |
| `apps/web/src/lib/env-validation.ts` | Environment variable validation at startup |
| `apps/web/src/instrumentation.ts` | Next.js hook that runs env validation on boot |
| `apps/web/src/app/api/portal-viewed/route.ts` | Tracks when clients view estimates in portal |
| `apps/web/src/app/api/portal-change-order-sign/route.ts` | Lets clients approve change orders from portal |
| `apps/web/src/__tests__/api-validation.test.ts` | Unit tests for all Zod validation schemas |
| `apps/web/src/__tests__/env-validation.test.ts` | Unit tests for env validation |
| `apps/web/src/__tests__/rate-limit.test.ts` | Unit tests for rate limiter |

### Script-applied changes (run `bash production-hardening/apply.sh`)

| Change | Routes affected |
|--------|----------------|
| Sentry `captureError` imports + calls | All 19 API routes |
| Auth failure logging (`logAuthFailure`) | `estimates/[id]/send` |
| Team member active check | `estimates/[id]/versions` POST |
| Stripe webhook sig enforcement in prod | `webhooks/stripe` |
| Anthropic API 60s timeout | `calls/to-estimate` |
| Sentry user context after auth | All authenticated routes |

### Portal enhancements (manual — see `portal-enhancements.patch.ts`)

| Enhancement | Description |
|-------------|-------------|
| Viewed tracking | `useEffect` calls `/api/portal-viewed` on mount |
| PDF download | Print button with `@media print` CSS |
| Change order approval | Client can approve COs from the portal |
| Mobile responsive CSS | Better spacing on small screens |

## How to apply

```bash
# 1. Run the automated hardening script
bash production-hardening/apply.sh

# 2. Apply portal enhancements manually (see portal-enhancements.patch.ts)
#    Open apps/web/src/app/portal/[id]/page.tsx and apply the 4 changes

# 3. Run checks
pnpm typecheck
pnpm lint
pnpm test

# 4. Review and commit
git diff
git add -A
git commit -m "chore: production hardening — sentry, validation, portal, security"
```

## Environment variables checklist

Required in all environments:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required in production:
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_SENTRY_DSN`
- `PORTAL_TOKEN_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ANTHROPIC_API_KEY`

## What was already done (found during audit)

- Settings page: fully implemented (4 tabs)
- Invoices: full implementation with search/sort/filter
- Portal: 1700+ lines with token auth, signature, decline flow
- Rate limiting: in place on all routes
- Security headers in middleware: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- Audit logging throughout
