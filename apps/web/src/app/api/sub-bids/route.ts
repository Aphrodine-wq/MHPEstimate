import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId, verifyEstimateOwnership } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const createBidSchema = z.object({
  estimate_id: z.string().uuid("estimate_id must be a valid UUID"),
  subcontractor_id: z.string().uuid("subcontractor_id must be a valid UUID"),
  trade: z.string().min(1, "trade is required").max(100),
  scope_description: z.string().max(5000).optional(),
  due_date: z.string().optional(),
  notes: z.string().max(5000).optional(),
});

const updateBidSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
  bid_amount: z.number().min(0).optional(),
  status: z.enum(["draft", "requested", "received", "accepted", "rejected", "expired"]).optional(),
  notes: z.string().max(5000).optional(),
});

// ---------------------------------------------------------------------------
// GET — List bids (optionally filtered by estimateId)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await estimateApiLimiter.check(30, user.id);
  } catch {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 },
    );
  }

  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const estimateId = req.nextUrl.searchParams.get("estimateId");

  try {
    if (estimateId) {
      const est = await verifyEstimateOwnership(estimateId, orgId);
      if (!est) {
        return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
      }

      const { data, error } = await supabase
        .from("sub_bids")
        .select("*, subcontractors(id, company_name, contact_name, email, phone, rating)")
        .eq("organization_id", orgId)
        .eq("estimate_id", estimateId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        captureError(new Error(error.message), { route: "sub-bids-get" });
        return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 });
      }

      return NextResponse.json({ bids: data ?? [] });
    }

    const { data, error } = await supabase
      .from("sub_bids")
      .select("*, subcontractors(id, company_name, contact_name, email, phone, rating)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      captureError(new Error(error.message), { route: "sub-bids-get" });
      return NextResponse.json({ error: "Failed to fetch bids" }, { status: 500 });
    }

    return NextResponse.json({ bids: data ?? [] });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "sub-bids-get" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Create a bid request (status: 'requested')
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await estimateApiLimiter.check(10, `write:${user.id}`);
  } catch {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 },
    );
  }

  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = createBidSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const ip = getClientIp(req);

  try {
    const est = await verifyEstimateOwnership(validated.data.estimate_id, orgId);
    if (!est) {
      return NextResponse.json({ error: "Estimate not found or access denied" }, { status: 404 });
    }

    const { data: subCheck } = await supabase
      .from("subcontractors")
      .select("id")
      .eq("id", validated.data.subcontractor_id)
      .eq("organization_id", orgId)
      .single();

    if (!subCheck) {
      return NextResponse.json({ error: "Subcontractor not found" }, { status: 404 });
    }

    const { data: bid, error } = await supabase
      .from("sub_bids")
      .insert({
        organization_id: orgId,
        estimate_id: validated.data.estimate_id,
        subcontractor_id: validated.data.subcontractor_id,
        trade: validated.data.trade,
        scope_description: validated.data.scope_description ?? null,
        due_date: validated.data.due_date ?? null,
        notes: validated.data.notes ?? null,
        status: "requested",
        requested_at: new Date().toISOString(),
      })
      .select("*, subcontractors(id, company_name, contact_name, email, phone, rating)")
      .single();

    if (error) {
      captureError(new Error(error.message), { route: "sub-bids-post" });
      return NextResponse.json({ error: "Failed to create bid request" }, { status: 500 });
    }

    await logAudit(
      user.id,
      "sub_bid_created",
      "sub_bid",
      bid.id,
      {
        estimate_id: validated.data.estimate_id,
        subcontractor_id: validated.data.subcontractor_id,
        trade: validated.data.trade,
      },
      ip,
    );

    return NextResponse.json({ bid }, { status: 201 });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "sub-bids-post" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update a bid (received amount, status change, accept/reject)
// ---------------------------------------------------------------------------
export async function PATCH(req: NextRequest) {
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await estimateApiLimiter.check(10, `write:${user.id}`);
  } catch {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 },
    );
  }

  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = updateBidSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const ip = getClientIp(req);

  try {
    const { data: existing, error: fetchError } = await supabase
      .from("sub_bids")
      .select("*")
      .eq("id", validated.data.id)
      .eq("organization_id", orgId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Bid not found" }, { status: 404 });
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (validated.data.bid_amount !== undefined) {
      updatePayload.bid_amount = validated.data.bid_amount;
      if (!validated.data.status) {
        updatePayload.status = "received";
        updatePayload.received_at = new Date().toISOString();
      }
    }

    if (validated.data.status !== undefined) {
      updatePayload.status = validated.data.status;
      if (validated.data.status === "received") {
        updatePayload.received_at = new Date().toISOString();
      }
    }

    if (validated.data.notes !== undefined) {
      updatePayload.notes = validated.data.notes;
    }

    const { data: updated, error: updateError } = await supabase
      .from("sub_bids")
      .update(updatePayload)
      .eq("id", validated.data.id)
      .eq("organization_id", orgId)
      .select("*, subcontractors(id, company_name, contact_name, email, phone, rating)")
      .single();

    if (updateError) {
      captureError(new Error(updateError.message), { route: "sub-bids-patch" });
      return NextResponse.json({ error: "Failed to update bid" }, { status: 500 });
    }

    await logAudit(
      user.id,
      "sub_bid_updated",
      "sub_bid",
      validated.data.id,
      {
        estimate_id: existing.estimate_id,
        status: updatePayload.status ?? existing.status,
        bid_amount: updatePayload.bid_amount ?? existing.bid_amount,
      },
      ip,
    );

    return NextResponse.json({ bid: updated });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "sub-bids-patch" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
