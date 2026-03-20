import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import { generateICalendar, type ICalPhase } from "@proestimate/estimation-engine";

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
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "schedule-export-ics" });
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
    .select("id, estimate_number, project_address, organization_id")
    .eq("id", estimateId)
    .single();

  if (estError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  if (estimate.organization_id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Fetch job phases ---
  const { data: phases, error: phasesError } = await supabase
    .from("job_phases")
    .select("*")
    .eq("estimate_id", estimateId)
    .order("sort_order");

  if (phasesError) {
    captureError(new Error(phasesError.message), { route: "schedule-export-ics" });
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }

  if (!phases || phases.length === 0) {
    return NextResponse.json({ error: "No schedule phases found for this estimate" }, { status: 404 });
  }

  // --- Map to ICalPhase ---
  const icalPhases: ICalPhase[] = phases.map((p) => ({
    id: p.id,
    phaseName: p.phase_name,
    startDate: p.start_date,
    endDate: p.end_date,
    status: p.status ?? "pending",
    crewAssigned: p.crew_assigned ?? [],
    notes: p.notes ?? undefined,
    projectAddress: estimate.project_address ?? undefined,
    estimateNumber: estimate.estimate_number ?? undefined,
  }));

  // --- Generate .ics ---
  const icsContent = generateICalendar(icalPhases, {
    calendarName: `MHP Estimate - ${estimate.estimate_number}`,
    companyName: "North MS Home Pros",
  });

  // --- Audit ---
  await logAudit(
    user.id,
    "schedule_exported",
    "job_phase",
    estimateId,
    {
      estimate_number: estimate.estimate_number,
      phase_count: phases.length,
      format: "ics",
    },
    getClientIp(req),
  );

  const filename = `${estimate.estimate_number ?? "schedule"}_schedule.ics`;

  return new NextResponse(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
