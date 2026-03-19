import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

export async function GET(req: NextRequest) {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-win-rates" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
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

  // --- Aggregate win rates by project_type + tier + status ---
  const { data: estimates, error } = await supabase
    .from("estimates")
    .select("project_type, tier, status")
    .in("status", ["accepted", "declined", "sent"]);

  if (error) {
    captureError(new Error(error.message), { route: "estimates-win-rates" });
    return NextResponse.json({ error: "Failed to fetch estimates" }, { status: 500 });
  }

  // Build aggregation map: key = "projectType|tier"
  const aggregation: Record<string, { wins: number; total: number }> = {};

  for (const est of estimates ?? []) {
    const pt = est.project_type ?? "General";
    const t = est.tier ?? "midrange";
    const key = `${pt}|${t}`;

    if (!aggregation[key]) aggregation[key] = { wins: 0, total: 0 };
    aggregation[key].total++;
    if (est.status === "accepted") {
      aggregation[key].wins++;
    }
  }

  const winRates = Object.entries(aggregation).map(([key, { wins, total }]) => {
    const [projectType, tier] = key.split("|");
    return {
      projectType,
      tier,
      wins,
      total,
      winRate: total > 0 ? Math.round((wins / total) * 1000) / 1000 : 0,
    };
  });

  // Sort by total descending for most relevant first
  winRates.sort((a, b) => b.total - a.total);

  return NextResponse.json({ winRates });
}
