import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { callToEstimateLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Zod schema — validates Claude's extracted JSON before touching the DB
// ---------------------------------------------------------------------------
const extractedSchema = z.object({
  project_type: z.string().optional(),
  tier: z.enum(["budget", "midrange", "high_end"]).optional(),
  project_address: z.string().nullable().optional(),
  site_conditions: z.string().nullable().optional(),
  scope_inclusions: z.array(z.string()).optional().default([]),
  scope_exclusions: z.array(z.string()).optional().default([]),
  client_name: z.string().nullable().optional(),
  client_email: z.string().email().nullable().optional(),
  client_phone: z.string().nullable().optional(),
  line_items: z
    .array(
      z.object({
        category: z.enum(["material", "labor", "subcontractor"]),
        description: z.string(),
        quantity: z.number().min(0),
        unit: z.string(),
        unit_price: z.number().min(0).max(10_000_000),
      })
    )
    .optional()
    .default([]),
});

interface TranscriptMessage {
  message: string;
  source: string;
}

export async function POST(req: NextRequest) {
  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 10 AI-processing requests per user per minute ---
  try {
    await callToEstimateLimiter.check(10, user.id);
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "calls-to-estimate" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a minute." },
      { status: 429 }
    );
  }

  let body: { messages?: TranscriptMessage[] };
  try {
    body = await req.json();
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "calls-to-estimate" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages } = body;
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "No transcript messages provided" }, { status: 400 });
  }

  const transcript = messages
    .map((m) => `${m.source === "ai" ? "Alex (AI Estimator)" : "Estimator"}: ${m.message}`)
    .join("\n");

  // Ask Claude to extract structured estimate data from the transcript
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: `You are an assistant that extracts structured estimate data from conversations between Alex (an AI estimator) and a contractor at North MS Home Pros, a home improvement company in Mississippi. Extract all relevant information discussed and return it as valid JSON only — no explanation, no markdown, just the raw JSON object.

Return JSON matching this exact schema:
{
  "project_type": string,
  "tier": string,
  "project_address": string | null,
  "site_conditions": string | null,
  "scope_inclusions": string[],
  "scope_exclusions": string[],
  "client_name": string | null,
  "client_email": string | null,
  "client_phone": string | null,
  "line_items": [
    {
      "category": string,
      "description": string,
      "quantity": number,
      "unit": string,
      "unit_price": number
    }
  ]
}

Rules:
- project_type must be one of: "General", "Kitchen Remodel", "Bathroom Remodel", "Flooring", "Roofing", "Painting", "Siding", "Deck / Patio", "Addition", "Full Renovation"
- tier must be one of: "budget", "midrange", "high_end"
- category must be one of: "material", "labor", "subcontractor"
- unit must be one of: "sq ft", "lin ft", "each", "bundle", "gallon", "sheet", "box", "roll", "bag", "ton", "hour", "day", "lot"
- Use your knowledge of home improvement pricing in the southeastern US to estimate reasonable unit prices if prices were not explicitly stated
- If a field is not mentioned, use null or an empty array`,
    messages: [
      {
        role: "user",
        content: `Extract estimate data from this voice conversation transcript:\n\n${transcript}`,
      },
    ],
  });

  const content = response.content[0]!;
  if (content.type !== "text") {
    return NextResponse.json({ error: "Unexpected response from AI" }, { status: 500 });
  }

  let extracted: z.infer<typeof extractedSchema>;

  try {
    const text = content.text.trim();
    const jsonText = text.startsWith("```")
      ? text.replace(/^```json?\n?/, "").replace(/\n?```$/, "")
      : text;
    const parsed: unknown = JSON.parse(jsonText);
    const validated = extractedSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("Claude response failed validation:", validated.error);
      return NextResponse.json({ error: "AI response validation failed" }, { status: 500 });
    }
    extracted = validated.data;
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "calls-to-estimate" });
    console.error("Failed to parse Claude response:", content.text);
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  const supabase = createServiceClient();

  // Create client record if we got a name
  let clientId: string | null = null;
  if (extracted.client_name) {
    const { data: newClient } = await supabase
      .from("clients")
      .insert({
        full_name: extracted.client_name,
        email: extracted.client_email ?? null,
        phone: extracted.client_phone ?? null,
      })
      .select("id")
      .single();
    clientId = newClient?.id ?? null;
  }

  // Get next estimate number with retry for uniqueness
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
        client_id: clientId,
        project_type: extracted.project_type ?? "General",
        project_address: extracted.project_address ?? null,
        status: "draft",
        tier: extracted.tier ?? "midrange",
        source: "voice",
        scope_inclusions: extracted.scope_inclusions ?? [],
        scope_exclusions: extracted.scope_exclusions ?? [],
        site_conditions: extracted.site_conditions ?? null,
        materials_subtotal: 0,
        labor_subtotal: 0,
        subcontractor_total: 0,
        permits_fees: 0,
        overhead_profit: 0,
        contingency: 0,
        tax: 0,
        grand_total: 0,
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") continue; // duplicate estimate_number, retry
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

  // Insert line items and recalculate totals
  const lineItems = extracted.line_items ?? [];
  if (lineItems.length > 0) {
    const toInsert = lineItems.map((li, i) => ({
      estimate_id: estimate!.id,
      line_number: i + 1,
      category: li.category ?? "material",
      description: li.description,
      quantity: li.quantity ?? 1,
      unit: li.unit ?? "each",
      unit_price: li.unit_price ?? 0,
      extended_price: (li.quantity ?? 1) * (li.unit_price ?? 0),
    }));

    await supabase.from("estimate_line_items").insert(toInsert);

    const matSub = toInsert
      .filter((l) => l.category === "material")
      .reduce((s, l) => s + l.extended_price, 0);
    const labSub = toInsert
      .filter((l) => l.category === "labor")
      .reduce((s, l) => s + l.extended_price, 0);
    const subSub = toInsert
      .filter((l) => l.category === "subcontractor")
      .reduce((s, l) => s + l.extended_price, 0);

    const base = matSub + labSub + subSub;
    const overhead = base * 0.15;
    const contingency = base * 0.05;
    const tax = base * 0.08;
    const grandTotal = base + overhead + contingency + tax;

    await supabase
      .from("estimates")
      .update({
        materials_subtotal: matSub,
        labor_subtotal: labSub,
        subcontractor_total: subSub,
        overhead_profit: overhead,
        contingency,
        tax,
        grand_total: grandTotal,
        gross_margin_pct: grandTotal > 0 ? ((grandTotal - base) / grandTotal) * 100 : 0,
      })
      .eq("id", estimate.id as string);

    const { data: updated } = await supabase
      .from("estimates")
      .select("*")
      .eq("id", estimate.id as string)
      .single();

    return NextResponse.json({ estimate: updated });
  }

  return NextResponse.json({ estimate });
}
