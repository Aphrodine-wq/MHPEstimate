import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { verifyPortalToken } from "@/lib/portal-token";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import { createHash } from "crypto";

/** 5 requests/minute per IP for payment creation */
const portalPayLimiter = rateLimit({
  interval: 60_000,
  uniqueTokenPerInterval: 500,
});

type PaymentMode = "full" | "deposit_percent" | "milestone";

interface PaymentConfig {
  mode: PaymentMode;
  deposit_percent?: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // --- Token validation ---
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  if (!verifyPortalToken(token, id)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // --- Rate limiting ---
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  try {
    await portalPayLimiter.check(5, ip);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "portal-pay" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json(
      { error: "Payment processing is not configured." },
      { status: 503 }
    );
  }

  const supabase = createServiceClient();

  // --- Fetch estimate ---
  const { data: estimate, error: estError } = await supabase
    .from("estimates")
    .select("id, estimate_number, grand_total, client_id, project_type, status, version, organization_id")
    .eq("id", id)
    .single();

  if (estError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  // Only accepted estimates can be paid via portal
  if (estimate.status !== "accepted") {
    return NextResponse.json(
      { error: "This estimate must be accepted before payment can be made." },
      { status: 400 }
    );
  }

  const grandTotal = Number(estimate.grand_total);
  if (grandTotal <= 0) {
    return NextResponse.json({ error: "Estimate total must be greater than zero" }, { status: 400 });
  }

  // --- Determine payment config (company default + per-estimate override) ---
  let paymentConfig: PaymentConfig = { mode: "full" };

  if (estimate.organization_id) {
    const { data: settingRow } = await supabase
      .from("company_settings")
      .select("value")
      .eq("organization_id", estimate.organization_id)
      .eq("key", "payment_config")
      .maybeSingle();

    if (settingRow?.value) {
      const val = typeof settingRow.value === "object" && settingRow.value !== null
        ? (settingRow.value as Record<string, unknown>).value ?? settingRow.value
        : settingRow.value;
      if (typeof val === "object" && val !== null) {
        const cfg = val as Record<string, unknown>;
        if (cfg.mode === "deposit_percent" || cfg.mode === "milestone" || cfg.mode === "full") {
          paymentConfig = {
            mode: cfg.mode as PaymentMode,
            deposit_percent: typeof cfg.deposit_percent === "number" ? cfg.deposit_percent : undefined,
          };
        }
      }
    }
  }

  // Calculate amount based on payment mode
  let amount: number;
  let description: string;

  switch (paymentConfig.mode) {
    case "deposit_percent": {
      const pct = paymentConfig.deposit_percent ?? 50;
      amount = Math.round(grandTotal * (pct / 100) * 100); // cents
      description = `${pct}% Deposit — Estimate ${estimate.estimate_number}`;
      break;
    }
    case "full":
    default:
      amount = Math.round(grandTotal * 100); // cents
      description = `Estimate ${estimate.estimate_number}`;
      break;
  }

  if (amount <= 0) {
    return NextResponse.json({ error: "Payment amount must be greater than zero" }, { status: 400 });
  }

  // --- Get client email ---
  let customerEmail: string | undefined;
  if (estimate.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("email")
      .eq("id", estimate.client_id)
      .single();
    customerEmail = client?.email || undefined;
  }

  // --- Create Stripe Checkout session with idempotency key ---
  let stripe;
  try {
    const Stripe = (await import("stripe")).default;
    stripe = new Stripe(stripeKey);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "portal-pay" });
    return NextResponse.json({ error: "Payment processing unavailable" }, { status: 503 });
  }

  // Idempotency key: hash of estimate_id + version + payment_mode + amount
  // This prevents duplicate checkout sessions for the same payment intent
  const idempotencyKey = createHash("sha256")
    .update(`portal-pay:${id}:v${estimate.version}:${paymentConfig.mode}:${amount}`)
    .digest("hex");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mhpestimate.cloud";
  const portalUrl = `${appUrl}/portal/${id}?token=${encodeURIComponent(token)}`;

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: description,
                description: `${estimate.project_type} — Payment`,
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
          estimate_version: String(estimate.version),
          payment_mode: paymentConfig.mode,
          source: "portal",
        },
        success_url: `${portalUrl}&payment=success`,
        cancel_url: `${portalUrl}&payment=cancelled`,
      },
      { idempotencyKey }
    );

    await logAudit(
      "portal_client",
      "payment_link_created",
      "estimate",
      id,
      {
        method: "portal_stripe_checkout",
        session_id: session.id,
        amount: amount / 100,
        payment_mode: paymentConfig.mode,
        ip,
      },
      ip
    );

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
      amount: amount / 100,
      paymentMode: paymentConfig.mode,
    });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "portal-pay" });
    console.error("Stripe checkout session creation failed:", err);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
