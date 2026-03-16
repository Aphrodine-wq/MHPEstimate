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
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "portal-decline" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  // --- Parse body ---
  let body: { reason?: string; declinerName?: string };
  try {
    body = await req.json();
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "portal-decline" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { reason, declinerName } = body;

  const supabase = createServiceClient();

  // --- Fetch estimate ---
  const { data: estimate, error: fetchError } = await supabase
    .from("estimates")
    .select("id, status, estimate_number")
    .eq("id", id)
    .single();

  if (fetchError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  // --- Status gate: only allow declining sent or approved estimates ---
  if (!["sent", "approved"].includes(estimate.status)) {
    return NextResponse.json(
      { error: `Estimate must be sent or approved to decline (current: ${estimate.status})` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("estimates")
    .update({
      status: "declined",
      declined_at: now,
      updated_at: now,
      validation_results: {
        decline: {
          decliner_name: declinerName ?? null,
          reason: reason?.trim() || null,
          declined_at: now,
          declined_via: "customer_portal",
          decliner_ip: ip,
        },
      },
    })
    .eq("id", id);

  if (updateError) {
    console.error("Failed to decline estimate:", updateError);
    return NextResponse.json({ error: "Failed to decline estimate" }, { status: 500 });
  }

  await logAudit(
    "portal_client",
    "estimate_declined",
    "estimate",
    id,
    { decliner_name: declinerName ?? null, reason: reason?.trim() || null, ip },
    ip
  );

  return NextResponse.json({
    success: true,
    estimateId: id,
    status: "declined",
    declinedAt: now,
  });
}
