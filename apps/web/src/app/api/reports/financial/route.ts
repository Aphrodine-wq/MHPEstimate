import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

function getPeriodRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();

  switch (period) {
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      return { start, end };
    }
    case "this_quarter": {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterMonth, 1).toISOString();
      return { start, end };
    }
    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1).toISOString();
      return { start, end };
    }
    case "all":
    default:
      return { start: "2000-01-01T00:00:00.000Z", end };
  }
}

/**
 * GET /api/reports/financial — Aggregate financial report across all estimates/jobs
 *
 * Query params:
 *   period (optional) — this_month, this_quarter, this_year, all (default: all)
 *   type   (optional) — summary, by_job, cash_flow (default: returns all)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await estimateApiLimiter.check(20, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "reports-financial-get" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? "all";
  const reportType = searchParams.get("type");

  const { start, end } = getPeriodRange(period);
  const supabase = createServiceClient();

  try {
    const { data: estimates, error: estError } = await supabase
      .from("estimates")
      .select("id, estimate_number, status, total, created_at, project_type, client:clients(id, first_name, last_name)")
      .eq("organization_id", orgId)
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });

    if (estError) {
      captureError(new Error(estError.message), { route: "reports-financial-get" });
      return NextResponse.json({ error: "Failed to fetch estimates" }, { status: 500 });
    }

    const allEstimates = estimates ?? [];
    const estimateIds = allEstimates.map((e) => e.id);

    let actuals: Array<{
      estimate_id: string;
      materials_cost: number | null;
      labor_cost: number | null;
      subcontractor_cost: number | null;
      total_actual: number | null;
    }> = [];
    if (estimateIds.length > 0) {
      const { data: actualsData } = await supabase
        .from("job_actuals")
        .select("estimate_id, materials_cost, labor_cost, subcontractor_cost, total_actual")
        .in("estimate_id", estimateIds);
      actuals = actualsData ?? [];
    }

    let invoices: Array<{
      estimate_id: string | null;
      total: number | null;
      amount_paid: number | null;
      status: string;
      issued_at: string | null;
      created_at: string;
    }> = [];
    if (estimateIds.length > 0) {
      const { data: invData } = await supabase
        .from("invoices")
        .select("estimate_id, total, amount_paid, status, issued_at, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", start)
        .lte("created_at", end);
      invoices = invData ?? [];
    }

    const actualsMap = new Map<string, typeof actuals[number]>();
    for (const a of actuals) {
      actualsMap.set(a.estimate_id, a);
    }

    let totalEstimated = 0;
    let totalActual = 0;
    let completedCount = 0;

    for (const est of allEstimates) {
      const estTotal = Number(est.total) || 0;
      totalEstimated += estTotal;

      const actual = actualsMap.get(est.id);
      if (actual) {
        totalActual += Number(actual.total_actual) || 0;
      }

      if (est.status === "completed" || est.status === "accepted") {
        completedCount++;
      }
    }

    const totalProfit = totalEstimated - totalActual;
    const avgMarginPct = totalEstimated > 0
      ? Math.round((totalProfit / totalEstimated) * 1000) / 10
      : 0;

    const summary = {
      totalEstimated: Math.round(totalEstimated),
      totalActual: Math.round(totalActual),
      totalProfit: Math.round(totalProfit),
      avgMarginPct,
      jobCount: allEstimates.length,
    };

    if (reportType === "summary") {
      return NextResponse.json({ summary });
    }

    const byJob = allEstimates.map((est) => {
      const estimated = Number(est.total) || 0;
      const actual = actualsMap.get(est.id);
      const actualTotal = actual ? (Number(actual.total_actual) || 0) : 0;
      const profit = estimated - actualTotal;
      const marginPct = estimated > 0 ? Math.round((profit / estimated) * 1000) / 10 : 0;

      const client = est.client as unknown as { id: string; first_name: string | null; last_name: string | null } | null;
      const clientName = client
        ? [client.first_name, client.last_name].filter(Boolean).join(" ") || "Unknown"
        : "No Client";

      return {
        estimateId: est.id,
        estimateNumber: est.estimate_number ?? "—",
        clientName,
        projectType: est.project_type ?? "general",
        estimated: Math.round(estimated),
        actual: Math.round(actualTotal),
        profit: Math.round(profit),
        marginPct,
        status: est.status ?? "draft",
      };
    });

    if (reportType === "by_job") {
      return NextResponse.json({ byJob });
    }

    const monthlyMap = new Map<string, { invoiced: number; collected: number; outstanding: number }>();
    for (const inv of invoices) {
      const dateStr = inv.issued_at ?? inv.created_at;
      if (!dateStr) continue;
      const month = dateStr.slice(0, 7);
      const entry = monthlyMap.get(month) ?? { invoiced: 0, collected: 0, outstanding: 0 };
      const invTotal = Number(inv.total) || 0;
      const paid = Number(inv.amount_paid) || 0;
      entry.invoiced += invTotal;
      entry.collected += paid;
      entry.outstanding += invTotal - paid;
      monthlyMap.set(month, entry);
    }

    const monthlyData = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        invoiced: Math.round(data.invoiced),
        collected: Math.round(data.collected),
        outstanding: Math.round(data.outstanding),
      }));

    if (reportType === "cash_flow") {
      return NextResponse.json({ cashFlow: { monthlyData } });
    }

    let totalLabor = 0;
    let totalMaterials = 0;
    let totalSubs = 0;
    for (const a of actuals) {
      totalLabor += Number(a.labor_cost) || 0;
      totalMaterials += Number(a.materials_cost) || 0;
      totalSubs += Number(a.subcontractor_cost) || 0;
    }
    const overheadTotal = totalLabor + totalMaterials + totalSubs;
    const overhead = {
      totalLabor: Math.round(totalLabor),
      totalMaterials: Math.round(totalMaterials),
      totalSubs: Math.round(totalSubs),
      laborPct: overheadTotal > 0 ? Math.round((totalLabor / overheadTotal) * 1000) / 10 : 0,
      materialsPct: overheadTotal > 0 ? Math.round((totalMaterials / overheadTotal) * 1000) / 10 : 0,
      subsPct: overheadTotal > 0 ? Math.round((totalSubs / overheadTotal) * 1000) / 10 : 0,
    };

    return NextResponse.json({
      summary,
      byJob,
      cashFlow: { monthlyData },
      overhead,
    });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "reports-financial-get" });
    return NextResponse.json({ error: "Failed to generate financial report" }, { status: 500 });
  }
}
