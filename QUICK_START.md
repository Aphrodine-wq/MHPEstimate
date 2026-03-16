# Quick Start - API Security Fixes

## TL;DR

7 security gaps found. 1 already correct. 6 need fixes.

**Critical:** Stripe webhook allows unsigned requests in production
**High:** Team member check missing, CSV exports not logged
**Medium:** Auth failures not tracked, API calls can hang

---

## Files to Read

1. **API_SECURITY_SUMMARY.md** - Executive overview
2. **SECURITY_FIXES.md** - Detailed specifications
3. **IMPLEMENTATION_GUIDE.md** - Copy-paste ready code

---

## Quick Implementation

### 1. Stripe Webhook (CRITICAL)
File: `apps/web/src/app/api/webhooks/stripe/route.ts`
Action: Replace lines 33-53 with production enforcement check

### 2. Team Member Check (HIGH)
File: `apps/web/src/app/api/estimates/[id]/versions/route.ts`
Action: Add team member active status check after line 75

### 3. Audit Logging (HIGH)
File: `apps/web/src/app/api/integrations/quickbooks/export/route.ts`
Action: Move logAudit() before format returns

### 4. Auth Failure Tracking (MEDIUM)
Files: `apps/web/src/lib/audit.ts` + portal routes
Action: Add logAuthFailure() function and call from sign/decline routes

### 5. API Timeouts (MEDIUM)
Files: `apps/web/src/app/api/calls/to-estimate/route.ts`
         `apps/web/src/app/api/calls/analyze-photo/route.ts`
Action: Wrap Anthropic API calls with 30-second AbortSignal

---

## Implementation Time
**Estimated:** 30-45 minutes
**Complexity:** Low-Medium
**Testing:** Unit tests + E2E tests should pass

---

## Verification

After implementation:
```
npm run typecheck   # Should pass
npm run test        # All tests should pass
npm run test:e2e    # E2E tests should pass
```

---

## Status Tracker

- [ ] Stripe webhook fix
- [ ] Team member check
- [ ] QuickBooks audit logging
- [ ] Auth failure logging
- [ ] to-estimate timeout
- [ ] analyze-photo timeout
- [ ] All tests passing
- [ ] Code review complete
- [ ] Deployed to staging
- [ ] Deployed to production

---

## Support

See detailed implementation code in: **IMPLEMENTATION_GUIDE.md**
See technical specifications in: **SECURITY_FIXES.md**

