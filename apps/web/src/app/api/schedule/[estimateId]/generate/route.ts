import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

export async function POST(
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
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "schedule-generate" });
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

  // --- Fetch estimate — verify org ownership ---
  const { data: estimate, error: estError } = await supabase
    .from("estimates")
    .select("id, project_type, estimated_start, organization_id")
    .eq("id", estimateId)
    .single();

  if (estError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  if (estimate.organization_id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Fetch schedule template for this project type ---
  const { data: template, error: templateError } = await supabase
    .from("schedule_templates")
    .select("*")
    .eq("project_type", estimate.project_type ?? "General")
    .single();

  if (templateError || !template) {
    return NextResponse.json(
      { error: `No schedule template found for project type: ${estimate.project_type}` },
      { status: 404 },
    );
  }

  // --- Delete existing phases for this estimate (regenerate) ---
  await supabase
    .from("job_phases")
    .delete()
    .eq("estimate_id", estimateId);

  // --- Generate phases from template ---
  const startDate = estimate.estimated_start
    ? new Date(estimate.estimated_start)
    : new Date();

  const templatePhases = template.phases as Array<{
    name: string;
    duration_days: number;
    offset_days: number;
    dependencies?: string[];
  }>;

  if (!Array.isArray(templatePhases) || templatePhases.length === 0) {
    return NextResponse.json(
      { error: "Schedule template has no phases defined" },
      { status: 400 },
    );
  }

  const phasesToInsert = templatePhases.map((phase, i) => {
    const phaseStart = new Date(startDate);
    phaseStart.setDate(phaseStart.getDate() + phase.offset_days);

    const phaseEnd = new Date(phaseStart);
    phaseEnd.setDate(phaseEnd.getDate() + phase.duration_days - 1);

    return {
      estimate_id: estimateId,
      phase_name: phase.name,
      sort_order: i + 1,
      start_date: phaseStart.toISOString().slice(0, 10),
      end_date: phaseEnd.toISOString().slice(0, 10),
      duration_days: phase.duration_days,
      status: "pending",
      crew_assigned: [],
      notes: null,
    };
  });

  const { data: insertedPhases, error: insertError } = await supabase
    .from("job_phases")
    .insert(phasesToInsert)
    .select();

  if (insertError) {
    captureError(new Error(insertError.message), { route: "schedule-generate" });
    return NextResponse.json({ error: "Failed to generate schedule" }, { status: 500 });
  }

  // --- Audit ---
  await logAudit(
    user.id,
    "schedule_generated",
    "job_phase",
    estimateId,
    {
      project_type: estimate.project_type,
      template_id: template.id,
      phase_count: phasesToInsert.length,
      start_date: startDate.toISOString().slice(0, 10),
    },
    getClientIp(req),
  );

  return NextResponse.json({ phases: insertedPhases ?? [] });
}
