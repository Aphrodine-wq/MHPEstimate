import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";
import { fetchLivePricingSnapshot } from "@/lib/live-pricing";

/**
 * GET /api/pricing/snapshot?zipCode=39042
 *
 * Returns a complete live pricing snapshot: BLS labor rates + commodity prices.
 * This is the single call the frontend makes before generating an auto-estimate
 * with live data.
 *
 * The returned data feeds directly into AutoEstimateInput.commodityPrices
 * and AutoEstimateInput.liveTradeRates.
 *
 * Cache strategy: results are cached server-side for 4 hours per ZIP prefix.
 * BLS data updates annually, commodity data updates daily.
 */

// Simple in-memory cache: zip3 → { data, timestamp }
const snapshotCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await estimateApiLimiter.check(10, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "pricing/snapshot" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const zipCode = req.nextUrl.searchParams.get("zipCode");
  if (!zipCode || !/^\d{5}$/.test(zipCode)) {
    return NextResponse.json({ error: "Valid 5-digit zipCode required" }, { status: 400 });
  }

  const zip3 = zipCode.slice(0, 3);

  // Check cache
  const cached = snapshotCache.get(zip3);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "private, max-age=14400" },
    });
  }

  try {
    const snapshot = await fetchLivePricingSnapshot(zipCode);

    // Transform into the format the estimation engine expects
    const commodityPrices: Record<string, number> = {};
    for (const [id, result] of Object.entries(snapshot.commodityPrices)) {
      commodityPrices[id] = result.currentPrice;
    }

    const liveTradeRates: Record<string, number> = {};
    const { TRADE_LABOR_RATES } = await import(
      "@proestimate/shared/constants/trade-labor-rates"
    );
    for (const rate of snapshot.laborRates) {
      for (const [slug, trade] of Object.entries(TRADE_LABOR_RATES)) {
        if ((trade as { socCode: string }).socCode === rate.socCode && rate.medianHourly > 0) {
          liveTradeRates[slug] = rate.medianHourly;
        }
      }
    }

    const response = {
      zipCode,
      commodityPrices,
      liveTradeRates,
      laborRates: snapshot.laborRates,
      commodityDetails: snapshot.commodityPrices,
      errors: snapshot.errors.length > 0 ? snapshot.errors : undefined,
      fetchedAt: snapshot.fetchedAt,
      cacheExpires: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    };

    // Cache the result
    snapshotCache.set(zip3, { data: response, ts: Date.now() });

    return NextResponse.json(response, {
      headers: { "X-Cache": "MISS", "Cache-Control": "private, max-age=14400" },
    });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      route: "pricing/snapshot",
      zipCode,
    });
    return NextResponse.json(
      { error: "Failed to fetch live pricing snapshot" },
      { status: 500 },
    );
  }
}
