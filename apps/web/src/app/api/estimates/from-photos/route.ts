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
  images: z
    .array(z.string().min(1))
    .min(1, "At least one image is required")
    .max(10, "Maximum 10 images per request"),
  zipCode: z.string().optional(),
  tier: z.enum(["budget", "midrange", "high_end"]).optional(),
});

// Schema for Claude Vision structured extraction
const photoExtractionSchema = z.object({
  suggestedProjectType: z.string(),
  suggestedSqft: z.number().gt(0).optional(),
  suggestedLineItems: z
    .array(
      z.object({
        description: z.string(),
        category: z.enum(["material", "labor", "subcontractor"]),
        quantity: z.number().min(0),
        unit: z.string(),
        unit_price: z.number().min(0),
      }),
    )
    .optional()
    .default([]),
  scopeInclusions: z.array(z.string()).optional().default([]),
  complexity: z.enum(["simple", "moderate", "complex"]).optional(),
});

export async function POST(req: NextRequest) {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await autoEstimateLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-from-photos" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Parse & validate ---
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-from-photos" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = inputSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { images, zipCode, tier } = validated.data;

  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Photo analysis not available — ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }

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

  // --- Call Claude Vision for structured analysis ---
  let extraction: z.infer<typeof photoExtractionSchema>;

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey });

    const imageBlocks = images.map((base64) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: "image/jpeg" as const, data: base64 },
    }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: `You are a construction estimating assistant. Analyze site photos and return structured JSON for generating a construction estimate. Return JSON only — no explanation, no markdown.

Return JSON matching this exact schema:
{
  "suggestedProjectType": string,
  "suggestedSqft": number,
  "suggestedLineItems": [
    {
      "description": string,
      "category": "material" | "labor" | "subcontractor",
      "quantity": number,
      "unit": string,
      "unit_price": number
    }
  ],
  "scopeInclusions": string[],
  "complexity": "simple" | "moderate" | "complex"
}

Rules:
- suggestedProjectType must be one of: "kitchen_renovation", "bathroom_renovation", "flooring", "roofing", "painting", "siding", "deck_patio", "addition", "full_renovation", "general"
- Estimate square footage from visual cues (room dimensions, reference objects)
- Use your knowledge of home improvement pricing in the southeastern US for unit_price
- unit must be one of: "sq ft", "lin ft", "each", "bundle", "gallon", "sheet", "box", "roll", "bag", "ton", "hour", "day", "lot"
- Include all visible work items as line items
- complexity reflects the overall project difficulty`,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            {
              type: "text" as const,
              text: `Analyze ${images.length > 1 ? "these " + images.length + " site photos" : "this site photo"} and return structured estimate data as JSON.`,
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (!content || content.type !== "text") throw new Error("Unexpected response from AI");

    const text = content.text.trim();
    const jsonText = text.startsWith("```")
      ? text.replace(/^```json?\n?/, "").replace(/\n?```$/, "")
      : text;

    const parsed: unknown = JSON.parse(jsonText);
    const extractionResult = photoExtractionSchema.safeParse(parsed);
    if (!extractionResult.success) {
      console.error("Photo extraction validation failed:", extractionResult.error);
      return NextResponse.json({ error: "AI response validation failed" }, { status: 500 });
    }
    extraction = extractionResult.data;
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-from-photos" });
    return NextResponse.json({ error: "Photo analysis failed" }, { status: 500 });
  }

  // --- Generate auto estimate from extracted data ---
  const sqft = extraction.suggestedSqft ?? 500; // fallback if vision can't determine
  let autoResult;
  try {
    autoResult = generateAutoEstimate({
      projectType: extraction.suggestedProjectType,
      squareFootage: sqft,
      zipCode,
      tier: tier ?? "midrange",
    });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "estimates-from-photos" });
    // If auto-estimate fails (unknown project type), fall through with photo-only items
    autoResult = null;
  }

  // --- Merge: photo-suggested items take priority, then fill from auto ---
  const photoItems = extraction.suggestedLineItems;
  const photoDescriptions = new Set(photoItems.map((li) => li.description.toLowerCase()));

  const mergedLineItems = [
    ...photoItems.map((li) => ({
      category: li.category,
      description: li.description,
      quantity: li.quantity,
      unit: li.unit,
      unit_price: li.unit_price,
      extended_price: li.quantity * li.unit_price,
    })),
    ...(autoResult?.lineItems ?? [])
      .filter((li) => !photoDescriptions.has(li.description.toLowerCase()))
      .map((li) => ({
        category: li.category === "general" ? "material" : li.category,
        description: li.description,
        quantity: li.quantity,
        unit: li.unit,
        unit_price: li.unitPrice,
        extended_price: li.extendedPrice,
      })),
  ];

  // --- Compute totals ---
  const matSub = mergedLineItems
    .filter((l) => l.category === "material")
    .reduce((s, l) => s + l.extended_price, 0);
  const labSub = mergedLineItems
    .filter((l) => l.category === "labor")
    .reduce((s, l) => s + l.extended_price, 0);
  const subSub = mergedLineItems
    .filter((l) => l.category === "subcontractor")
    .reduce((s, l) => s + l.extended_price, 0);

  const base = matSub + labSub + subSub;
  const overhead = base * 0.15;
  const contingency = base * 0.05;
  const tax = base * 0.08;
  const grandTotal = base + overhead + contingency + tax;

  // --- Create estimate ---
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
        project_type: extraction.suggestedProjectType,
        status: "draft",
        tier: tier ?? "midrange",
        source: "photo",
        zip_code: zipCode ?? null,
        square_footage: sqft,
        scope_inclusions: extraction.scopeInclusions ?? [],
        scope_exclusions: [],
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
      captureError(new Error(insertError.message), { route: "estimates-from-photos" });
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

  // --- Insert line items ---
  if (mergedLineItems.length > 0) {
    const toInsert = mergedLineItems.map((li, i) => ({
      estimate_id: estimate!.id,
      line_number: i + 1,
      category: li.category,
      description: li.description,
      quantity: li.quantity,
      unit: li.unit,
      unit_price: li.unit_price,
      extended_price: li.extended_price,
    }));

    const { error: lineItemError } = await supabase.from("estimate_line_items").insert(toInsert);
    if (lineItemError) {
      captureError(new Error(lineItemError.message), { route: "estimates-from-photos" });
    }
  }

  // --- Audit ---
  await logAudit(
    user.id,
    "photo_estimate_generated",
    "estimate",
    estimate.id as string,
    {
      image_count: images.length,
      suggested_project_type: extraction.suggestedProjectType,
      suggested_sqft: sqft,
      complexity: extraction.complexity,
      line_item_count: mergedLineItems.length,
      grand_total: grandTotal,
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
    photoAnalysis: {
      suggestedProjectType: extraction.suggestedProjectType,
      suggestedSqft: sqft,
      scopeInclusions: extraction.scopeInclusions,
      complexity: extraction.complexity,
      photoLineItemCount: photoItems.length,
      autoLineItemCount: autoResult?.lineItems.length ?? 0,
      mergedLineItemCount: mergedLineItems.length,
    },
  });
}
