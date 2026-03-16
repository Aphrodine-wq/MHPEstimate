import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

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
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-sign" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  let body: {
    signatureDataUrl?: string;
    signerName?: string;
    signerEmail?: string;
  };
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-sign" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { signatureDataUrl, signerName, signerEmail } = body;

  if (!signatureDataUrl || !signerName) {
    return NextResponse.json(
      { error: "Missing required fields: signatureDataUrl, signerName" },
      { status: 400 }
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
  const { data: estimate, error: fetchError } = await supabase
    .from("estimates")
    .select("id, status, estimate_number")
    .eq("id", id)
    .single();

  if (fetchError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  if (!["sent", "approved"].includes(estimate.status)) {
    return NextResponse.json(
      { error: `Estimate must be sent or approved to sign (current: ${estimate.status})` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // Update estimate to accepted with signature metadata
  const { error: updateError } = await supabase
    .from("estimates")
    .update({
      status: "accepted",
      accepted_at: now,
      updated_at: now,
      validation_results: {
        ...(estimate as Record<string, unknown>).validation_results as Record<string, unknown> || {},
        signature: {
          signer_name: signerName,
          signer_email: signerEmail || null,
          signed_at: now,
          signature_data: signatureDataUrl.slice(0, 100) + "...", // Store truncated ref, not full base64
          method: "digital_canvas",
        },
      },
    })
    .eq("id", id);

  if (updateError) {
    console.error("Failed to save signature:", updateError);
    return NextResponse.json({ error: "Failed to save signature" }, { status: 500 });
  }

  await logAudit(
    user.id,
    "estimate_signed",
    "estimate",
    id,
    { signer_name: signerName, method: "digital_canvas" },
    getClientIp(req)
  );

  return NextResponse.json({
    success: true,
    estimateId: id,
    status: "accepted",
    signedAt: now,
    signerName,
  });
}
