import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser, getUserOrgId } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";

// ---------------------------------------------------------------------------
// Trades matching the CHECK constraints
// ---------------------------------------------------------------------------
const TRADES = [
  "framing",
  "electrical",
  "plumbing",
  "hvac",
  "drywall",
  "painting",
  "flooring",
  "roofing",
  "concrete",
  "demolition",
  "finish_carpentry",
  "tile",
  "insulation",
  "landscaping",
  "siding",
  "gutters",
  "windows_doors",
] as const;

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const createSubSchema = z.object({
  company_name: z.string().min(1, "company_name is required").max(300),
  contact_name: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  trades: z.array(z.enum(TRADES)).optional(),
  license_number: z.string().max(100).optional(),
  insurance_expiry: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(5000).optional(),
});

// ---------------------------------------------------------------------------
// GET — List subcontractors for org
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
  const trade = req.nextUrl.searchParams.get("trade");

  try {
    let query = supabase
      .from("subcontractors")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .order("company_name", { ascending: true });

    if (trade) {
      query = query.contains("trades", [trade]);
    }

    const { data, error } = await query.limit(500);

    if (error) {
      captureError(new Error(error.message), { route: "subcontractors-get" });
      return NextResponse.json({ error: "Failed to fetch subcontractors" }, { status: 500 });
    }

    return NextResponse.json({ subcontractors: data ?? [] });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "subcontractors-get" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — Create a new subcontractor
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

  const validated = createSubSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const ip = getClientIp(req);

  try {
    const { data: sub, error } = await supabase
      .from("subcontractors")
      .insert({
        organization_id: orgId,
        company_name: validated.data.company_name,
        contact_name: validated.data.contact_name ?? null,
        email: validated.data.email || null,
        phone: validated.data.phone ?? null,
        trades: validated.data.trades ?? [],
        license_number: validated.data.license_number ?? null,
        insurance_expiry: validated.data.insurance_expiry ?? null,
        rating: validated.data.rating ?? null,
        notes: validated.data.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      captureError(new Error(error.message), { route: "subcontractors-post" });
      return NextResponse.json({ error: "Failed to create subcontractor" }, { status: 500 });
    }

    await logAudit(
      user.id,
      "subcontractor_created",
      "subcontractor",
      sub.id,
      { company_name: validated.data.company_name, trades: validated.data.trades },
      ip,
    );

    return NextResponse.json({ subcontractor: sub }, { status: 201 });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "subcontractors-post" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
