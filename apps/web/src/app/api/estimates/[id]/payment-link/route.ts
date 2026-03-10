import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 10 requests/minute per user ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch {
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      {
        error: "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment variables.",
        configured: false,
      },
      { status: 503 }
    );
  }

  const supabase = createServiceClient();

  // --- Ownership check: user must be an active team member ---
  const { data: teamMember, error: teamMemberError } = await supabase
    .from("team_members")
    .select("id, is_active")
    .eq("auth_id", user.id)
    .single();

  if (teamMemberError || !teamMember || !teamMember.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch estimate
  const { data: estimate, error: estError } = await supabase
    .from("estimates")
    .select("id, estimate_number, grand_total, client_id, project_type, status")
    .eq("id", id)
    .single();

  if (estError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  if (!["approved", "sent", "accepted"].includes(estimate.status)) {
    return NextResponse.json(
      { error: `Estimate must be approved or sent before requesting payment (current: ${estimate.status})` },
      { status: 400 }
    );
  }

  const amount = Math.round(Number(estimate.grand_total) * 100); // cents
  if (amount <= 0) {
    return NextResponse.json({ error: "Estimate total must be greater than zero" }, { status: 400 });
  }

  // Get client email if available
  let customerEmail: string | undefined;
  if (estimate.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("email")
      .eq("id", estimate.client_id)
      .single();
    customerEmail = client?.email || undefined;
  }

  // Dynamic import — Stripe is an optional dependency
  let stripe;
  try {
    const Stripe = (await import("stripe")).default;
    stripe = new Stripe(stripeKey);
  } catch {
    return NextResponse.json(
      { error: "Stripe package not installed. Run: pnpm add stripe" },
      { status: 503 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mhpestimate.cloud";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Estimate ${estimate.estimate_number}`,
              description: `${estimate.project_type} — North MS Home Pros`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      customer_email: customerEmail,
      metadata: {
        estimate_id: id,
        estimate_number: estimate.estimate_number,
      },
      success_url: `${appUrl}?payment=success&estimate=${id}`,
      cancel_url: `${appUrl}?payment=cancelled&estimate=${id}`,
    });

    await logAudit(
      user.id,
      "payment_link_created",
      "estimate",
      id,
      { estimate_number: estimate.estimate_number, amount: amount / 100, session_id: session.id },
      getClientIp(req)
    );

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      configured: true,
    });
  } catch (err) {
    console.error("Stripe session creation failed:", err);
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ configured: false, status: "not_configured" });
  }

  let stripe;
  try {
    const Stripe = (await import("stripe")).default;
    stripe = new Stripe(stripeKey);
  } catch {
    return NextResponse.json({ configured: false, status: "not_installed" });
  }

  try {
    // Search for checkout sessions with this estimate ID in metadata
    const sessions = await stripe.checkout.sessions.list({
      limit: 10,
    });

    const matching = sessions.data.filter(
      (s) => s.metadata?.estimate_id === id
    );

    if (matching.length === 0) {
      return NextResponse.json({ configured: true, status: "unpaid", sessions: [] });
    }

    const paid = matching.find((s) => s.payment_status === "paid");
    if (paid) {
      return NextResponse.json({
        configured: true,
        status: "paid",
        amount: (paid.amount_total ?? 0) / 100,
        paidAt: paid.created ? new Date(paid.created * 1000).toISOString() : null,
      });
    }

    return NextResponse.json({
      configured: true,
      status: "pending",
      lastSessionUrl: matching[0]?.url,
    });
  } catch (err) {
    console.error("Stripe status check failed:", err);
    return NextResponse.json({ configured: true, status: "error" }, { status: 500 });
  }
}
