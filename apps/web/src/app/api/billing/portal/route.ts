import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { billingApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for the user's organization.
 * Returns `{ url }` for client-side redirect.
 */
export async function POST(req: NextRequest) {
  // --- Auth check ---
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

  // --- Stripe setup ---
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  let stripe;
  try {
    const Stripe = (await import("stripe")).default;
    stripe = new Stripe(stripeKey);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "billing-portal" });
    return NextResponse.json({ error: "Stripe package not available" }, { status: 503 });
  }

  const supabase = createServiceClient();

  // --- Get user's organization ---
  const orgId = req.cookies.get("pe-org-id")?.value;
  if (!orgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 });
  }

  // Verify user is a member of this org
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this organization" }, { status: 403 });
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    return NextResponse.json({ error: "Only owners and admins can manage billing" }, { status: 403 });
  }

  // --- Get organization's Stripe customer ID ---
  const { data: org } = await supabase
    .from("organizations")
    .select("stripe_customer_id")
    .eq("id", orgId)
    .single();

  if (!org?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found. Please subscribe to a plan first." },
      { status: 400 }
    );
  }

  // --- Create Stripe Customer Portal session ---
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mhpestimate.cloud";

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "billing-portal" });
    console.error("Stripe portal session creation failed:", err);
    return NextResponse.json({ error: "Failed to create billing portal session" }, { status: 500 });
  }
}
