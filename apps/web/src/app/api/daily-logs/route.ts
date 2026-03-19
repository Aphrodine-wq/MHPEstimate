import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId, verifyEstimateOwnership } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// POST input validation
// ---------------------------------------------------------------------------
const dailyLogSchema = z.object({
  estimate_id: z.string().uuid(),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format"),
  weather: z.enum(["clear", "cloudy", "rain", "snow", "wind", "extreme_heat", "extreme_cold"]).optional().nullable(),
  temperature_f: z.number().int().min(-60).max(150).optional().nullable(),
  crew_count: z.number().int().min(0).optional(),
  hours_on_site: z.number().min(0).max(24).optional().nullable(),
  work_performed: z.string().max(5000).optional().nullable(),
  materials_used: z.string().max(5000).optional().nullable(),
  deliveries: z.string().max(2000).optional().nullable(),
  visitors: z.string().max(2000).optional().nullable(),
  issues: z.string().max(5000).optional().nullable(),
  safety_notes: z.string().max(2000).optional().nullable(),
  delay_reason: z.string().max(1000).optional().nullable(),
  delay_hours: z.number().min(0).max(24).optional().nullable(),
});

/**
 * GET /api/daily-logs — List daily logs for an estimate
 *
 * Query params:
 *   estimateId (required) — the estimate to fetch logs for
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await estimateApiLimiter.check(30, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "daily-logs-get" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Org scoping ---
  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const estimateId = searchParams.get("estimateId");

  if (!estimateId) {
    return NextResponse.json({ error: "estimateId query parameter is required" }, { status: 400 });
  }

  // --- Verify estimate ownership ---
  const estimate = await verifyEstimateOwnership(estimateId, orgId);
  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("estimate_id", estimateId)
    .order("log_date", { ascending: false });

  if (error) {
    captureError(new Error(error.message), { route: "daily-logs-get" });
    return NextResponse.json({ error: "Failed to fetch daily logs" }, { status: 500 });
  }

  return NextResponse.json({ logs: data ?? [] });
}

/**
 * POST /api/daily-logs — Create or update a daily log (upsert by org+estimate+date)
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await estimateApiLimiter.check(20, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "daily-logs-post" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Org scoping ---
  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  // --- Parse & validate ---
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "daily-logs-post" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = dailyLogSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // --- Verify estimate ownership ---
  const estimate = await verifyEstimateOwnership(validated.data.estimate_id, orgId);
  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const supabase = createServiceClient();

  // --- Look up user display name ---
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("full_name")
    .eq("auth_id", user.id)
    .single();

  // --- Upsert by (organization_id, estimate_id, log_date) ---
  const { data: log, error } = await supabase
    .from("daily_logs")
    .upsert(
      {
        organization_id: orgId,
        estimate_id: validated.data.estimate_id,
        log_date: validated.data.log_date,
        weather: validated.data.weather ?? null,
        temperature_f: validated.data.temperature_f ?? null,
        crew_count: validated.data.crew_count ?? 0,
        hours_on_site: validated.data.hours_on_site ?? null,
        work_performed: validated.data.work_performed ?? null,
        materials_used: validated.data.materials_used ?? null,
        deliveries: validated.data.deliveries ?? null,
        visitors: validated.data.visitors ?? null,
        issues: validated.data.issues ?? null,
        safety_notes: validated.data.safety_notes ?? null,
        delay_reason: validated.data.delay_reason ?? null,
        delay_hours: validated.data.delay_hours ?? null,
        created_by: user.id,
        created_by_name: teamMember?.full_name ?? user.email ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,estimate_id,log_date" },
    )
    .select()
    .single();

  if (error) {
    captureError(new Error(error.message), { route: "daily-logs-post" });
    return NextResponse.json({ error: "Failed to save daily log" }, { status: 500 });
  }

  return NextResponse.json({ log }, { status: 201 });
}
