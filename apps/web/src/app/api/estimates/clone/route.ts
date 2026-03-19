import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import { cloneAndAdjustEstimate } from "@proestimate/estimation-engine";

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const inputSchema = z.object({
  sourceEstimateId: z.string().uuid("sourceEstimateId must be a valid UUID"),
  newSquareFootage: z.number().gt(0).optional(),
  newZipCode: z.string().optional(),
  newClientId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-clone" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Parse & validate body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-clone" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = inputSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { sourceEstimateId, newSquareFootage, newZipCode, newClientId } = validated.data;

  const supabase = createServiceClient();

  // --- Team membership check ---
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("id, is_active")
    .eq("auth_id", user.id)
    .single();

  if (!teamMember || !teamMember.is_active) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Org ownership check ---
  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  // --- Fetch source estimate ---
  const { data: sourceEstimate, error: estError } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", sourceEstimateId)
    .single();

  if (estError || !sourceEstimate) {
    return NextResponse.json({ error: "Source estimate not found" }, { status: 404 });
  }

  if (sourceEstimate.organization_id !== orgId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // --- Fetch source line items ---
  const { data: sourceLineItems } = await supabase
    .from("estimate_line_items")
    .select("*")
    .eq("estimate_id", sourceEstimateId)
    .order("line_number");

  const items = sourceLineItems ?? [];

  // --- Run clone engine ---
  const cloneResult = cloneAndAdjustEstimate({
    originalLineItems: items.map((li) => ({
      description: li.description,
      category: li.category,
      quantity: li.quantity ?? 1,
      unit: li.unit ?? "each",
      unitPrice: li.unit_price ?? 0,
      extendedPrice: li.extended_price ?? 0,
    })),
    originalDate: sourceEstimate.created_at,
    originalSqft: sourceEstimate.square_footage ?? undefined,
    newSqft: newSquareFootage,
    originalZipCode: sourceEstimate.zip_code ?? undefined,
    newZipCode,
  });

  // --- Create new estimate ---
  const MAX_RETRIES = 3;
  let estimate: Record<string, unknown> | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data: settings } = await supabase
      .from("company_settings")
      .select("value")
      .eq("key", "estimate_numbering")
      .single();

    const numbering = settings?.value as
      | { prefix: string; year_format: string; next_sequence: number }
      | undefined;
    const seq = numbering?.next_sequence ?? 1;
    const prefix = numbering?.prefix ?? "EST";
    const year = new Date().getFullYear();
    const estimate_number = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;

    // Compute totals from adjusted line items
    const matSub = cloneResult.lineItems
      .filter((l) => l.category === "material")
      .reduce((s, l) => s + l.adjustedExtendedPrice, 0);
    const labSub = cloneResult.lineItems
      .filter((l) => l.category === "labor")
      .reduce((s, l) => s + l.adjustedExtendedPrice, 0);
    const subSub = cloneResult.lineItems
      .filter((l) => l.category === "subcontractor")
      .reduce((s, l) => s + l.adjustedExtendedPrice, 0);

    const base = matSub + labSub + subSub;
    const overhead = base * 0.15;
    const contingency = base * 0.05;
    const tax = base * 0.08;
    const grandTotal = base + overhead + contingency + tax;

    const { data: newEstimate, error: insertError } = await supabase
      .from("estimates")
      .insert({
        estimate_number,
        client_id: newClientId ?? sourceEstimate.client_id ?? null,
        project_type: sourceEstimate.project_type,
        project_address: sourceEstimate.project_address ?? null,
        status: "draft",
        tier: sourceEstimate.tier ?? "midrange",
        source: sourceEstimate.source ?? "manual",
        parent_estimate_id: sourceEstimateId,
        zip_code: newZipCode ?? sourceEstimate.zip_code ?? null,
        square_footage: newSquareFootage ?? sourceEstimate.square_footage ?? null,
        scope_inclusions: sourceEstimate.scope_inclusions ?? [],
        scope_exclusions: sourceEstimate.scope_exclusions ?? [],
        site_conditions: sourceEstimate.site_conditions ?? null,
        materials_subtotal: matSub,
        labor_subtotal: labSub,
        subcontractor_total: subSub,
        permits_fees: 0,
        overhead_profit: overhead,
        contingency,
        tax,
        grand_total: grandTotal,
        gross_margin_pct: grandTotal > 0 ? ((grandTotal - base) / grandTotal) * 100 : 0,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") continue;
      captureError(new Error(insertError.message), { route: "estimates-clone" });
      return NextResponse.json({ error: "Failed to create estimate" }, { status: 500 });
    }

    estimate = newEstimate;

    if (numbering) {
      await supabase
        .from("company_settings")
        .update({ value: { ...numbering, next_sequence: seq + 1 } })
        .eq("key", "estimate_numbering");
    }
    break;
  }

  if (!estimate) {
    return NextResponse.json({ error: "Failed to generate estimate number" }, { status: 500 });
  }

  // --- Insert adjusted line items ---
  if (cloneResult.lineItems.length > 0) {
    const toInsert = cloneResult.lineItems.map((li, i) => ({
      estimate_id: estimate!.id,
      line_number: i + 1,
      category: li.category,
      description: li.description,
      quantity: li.adjustedQuantity,
      unit: li.unit,
      unit_price: li.adjustedUnitPrice,
      extended_price: li.adjustedExtendedPrice,
    }));

    const { error: lineItemError } = await supabase.from("estimate_line_items").insert(toInsert);
    if (lineItemError) {
      captureError(new Error(lineItemError.message), { route: "estimates-clone" });
    }
  }

  // --- Audit ---
  await logAudit(
    user.id,
    "estimate_cloned",
    "estimate",
    estimate.id as string,
    {
      source_estimate_id: sourceEstimateId,
      source_estimate_number: sourceEstimate.estimate_number,
      adjustment_pct: cloneResult.totalAdjustmentPct,
      months_elapsed: cloneResult.monthsElapsed,
      sqft_ratio: cloneResult.sqftRatio,
      regional_ratio: cloneResult.regionalRatio,
    },
    getClientIp(req),
  );

  const { data: fullEstimate } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimate.id as string)
    .single();

  return NextResponse.json({
    estimate: fullEstimate,
    cloneResult: {
      originalSubtotal: cloneResult.originalSubtotal,
      adjustedSubtotal: cloneResult.adjustedSubtotal,
      totalAdjustmentPct: cloneResult.totalAdjustmentPct,
      monthsElapsed: cloneResult.monthsElapsed,
      inflationMultiplier: cloneResult.inflationMultiplier,
      regionalRatio: cloneResult.regionalRatio,
      sqftRatio: cloneResult.sqftRatio,
    },
  });
}
