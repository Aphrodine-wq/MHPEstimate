import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { verifyPortalToken } from "@/lib/portal-token";
import { portalSignLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

/**
 * POST /api/portal-viewed
 * Body: { estimateId: string, token: string }
 *
 * Called when a client first opens the portal page. Records the view event
 * for analytics. Rate limited to prevent spam.
 */
export async function POST(req: NextRequest) {
  let body: { estimateId?: string; token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ received: true });
  }

  const { estimateId, token } = body;
  if (!token || !estimateId) {
    return NextResponse.json({ received: true });
  }

  // Rate limit: 3 view events per minute per IP
  const ip = getClientIp(req) ?? "unknown";
  try {
    await portalSignLimiter.check(3, `viewed:${ip}`);
  } catch {
    return NextResponse.json({ received: true }); // Silently succeed
  }

  // Verify token
  if (!verifyPortalToken(token, estimateId)) {
    return NextResponse.json({ received: true });
  }

  try {
    const supabase = createServiceClient();

    const { data: estimate, error: fetchError } = await supabase
      .from("estimates")
      .select("id, status, validation_results")
      .eq("id", estimateId)
      .single();

    if (fetchError || !estimate) {
      return NextResponse.json({ received: true });
    }

    if (!["sent", "approved", "accepted"].includes(estimate.status)) {
      return NextResponse.json({ received: true });
    }

    // Record the view in validation_results JSON
    const existingResults = (estimate.validation_results as Record<string, unknown>) ?? {};
    const portalViews = (existingResults.portal_views as Array<Record<string, unknown>>) ?? [];

    portalViews.push({
      viewed_at: new Date().toISOString(),
      viewer_ip: ip,
      user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    });

    await supabase
      .from("estimates")
      .update({
        validation_results: {
          ...existingResults,
          portal_viewed_at: existingResults.portal_viewed_at ?? new Date().toISOString(),
          portal_views: portalViews,
        },
      })
      .eq("id", estimateId);

    await logAudit(
      "portal_client",
      "estimate_viewed" as never,
      "estimate",
      estimateId,
      { viewer_ip: ip },
      ip
    );

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Portal viewed error:", err);
    captureError(
      err instanceof Error ? err : new Error(String(err)),
      { route: "/api/portal-viewed", estimateId }
    );
    return NextResponse.json({ received: true });
  }
}
