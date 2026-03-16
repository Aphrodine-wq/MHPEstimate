import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

export interface PhotoAnalysisResult {
  analyzed: boolean;
  rooms: string[];
  materials: string[];
  dimensions: string[];
  conditions: string[];
  rawDescription: string;
}

function placeholderAnalysis(imageCount: number): PhotoAnalysisResult {
  return {
    analyzed: false,
    rooms: [],
    materials: [],
    dimensions: [],
    conditions: [],
    rawDescription: `[Photo analysis not available — ${imageCount} image${imageCount !== 1 ? "s" : ""} attached. Configure ANTHROPIC_API_KEY to enable AI vision analysis.]`,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 10 requests/minute per user ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "calls-analyze-photo" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  let body: { images?: string[] };
  try {
    body = await req.json();
  } catch {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "calls-analyze-photo" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { images } = body;
  if (!images || images.length === 0) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }
  if (images.length > 10) {
    return NextResponse.json({ error: "Maximum 10 images per request" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(placeholderAnalysis(images.length));
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey });

    const imageBlocks = images.map((base64) => ({
      type: "image" as const,
      source: { type: "base64" as const, media_type: "image/jpeg" as const, data: base64 },
    }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a construction estimating assistant. Analyze site photos and return a JSON object only — no explanation, no markdown.
Return JSON: { "rooms": string[], "materials": string[], "dimensions": string[], "conditions": string[], "rawDescription": string }`,
      messages: [{
        role: "user",
        content: [
          ...imageBlocks,
          { type: "text" as const, text: `Analyze ${images.length > 1 ? "these " + images.length + " site photos" : "this site photo"} and return structured JSON.` },
        ],
      }],
    });

    const content = response.content[0];
    if (!content || content.type !== "text") throw new Error("Unexpected response");

    const text = content.text.trim();
    const jsonText = text.startsWith("```") ? text.replace(/^```json?\n?/, "").replace(/\n?```$/, "") : text;
    const parsed = JSON.parse(jsonText);

    return NextResponse.json({
      analyzed: true,
      rooms: parsed.rooms ?? [],
      materials: parsed.materials ?? [],
      dimensions: parsed.dimensions ?? [],
      conditions: parsed.conditions ?? [],
      rawDescription: parsed.rawDescription ?? "",
    });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "calls-analyze-photo" });
    console.error("Photo analysis error:", err);
    return NextResponse.json(placeholderAnalysis(images.length));
  }
}
