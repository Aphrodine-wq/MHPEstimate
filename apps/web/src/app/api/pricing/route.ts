import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import type { PriceFreshness, PriceSource } from "@proestimate/shared/types";
import { captureError } from "@/lib/sentry";

function computeFreshness(lastUpdated: string): PriceFreshness {
  const ageDays = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return "green";
  if (ageDays <= 30) return "yellow";
  if (ageDays <= 90) return "orange";
  return "red";
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // --- Rate limiting: 30 requests/minute per user ---
  try {
    await estimateApiLimiter.check(30, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "pricing" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: product, error: prodErr } = await supabase
    .from("products").select("id, name, sku_hd, sku_lowes, unit, category").eq("id", productId).maybeSingle();
  if (prodErr || !product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const { data: unified } = await supabase.from("unified_pricing").select("*").eq("product_id", productId).maybeSingle();

  const { data: history } = await supabase.from("pricing_history").select("*")
    .eq("product_id", productId).order("observed_at", { ascending: false }).limit(20);

  const latestBySource: Record<string, { price: number; observed_at: string }> = {};
  for (const obs of (history ?? []) as Array<{ source: string; price: number; observed_at: string }>) {
    if (!latestBySource[obs.source]) latestBySource[obs.source] = { price: obs.price, observed_at: obs.observed_at };
  }

  const hdF: PriceFreshness = latestBySource["home_depot"] ? computeFreshness(latestBySource["home_depot"].observed_at) : "red";
  const lwF: PriceFreshness = latestBySource["lowes"] ? computeFreshness(latestBySource["lowes"].observed_at) : "red";
  const invF: PriceFreshness = latestBySource["invoice"] ? computeFreshness(latestBySource["invoice"].observed_at) : "red";
  const mostRecent = (history as Array<{ observed_at: string }>)?.[0];
  const freshness: PriceFreshness = mostRecent ? computeFreshness(mostRecent.observed_at) : (unified?.freshness ?? "red");

  return NextResponse.json({
    product,
    unified: { unified_price: unified?.unified_price ?? null, freshness, last_updated: unified?.last_updated ?? mostRecent?.observed_at ?? null },
    sources: {
      home_depot: { price: unified?.hd_price ?? latestBySource["home_depot"]?.price ?? null, freshness: hdF },
      lowes: { price: unified?.lowes_price ?? latestBySource["lowes"]?.price ?? null, freshness: lwF },
      invoice: { price: unified?.invoice_price ?? latestBySource["invoice"]?.price ?? null, freshness: invF },
    },
    history: ((history ?? []) as unknown[]).slice(0, 10),
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // --- Rate limiting: 10 requests/minute per user ---
  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "pricing" });
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
  }

  let body: { productId?: string; source?: PriceSource; price?: number; unit?: string; storeLocation?: string; supplierName?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { productId, source, price } = body;
  if (!productId || !source || typeof price !== "number" || price <= 0) {
    return NextResponse.json({ error: "Missing productId, source, or valid price" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { error: insertErr } = await supabase.from("pricing_history").insert({
    product_id: productId, source, price, unit: body.unit ?? null,
    store_location: body.storeLocation ?? null, supplier_name: body.supplierName ?? null, observed_at: now,
  });
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Recompute unified pricing
  const { data: allHistory } = await supabase.from("pricing_history").select("source, price")
    .eq("product_id", productId).order("observed_at", { ascending: false });
  const latest: Record<string, number> = {};
  for (const obs of (allHistory ?? []) as Array<{ source: string; price: number }>) {
    if (!latest[obs.source]) latest[obs.source] = obs.price;
  }
  const prices = Object.values(latest).filter((p) => p > 0).sort((a, b) => a - b);
  const unifiedPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)] : price;

  await supabase.from("unified_pricing").upsert({
    product_id: productId, unified_price: unifiedPrice,
    hd_price: latest["home_depot"] ?? null, lowes_price: latest["lowes"] ?? null,
    invoice_price: latest["invoice"] ?? null, freshness: computeFreshness(now), last_updated: now,
  }, { onConflict: "product_id" });

  return NextResponse.json({ unified_price: unifiedPrice, freshness: "green" }, { status: 201 });
}
