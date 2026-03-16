import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { getPortalUrl } from "@/lib/portal-token";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

type Params = { params: Promise<{ id: string }> };

/** GET /api/estimates/[id]/change-orders — list change orders for an estimate */
export async function GET(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { id } = await params;

  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 30 requests/minute per user ---
  try {
    await estimateApiLimiter.check(30, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-change-orders" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("estimate_change_orders")
    .select("*")
    .eq("estimate_id", id)
    .order("change_number", { ascending: true });

  if (error) {
    captureError(new Error(error.message || error.toString()), { route: "estimates-change-orders" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ changeOrders: data ?? [] });
}

/** POST /api/estimates/[id]/change-orders — create a new change order */
export async function POST(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { id } = await params;

  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 10 requests/minute per user ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-change-orders" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  let body: {
    description?: string;
    cost_impact?: number;
    timeline_impact?: string | null;
  };

  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-change-orders" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { description, cost_impact, timeline_impact } = body;

  if (!description || typeof cost_impact !== "number") {
    return NextResponse.json(
      { error: "Missing required fields: description, cost_impact" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // --- Ownership check: user must be an active team member ---
  const { data: teamMemberPost, error: teamMemberPostError } = await supabase
    .from("team_members")
    .select("id, is_active")
    .eq("auth_id", user.id)
    .single();

  if (teamMemberPostError || !teamMemberPost || !teamMemberPost.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify estimate exists
  const { data: estimate, error: fetchError } = await supabase
    .from("estimates")
    .select("id, status, estimate_number, client_id")
    .eq("id", id)
    .single();

  if (fetchError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  // Only allow change orders on approved/sent/accepted estimates
  const allowedStatuses = ["approved", "sent", "accepted"];
  if (!allowedStatuses.includes(estimate.status)) {
    return NextResponse.json(
      {
        error: `Change orders can only be added to approved, sent, or accepted estimates (current status: ${estimate.status})`,
      },
      { status: 400 }
    );
  }

  // Get next change number
  const { data: existing } = await supabase
    .from("estimate_change_orders")
    .select("change_number")
    .eq("estimate_id", id)
    .order("change_number", { ascending: false })
    .limit(1);

  const nextNumber = (existing?.[0]?.change_number ?? 0) + 1;

  const { data: newCo, error: insertError } = await supabase
    .from("estimate_change_orders")
    .insert({
      estimate_id: id,
      change_number: nextNumber,
      description: description.trim(),
      cost_impact,
      timeline_impact: timeline_impact || null,
      status: "pending",
      client_signed: false,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await logAudit(
    user.id,
    "change_order_created",
    "estimate_change_order",
    newCo.id,
    { estimate_id: id, change_number: nextNumber, cost_impact, description: description.trim() },
    getClientIp(req)
  );

  // Send email notification to the client about the new change order
  await sendChangeOrderClientNotification(supabase, {
    estimateId: id,
    estimateNumber: estimate.estimate_number ?? id.slice(0, 8),
    changeNumber: nextNumber,
    description: description.trim(),
    costImpact: cost_impact,
    timelineImpact: timeline_impact ?? null,
    event: "created",
  });

  return NextResponse.json({ changeOrder: newCo }, { status: 201 });
}

/** PATCH /api/estimates/[id]/change-orders — update a change order's status, signature, or editable fields */
export async function PATCH(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { id } = await params;

  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 10 requests/minute per user ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-change-orders" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  let body: {
    change_order_id?: string;
    status?: "pending" | "approved" | "rejected";
    client_signed?: boolean;
    description?: string;
    cost_impact?: number;
    timeline_impact?: string | null;
  };

  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-change-orders" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { change_order_id, status, client_signed, description, cost_impact, timeline_impact } = body;

  if (!change_order_id) {
    return NextResponse.json({ error: "Missing change_order_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // --- Ownership check: user must be an active team member ---
  const { data: teamMemberPatch, error: teamMemberPatchError } = await supabase
    .from("team_members")
    .select("id, is_active")
    .eq("auth_id", user.id)
    .single();

  if (teamMemberPatchError || !teamMemberPatch || !teamMemberPatch.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // If editing description/cost/timeline, the change order must still be pending
  const isEditingFields = description !== undefined || cost_impact !== undefined || timeline_impact !== undefined;
  if (isEditingFields) {
    const { data: existing, error: fetchErr } = await supabase
      .from("estimate_change_orders")
      .select("status")
      .eq("id", change_order_id)
      .eq("estimate_id", id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: "Change order not found" }, { status: 404 });
    }
    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending change orders can be edited" },
        { status: 400 }
      );
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (status !== undefined) updatePayload.status = status;
  if (client_signed !== undefined) {
    updatePayload.client_signed = client_signed;
    updatePayload.signed_at = client_signed ? new Date().toISOString() : null;
  }
  if (description !== undefined) updatePayload.description = description.trim();
  if (cost_impact !== undefined) updatePayload.cost_impact = cost_impact;
  if (timeline_impact !== undefined) updatePayload.timeline_impact = timeline_impact || null;

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("estimate_change_orders")
    .update(updatePayload)
    .eq("id", change_order_id)
    .eq("estimate_id", id)
    .select()
    .single();

  if (error) {
    captureError(new Error(error.message || error.toString()), { route: "estimates-change-orders" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (status === "approved" || status === "rejected") {
    await logAudit(
      user.id,
      status === "approved" ? "change_order_approved" : "change_order_rejected",
      "estimate_change_order",
      change_order_id,
      { estimate_id: id, status },
      getClientIp(req)
    );

    // Send email notification to the client about status change
    // Fetch estimate details for the notification
    const { data: estimateForNotify } = await supabase
      .from("estimates")
      .select("estimate_number, client_id")
      .eq("id", id)
      .single();

    if (estimateForNotify && data) {
      await sendChangeOrderClientNotification(supabase, {
        estimateId: id,
        estimateNumber: estimateForNotify.estimate_number ?? id.slice(0, 8),
        changeNumber: data.change_number,
        description: data.description,
        costImpact: data.cost_impact,
        timelineImpact: data.timeline_impact ?? null,
        event: status === "approved" ? "approved_by_contractor" : "rejected_by_contractor",
      });
    }
  }

  return NextResponse.json({ changeOrder: data });
}

/** DELETE /api/estimates/[id]/change-orders — delete a pending change order */
export async function DELETE(
  req: NextRequest,
  { params }: Params
): Promise<NextResponse> {
  const { id } = await params;

  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 10 requests/minute per user ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-change-orders" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  let body: { change_order_id?: string };
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-change-orders" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { change_order_id } = body;
  if (!change_order_id) {
    return NextResponse.json({ error: "Missing change_order_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // --- Ownership check: user must be an active team member ---
  const { data: teamMemberDel, error: teamMemberDelError } = await supabase
    .from("team_members")
    .select("id, is_active")
    .eq("auth_id", user.id)
    .single();

  if (teamMemberDelError || !teamMemberDel || !teamMemberDel.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the change order exists, belongs to this estimate, and is pending
  const { data: existing, error: fetchErr } = await supabase
    .from("estimate_change_orders")
    .select("id, status")
    .eq("id", change_order_id)
    .eq("estimate_id", id)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Change order not found" }, { status: 404 });
  }

  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending change orders can be deleted" },
      { status: 400 }
    );
  }

  const { error: deleteErr } = await supabase
    .from("estimate_change_orders")
    .delete()
    .eq("id", change_order_id)
    .eq("estimate_id", id);

  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/* ── Internal helper: send email notification to client about change order events ── */

async function sendChangeOrderClientNotification(
  supabase: ReturnType<typeof createServiceClient>,
  opts: {
    estimateId: string;
    estimateNumber: string;
    changeNumber: number;
    description: string;
    costImpact: number;
    timelineImpact: string | null;
    event: "created" | "approved_by_contractor" | "rejected_by_contractor";
  }
): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.warn("[change-order-notify] RESEND_API_KEY not set, skipping client notification");
    return;
  }

  try {
    // Look up the estimate's client to get their email
    const { data: estimate } = await supabase
      .from("estimates")
      .select("client_id")
      .eq("id", opts.estimateId)
      .single();

    if (!estimate?.client_id) return;

    const { data: client } = await supabase
      .from("clients")
      .select("email, full_name")
      .eq("id", estimate.client_id)
      .single();

    if (!client?.email) return;

    const FROM = process.env.RESEND_FROM_EMAIL ?? "estimates@northmshomepros.com";
    const portalUrl = getPortalUrl(opts.estimateId);

    const costFormatted = `${opts.costImpact >= 0 ? "+" : ""}$${Math.abs(opts.costImpact).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    let subject: string;
    let statusHtml: string;
    let ctaHtml: string;

    if (opts.event === "created") {
      subject = `New Change Order #${opts.changeNumber} — ${opts.estimateNumber}`;
      statusHtml = `
        <div style="margin-bottom: 16px;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #ffffff; background: #d97706;">
            Pending Your Review
          </span>
        </div>
        <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
          A new change order has been added to your estimate. Please review and respond at your earliest convenience.
        </p>
      `;
      ctaHtml = `
        <div style="margin: 24px 0; text-align: center;">
          <a href="${portalUrl}" style="display: inline-block; padding: 12px 28px; background: #1e3a5f; color: #ffffff; font-size: 14px; font-weight: 600; border-radius: 8px; text-decoration: none;">
            Review Change Order
          </a>
        </div>
      `;
    } else if (opts.event === "approved_by_contractor") {
      subject = `Change Order #${opts.changeNumber} Approved — ${opts.estimateNumber}`;
      statusHtml = `
        <div style="margin-bottom: 16px;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #ffffff; background: #16a34a;">
            Approved — Signature Required
          </span>
        </div>
        <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
          This change order has been approved. Please sign off on it at your convenience to confirm.
        </p>
      `;
      ctaHtml = `
        <div style="margin: 24px 0; text-align: center;">
          <a href="${portalUrl}" style="display: inline-block; padding: 12px 28px; background: #16a34a; color: #ffffff; font-size: 14px; font-weight: 600; border-radius: 8px; text-decoration: none;">
            Sign Change Order
          </a>
        </div>
      `;
    } else {
      subject = `Change Order #${opts.changeNumber} Update — ${opts.estimateNumber}`;
      statusHtml = `
        <div style="margin-bottom: 16px;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; color: #ffffff; background: #dc2626;">
            Not Approved
          </span>
        </div>
        <p style="margin: 0 0 16px; font-size: 14px; color: #374151;">
          This change order was not approved. If you have questions, please contact us.
        </p>
      `;
      ctaHtml = `
        <div style="margin: 24px 0; text-align: center;">
          <a href="${portalUrl}" style="display: inline-block; padding: 12px 28px; background: #1e3a5f; color: #ffffff; font-size: 14px; font-weight: 600; border-radius: 8px; text-decoration: none;">
            View Estimate
          </a>
        </div>
      `;
    }

    const { Resend } = await import("resend");
    const resend = new Resend(RESEND_API_KEY);

    await resend.emails.send({
      from: FROM,
      to: [client.email],
      subject,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #1e3a5f; padding: 24px 32px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; color: #ffffff; font-size: 18px;">Change Order #${opts.changeNumber}</h1>
            <p style="margin: 4px 0 0; color: rgba(255,255,255,0.7); font-size: 13px;">
              Estimate ${opts.estimateNumber}
            </p>
          </div>
          <div style="background: #ffffff; padding: 24px 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 16px; font-size: 14px; color: #111827;">
              Hi ${client.full_name ?? "there"},
            </p>
            ${statusHtml}
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 140px;">Description</td>
                <td style="padding: 8px 0; color: #111827;">${opts.description}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Cost Impact</td>
                <td style="padding: 8px 0; font-weight: 600; color: ${opts.costImpact >= 0 ? "#16a34a" : "#dc2626"};">${costFormatted}</td>
              </tr>
              ${opts.timelineImpact ? `
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Timeline Impact</td>
                <td style="padding: 8px 0; color: #111827;">${opts.timelineImpact}</td>
              </tr>
              ` : ""}
            </table>
            ${ctaHtml}
            <p style="margin: 0; font-size: 12px; color: #9ca3af;">
              If you have any questions, please contact us directly.
            </p>
            <br/>
            <p style="margin: 0; font-size: 13px; color: #374151;">
              Best regards,<br/><strong>North MS Home Pros</strong>
            </p>
          </div>
        </div>
      `,
    });

    // Log that notification was sent
    await logAudit(
      "system",
      "change_order_notification_sent",
      "estimate_change_order",
      null,
      {
        estimate_id: opts.estimateId,
        change_number: opts.changeNumber,
        event: opts.event,
        client_email: client.email,
      },
      null
    );
  } catch (err) {
    // Email failures should not break the main operation
    console.error("[change-order-notify] Failed to send client notification:", err);
  }
}
