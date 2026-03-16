import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

type Params = { params: Promise<{ id: string }> };

/** GET /api/estimates/[id]/versions — list version history for an estimate */
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
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-versions" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("estimate_versions")
    .select("*")
    .eq("estimate_id", id)
    .order("version_number", { ascending: false });

  if (error) {
    captureError(new Error(error.message || error.toString()), { route: "estimates-versions" });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ versions: data ?? [] });
}

/** POST /api/estimates/[id]/versions — create a version snapshot */
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
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-versions" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  let body: { change_summary?: string };
  try {
    body = await req.json();
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-versions" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch the full estimate
  const { data: estimate, error: estError } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", id)
    .single();

  if (estError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  // Fetch all line items for the estimate
  const { data: lineItems, error: liError } = await supabase
    .from("estimate_line_items")
    .select("*")
    .eq("estimate_id", id)
    .order("line_number", { ascending: true });

  if (liError) {
    return NextResponse.json({ error: liError.message }, { status: 500 });
  }

  // Determine next version number
  const { data: latestVersions } = await supabase
    .from("estimate_versions")
    .select("version_number")
    .eq("estimate_id", id)
    .order("version_number", { ascending: false })
    .limit(1);

  const nextVersion = (latestVersions?.[0]?.version_number ?? 0) + 1;

  // Build snapshot
  const snapshot = {
    estimate,
    line_items: lineItems ?? [],
  };

  const { data: version, error: insertError } = await supabase
    .from("estimate_versions")
    .insert({
      estimate_id: id,
      version_number: nextVersion,
      snapshot,
      change_summary: body.change_summary?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Log audit entry
  await logAudit(
    user.id,
    "version_snapshot_created",
    "estimate_version",
    version.id,
    {
      estimate_id: id,
      version_number: nextVersion,
      change_summary: body.change_summary ?? null,
    },
    getClientIp(req)
  );

  return NextResponse.json({ version }, { status: 201 });
}
