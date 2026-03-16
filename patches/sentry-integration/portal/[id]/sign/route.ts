import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { verifyPortalToken } from "@/lib/portal-token";
import { portalSignLimiter } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

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

  // --- Rate limiting: 5 requests/minute per IP ---
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  try {
    await portalSignLimiter.check(5, ip);
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "portal-sign" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  // --- Parse body ---
  let body: {
    signatureDataUrl?: string;
    signerName?: string;
    signerEmail?: string;
  };
  try {
    body = await req.json();
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "portal-sign" });
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

  // --- Fetch estimate ---
  const { data: estimate, error: fetchError } = await supabase
    .from("estimates")
    .select("id, status, estimate_number, validation_results")
    .eq("id", id)
    .single();

  if (fetchError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  // --- Status gate: only allow signing of sent or approved estimates ---
  if (!["sent", "approved"].includes(estimate.status)) {
    return NextResponse.json(
      {
        error: `Estimate must be sent or approved to sign (current: ${estimate.status})`,
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // --- Save signature and mark as accepted ---
  const { error: updateError } = await supabase
    .from("estimates")
    .update({
      status: "accepted",
      accepted_at: now,
      updated_at: now,
      validation_results: {
        ...((estimate.validation_results as Record<string, unknown>) ?? {}),
        signature: {
          signer_name: signerName,
          signer_email: signerEmail ?? null,
          signed_at: now,
          signature_data: signatureDataUrl.slice(0, 100) + "...", // Truncated ref, not full base64
          method: "portal_digital_canvas",
          signed_via: "customer_portal",
          signer_ip: ip,
        },
      },
    })
    .eq("id", id);

  if (updateError) {
    console.error("Failed to save portal signature:", updateError);
    return NextResponse.json(
      { error: "Failed to save signature" },
      { status: 500 }
    );
  }

  await logAudit(
    "portal_client",
    "estimate_accepted",
    "estimate",
    id,
    { signer_name: signerName, signer_email: signerEmail ?? null, method: "portal_digital_canvas", ip },
    ip
  );

  return NextResponse.json({
    success: true,
    estimateId: id,
    status: "accepted",
    signedAt: now,
    signerName,
  });
}
