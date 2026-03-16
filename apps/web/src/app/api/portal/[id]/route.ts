import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { verifyPortalToken } from "@/lib/portal-token";
import { rateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";

/** 30 requests/minute per IP for public portal reads */
const portalReadLimiter = rateLimit({
  interval: 60_000,
  uniqueTokenPerInterval: 1000,
});

/** Statuses that a client is permitted to view via the portal */
const VIEWABLE_STATUSES = ["sent", "approved", "accepted"] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // --- Token validation ---
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  if (!verifyPortalToken(token, id)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // --- Rate limiting: 30 requests/minute per IP ---
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  try {
    await portalReadLimiter.check(30, ip);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "portal" });
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  const supabase = createServiceClient();

  // --- Fetch estimate ---
  const { data: estimateRaw, error: estimateError } = await supabase
    .from("estimates")
    .select(
      [
        "id",
        "estimate_number",
        "client_id",
        "project_type",
        "project_address",
        "status",
        "scope_inclusions",
        "scope_exclusions",
        "site_conditions",
        "materials_subtotal",
        "labor_subtotal",
        "subcontractor_total",
        "permits_fees",
        "overhead_profit",
        "contingency",
        "tax",
        "grand_total",
        "gross_margin_pct",
        "estimated_start",
        "estimated_end",
        "valid_through",
        "tier",
        "version",
        "created_at",
        "sent_at",
        "accepted_at",
        "declined_at",
      ].join(", ")
    )
    .eq("id", id)
    .single();

  if (estimateError || !estimateRaw) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  const estimate = estimateRaw as unknown as Record<string, unknown>;

  // --- Status gate: only allow viewable statuses ---
  if (!VIEWABLE_STATUSES.includes(estimate.status as typeof VIEWABLE_STATUSES[number])) {
    return NextResponse.json(
      { error: "This estimate is not available for viewing" },
      { status: 403 }
    );
  }

  // --- Fetch line items ---
  const { data: lineItems, error: lineItemsError } = await supabase
    .from("estimate_line_items")
    .select(
      [
        "id",
        "line_number",
        "category",
        "description",
        "quantity",
        "unit",
        "unit_price",
        "extended_price",
        "notes",
      ].join(", ")
    )
    .eq("estimate_id", id)
    .order("line_number", { ascending: true });

  if (lineItemsError) {
    console.error("Failed to fetch line items:", lineItemsError);
    return NextResponse.json(
      { error: "Failed to fetch estimate details" },
      { status: 500 }
    );
  }

  // --- Fetch client (sanitized) ---
  let client: {
    full_name: string;
    email: string | null;
    phone: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null = null;

  if (estimate.client_id) {
    const { data: clientData } = await supabase
      .from("clients")
      .select(
        "full_name, email, phone, address_line1, address_line2, city, state, zip"
      )
      .eq("id", estimate.client_id)
      .single();

    client = clientData ?? null;
  }

  // --- Fetch company settings ---
  const company: {
    name: string;
    address: string | null;
    city_state_zip: string | null;
    email: string;
    phone: string | null;
  } = {
    name: "North MS Home Pros",
    address: null,
    city_state_zip: null,
    email: "info@northmshomepros.com",
    phone: null,
  };

  const { data: settingsRows } = await supabase
    .from("company_settings")
    .select("key, value")
    .in("key", [
      "company_name",
      "company_address",
      "company_city_state_zip",
      "company_email",
      "company_phone",
    ]);

  if (settingsRows) {
    for (const row of settingsRows) {
      // Settings values are stored as JSONB objects: { value: "..." }
      const val =
        typeof row.value === "object" && row.value !== null
          ? ((row.value as Record<string, unknown>).value as string | undefined)
          : String(row.value);
      if (!val) continue;
      if (row.key === "company_name") company.name = val;
      else if (row.key === "company_address") company.address = val;
      else if (row.key === "company_city_state_zip") company.city_state_zip = val;
      else if (row.key === "company_email") company.email = val;
      else if (row.key === "company_phone") company.phone = val;
    }
  }

  // --- Fetch change orders (approved + pending — clients need to see both) ---
  const { data: changeOrders } = await supabase
    .from("estimate_change_orders")
    .select(
      [
        "id",
        "change_number",
        "description",
        "cost_impact",
        "timeline_impact",
        "status",
        "client_signed",
        "signed_at",
        "created_at",
      ].join(", ")
    )
    .eq("estimate_id", id)
    .in("status", ["approved", "pending"])
    .order("change_number", { ascending: true });

  return NextResponse.json({
    estimate,
    lineItems: lineItems ?? [],
    client,
    company,
    changeOrders: changeOrders ?? [],
  });
}
