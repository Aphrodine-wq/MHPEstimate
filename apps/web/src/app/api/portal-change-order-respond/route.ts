import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { verifyPortalToken } from "@/lib/portal-token";
import { portalSignLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import { portalChangeOrderResponseSchema, validateBody } from "@/lib/api-validation";

/**
 * POST /api/portal-change-order-respond
 * Body: {
 *   estimateId: string,
 *   token: string,
 *   changeOrderId: string,
 *   action: "approve" | "reject",
 *   signerName: string,
 *   signatureDataUrl?: string, // required for approval
 *   reason?: string,           // optional for rejection
 * }
 *
 * Allows a client to approve or reject a pending change order from the portal.
 * Approval requires a digital signature. Approved COs are marked client_signed.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req) ?? "unknown";

  // Rate limit: 5 per minute per IP
  try {
    await portalSignLimiter.check(5, `co-respond:${ip}`);
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
    action?: string;
    signerName?: string;
    signatureDataUrl?: string;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { estimateId, token } = body;

  if (!estimateId || !token) {
    return NextResponse.json({ error: "Missing estimate ID or token" }, { status: 400 });
  }

  // Validate body fields
  const validation = validateBody(portalChangeOrderResponseSchema, {
    changeOrderId: body.changeOrderId,
    action: body.action,
    signerName: body.signerName,
    signatureDataUrl: body.signatureDataUrl,
    reason: body.reason,
  });
  if ("error" in validation) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { changeOrderId, action, signerName, signatureDataUrl, reason } = validation.data;

  // Approval requires a signature
  if (action === "approve" && !signatureDataUrl) {
    return NextResponse.json(
      { error: "A digital signature is required to approve a change order" },
      { status: 400 }
    );
  }

  // Verify portal token
  if (!verifyPortalToken(token, estimateId)) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
  }

  try {
    const supabase = createServiceClient();

    // Verify estimate exists and is in a viewable/signable status
    const { data: estimate, error: estErr } = await supabase
      .from("estimates")
      .select("id, status, estimate_number, client_id")
      .eq("id", estimateId)
      .single();

    if (estErr || !estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    if (!["sent", "approved", "accepted"].includes(estimate.status)) {
      return NextResponse.json(
        { error: "Estimate is not in a state that allows change order responses" },
        { status: 400 }
      );
    }

    // Fetch the change order -- must be pending
    const { data: changeOrder, error: coErr } = await supabase
      .from("estimate_change_orders")
      .select("id, estimate_id, status, client_signed, change_number, description, cost_impact")
      .eq("id", changeOrderId)
      .eq("estimate_id", estimateId)
      .single();

    if (coErr || !changeOrder) {
      return NextResponse.json({ error: "Change order not found" }, { status: 404 });
    }

    if (changeOrder.status !== "pending") {
      return NextResponse.json(
        { error: `Change order is already ${changeOrder.status}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (action === "approve") {
      // Client approves: mark as approved + signed
      const { error: updateErr } = await supabase
        .from("estimate_change_orders")
        .update({
          status: "approved",
          client_signed: true,
          signed_at: now,
        })
        .eq("id", changeOrder.id);

      if (updateErr) throw updateErr;

      // Update estimate grand_total with the cost impact
      const { data: estimateData } = await supabase
        .from("estimates")
        .select("grand_total")
        .eq("id", estimateId)
        .single();

      if (estimateData) {
        const newTotal = Number(estimateData.grand_total) + Number(changeOrder.cost_impact);
        await supabase
          .from("estimates")
          .update({ grand_total: newTotal, updated_at: now })
          .eq("id", estimateId);
      }

      // Audit log
      await logAudit(
        "portal_client",
        "change_order_client_approved",
        "estimate_change_order",
        changeOrder.id,
        {
          estimate_id: estimateId,
          change_number: changeOrder.change_number,
          cost_impact: changeOrder.cost_impact,
          signer_name: signerName,
          signer_ip: ip,
          signature_ref: signatureDataUrl ? signatureDataUrl.slice(0, 80) + "..." : null,
        },
        ip
      );

      // Send notification email to the contractor team
      await sendChangeOrderNotification(supabase, {
        estimateId,
        estimateNumber: estimate.estimate_number,
        changeNumber: changeOrder.change_number,
        description: changeOrder.description,
        costImpact: changeOrder.cost_impact,
        action: "approved",
        clientName: signerName,
      });

      return NextResponse.json({
        success: true,
        action: "approved",
        signedAt: now,
      });
    } else {
      // Client rejects: mark as rejected
      const { error: updateErr } = await supabase
        .from("estimate_change_orders")
        .update({ status: "rejected" })
        .eq("id", changeOrder.id);

      if (updateErr) throw updateErr;

      // Audit log
      await logAudit(
        "portal_client",
        "change_order_client_rejected",
        "estimate_change_order",
        changeOrder.id,
        {
          estimate_id: estimateId,
          change_number: changeOrder.change_number,
          reason: reason ?? null,
          decliner_name: signerName,
          decliner_ip: ip,
        },
        ip
      );

      // Send notification email to the contractor team
      await sendChangeOrderNotification(supabase, {
        estimateId,
        estimateNumber: estimate.estimate_number,
        changeNumber: changeOrder.change_number,
        description: changeOrder.description,
        costImpact: changeOrder.cost_impact,
        action: "rejected",
        clientName: signerName,
        reason,
      });

      return NextResponse.json({
        success: true,
        action: "rejected",
      });
    }
  } catch (err) {
    console.error("Portal change order respond error:", err);
    captureError(
      err instanceof Error ? err : new Error(String(err)),
      { route: "/api/portal-change-order-respond", estimateId, changeOrderId: body.changeOrderId }
    );
    return NextResponse.json({ error: "Failed to process change order response" }, { status: 500 });
  }
}

/* ── Internal helper: send email notification about CO status change ── */

async function sendChangeOrderNotification(
  supabase: ReturnType<typeof createServiceClient>,
  opts: {
    estimateId: string;
    estimateNumber: string;
    changeNumber: number;
    description: string;
    costImpact: number;
    action: "approved" | "rejected";
    clientName: string;
    reason?: string;
  }
): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn("[change-order-notify] RESEND_API_KEY not set, skipping notification");
    return;
  }

  const FROM = process.env.RESEND_FROM_EMAIL ?? "estimates@northmshomepros.com";
  const NOTIFICATION_EMAIL = process.env.TEAM_NOTIFICATION_EMAIL ?? "info@northmshomepros.com";

  const costFormatted = `${opts.costImpact >= 0 ? "+" : ""}$${Math.abs(opts.costImpact).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const statusColor = opts.action === "approved" ? "#16a34a" : "#dc2626";
  const statusLabel = opts.action === "approved" ? "Approved" : "Rejected";

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(RESEND_API_KEY);

    await resend.emails.send({
      from: FROM,
      to: [NOTIFICATION_EMAIL],
      subject: `Change Order #${opts.changeNumber} ${statusLabel} — ${opts.estimateNumber}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e3a5f; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; color: #ffffff; font-size: 18px;">Change Order ${statusLabel}</h1>
            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.7); font-size: 13px;">
              Estimate ${opts.estimateNumber}
            </p>
          </div>
          <div style="background: #ffffff; padding: 24px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <div style="margin-bottom: 16px;">
              <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #ffffff; background: ${statusColor};">
                ${statusLabel} by Client
              </span>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 140px;">Change Order</td>
                <td style="padding: 8px 0; font-weight: 600; color: #111827;">#${opts.changeNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Description</td>
                <td style="padding: 8px 0; color: #111827;">${opts.description}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Cost Impact</td>
                <td style="padding: 8px 0; font-weight: 600; color: ${statusColor};">${costFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Client</td>
                <td style="padding: 8px 0; color: #111827;">${opts.clientName}</td>
              </tr>
              ${opts.reason ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Reason</td>
                <td style="padding: 8px 0; color: #111827;">${opts.reason}</td>
              </tr>
              ` : ""}
            </table>
            <p style="margin: 20px 0 0; font-size: 12px; color: #9ca3af;">
              This notification was sent automatically by MHP Estimate.
            </p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    // Email failures should not break the main operation
    console.error("[change-order-notify] Failed to send notification:", err);
  }
}
