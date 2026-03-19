import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId, maskEmail } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { generatePortalToken } from "@/lib/portal-token";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

/**
 * POST /api/estimates/[id]/sign-request
 *
 * Sends an estimate for electronic signature. Generates a unique signing
 * token, updates the estimate status to "sent", and returns a portal URL
 * that the client can use to review and sign.
 *
 * This is the native e-signing flow (as opposed to DocuSign integration).
 * The actual email delivery is handled separately or can be triggered
 * from the client component.
 */
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

  // --- Rate limiting: 10 requests/minute per user ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(
      err instanceof Error ? err : new Error(String(err)),
      { route: "estimates-sign-request" }
    );
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  // --- Parse request body ---
  let body: {
    clientEmail?: string;
    personalMessage?: string;
  };
  try {
    body = await req.json();
  } catch (err) {
    captureError(
      err instanceof Error ? err : new Error(String(err)),
      { route: "estimates-sign-request" }
    );
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { clientEmail, personalMessage } = body;

  if (!clientEmail) {
    return NextResponse.json(
      { error: "Missing required field: clientEmail" },
      { status: 400 }
    );
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clientEmail)) {
    return NextResponse.json(
      { error: "Invalid email address" },
      { status: 400 }
    );
  }

  // --- Org ownership check ---
  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  const supabase = createServiceClient();

  // --- Ownership check: user must be an active team member ---
  const { data: teamMember, error: teamMemberError } = await supabase
    .from("team_members")
    .select("id, role, is_active")
    .eq("auth_id", user.id)
    .single();

  if (teamMemberError || !teamMember || !teamMember.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Fetch estimate and verify org ownership ---
  const { data: estimate, error: fetchError } = await supabase
    .from("estimates")
    .select("id, status, estimate_number, client_id, organization_id")
    .eq("id", id)
    .single();

  if (fetchError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  if (estimate.organization_id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only approved or draft estimates can be sent for signature
  if (!["approved", "draft"].includes(estimate.status)) {
    return NextResponse.json(
      {
        error: `Estimate must be approved or draft to send for signature (current: ${estimate.status})`,
      },
      { status: 400 }
    );
  }

  // --- Generate signing token and portal URL ---
  const signingToken = generatePortalToken(id);
  const signRequestId = randomUUID();
  const now = new Date().toISOString();

  // Build the portal signing URL
  let baseUrl: string;
  if (process.env.NEXT_PUBLIC_APP_URL) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  } else if (process.env.VERCEL_URL) {
    baseUrl = `https://${process.env.VERCEL_URL}`;
  } else {
    baseUrl = "http://localhost:3000";
  }
  const portalUrl = `${baseUrl}/portal/sign/${id}?token=${signingToken}`;

  // --- Update estimate status to "sent" and store sign request metadata ---
  const { error: updateError } = await supabase
    .from("estimates")
    .update({
      status: "sent",
      sent_at: now,
      updated_at: now,
      validation_results: {
        ...((estimate as Record<string, unknown>).validation_results as Record<string, unknown> || {}),
        sign_request: {
          id: signRequestId,
          client_email: clientEmail,
          personal_message: personalMessage || null,
          requested_by: user.id,
          requested_at: now,
          method: "native_esign",
          status: "pending",
        },
      },
    })
    .eq("id", id);

  if (updateError) {
    console.error("Failed to create sign request:", updateError);
    captureError(
      new Error(`Sign request update failed: ${updateError.message}`),
      { route: "estimates-sign-request", estimateId: id }
    );
    return NextResponse.json(
      { error: "Failed to send signature request" },
      { status: 500 }
    );
  }

  // --- Audit log ---
  await logAudit(
    user.id,
    "estimate_sent",
    "estimate",
    id,
    {
      sign_request_id: signRequestId,
      client_email: maskEmail(clientEmail),
      method: "native_esign",
      estimate_number: estimate.estimate_number,
    },
    getClientIp(req)
  );

  return NextResponse.json({
    success: true,
    estimateId: id,
    signRequestId,
    portalUrl,
    status: "sent",
    sentAt: now,
  });
}
