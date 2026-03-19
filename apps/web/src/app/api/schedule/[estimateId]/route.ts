import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// PUT input validation
// ---------------------------------------------------------------------------
const phaseUpdateSchema = z.object({
  id: z.string().uuid(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.string().optional(),
  crew_assigned: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const putInputSchema = z.object({
  phases: z.array(phaseUpdateSchema).min(1, "At least one phase is required"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ estimateId: string }> },
) {
  const { estimateId } = await params;

  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "schedule-get" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Org ownership check ---
  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  const supabase = createServiceClient();

  // --- Team membership check ---
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("id, is_active")
    .eq("auth_id", user.id)
    .single();

  if (!teamMember || !teamMember.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Verify estimate exists ---
  const { data: estimate } = await supabase
    .from("estimates")
    .select("id, organization_id")
    .eq("id", estimateId)
    .single();

  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  if (estimate.organization_id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Fetch phases ---
  const { data: phases, error } = await supabase
    .from("job_phases")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order");

  if (error) {
    captureError(new Error(error.message), { route: "schedule-get" });
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }

  return NextResponse.json({ phases: phases ?? [] });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ estimateId: string }> },
) {
  const { estimateId } = await params;

  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "schedule-put" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Org ownership check ---
  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  // --- Parse & validate ---
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "schedule-put" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = putInputSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  // --- Team membership check ---
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("id, is_active")
    .eq("auth_id", user.id)
    .single();

  if (!teamMember || !teamMember.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Verify estimate exists ---
  const { data: estimate } = await supabase
    .from("estimates")
    .select("id, organization_id")
    .eq("id", estimateId)
    .single();

  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  if (estimate.organization_id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Bulk update phases ---
  const errors: string[] = [];

  for (const phase of validated.data.phases) {
    const updateData: Record<string, unknown> = {};
    if (phase.start_date !== undefined) updateData.start_date = phase.start_date;
    if (phase.end_date !== undefined) updateData.end_date = phase.end_date;
    if (phase.status !== undefined) updateData.status = phase.status;
    if (phase.crew_assigned !== undefined) updateData.crew_assigned = phase.crew_assigned;
    if (phase.notes !== undefined) updateData.notes = phase.notes;

    const { error: updateError } = await supabase
      .from("job_phases")
      .update(updateData)
      .eq("id", phase.id)
      .eq("estimate_id", estimateId);

    if (updateError) {
      errors.push(`Phase ${phase.id}: ${updateError.message}`);
    }
  }

  if (errors.length > 0) {
    captureError(new Error(`Schedule update errors: ${errors.join("; ")}`), { route: "schedule-put" });
  }

  // --- Fetch updated phases ---
  const { data: updatedPhases } = await supabase
    .from("job_phases")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order");

  // --- Audit ---
  await logAudit(
    user.id,
    "schedule_updated",
    "job_phase",
    estimateId,
    {
      phases_updated: validated.data.phases.length,
      errors: errors.length > 0 ? errors : undefined,
    },
    getClientIp(req),
  );

  return NextResponse.json({
    phases: updatedPhases ?? [],
    ...(errors.length > 0 ? { warnings: errors } : {}),
  });
}
