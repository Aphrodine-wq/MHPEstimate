import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { getPortalUrl, generatePortalToken } from "@/lib/portal-token";
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
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-share" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
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

  // Validate estimate exists and has a shareable status
  const { data: estimate, error: fetchError } = await supabase
    .from("estimates")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  if (!["sent", "approved", "accepted"].includes(estimate.status)) {
    return NextResponse.json(
      {
        error: `Portal links are only available for sent, approved, or accepted estimates (current status: ${estimate.status})`,
      },
      { status: 400 }
    );
  }

  const url = getPortalUrl(id);
  const token = generatePortalToken(id);

  await logAudit(
    user.id,
    "estimate_shared",
    "estimate",
    id,
    { portal_url: url },
    getClientIp(req)
  );

  return NextResponse.json({ url, token });
}
