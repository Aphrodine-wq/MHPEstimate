import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
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
  } catch {
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
  } catch {
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
  } catch {
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
    .select("id, status")
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
  } catch {
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
  } catch {
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
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-change-orders" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  let body: { change_order_id?: string };
  try {
    body = await req.json();
  } catch {
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
