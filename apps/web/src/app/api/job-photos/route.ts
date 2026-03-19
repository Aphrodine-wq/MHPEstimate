import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId, verifyEstimateOwnership } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// POST input validation
// ---------------------------------------------------------------------------
const photoCreateSchema = z.object({
  estimate_id: z.string().uuid(),
  phase_id: z.string().uuid().optional().nullable(),
  storage_path: z.string().min(1),
  thumbnail_path: z.string().optional().nullable(),
  file_name: z.string().min(1),
  file_size_bytes: z.number().int().positive().optional(),
  mime_type: z.string().optional(),
  category: z.enum([
    "before", "during", "after", "issue", "progress",
    "material", "inspection", "safety", "other",
  ]).default("progress"),
  caption: z.string().max(500).optional().nullable(),
  tags: z.array(z.string()).optional(),
  room: z.string().max(100).optional().nullable(),
  gps_lat: z.number().optional().nullable(),
  gps_lng: z.number().optional().nullable(),
});

/**
 * GET /api/job-photos — List photos for an estimate
 *
 * Query params:
 *   estimateId (required) — the estimate to fetch photos for
 *   category   (optional) — filter by photo category
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await estimateApiLimiter.check(30, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "job-photos-get" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Org scoping ---
  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const estimateId = searchParams.get("estimateId");

  if (!estimateId) {
    return NextResponse.json({ error: "estimateId query parameter is required" }, { status: 400 });
  }

  // --- Verify estimate ownership ---
  const estimate = await verifyEstimateOwnership(estimateId, orgId);
  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const supabase = createServiceClient();

  let query = supabase
    .from("job_photos")
    .select("*")
    .eq("organization_id", orgId)
    .eq("estimate_id", estimateId)
    .order("taken_at", { ascending: false });

  const category = searchParams.get("category");
  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    captureError(new Error(error.message), { route: "job-photos-get" });
    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 });
  }

  return NextResponse.json({ photos: data ?? [] });
}

/**
 * POST /api/job-photos — Create a photo metadata record
 *
 * The actual file should already be uploaded to Supabase Storage.
 * This endpoint stores the metadata row in the job_photos table.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await estimateApiLimiter.check(20, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "job-photos-post" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Org scoping ---
  const orgId = await getUserOrgId(req, user.id);
  if (!orgId) {
    return NextResponse.json({ error: "No organization found" }, { status: 403 });
  }

  // --- Parse & validate ---
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "job-photos-post" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = photoCreateSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  // --- Verify estimate ownership ---
  const estimate = await verifyEstimateOwnership(validated.data.estimate_id, orgId);
  if (!estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const supabase = createServiceClient();

  // --- Look up user display name ---
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("full_name")
    .eq("auth_id", user.id)
    .single();

  const { data: photo, error } = await supabase
    .from("job_photos")
    .insert({
      organization_id: orgId,
      estimate_id: validated.data.estimate_id,
      phase_id: validated.data.phase_id ?? null,
      storage_path: validated.data.storage_path,
      thumbnail_path: validated.data.thumbnail_path ?? null,
      file_name: validated.data.file_name,
      file_size_bytes: validated.data.file_size_bytes ?? null,
      mime_type: validated.data.mime_type ?? "image/jpeg",
      category: validated.data.category,
      caption: validated.data.caption ?? null,
      tags: validated.data.tags ?? [],
      room: validated.data.room ?? null,
      gps_lat: validated.data.gps_lat ?? null,
      gps_lng: validated.data.gps_lng ?? null,
      taken_by: user.id,
      taken_by_name: teamMember?.full_name ?? user.email ?? null,
    })
    .select()
    .single();

  if (error) {
    captureError(new Error(error.message), { route: "job-photos-post" });
    return NextResponse.json({ error: "Failed to create photo record" }, { status: 500 });
  }

  return NextResponse.json({ photo }, { status: 201 });
}
