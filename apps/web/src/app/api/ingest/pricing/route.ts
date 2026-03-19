import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServiceClient } from "@/lib/supabase-server";
import { ingestApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";
import type { PriceFreshness, PriceSource } from "@proestimate/shared/types";

/**
 * Allowed source IPs for network-level auth.
 * In production, this should be populated from env (PRICE_SCRAPER_ALLOWED_IPS).
 * Accepts comma-separated CIDRs or IPs.
 */
function getAllowedIPs(): string[] {
  const raw = process.env.PRICE_SCRAPER_ALLOWED_IPS ?? "";
  if (!raw) return [];
  return raw.split(",").map((ip) => ip.trim()).filter(Boolean);
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Verify the HMAC API key from the X-API-Key header.
 * Expected format: the raw API key string that matches PRICE_SCRAPER_API_KEY env var.
 */
function verifyApiKey(req: NextRequest): boolean {
  const apiKey = process.env.PRICE_SCRAPER_API_KEY;
  if (!apiKey) return false;

  const provided = req.headers.get("x-api-key");
  if (!provided) return false;

  // Constant-time comparison
  const expected = Buffer.from(apiKey, "utf8");
  const actual = Buffer.from(provided, "utf8");
  if (expected.length !== actual.length) return false;

  return timingSafeEqual(expected, actual);
}

function computeFreshness(lastUpdated: string): PriceFreshness {
  const ageDays = (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return "green";
  if (ageDays <= 30) return "yellow";
  if (ageDays <= 90) return "orange";
  return "red";
}

/** Schema for a single price update in the bulk payload */
interface PriceUpdate {
  product_id: string;
  source: PriceSource;
  price: number;
  unit?: string;
  store_location?: string;
  observed_at?: string;
}

interface IngestPayload {
  prices: PriceUpdate[];
}

/**
 * POST /api/ingest/pricing
 *
 * Dedicated endpoint for the Price Scraper MCP to push scraped prices.
 * Auth: network-level (known IPs). Not user-authenticated.
 * Accepts bulk price updates, upserts into unified_pricing table.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const clientIP = getClientIP(req);

  // Primary auth: HMAC API key
  if (!verifyApiKey(req)) {
    // Secondary defense: IP allowlist (only if API key auth fails)
    const allowedIPs = getAllowedIPs();
    if (allowedIPs.length === 0 || !allowedIPs.includes(clientIP)) {
      return NextResponse.json(
        { error: "Forbidden: invalid or missing API key" },
        { status: 403 },
      );
    }
  }

  // --- Rate limiting: 30 per minute per IP ---
  try {
    await ingestApiLimiter.check(30, clientIP);
  } catch {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: IngestPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.prices) || body.prices.length === 0) {
    return NextResponse.json(
      { error: "Request body must contain a non-empty 'prices' array" },
      { status: 400 },
    );
  }

  if (body.prices.length > 500) {
    return NextResponse.json(
      { error: "Batch size cannot exceed 500 items" },
      { status: 400 },
    );
  }

  const validSources: PriceSource[] = ["home_depot", "lowes", "invoice", "manual"];
  const errors: string[] = [];
  const validPrices: PriceUpdate[] = [];

  for (let i = 0; i < body.prices.length; i++) {
    const p = body.prices[i]!;
    if (!p.product_id || typeof p.product_id !== "string") {
      errors.push(`prices[${i}]: missing or invalid product_id`);
      continue;
    }
    if (!p.source || !validSources.includes(p.source)) {
      errors.push(`prices[${i}]: invalid source '${p.source}'`);
      continue;
    }
    if (typeof p.price !== "number" || p.price <= 0) {
      errors.push(`prices[${i}]: price must be a positive number`);
      continue;
    }
    validPrices.push(p);
  }

  if (validPrices.length === 0) {
    return NextResponse.json(
      { error: "No valid price entries", details: errors },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  let inserted = 0;
  let unified = 0;

  try {
    // Insert into pricing_history
    const historyRows = validPrices.map((p) => ({
      product_id: p.product_id,
      source: p.source,
      price: p.price,
      unit: p.unit ?? null,
      store_location: p.store_location ?? null,
      supplier_name: null,
      observed_at: p.observed_at ?? now,
    }));

    const { error: insertErr } = await supabase
      .from("pricing_history")
      .insert(historyRows);

    if (insertErr) throw insertErr;
    inserted = historyRows.length;

    // Recompute unified_pricing for each affected product
    const productIds = [...new Set(validPrices.map((p) => p.product_id))];

    for (const productId of productIds) {
      const { data: allHistory } = await supabase
        .from("pricing_history")
        .select("source, price")
        .eq("product_id", productId)
        .order("observed_at", { ascending: false });

      const latest: Record<string, number> = {};
      for (const obs of (allHistory ?? []) as Array<{ source: string; price: number }>) {
        if (!latest[obs.source]) latest[obs.source] = obs.price;
      }

      const prices = Object.values(latest).filter((p) => p > 0).sort((a, b) => a - b);
      const unifiedPrice = prices.length > 0 ? prices[Math.floor(prices.length / 2)]! : 0;

      if (unifiedPrice > 0) {
        await supabase.from("unified_pricing").upsert(
          {
            product_id: productId,
            unified_price: unifiedPrice,
            hd_price: latest["home_depot"] ?? null,
            lowes_price: latest["lowes"] ?? null,
            invoice_price: latest["invoice"] ?? null,
            freshness: computeFreshness(now),
            last_updated: now,
          },
          { onConflict: "product_id" },
        );
        unified++;
      }
    }
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      route: "ingest/pricing",
      batchSize: validPrices.length,
    });
    return NextResponse.json(
      { error: "Failed to ingest prices", details: String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      inserted,
      unified_updated: unified,
      skipped: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    },
    { status: 201 },
  );
}
