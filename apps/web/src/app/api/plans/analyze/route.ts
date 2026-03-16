import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

/**
 * POST /api/plans/analyze
 *
 * Accepts building plan images (base64) and uses Claude Vision to extract
 * construction data: rooms, dimensions, materials, openings.
 *
 * Body: { images: string[] } — base64-encoded page images (max 10)
 * Returns: PlanPageAnalysis[] with structured extraction per page
 */

interface ExtractedRoom {
  name: string;
  length_ft: number | null;
  width_ft: number | null;
  height_ft: number | null;
  area_sqft: number | null;
  perimeter_lft: number | null;
  window_count: number;
  door_count: number;
  notes: string | null;
}

interface ExtractedOpening {
  type: "window" | "door" | "garage_door" | "sliding_door";
  width_ft: number | null;
  height_ft: number | null;
  count: number;
  location: string | null;
}

interface ExtractedDimension {
  label: string;
  value: number;
  unit: string;
  location: string | null;
}

interface PageResult {
  page: number;
  plan_type: string;
  rooms: ExtractedRoom[];
  openings: ExtractedOpening[];
  dimensions: ExtractedDimension[];
  building_length_ft: number | null;
  building_width_ft: number | null;
  total_area_sqft: number | null;
  roof_pitch: string | null;
  roof_type: string | null;
  foundation_type: string | null;
  exterior_materials: string[];
  raw_description: string;
  confidence: number;
}

const PLAN_ANALYSIS_PROMPT = `You are an expert construction estimator analyzing building plans/blueprints.
Extract ALL measurable data from this construction plan image. Return ONLY valid JSON, no explanation.

Return JSON matching this exact schema:
{
  "plan_type": "floor_plan" | "elevation" | "roof_plan" | "foundation" | "site_plan" | "detail" | "electrical" | "plumbing" | "mechanical" | "other",
  "rooms": [
    {
      "name": string,
      "length_ft": number | null,
      "width_ft": number | null,
      "height_ft": number | null,
      "area_sqft": number | null,
      "perimeter_lft": number | null,
      "window_count": number,
      "door_count": number,
      "notes": string | null
    }
  ],
  "openings": [
    {
      "type": "window" | "door" | "garage_door" | "sliding_door",
      "width_ft": number | null,
      "height_ft": number | null,
      "count": number,
      "location": string | null
    }
  ],
  "dimensions": [
    {
      "label": string,
      "value": number,
      "unit": string,
      "location": string | null
    }
  ],
  "building_length_ft": number | null,
  "building_width_ft": number | null,
  "total_area_sqft": number | null,
  "roof_pitch": string | null,
  "roof_type": string | null,
  "foundation_type": string | null,
  "exterior_materials": string[],
  "raw_description": string,
  "confidence": number
}

Rules:
- Extract EVERY dimension annotation visible on the plan
- Calculate area_sqft from length × width when both are available
- Calculate perimeter_lft as 2×(length + width) when dimensions are available
- Count all windows and doors visible in each room
- For elevation views, extract roof pitch, exterior materials, and building height
- For floor plans, extract room names, dimensions, and fixture counts
- Identify foundation type if visible (slab, crawlspace, pier & beam, basement)
- Note exterior materials (vinyl siding, hardie board, brick, stone, stucco)
- Set confidence between 0 and 1 based on how clearly you can read the plan
- If dimensions are in inches, convert to feet (divide by 12)
- Common room names: "Living Room", "Kitchen", "Master Bedroom", "Bedroom 2", "Bathroom", "Garage", "Laundry", "Foyer", "Hallway", "Closet", "Pantry", "Porch"
- If you can see a scale bar, use it to estimate any unmarked dimensions
- raw_description should summarize what you see on this page in 1-2 sentences`;

export async function POST(req: NextRequest): Promise<NextResponse> {
  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 5 plan analyses per minute ---
  try {
    await estimateApiLimiter.check(5, `plan-${user.id}`);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "plans-analyze" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  let body: { images?: string[] };
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "plans-analyze" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { images } = body;
  if (!images || images.length === 0) {
    return NextResponse.json({ error: "No plan images provided" }, { status: 400 });
  }
  if (images.length > 10) {
    return NextResponse.json({ error: "Maximum 10 pages per analysis" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Plan analysis requires ANTHROPIC_API_KEY to be configured" },
      { status: 503 },
    );
  }

  try {
    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const anthropic = new Anthropic({ apiKey });

    // Analyze each page in parallel
    const pagePromises = images.map(async (base64, index): Promise<PageResult> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000); // 60s per page

      try {
        // Detect media type from base64 header or default to jpeg
        let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";
        if (base64.startsWith("/9j/")) mediaType = "image/jpeg";
        else if (base64.startsWith("iVBOR")) mediaType = "image/png";

        const response = await anthropic.messages.create(
          {
            model: "claude-sonnet-4-6",
            max_tokens: 4096,
            system: PLAN_ANALYSIS_PROMPT,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "image" as const,
                    source: {
                      type: "base64" as const,
                      media_type: mediaType,
                      data: base64,
                    },
                  },
                  {
                    type: "text" as const,
                    text: `Analyze this building plan (page ${index + 1}). Extract all rooms, dimensions, openings, and construction details. Return only JSON.`,
                  },
                ],
              },
            ],
          },
          { signal: controller.signal },
        );

        const content = response.content[0];
        if (!content || content.type !== "text") {
          throw new Error("Unexpected response type");
        }

        const text = content.text.trim();
        const jsonText = text.startsWith("```")
          ? text.replace(/^```json?\n?/, "").replace(/\n?```$/, "")
          : text;
        const parsed = JSON.parse(jsonText);

        return {
          page: index + 1,
          plan_type: parsed.plan_type ?? "other",
          rooms: (parsed.rooms ?? []).map((r: Record<string, unknown>) => ({
            name: String(r.name ?? "Unknown"),
            length_ft: toNum(r.length_ft),
            width_ft: toNum(r.width_ft),
            height_ft: toNum(r.height_ft),
            area_sqft: toNum(r.area_sqft) ?? computeArea(toNum(r.length_ft), toNum(r.width_ft)),
            perimeter_lft: toNum(r.perimeter_lft) ?? computePerimeter(toNum(r.length_ft), toNum(r.width_ft)),
            window_count: Number(r.window_count) || 0,
            door_count: Number(r.door_count) || 0,
            notes: r.notes ? String(r.notes) : null,
          })),
          openings: parsed.openings ?? [],
          dimensions: parsed.dimensions ?? [],
          building_length_ft: toNum(parsed.building_length_ft),
          building_width_ft: toNum(parsed.building_width_ft),
          total_area_sqft: toNum(parsed.total_area_sqft),
          roof_pitch: parsed.roof_pitch ?? null,
          roof_type: parsed.roof_type ?? null,
          foundation_type: parsed.foundation_type ?? null,
          exterior_materials: parsed.exterior_materials ?? [],
          raw_description: parsed.raw_description ?? "",
          confidence: Number(parsed.confidence) || 0.5,
        };
      } finally {
        clearTimeout(timeout);
      }
    });

    const pages = await Promise.all(pagePromises);

    // Build aggregate summary
    const allRooms = pages.flatMap((p) => p.rooms);
    const summary = {
      total_area_sqft: (pages.find((p) => p.total_area_sqft)?.total_area_sqft ??
        allRooms.reduce((sum, r) => sum + (r.area_sqft ?? 0), 0)) || null,
      total_rooms: allRooms.length,
      total_bathrooms: allRooms.filter((r) =>
        /bath|shower|powder|restroom/i.test(r.name),
      ).length,
      total_bedrooms: allRooms.filter((r) =>
        /bedroom|master\s*(bed|suite)|guest\s*room/i.test(r.name),
      ).length,
      stories: pages.filter((p) => p.plan_type === "floor_plan").length || 1,
      garage_bays: pages
        .flatMap((p) => p.openings)
        .filter((o) => o.type === "garage_door")
        .reduce((sum, o) => sum + o.count, 0),
      building_footprint_sqft:
        pages.find((p) => p.building_length_ft && p.building_width_ft)
          ? (pages.find((p) => p.building_length_ft)?.building_length_ft ?? 0) *
            (pages.find((p) => p.building_width_ft)?.building_width_ft ?? 0)
          : null,
      exterior_wall_lft: pages.find((p) => p.building_length_ft && p.building_width_ft)
        ? 2 * ((pages.find((p) => p.building_length_ft)?.building_length_ft ?? 0) +
            (pages.find((p) => p.building_width_ft)?.building_width_ft ?? 0))
        : null,
      roof_squares: null as number | null,
    };

    return NextResponse.json({ pages, summary });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "plans-analyze" });
    console.error("Plan analysis error:", err);
    return NextResponse.json(
      { error: "Failed to analyze building plans. Please try again." },
      { status: 500 },
    );
  }
}

function toNum(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function computeArea(length: number | null, width: number | null): number | null {
  if (length && width) return Math.round(length * width * 100) / 100;
  return null;
}

function computePerimeter(length: number | null, width: number | null): number | null {
  if (length && width) return Math.round(2 * (length + width) * 100) / 100;
  return null;
}
