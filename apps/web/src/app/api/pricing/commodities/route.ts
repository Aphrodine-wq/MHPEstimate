import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";
import { fetchAllCommodityPrices } from "@/lib/live-pricing";
import {
  COMMODITY_INDICES,
  calculateCommodityAdjustment,
} from "@proestimate/shared/constants/commodity-indices";

/**
 * GET /api/pricing/commodities?category=framing
 *
 * Returns current commodity prices and their impact on material costs.
 *
 * Query params:
 *   category (optional) - Material category to calculate adjustment for
 *                          If omitted, returns all commodity prices
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await estimateApiLimiter.check(20, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "pricing/commodities" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const category = req.nextUrl.searchParams.get("category");

  try {
    const commodityPrices = await fetchAllCommodityPrices();
    const currentPriceMap: Record<string, number> = {};
    for (const [id, result] of Object.entries(commodityPrices)) {
      currentPriceMap[id] = result.currentPrice;
    }

    // Build response with baseline comparisons
    const indices = Object.entries(COMMODITY_INDICES).map(([id, index]) => {
      const live = commodityPrices[id];
      const currentPrice = live?.currentPrice ?? null;
      const changeFromBaseline = currentPrice !== null
        ? Math.round(((currentPrice / index.baselinePrice) - 1) * 1000) / 10
        : null;

      return {
        id,
        name: index.name,
        unit: index.unit,
        baselinePrice: index.baselinePrice,
        currentPrice,
        changeFromBaselinePct: changeFromBaseline,
        volatility: index.volatility,
        affectedCategories: index.affectedCategories,
        source: live?.source ?? null,
        lastFetched: live?.lastFetched ?? null,
        status: currentPrice !== null ? "live" : "unavailable",
      };
    });

    // If a category was requested, calculate the adjustment factor
    let adjustment = null;
    if (category) {
      adjustment = calculateCommodityAdjustment(category, currentPriceMap);
    }

    return NextResponse.json({
      commodities: indices,
      adjustment: adjustment ? {
        category,
        factor: adjustment.adjustmentFactor,
        drivers: adjustment.drivers,
        interpretation: adjustment.adjustmentFactor > 1.05
          ? `Material costs for ${category} are trending ${Math.round((adjustment.adjustmentFactor - 1) * 100)}% above baseline due to commodity prices`
          : adjustment.adjustmentFactor < 0.95
            ? `Material costs for ${category} are trending ${Math.round((1 - adjustment.adjustmentFactor) * 100)}% below baseline`
            : `Material costs for ${category} are near baseline levels`,
      } : undefined,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      route: "pricing/commodities",
    });
    return NextResponse.json(
      { error: "Failed to fetch commodity prices" },
      { status: 500 },
    );
  }
}
