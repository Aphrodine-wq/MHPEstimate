import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import { predictWinProbability } from "@proestimate/estimation-engine";

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const inputSchema = z.object({
  estimateId: z.string().uuid("estimateId must be a valid UUID"),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-predict-win" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Parse & validate ---
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-predict-win" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = inputSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { estimateId } = validated.data;
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

  // --- Fetch estimate ---
  const { data: estimate, error: estError } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimateId)
    .single();

  if (estError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  // --- Load historical win rates from DB ---
  // Group estimates by project_type+status, count accepted vs total sent
  const { data: allEstimates } = await supabase
    .from("estimates")
    .select("project_type, status")
    .in("status", ["accepted", "declined", "sent"]);

  const byProjectType: Record<string, { wins: number; total: number }> = {};
  let overallWins = 0;
  let overallTotal = 0;

  for (const est of allEstimates ?? []) {
    const pt = est.project_type ?? "General";
    if (!byProjectType[pt]) byProjectType[pt] = { wins: 0, total: 0 };
    byProjectType[pt].total++;
    overallTotal++;
    if (est.status === "accepted") {
      byProjectType[pt].wins++;
      overallWins++;
    }
  }

  const historicalRates = {
    byProjectType: Object.fromEntries(
      Object.entries(byProjectType).map(([k, v]) => [
        k,
        v.total > 0 ? v.wins / v.total : 0.5,
      ]),
    ),
    overall: overallTotal > 0 ? overallWins / overallTotal : 0.5,
  };

  // --- Check if this is a repeat client ---
  let isRepeatClient = false;
  if (estimate.client_id) {
    const { count } = await supabase
      .from("estimates")
      .select("id", { count: "exact", head: true })
      .eq("client_id", estimate.client_id)
      .eq("status", "accepted")
      .neq("id", estimateId);

    isRepeatClient = (count ?? 0) > 0;
  }

  // --- Compute days since created ---
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(estimate.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );

  // --- Direct cost total ---
  const directCostTotal =
    Number(estimate.materials_subtotal ?? 0) +
    Number(estimate.labor_subtotal ?? 0) +
    Number(estimate.subcontractor_total ?? 0);

  // --- Run prediction ---
  const result = predictWinProbability(
    {
      projectType: estimate.project_type ?? "General",
      bidTotal: Number(estimate.grand_total ?? 0),
      directCostTotal,
      tier: estimate.tier ?? "midrange",
      zipCode: estimate.zip_code ?? undefined,
      daysSinceCreated,
      isRepeatClient,
    },
    historicalRates,
  );

  // --- Update estimate with win score ---
  await supabase
    .from("estimates")
    .update({
      win_score: result.winProbability,
      win_score_updated_at: new Date().toISOString(),
    })
    .eq("id", estimateId);

  // --- Audit ---
  await logAudit(
    user.id,
    "win_score_calculated",
    "estimate",
    estimateId,
    {
      win_probability: result.winProbability,
      is_repeat_client: isRepeatClient,
      days_since_created: daysSinceCreated,
      bid_total: Number(estimate.grand_total ?? 0),
    },
    getClientIp(req),
  );

  return NextResponse.json({
    score: result.winProbability,
    factors: result.scoreBreakdown,
    suggestions: result.priceAdjustments,
    currentGrossMarginPct: result.currentGrossMarginPct,
    marginFloor: result.marginFloor,
    isAboveMarginFloor: result.isAboveMarginFloor,
  });
}
