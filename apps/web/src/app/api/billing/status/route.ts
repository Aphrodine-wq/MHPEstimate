import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { billingApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

/**
 * GET /api/billing/status
 *
 * Returns the current billing plan, subscription status, and usage stats
 * for the authenticated user's organization.
 */
export async function GET(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 10 per minute per user ---
  try {
    await billingApiLimiter.check(10, user.id);
  } catch {
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  const orgId = req.cookies.get("pe-org-id")?.value;
  if (!orgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, stripe_subscription_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch plan details
  const planId = subscription?.plan_id ?? "free";
  const { data: plan } = await supabase
    .from("billing_plans")
    .select("id, name, price_monthly_cents, max_team_members, max_estimates_per_month, features")
    .eq("id", planId)
    .maybeSingle();

  // Fetch organization for stripe_customer_id
  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .single();

  // Count estimates this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const { count: estimatesThisMonth } = await supabase
    .from("estimates")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", monthStart);

  // Count active team members
  const { count: teamMembers } = await supabase
    .from("org_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("is_active", true);

  try {
    return NextResponse.json({
      plan: plan ?? { id: "free", name: "Free", price_monthly_cents: 0, max_team_members: 1, max_estimates_per_month: 10, features: {} },
      subscription: subscription
        ? {
            id: subscription.id,
            plan_id: subscription.plan_id,
            status: subscription.status,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
          }
        : null,
      usage: {
        estimatesThisMonth: estimatesThisMonth ?? 0,
        teamMembers: teamMembers ?? 0,
      },
      hasStripeCustomer: !!org?.stripe_customer_id,
    });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "billing-status" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
