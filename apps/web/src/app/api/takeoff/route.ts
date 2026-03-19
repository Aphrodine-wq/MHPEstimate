import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId, verifyEstimateOwnership } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const MEASUREMENT_TYPES = ["linear", "area", "count", "volume"] as const;

const measurementCreateSchema = z.object({
  estimate_id: z.string().uuid(),
  page_number: z.number().int().min(1).optional(),
  plan_image_path: z.string().optional().nullable(),
  measurement_type: z.enum(MEASUREMENT_TYPES),
  label: z.string().min(1).max(500),
  value: z.number().min(0),
  unit: z.string().min(1).max(20).default("ft"),
  color: z.string().max(20).optional(),
  points: z.array(z.record(z.unknown())).optional(),
  linked_line_item_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

/**
 * GET /api/takeoff — List measurements for an estimate
 *
 * Query params:
 *   estimateId (required) — the estimate to fetch measurements for
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await estimateApiLimiter.check(30, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "takeoff-get" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const estimateId = searchParams.get("estimateId");

  if (!estimateId) {
    return NextResponse.json({ error: "estimateId query parameter is required" }, { status: 400 });
  }

  const estimate = await verifyEstimateOwnership(estimateId, orgId);
  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("takeoff_measurements")
    .select("*")
    .eq("organization_id", orgId)
    .eq("estimate_id", estimateId)
    .order("page_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    captureError(new Error(error.message), { route: "takeoff-get" });
    return NextResponse.json({ error: "Failed to fetch measurements" }, { status: 500 });
  }

  return NextResponse.json({ measurements: data ?? [] });
}

/**
 * POST /api/takeoff — Save a measurement
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await estimateApiLimiter.check(20, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "takeoff-post" });
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
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "takeoff-post" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = measurementCreateSchema.safeParse(body);
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

  const { data: measurement, error } = await supabase
    .from("takeoff_measurements")
    .insert({
      organization_id: orgId,
      estimate_id: validated.data.estimate_id,
      page_number: validated.data.page_number ?? 1,
      plan_image_path: validated.data.plan_image_path ?? null,
      measurement_type: validated.data.measurement_type,
      label: validated.data.label,
      value: validated.data.value,
      unit: validated.data.unit,
      color: validated.data.color ?? "#991b1b",
      points: validated.data.points ?? [],
      linked_line_item_id: validated.data.linked_line_item_id ?? null,
      notes: validated.data.notes ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    captureError(new Error(error.message), { route: "takeoff-post" });
    return NextResponse.json({ error: "Failed to save measurement" }, { status: 500 });
  }

  return NextResponse.json({ measurement }, { status: 201 });
}

/**
 * DELETE /api/takeoff — Remove a measurement
 *
 * Query params:
 *   id (required) — the measurement ID to delete
 */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await estimateApiLimiter.check(20, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "takeoff-delete" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id query parameter is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("takeoff_measurements")
    .select("id")
    .eq("id", id)
    .eq("organization_id", orgId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Measurement not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("takeoff_measurements")
    .delete()
    .eq("id", id)
    .eq("organization_id", orgId);

  if (error) {
    captureError(new Error(error.message), { route: "takeoff-delete" });
    return NextResponse.json({ error: "Failed to delete measurement" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
