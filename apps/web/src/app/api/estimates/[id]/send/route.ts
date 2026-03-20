import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { sendEstimateLimiter } from "@/lib/rate-limit";
import { getPortalUrl } from "@/lib/portal-token";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}
const FROM = process.env.RESEND_FROM_EMAIL ?? "estimates@mhpestimate.cloud";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Domain validation (disabled — allow any authenticated user) ---

  // --- Rate limiting: 5 sends/minute per user (email is expensive) ---
  try {
    await sendEstimateLimiter.check(5, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-send" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  let body: {
    pdfBase64?: string;
    clientEmail?: string;
    clientName?: string;
    estimateNumber?: string;
  };
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-send" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { pdfBase64, clientEmail, clientName, estimateNumber } = body;

  if (!pdfBase64 || !clientEmail || !estimateNumber) {
    return NextResponse.json({ error: "Missing required fields: pdfBase64, clientEmail, estimateNumber" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // --- Ownership check: user must be an active team member ---
  // This is a single-tenant app; all estimates belong to the company. We verify
  // the caller is an active member so deactivated accounts cannot perform mutations.
  const { data: teamMember, error: teamMemberError } = await supabase
    .from("team_members")
    .select("id, role, is_active")
    .eq("auth_id", user.id)
    .single();

  if (teamMemberError || !teamMember || !teamMember.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate estimate exists and is approved — cannot send from any other status
  const { data: estimate, error: fetchError } = await supabase
    .from("estimates")
    .select("id, status, estimate_number")
    .eq("id", id)
    .single();

  if (fetchError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  if (estimate.status !== "approved") {
    return NextResponse.json(
      { error: `Estimate must be approved before sending (current status: ${estimate.status})` },
      { status: 400 }
    );
  }

  const pdfBuffer = Buffer.from(pdfBase64, "base64");
  const portalUrl = getPortalUrl(id);

  const { error: emailError } = await getResend().emails.send({
    from: FROM,
    to: [clientEmail],
    subject: `Your Estimate from North MS Home Pros — ${estimateNumber}`,
    html: `
      <p>Hi ${clientName ?? "there"},</p>
      <p>Please find your project estimate attached to this email.</p>
      <p>You can also <a href="${portalUrl}">view and accept your estimate online</a>.</p>
      <p>If you have any questions or would like to discuss the details, don't hesitate to reach out — we're happy to walk through it with you.</p>
      <br/>
      <p>Best regards,<br/><strong>North MS Home Pros</strong></p>
    `,
    attachments: [
      {
        filename: `${estimateNumber}.pdf`,
        content: pdfBuffer,
      },
    ],
  });

  if (emailError) {
    console.error("Resend error:", emailError);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  // Mark as sent
  const now = new Date().toISOString();
  await supabase
    .from("estimates")
    .update({
      status: "sent",
      sent_at: now,
      updated_at: now,
    })
    .eq("id", id);

  // Audit log
  await logAudit(
    user.id,
    "estimate_sent",
    "estimate",
    id,
    { estimate_number: estimateNumber, client_email: clientEmail },
    getClientIp(req)
  );

  return NextResponse.json({ success: true });
}
