import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { orgApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

interface CreateOrgBody {
  name?: string;
  slug?: string;
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * POST /api/organizations
 *
 * Creates a new organization for the authenticated user.
 * Also creates the owner org_members entry, default company_settings,
 * and a free-tier subscription. Sets the `pe-org-id` cookie on the response.
 */
export async function POST(req: NextRequest) {
  // --- Auth check ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting: 5 per minute per user ---
  try {
    await orgApiLimiter.check(5, user.id);
  } catch {
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Parse body ---
  let body: CreateOrgBody;
  try {
    body = (await req.json()) as CreateOrgBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { name, slug } = body;

  // --- Validate fields ---
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!slug || typeof slug !== "string" || !SLUG_RE.test(slug)) {
    return NextResponse.json(
      { error: "slug must be lowercase alphanumeric with optional hyphens (3-63 chars)" },
      { status: 400 }
    );
  }

  const trimmedName = name.trim();
  const normalizedSlug = slug.toLowerCase();

  const supabase = createServiceClient();

  // --- Check slug uniqueness ---
  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", normalizedSlug)
    .maybeSingle();

  if (existingOrg) {
    return NextResponse.json({ error: "An organization with this slug already exists" }, { status: 409 });
  }

  // --- Create organization ---
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name: trimmedName,
      slug: normalizedSlug,
      owner_id: user.id,
    })
    .select()
    .single();

  if (orgError || !org) {
    console.error("Failed to create organization:", orgError);
    captureError(
      orgError ? new Error(orgError.message) : new Error("Unknown org creation error"),
      { route: "organizations-create" }
    );
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }

  // --- Create org_members entry for the owner ---
  const { error: memberError } = await supabase.from("org_members").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "owner",
    is_active: true,
  });

  if (memberError) {
    console.error("Failed to create org_members entry:", memberError);
    // Attempt cleanup
    await supabase.from("organizations").delete().eq("id", org.id);
    return NextResponse.json({ error: "Failed to create organization membership" }, { status: 500 });
  }

  // --- Create default company_settings ---
  const defaultSettings = [
    {
      organization_id: org.id,
      key: "estimate_numbering",
      value: { prefix: "EST", next_number: 1001, pad_length: 4 },
    },
    {
      organization_id: org.id,
      key: "feature_flags",
      value: { voice_ai: false, advanced_analytics: false, change_orders: true },
    },
  ];

  const { error: settingsError } = await supabase
    .from("company_settings")
    .insert(defaultSettings);

  if (settingsError) {
    console.error("Failed to create default company_settings:", settingsError);
    // Non-fatal — org still usable, settings can be created later
  }

  // --- Create free subscription ---
  const { error: subError } = await supabase.from("subscriptions").insert({
    organization_id: org.id,
    plan_id: "free",
    status: "active",
    stripe_subscription_id: null,
    current_period_start: new Date().toISOString(),
    current_period_end: null,
    cancel_at_period_end: false,
  });

  if (subError) {
    console.error("Failed to create free subscription:", subError);
    // Non-fatal — billing can be set up later
  }

  // --- Set pe-org-id cookie ---
  const response = NextResponse.json(org, { status: 201 });
  response.cookies.set("pe-org-id", org.id, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return response;
}
