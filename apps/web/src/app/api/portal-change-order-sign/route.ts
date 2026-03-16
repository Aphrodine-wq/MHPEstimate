import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { verifyPortalToken } from "@/lib/portal-token";
import { portalSignLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import { portalChangeOrderSignSchema, validateBody } from "@/lib/api-validation";

/**
 * POST /api/portal-change-order-sign
 * Body: { estimateId: string, token: string, changeOrderId: string, signerName: string }
 *
 * Allows a client to sign/approve a change order from the portal.
 * The change order must already be approved by the contractor.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req) ?? "unknown";

  // Rate limit: 5 per minute per IP
  try {
    await portalSignLimiter.check(5, `co-sign:${ip}`);
  } catch {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: {
    estimateId?: string;
    token?: string;
    changeOrderId?: string;
    signerName?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { estimateId, token, changeOrderId, signerName } = body;

  if (!estimateId || !token) {
    return NextResponse.json({ error: "Missing estimate ID or token" }, { status: 400 });
  }

  // Validate body fields
  const validation = validateBody(portalChangeOrderSignSchema, { changeOrderId, signerName });
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Verify portal token
  if (!verifyPortalToken(token, estimateId)) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
  }

  try {
    const supabase = createServiceClient();

    // Verify estimate exists and is in correct status
    const { data: estimate, error: estErr } = await supabase
      .from("estimates")
      .select("id, status")
      .eq("id", estimateId)
      .single();

    if (estErr || !estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    if (!["sent", "approved", "accepted"].includes(estimate.status)) {
      return NextResponse.json({ error: "Estimate not in a signable state" }, { status: 400 });
    }

    // Fetch the change order — must be approved (by contractor) and not yet signed by client
    const { data: changeOrder, error: coErr } = await supabase
      .from("estimate_change_orders")
      .select("id, estimate_id, status, client_signed, change_number")
      .eq("id", validation.data.changeOrderId)
      .eq("estimate_id", estimateId)
      .single();

    if (coErr || !changeOrder) {
      return NextResponse.json({ error: "Change order not found" }, { status: 404 });
    }

    if (changeOrder.status !== "approved") {
      return NextResponse.json(
        { error: "Change order must be approved by the contractor before client signing" },
        { status: 400 }
      );
    }

    if (changeOrder.client_signed) {
      return NextResponse.json(
        { error: "Change order already signed" },
        { status: 400 }
      );
    }

    // Sign the change order
    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("estimate_change_orders")
      .update({
        client_signed: true,
        signed_at: now,
      })
      .eq("id", changeOrder.id);

    if (updateErr) {
      throw updateErr;
    }

    // Audit log
    await logAudit(
      "portal_client",
      "change_order_signed" as never,
      "estimate_change_order",
      changeOrder.id,
      {
        estimate_id: estimateId,
        change_number: changeOrder.change_number,
        signer_name: validation.data.signerName,
        signer_ip: ip,
      },
      ip
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Portal change order sign error:", err);
    captureError(
      err instanceof Error ? err : new Error(String(err)),
      { route: "/api/portal-change-order-sign", estimateId, changeOrderId }
    );
    return NextResponse.json({ error: "Failed to sign change order" }, { status: 500 });
  }
}
