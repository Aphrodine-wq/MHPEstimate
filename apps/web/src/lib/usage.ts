import { createServiceClient } from "./supabase-server";

interface UsageLimitResult {
  allowed: boolean;
  current: number;
  limit: number | null; // null = unlimited
}

/**
 * Check if an organization has capacity for a resource.
 * Called before creating estimates or inviting team members.
 */
export async function checkUsageLimit(
  orgId: string,
  resource: "estimates" | "team_members"
): Promise<UsageLimitResult> {
  const supabase = createServiceClient();

  // Get the org's current plan
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan_id")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: plan } = await supabase
    .from("billing_plans")
    .select("max_team_members, max_estimates_per_month")
    .eq("id", sub?.plan_id ?? "free")
    .single();

  if (resource === "estimates") {
    const limit = plan?.max_estimates_per_month ?? null;
    if (limit === null) return { allowed: true, current: 0, limit: null };

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("estimates")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", startOfMonth.toISOString());

    const current = count ?? 0;
    return { allowed: current < limit, current, limit };
  }

  if (resource === "team_members") {
    const limit = plan?.max_team_members ?? null;
    if (limit === null) return { allowed: true, current: 0, limit: null };

    const { count } = await supabase
      .from("org_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("is_active", true);

    const current = count ?? 0;
    return { allowed: current < limit, current, limit };
  }

  return { allowed: true, current: 0, limit: null };
}
