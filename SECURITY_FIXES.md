# MHPEstimate API Security Fixes

This document outlines all required API security fixes for the MHPEstimate platform. Due to file system restrictions, these changes must be applied manually or through automated tooling.

---

## Quick Summary

| # | File | Issue | Severity | Status |
|---|------|-------|----------|--------|
| 1 | `apps/web/src/lib/portal-token.ts` | Verify token ownership | VERIFIED | ✓ Already Correct |
| 2 | `apps/web/src/app/api/estimates/[id]/versions/route.ts` | Missing team member check | HIGH | NEEDS FIX |
| 3 | `apps/web/src/app/api/webhooks/stripe/route.ts` | Unsigned webhooks allowed in prod | CRITICAL | NEEDS FIX |
| 4 | `apps/web/src/app/api/integrations/quickbooks/export/route.ts` | CSV exports not audited | HIGH | NEEDS FIX |
| 5 | `apps/web/src/lib/audit.ts` | Missing auth failure logging | MEDIUM | NEEDS FIX |
| 6 | `apps/web/src/app/api/calls/to-estimate/route.ts` | No API timeout | MEDIUM | NEEDS FIX |
| 7 | `apps/web/src/app/api/calls/analyze-photo/route.ts` | No API timeout | MEDIUM | NEEDS FIX |

---

## Fix #1: Portal Token Ownership Verification

**File:** `apps/web/src/lib/portal-token.ts`
**Status:** ✓ ALREADY CORRECT (No changes needed)

### Verification

The implementation correctly encodes and verifies the estimate ID:

```typescript
// Line 27 - Generation includes estimate ID
const payload = `${estimateId}:${expiresAt}`;
const sig = createHmac("sha256", SECRET).update(payload).digest("hex");

// Line 53 - Verification recomputes with estimate ID
const payload = `${estimateId}:${expiresAtStr}`;
const expected = createHmac("sha256", SECRET).update(payload).digest("hex");

// Line 68 - Uses timing-safe comparison
return timingSafeEqual(sigBuf, expectedBuf);
```

**Conclusion:** Token ownership is properly verified. No action required.

---

## Fix #2: Estimate Versions Team Member Authorization

**File:** `apps/web/src/app/api/estimates/[id]/versions/route.ts`
**Severity:** HIGH
**Issue:** POST handler missing team member active status check

### Current Code (VULNERABLE)
Lines 48-75: User authentication checked, but not team member status

### Required Change
Add team member authorization check after rate limiting in POST handler:

```typescript
// Location: After body parsing (line 75), before Supabase fetch (line 79)

const supabase = createServiceClient();

// --- Team member check: verify user is an active team member ---
const { data: teamMember } = await supabase
  .from("team_members")
  .select("id, role, is_active")
  .eq("auth_id", user.id)
  .single();

if (!teamMember?.is_active) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### Impact
Prevents inactive team members from creating estimate versions.

---

## Fix #3: Stripe Webhook Secret Enforcement

**File:** `apps/web/src/app/api/webhooks/stripe/route.ts`
**Severity:** CRITICAL
**Issue:** Allows unsigned webhooks in production if `STRIPE_WEBHOOK_SECRET` is missing

### Current Code (VULNERABLE)
Lines 33-53: No production enforcement of webhook secret

```typescript
if (webhookSecret) {
  // ... verify signature
} else {
  // ... parse without verification (allowed in all envs!)
}
```

### Required Change
Replace lines 33-53 with:

```typescript
// Verify webhook signature if secret is configured
let event;
if (!webhookSecret) {
  if (process.env.NODE_ENV === "production") {
    console.error("STRIPE_WEBHOOK_SECRET not configured in production");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  // In dev, allow unsigned for testing
  console.warn("⚠️ STRIPE_WEBHOOK_SECRET not set — accepting unsigned webhook in dev mode");
}

if (webhookSecret) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
} else {
  // No webhook secret — parse event without verification (dev only)
  try {
    event = JSON.parse(rawBody) as { type: string; data: { object: Record<string, unknown> } };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
```

### Impact
- Production deployments without `STRIPE_WEBHOOK_SECRET` will reject webhooks with 503
- Dev environments can still use unsigned webhooks for testing
- Prevents webhook spoofing attacks

---

## Fix #4: QuickBooks Export Audit Logging

**File:** `apps/web/src/app/api/integrations/quickbooks/export/route.ts`
**Severity:** HIGH
**Issue:** CSV exports skip audit logging due to early return

### Current Code (VULNERABLE)
```typescript
const items = (lineItems as LineItem[]) ?? [];
const estNumber = estimate.estimate_number as string;

if (format === "csv") {
  const csv = generateCSV(estimate, items, client);
  return new NextResponse(csv, {  // <-- EARLY RETURN, no audit log!
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${estNumber}_export.csv"`,
    },
  });
}

await logAudit(  // <-- This never runs for CSV exports
  user.id,
  "estimate_exported",
  "estimate",
  estimateId,
  { format, estimate_number: estNumber },
  getClientIp(req)
);
```

### Required Change
Move audit logging before format-specific returns:

```typescript
const items = (lineItems as LineItem[]) ?? [];
const estNumber = estimate.estimate_number as string;

// Log audit entry BEFORE format-specific returns
await logAudit(
  user.id,
  "estimate_exported",
  "estimate",
  estimateId,
  { format, estimate_number: estNumber },
  getClientIp(req)
);

if (format === "csv") {
  const csv = generateCSV(estimate, items, client);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${estNumber}_export.csv"`,
    },
  });
}

// Default: IIF
const iif = generateIIF(estimate, items, client);
return new NextResponse(iif, {
  headers: {
    "Content-Type": "application/x-iif",
    "Content-Disposition": `attachment; filename="${estNumber}_quickbooks.iif"`,
  },
});
```

### Impact
All export formats (CSV and IIF) will be logged to audit trail.

---

## Fix #5: Authentication Failure Audit Logging

**File:** `apps/web/src/lib/audit.ts`
**Severity:** MEDIUM
**Issue:** No mechanism to log failed authentication attempts

### Required Addition
Add new helper function at end of file:

```typescript
/**
 * Log an authentication failure. Used for tracking failed login attempts and other auth violations.
 */
export async function logAuthFailure(
  action: string,
  metadata: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    const supabase = createServiceClient();
    if (!supabase) return;

    await supabase.from("audit_log").insert({
      user_id: null,
      action_type: action,
      entity_type: "auth",
      entity_id: null,
      metadata,
      ip_address: ipAddress ?? null,
    });
  } catch (err) {
    console.error("Failed to log auth failure:", err);
  }
}
```

### Usage: Portal Sign Route

**File:** `apps/web/src/app/api/portal/[id]/sign/route.ts`
**Location:** Lines 14-21 (token validation section)

Add import:
```typescript
import { logAuthFailure } from "@/lib/audit";
```

Replace token validation section:
```typescript
// --- Token validation ---
const token = req.nextUrl.searchParams.get("token");
if (!token) {
  logAuthFailure("portal_token_missing", { route: "/api/portal/[id]/sign", estimate_id: id }, ip);
  return NextResponse.json({ error: "Missing token" }, { status: 401 });
}

if (!verifyPortalToken(token, id)) {
  logAuthFailure("portal_token_invalid", { route: "/api/portal/[id]/sign", estimate_id: id }, ip);
  return NextResponse.json({ error: "Invalid token" }, { status: 401 });
}
```

### Usage: Portal Decline Route

**File:** `apps/web/src/app/api/portal/[id]/decline/route.ts`
**Location:** Lines 14-21 (token validation section)

Apply the same pattern as the sign route above.

### Usage: Estimate Send Route (if exists)

**File:** `apps/web/src/app/api/estimates/[id]/send/route.ts`
**Location:** Auth check section

Add import:
```typescript
import { logAuthFailure, getClientIp } from "@/lib/audit";
```

Add to auth check:
```typescript
const { user } = await getAuthUser(req);
if (!user) {
  logAuthFailure("send_unauthorized", { route: "/api/estimates/[id]/send", reason: "no_auth_token" }, getClientIp(req));
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Impact
Failed auth attempts are tracked in audit log with IP addresses for security monitoring.

---

## Fix #6: Anthropic API Timeout (to-estimate)

**File:** `apps/web/src/app/api/calls/to-estimate/route.ts`
**Severity:** MEDIUM
**Issue:** No timeout on external Anthropic API calls, can cause hanging requests

### Current Code (VULNERABLE)
Lines 76-116: No timeout protection on `anthropic.messages.create()`

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 2000,
  system: `...`,
  messages: [...]
});
```

### Required Change
Wrap with AbortSignal timeout:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30_000); // 30 second timeout

try {
  const response = await anthropic.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: `You are an assistant that extracts structured estimate data...`,
      messages: [
        {
          role: "user",
          content: `Extract estimate data from this voice conversation transcript:\n\n${transcript}`,
        },
      ],
    },
    { signal: controller.signal }
  );

  // Continue with existing response handling (lines 118-280)
  const content = response.content[0]!;
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response from AI" }, { status: 500 });
  }

  // ... rest of response processing ...
} finally {
  clearTimeout(timeout);
}
```

### Impact
API calls abort after 30 seconds, preventing request timeouts and resource exhaustion.

---

## Fix #7: Anthropic API Timeout (analyze-photo)

**File:** `apps/web/src/app/api/calls/analyze-photo/route.ts`
**Severity:** MEDIUM
**Issue:** No timeout on external Anthropic API calls for photo analysis

### Current Code (VULNERABLE)
Lines 68-80: No timeout protection on `anthropic.messages.create()`

```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: `...`,
  messages: [{...}]
});
```

### Required Change
Wrap with AbortSignal timeout:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30_000); // 30 second timeout

try {
  const response = await anthropic.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a construction estimating assistant. Analyze site photos and return a JSON object only — no explanation, no markdown.
Return JSON: { "rooms": string[], "materials": string[], "dimensions": string[], "conditions": string[], "rawDescription": string }`,
      messages: [{
        role: "user",
        content: [
          ...imageBlocks,
          { type: "text" as const, text: `Analyze ${images.length > 1 ? "these " + images.length + " site photos" : "this site photo"} and return structured JSON.` },
        ],
      }],
    },
    { signal: controller.signal }
  );

  // Continue with existing response handling (lines 82-96)
  const content = response.content[0];
  if (!content || content.type !== "text") throw new Error("Unexpected response");

  const text = content.text.trim();
  const jsonText = text.startsWith("```") ? text.replace(/^```json?\n?/, "").replace(/\n?```$/, "") : text;
  const parsed = JSON.parse(jsonText);

  return NextResponse.json({
    analyzed: true,
    rooms: parsed.rooms ?? [],
    materials: parsed.materials ?? [],
    dimensions: parsed.dimensions ?? [],
    conditions: parsed.conditions ?? [],
    rawDescription: parsed.rawDescription ?? "",
  });
} finally {
  clearTimeout(timeout);
}
```

### Impact
API calls abort after 30 seconds, preventing request timeouts during photo analysis.

---

## Testing Checklist

After applying all fixes, verify:

- [ ] Portal token verification still works for valid tokens
- [ ] Portal token verification rejects mismatched estimate IDs
- [ ] Inactive team members cannot create estimate versions
- [ ] Stripe webhook with invalid secret returns 503 in production
- [ ] Stripe webhook with valid secret processes successfully
- [ ] CSV exports appear in audit log
- [ ] IIF exports appear in audit log
- [ ] Failed portal token attempts logged to audit_log
- [ ] Anthropic API calls timeout after 30 seconds
- [ ] Valid requests complete normally without timeout interference

---

## Deployment Notes

1. These fixes should be applied in a single commit
2. Test in staging environment before production deployment
3. Monitor audit logs for expected auth failure entries
4. Verify Stripe webhook processing still works after fix
5. No database migrations required

---

## Files Modified

```
apps/web/src/lib/portal-token.ts              (VERIFIED - no changes)
apps/web/src/lib/audit.ts                     (ADD: logAuthFailure function)
apps/web/src/app/api/estimates/[id]/versions/route.ts    (ADD: team member check)
apps/web/src/app/api/webhooks/stripe/route.ts            (REPLACE: webhook verification logic)
apps/web/src/app/api/integrations/quickbooks/export/route.ts (MOVE: audit logging)
apps/web/src/app/api/calls/to-estimate/route.ts          (ADD: AbortSignal timeout)
apps/web/src/app/api/calls/analyze-photo/route.ts        (ADD: AbortSignal timeout)
apps/web/src/app/api/portal/[id]/sign/route.ts           (ADD: logAuthFailure calls)
apps/web/src/app/api/portal/[id]/decline/route.ts        (ADD: logAuthFailure calls)
```

---

**Generated:** 2026-03-10
**Status:** Ready for implementation
