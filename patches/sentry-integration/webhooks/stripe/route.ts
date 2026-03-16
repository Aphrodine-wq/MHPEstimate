import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { logAudit } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events for payment confirmations.
 * Configured in Stripe Dashboard → Webhooks → Add endpoint.
 *
 * Events handled:
 * - checkout.session.completed — marks estimate as paid/accepted
 */
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  // Read raw body for signature verification
  const rawBody = await req.text();

  let stripe;
  try {
    const Stripe = (await import("stripe")).default;
    stripe = new Stripe(stripeKey);
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "webhooks-stripe" });
    return NextResponse.json({ error: "Stripe package not available" }, { status: 503 });
  }

  // Verify webhook signature if secret is configured
  let event;
  if (webhookSecret) {
    const sig = req.headers.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
    }
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), { route: "webhooks-stripe" });
      console.error("Stripe webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    // No webhook secret — parse event without verification (dev only)
    try {
      event = JSON.parse(rawBody) as { type: string; data: { object: Record<string, unknown> } };
    } catch {
      captureError(err instanceof Error ? err : new Error(String(err)), { route: "webhooks-stripe" });
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      payment_status: string;
      amount_total: number | null;
      metadata: Record<string, string> | null;
      customer_email: string | null;
    };

    const estimateId = session.metadata?.estimate_id;
    const estimateNumber = session.metadata?.estimate_number;

    if (!estimateId) {
      // Not one of our sessions — ignore
      return NextResponse.json({ received: true });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();
    const now = new Date().toISOString();

    // Update estimate status to accepted if it's currently sent/approved
    const { data: estimate } = await supabase
      .from("estimates")
      .select("id, status")
      .eq("id", estimateId)
      .single();

    if (estimate && ["sent", "approved"].includes(estimate.status)) {
      await supabase
        .from("estimates")
        .update({
          status: "accepted",
          accepted_at: now,
          updated_at: now,
        })
        .eq("id", estimateId);
    }

    await logAudit(
      "stripe_webhook",
      "estimate_accepted",
      "estimate",
      estimateId,
      {
        method: "stripe_payment",
        session_id: session.id,
        amount: (session.amount_total ?? 0) / 100,
        estimate_number: estimateNumber ?? null,
        customer_email: session.customer_email ?? null,
      },
      null
    );
  }

  return NextResponse.json({ received: true });
}
