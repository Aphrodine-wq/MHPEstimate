import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId, verifyEstimateOwnership } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// GET /api/job-financials/[estimateId]
// Returns a complete financial picture for one estimate/job:
//   estimate totals, job_actuals, time_entries aggregation, variances, profitability
// ---------------------------------------------------------------------------

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

  // --- Rate limiting (10 req/min per user) ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "job-financials-get" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Org ownership check ---
  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  // --- Verify estimate belongs to org ---
  const estimate = await verifyEstimateOwnership(
    estimateId,
    orgId,
    "id, organization_id, grand_total, materials_subtotal, labor_subtotal, subcontractor_total, overhead_profit, contingency, tax, gross_margin_pct",
  );
  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const supabase = createServiceClient();

  try {
    // --- Fetch job_actuals ---
    const { data: actualsRow } = await supabase
      .from("job_actuals")
      .select("actual_materials, actual_labor, actual_subs, actual_total")
      .eq("estimate_id", estimateId)
      .maybeSingle();

    // --- Fetch time entries aggregation ---
    const { data: timeEntries, error: teError } = await supabase
      .from("time_entries")
      .select("hours_worked, labor_cost, trade")
      .eq("estimate_id", estimateId)
      .eq("organization_id", orgId)
      .not("clock_out", "is", null);

    if (teError) {
      captureError(new Error(teError.message), { route: "job-financials-get" });
    }

    const entries = timeEntries ?? [];
    const totalHours = entries.reduce((sum, e) => sum + (Number(e.hours_worked) || 0), 0);
    const totalLaborCost = entries.reduce((sum, e) => sum + (Number(e.labor_cost) || 0), 0);
    const entriesCount = entries.length;

    // Group hours by trade
    const tradeMap: Record<string, { hours: number; cost: number; count: number }> = {};
    for (const e of entries) {
      const trade = (e.trade as string) || "general";
      if (!tradeMap[trade]) {
        tradeMap[trade] = { hours: 0, cost: 0, count: 0 };
      }
      tradeMap[trade].hours += Number(e.hours_worked) || 0;
      tradeMap[trade].cost += Number(e.labor_cost) || 0;
      tradeMap[trade].count += 1;
    }

    const byTrade = Object.entries(tradeMap)
      .map(([trade, data]) => ({
        trade,
        hours: Math.round(data.hours * 100) / 100,
        cost: Math.round(data.cost * 100) / 100,
        entries: data.count,
      }))
      .sort((a, b) => b.hours - a.hours);

    // --- Build estimate numbers ---
    const estMaterials = Number(estimate.materials_subtotal) || 0;
    const estLabor = Number(estimate.labor_subtotal) || 0;
    const estSubs = Number(estimate.subcontractor_total) || 0;
    const estOverhead = Number(estimate.overhead_profit) || 0;
    const estTax = Number(estimate.tax) || 0;
    const estContingency = Number(estimate.contingency) || 0;
    const estTotal = Number(estimate.grand_total) || 0;

    // --- Build actuals ---
    const actMaterials = Number(actualsRow?.actual_materials) || 0;
    const actLabor = Number(actualsRow?.actual_labor) || 0;
    const actSubs = Number(actualsRow?.actual_subs) || 0;
    const actTotal = Number(actualsRow?.actual_total) || 0;

    // Prefer time-tracking labor cost if available (more accurate than manual actuals)
    const effectiveActualLabor = totalLaborCost > 0 ? totalLaborCost : actLabor;
    const effectiveActualTotal = actMaterials + effectiveActualLabor + actSubs;

    // --- Compute variances ---
    const materialsVar = actMaterials > 0 ? actMaterials - estMaterials : 0;
    const laborVar = effectiveActualLabor > 0 ? effectiveActualLabor - estLabor : 0;
    const subsVar = actSubs > 0 ? actSubs - estSubs : 0;
    const totalVar = effectiveActualTotal > 0 ? effectiveActualTotal - (estMaterials + estLabor + estSubs) : 0;

    const pct = (variance: number, estimated: number) =>
      estimated > 0 ? Math.round((variance / estimated) * 1000) / 10 : 0;

    // --- Profitability ---
    const grossProfit = effectiveActualTotal > 0
      ? estTotal - effectiveActualTotal
      : estTotal - (estMaterials + estLabor + estSubs);
    const grossMarginPct = estTotal > 0
      ? Math.round((grossProfit / estTotal) * 1000) / 10
      : 0;
    const estimatedMarginPct = Number(estimate.gross_margin_pct) || (
      estTotal > 0 ? Math.round(((estTotal - estMaterials - estLabor - estSubs) / estTotal) * 1000) / 10 : 0
    );

    return NextResponse.json({
      estimate: {
        materials: estMaterials,
        labor: estLabor,
        subs: estSubs,
        overhead: estOverhead,
        contingency: estContingency,
        tax: estTax,
        total: estTotal,
      },
      actuals: {
        materials: actMaterials,
        labor: actLabor,
        subs: actSubs,
        total: actTotal,
        effectiveLabor: effectiveActualLabor,
        effectiveTotal: effectiveActualTotal,
      },
      timeTracking: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalLaborCost: Math.round(totalLaborCost * 100) / 100,
        entriesCount,
        avgCostPerHour: totalHours > 0 ? Math.round((totalLaborCost / totalHours) * 100) / 100 : 0,
        byTrade,
      },
      variances: {
        materials: Math.round(materialsVar * 100) / 100,
        materialsPercent: pct(materialsVar, estMaterials),
        labor: Math.round(laborVar * 100) / 100,
        laborPercent: pct(laborVar, estLabor),
        subs: Math.round(subsVar * 100) / 100,
        subsPercent: pct(subsVar, estSubs),
        total: Math.round(totalVar * 100) / 100,
        totalPercent: pct(totalVar, estMaterials + estLabor + estSubs),
      },
      profitability: {
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossMarginPct,
        estimatedMarginPct,
      },
    });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "job-financials-get" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
