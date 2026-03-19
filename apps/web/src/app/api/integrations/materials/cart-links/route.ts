import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { integrationApiLimiter } from "@/lib/rate-limit";
import { logAudit, getClientIp } from "@/lib/audit";
import { captureError } from "@/lib/sentry";
import { buildCartLinks, type CartLineItem } from "@proestimate/estimation-engine";

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------
const inputSchema = z.object({
  estimateId: z.string().uuid("estimateId must be a valid UUID"),
});

export async function POST(req: NextRequest) {
  // --- Auth ---
  const { user } = await getAuthUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Rate limiting ---
  try {
    await integrationApiLimiter.check(30, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "integrations-materials-cart-links" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  // --- Parse & validate ---
  let body: unknown;
  try {
    body = await req.json();
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "integrations-materials-cart-links" });
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validated = inputSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { error: "Validation failed", details: validated.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { estimateId } = validated.data;
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

  // --- Verify estimate exists ---
  const { data: estimate, error: estError } = await supabase
    .from("estimates")
    .select("id, estimate_number")
    .eq("id", estimateId)
    .single();

  if (estError || !estimate) {
    return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  }

  // --- Fetch line items joined with products for SKU data ---
  const { data: lineItems, error: liError } = await supabase
    .from("estimate_line_items")
    .select("description, quantity, product_id")
    .eq("estimate_id", estimateId)
    .eq("category", "material")
    .order("line_number");

  if (liError) {
    captureError(new Error(liError.message), { route: "integrations-materials-cart-links" });
    return NextResponse.json({ error: "Failed to fetch line items" }, { status: 500 });
  }

  // Fetch product SKUs for items that have a product_id
  const productIds = (lineItems ?? [])
    .map((li) => li.product_id)
    .filter((id): id is string => !!id);

  let productMap: Record<string, { sku_hd: string | null; sku_lowes: string | null }> = {};

  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, sku_hd, sku_lowes")
      .in("id", productIds);

    if (products) {
      productMap = Object.fromEntries(
        products.map((p) => [p.id, { sku_hd: p.sku_hd, sku_lowes: p.sku_lowes }]),
      );
    }
  }

  // --- Build CartLineItem array ---
  const cartLineItems: CartLineItem[] = (lineItems ?? []).map((li) => {
    const product = li.product_id ? productMap[li.product_id] : undefined;
    return {
      description: li.description,
      quantity: li.quantity ?? 1,
      productId: li.product_id ?? undefined,
      skuHd: product?.sku_hd ?? null,
      skuLowes: product?.sku_lowes ?? null,
    };
  });

  // --- Build cart links ---
  const result = buildCartLinks(cartLineItems);

  // --- Audit ---
  await logAudit(
    user.id,
    "material_cart_generated",
    "estimate",
    estimateId,
    {
      estimate_number: estimate.estimate_number,
      hd_item_count: result.homeDepot.itemCount,
      lowes_item_count: result.lowes.itemCount,
      unmatched_count: result.unmatchedItems.length,
      match_rate: result.matchRate,
    },
    getClientIp(req),
  );

  return NextResponse.json(result);
}
