# API Security Fixes - Implementation Guide

This guide provides copy-paste ready code for all 7 security fixes.

## Fix #1: Portal Token (Already Correct)
No changes required - token verification is properly implemented.

---

## Fix #2: Team Member Check (versions/route.ts)

**Location:** After line 75 (after body parsing try-catch block)

**Add this code block:**
```typescript
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

**Note:** This replaces the existing `const supabase = createServiceClient();` on line 77, which becomes redundant.

---

## Fix #3: Stripe Webhook (stripe/route.ts)

**Location:** Lines 33-53 (the webhook verification section)

**Replace the entire section with:**
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

---

## Fix #4: QuickBooks Export (export/route.ts)

**Location:** Move lines 245-252 (logAudit call) to before line 235 (format check)

**Before:** (lines 232-262)
```typescript
const items = (lineItems as LineItem[]) ?? [];
const estNumber = estimate.estimate_number as string;

if (format === "csv") {
  const csv = generateCSV(estimate, items, client);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${estNumber}_export.csv"`,
    },
  });
}

await logAudit(
  user.id,
  "estimate_exported",
  "estimate",
  estimateId,
  { format, estimate_number: estNumber },
  getClientIp(req)
);
```

**After:**
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
```

---

## Fix #5: Audit Helper (audit.ts)

**Location:** End of file (after `getClientIp` function)

**Add this function:**
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

---

## Fix #5b: Portal Sign Route (sign/route.ts)

**Location:** Lines 14-21 (token validation)

**Replace with:**
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

**Also add import at top:**
```typescript
import { logAuthFailure } from "@/lib/audit";
```

---

## Fix #5c: Portal Decline Route (decline/route.ts)

**Location:** Lines 14-21 (token validation)

**Replace with:**
```typescript
// --- Token validation ---
const token = req.nextUrl.searchParams.get("token");
if (!token) {
  logAuthFailure("portal_token_missing", { route: "/api/portal/[id]/decline", estimate_id: id }, ip);
  return NextResponse.json({ error: "Missing token" }, { status: 401 });
}

if (!verifyPortalToken(token, id)) {
  logAuthFailure("portal_token_invalid", { route: "/api/portal/[id]/decline", estimate_id: id }, ip);
  return NextResponse.json({ error: "Invalid token" }, { status: 401 });
}
```

**Also add import at top:**
```typescript
import { logAuthFailure } from "@/lib/audit";
```

---

## Fix #6: to-estimate Timeout (to-estimate/route.ts)

**Location:** Lines 76-116 (the anthropic.messages.create call)

**Replace with:**
```typescript
// Ask Claude to extract structured estimate data from the transcript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30_000); // 30 second timeout

try {
  const response = await anthropic.messages.create(
    {
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: `You are an assistant that extracts structured estimate data from conversations between Alex (an AI estimator) and a contractor at North MS Home Pros, a home improvement company in Mississippi. Extract all relevant information discussed and return it as valid JSON only — no explanation, no markdown, just the raw JSON object.

Return JSON matching this exact schema:
{
  "project_type": string,
  "tier": string,
  "project_address": string | null,
  "site_conditions": string | null,
  "scope_inclusions": string[],
  "scope_exclusions": string[],
  "client_name": string | null,
  "client_email": string | null,
  "client_phone": string | null,
  "line_items": [
    {
      "category": string,
      "description": string,
      "quantity": number,
      "unit": string,
      "unit_price": number
    }
  ]
}

Rules:
- project_type must be one of: "General", "Kitchen Remodel", "Bathroom Remodel", "Flooring", "Roofing", "Painting", "Siding", "Deck / Patio", "Addition", "Full Renovation"
- tier must be one of: "budget", "midrange", "high_end"
- category must be one of: "material", "labor", "subcontractor"
- unit must be one of: "sq ft", "lin ft", "each", "bundle", "gallon", "sheet", "box", "roll", "bag", "ton", "hour", "day", "lot"
- Use your knowledge of home improvement pricing in the southeastern US to estimate reasonable unit prices if prices were not explicitly stated
- If a field is not mentioned, use null or an empty array`,
      messages: [
        {
          role: "user",
          content: `Extract estimate data from this voice conversation transcript:\n\n${transcript}`,
        },
      ],
    },
    { signal: controller.signal }
  );

  const content = response.content[0]!;
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response from AI" }, { status: 500 });
  }

  let extracted: z.infer<typeof extractedSchema>;

  try {
    const text = content.text.trim();
    const jsonText = text.startsWith("```")
      ? text.replace(/^```json?\n?/, "").replace(/\n?```$/, "")
      : text;
    const parsed: unknown = JSON.parse(jsonText);
    const validated = extractedSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("Claude response failed validation:", validated.error);
      return NextResponse.json({ error: "AI response validation failed" }, { status: 500 });
    }
    extracted = validated.data;
  } catch {
    console.error("Failed to parse Claude response:", content.text);
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  const supabase = createServiceClient();

  // Create client record if we got a name
  let clientId: string | null = null;
  if (extracted.client_name) {
    const { data: newClient } = await supabase
      .from("clients")
      .insert({
        full_name: extracted.client_name,
        email: extracted.client_email ?? null,
        phone: extracted.client_phone ?? null,
      })
      .select("id")
      .single();
    clientId = newClient?.id ?? null;
  }

  // [Continue with rest of function from line 159 onwards...]
} finally {
  clearTimeout(timeout);
}
```

**Note:** The rest of the function (lines 142-280) remains unchanged inside the try block.

---

## Fix #7: analyze-photo Timeout (analyze-photo/route.ts)

**Location:** Lines 68-80 (the anthropic.messages.create call)

**Replace with:**
```typescript
try {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic({ apiKey });

  const imageBlocks = images.map((base64) => ({
    type: "image" as const,
    source: { type: "base64" as const, media_type: "image/jpeg" as const, data: base64 },
  }));

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
} catch (err) {
  console.error("Photo analysis error:", err);
  return NextResponse.json(placeholderAnalysis(images.length));
}
```

---

## Summary of Files to Modify

1. `apps/web/src/lib/audit.ts` - Add logAuthFailure function
2. `apps/web/src/app/api/estimates/[id]/versions/route.ts` - Add team member check
3. `apps/web/src/app/api/webhooks/stripe/route.ts` - Add production secret enforcement
4. `apps/web/src/app/api/integrations/quickbooks/export/route.ts` - Move audit logging
5. `apps/web/src/app/api/portal/[id]/sign/route.ts` - Add logAuthFailure calls
6. `apps/web/src/app/api/portal/[id]/decline/route.ts` - Add logAuthFailure calls
7. `apps/web/src/app/api/calls/to-estimate/route.ts` - Add timeout
8. `apps/web/src/app/api/calls/analyze-photo/route.ts` - Add timeout

---

**Implementation Order:**
1. Add logAuthFailure to audit.ts
2. Update sign/decline routes
3. Update webhook route (stripe)
4. Update quickbooks route
5. Update versions route
6. Update to-estimate route
7. Update analyze-photo route

This order allows testing each fix independently.
