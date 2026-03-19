import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { autoEstimateLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import { generateAutoEstimate } from "@proestimate/estimation-engine";

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const inputSchema = z.object({
  projectType: z.string().min(1, "projectType is required"),
  squareFootage: z.number().gt(0, "squareFootage must be greater than 0"),
  zipCode: z.string().optional(),
  tier: z.enum(["budget", "midrange", "high_end"]).optional(),
  specialRequests: z.string().optional(),
});

export async function POST(req: NextRequest) {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 10 requests/minute per user ---
  try {
    await autoEstimateLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-auto-generate" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Parse & validate body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-auto-generate" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = inputSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { projectType, squareFootage, zipCode, tier, specialRequests } = validated.data;

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

  // --- Generate auto estimate ---
  let result;
  try {
    result = generateAutoEstimate({
      projectType,
      squareFootage,
      zipCode,
      tier: tier ?? "midrange",
      specialRequests: specialRequests ? [specialRequests] : undefined,
    });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-auto-generate" });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate estimate" },
      { status: 400 },
    );
  }

  // --- Create estimate with retry for unique estimate number ---
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

    const { data: newEstimate, error: insertError } = await supabase
      .from("estimates")
      .insert({
        estimate_number,
        project_type: projectType,
        status: "draft",
        tier: tier ?? "midrange",
        source: "auto",
        zip_code: zipCode ?? null,
        square_footage: squareFootage,
        materials_subtotal: result.materialsSubtotal,
        labor_subtotal: result.laborSubtotal,
        subcontractor_total: result.subcontractorTotal,
        permits_fees: 0,
        overhead_profit: result.overheadDollar,
        contingency: result.contingencyDollar,
        tax: 0,
        grand_total: result.grandTotal,
        gross_margin_pct: result.grossMarginPct,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") continue; // duplicate estimate_number, retry
      captureError(new Error(insertError.message), { route: "estimates-auto-generate" });
      return NextResponse.json({ error: "Failed to create estimate" }, { status: 500 });
    }

    estimate = newEstimate;

    // Increment sequence
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

  // --- Insert line items ---
  if (result.lineItems.length > 0) {
    const toInsert = result.lineItems.map((li, i) => ({
      estimate_id: estimate!.id,
      line_number: i + 1,
      category: li.category === "general" ? "material" : li.category,
      description: li.description,
      quantity: li.quantity,
      unit: li.unit,
      unit_price: li.unitPrice,
      extended_price: li.extendedPrice,
    }));

    const { error: lineItemError } = await supabase.from("estimate_line_items").insert(toInsert);
    if (lineItemError) {
      captureError(new Error(lineItemError.message), { route: "estimates-auto-generate" });
    }
  }

  // --- Audit ---
  await logAudit(
    user.id,
    "auto_estimate_generated",
    "estimate",
    estimate.id as string,
    {
      project_type: projectType,
      square_footage: squareFootage,
      zip_code: zipCode ?? null,
      tier: tier ?? "midrange",
      line_item_count: result.lineItems.length,
      grand_total: result.grandTotal,
    },
    getClientIp(req),
  );

  // Fetch the full estimate for response
  const { data: fullEstimate } = await supabase
    .from("estimates")
    .select("*")
    .eq("id", estimate.id as string)
    .single();

  return NextResponse.json({
    estimate: fullEstimate,
    autoEstimateResult: {
      costPerSqft: result.costPerSqft,
      grossMarginPct: result.grossMarginPct,
      marginAlerts: result.marginAlerts,
      regionalMultiplier: result.regionalMultiplier,
      tierMultiplier: result.tierMultiplier,
    },
  });
}
