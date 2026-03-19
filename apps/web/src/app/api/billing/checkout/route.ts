import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { billingApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

interface CheckoutBody {
  planId?: string;
}

const VALID_PLANS = new Set(["pro", "enterprise", "journeyman", "master", "gc"]);

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout Session for subscribing to a paid plan.
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

  // --- Parse body ---
  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { planId } = body;

  if (!planId || !VALID_PLANS.has(planId)) {
    return NextResponse.json(
      { error: `planId must be one of: ${[...VALID_PLANS].join(", ")}` },
      { status: 400 }
    );
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
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "billing-checkout" });
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

  // --- Look up the billing plan to get the Stripe price ID ---
  const { data: plan } = await supabase
    .from("billing_plans")
    .select("id, stripe_price_id, name")
    .eq("id", planId)
    .single();

  if (!plan || !plan.stripe_price_id) {
    return NextResponse.json({ error: "Plan not found or not configured for billing" }, { status: 400 });
  }

  // --- Get or create Stripe Customer ---
  const { data: org } = await supabase
    .from("organizations")
    .select("id, stripe_customer_id, name")
    .eq("id", orgId)
    .single();

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  let customerId = org.stripe_customer_id;

  if (!customerId) {
    try {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: org.name,
        metadata: {
          organization_id: orgId,
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Store the customer ID on the organization
      await supabase
        .from("organizations")
        .update({ stripe_customer_id: customerId })
        .eq("id", orgId);
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), { route: "billing-checkout" });
      return NextResponse.json({ error: "Failed to create Stripe customer" }, { status: 500 });
    }
  }

  // --- Create Stripe Checkout Session ---
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mhpestimate.cloud";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1,
        },
      ],
      metadata: {
        organization_id: orgId,
        plan_id: planId,
      },
      subscription_data: {
        metadata: {
          organization_id: orgId,
          plan_id: planId,
        },
      },
      success_url: `${appUrl}/invite-team?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/choose-plan`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "billing-checkout" });
    console.error("Stripe checkout session creation failed:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
