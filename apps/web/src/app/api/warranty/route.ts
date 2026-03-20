import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId, verifyEstimateOwnership } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const WARRANTY_CATEGORIES = [
  "labor", "material", "structural", "plumbing", "electrical",
  "hvac", "roofing", "flooring", "painting", "appliance", "other",
] as const;

const WARRANTY_STATUSES = [
  "active", "claimed", "in_progress", "resolved", "expired", "voided",
] as const;

const warrantyCreateSchema = z.object({
  estimate_id: z.string().uuid(),
  client_id: z.string().uuid().optional().nullable(),
  item_description: z.string().min(1).max(2000),
  category: z.enum(WARRANTY_CATEGORIES).optional().nullable(),
  warranty_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  warranty_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  callback_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  callback_notes: z.string().max(2000).optional().nullable(),
  photos: z.array(z.string()).optional(),
});

const warrantyUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(WARRANTY_STATUSES).optional(),
  claim_description: z.string().max(5000).optional().nullable(),
  resolution: z.string().max(5000).optional().nullable(),
  cost_to_repair: z.number().min(0).optional().nullable(),
  callback_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  callback_notes: z.string().max(2000).optional().nullable(),
  photos: z.array(z.string()).optional(),
});

/**
 * GET /api/warranty — List warranty items
 *
 * Query params:
 *   estimateId (optional) — filter to a specific estimate
 *   status     (optional) — filter by status (active, claimed, in_progress, resolved, expired, voided)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await estimateApiLimiter.check(30, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "warranty-get" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const estimateId = searchParams.get("estimateId");
  const status = searchParams.get("status");

  const supabase = createServiceClient();

  let query = supabase
    .from("warranty_items")
    .select("*")
    .eq("organization_id", orgId)
    .order("warranty_end", { ascending: true });

  if (estimateId) {
    const estimate = await verifyEstimateOwnership(estimateId, orgId);
    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }
    query = query.eq("estimate_id", estimateId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    captureError(new Error(error.message), { route: "warranty-get" });
    return NextResponse.json({ error: "Failed to fetch warranty items" }, { status: 500 });
  }

  return NextResponse.json({ warranties: data ?? [] });
}

/**
 * POST /api/warranty — Create a warranty item
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await estimateApiLimiter.check(20, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "warranty-post" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "warranty-post" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = warrantyCreateSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const estimate = await verifyEstimateOwnership(validated.data.estimate_id, orgId);
  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const supabase = createServiceClient();

  const { data: warranty, error } = await supabase
    .from("warranty_items")
    .insert({
      organization_id: orgId,
      estimate_id: validated.data.estimate_id,
      client_id: validated.data.client_id ?? null,
      item_description: validated.data.item_description,
      category: validated.data.category ?? null,
      warranty_start: validated.data.warranty_start,
      warranty_end: validated.data.warranty_end,
      status: "active",
      callback_date: validated.data.callback_date ?? null,
      callback_notes: validated.data.callback_notes ?? null,
      photos: validated.data.photos ?? [],
    })
    .select()
    .single();

  if (error) {
    captureError(new Error(error.message), { route: "warranty-post" });
    return NextResponse.json({ error: "Failed to create warranty item" }, { status: 500 });
  }

  return NextResponse.json({ warranty }, { status: 201 });
}

/**
 * PATCH /api/warranty — Update a warranty item (claim, resolve, schedule callback)
 */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await estimateApiLimiter.check(20, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "warranty-patch" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "warranty-patch" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = warrantyUpdateSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("warranty_items")
    .select("id, status")
    .eq("id", validated.data.id)
    .eq("organization_id", orgId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Warranty item not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (validated.data.status !== undefined) {
    updates.status = validated.data.status;

    if (validated.data.status === "claimed" && existing.status === "active") {
      updates.claim_description = validated.data.claim_description ?? updates.claim_description;
    }
    if (validated.data.status === "resolved") {
      updates.resolution = validated.data.resolution ?? updates.resolution;
    }
  }

  if (validated.data.claim_description !== undefined) updates.claim_description = validated.data.claim_description;
  if (validated.data.resolution !== undefined) updates.resolution = validated.data.resolution;
  if (validated.data.cost_to_repair !== undefined) updates.cost_to_repair = validated.data.cost_to_repair;
  if (validated.data.callback_date !== undefined) updates.callback_date = validated.data.callback_date;
  if (validated.data.callback_notes !== undefined) updates.callback_notes = validated.data.callback_notes;
  if (validated.data.photos !== undefined) updates.photos = validated.data.photos;

  const { data: warranty, error } = await supabase
    .from("warranty_items")
    .update(updates)
    .eq("id", validated.data.id)
    .eq("organization_id", orgId)
    .select()
    .single();

  if (error) {
    captureError(new Error(error.message), { route: "warranty-patch" });
    return NextResponse.json({ error: "Failed to update warranty item" }, { status: 500 });
  }

  return NextResponse.json({ warranty });
}
