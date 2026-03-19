import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth-helpers";
import { estimateApiLimiter } from "@/lib/rate-limit";
import { captureError } from "@/lib/sentry";
import { fetchBLSLaborRates } from "@/lib/live-pricing";
import {
  TRADE_LABOR_RATES,
  getTradeRateForCategory,
  getAdjustedTradeRate,
} from "@proestimate/shared/constants/trade-labor-rates";
import { getRegionalMultiplier } from "@proestimate/shared/constants/regional-pricing";

/**
 * GET /api/pricing/labor?zipCode=39042&trades=electrician,plumber
 *
 * Returns trade-specific labor rates adjusted for the given ZIP code.
 * Tries BLS live data first, falls back to static rates with regional multipliers.
 *
 * Query params:
 *   zipCode (required) - 5-digit ZIP for regional adjustment
 *   trades  (optional) - Comma-separated trade slugs (defaults to all)
 *   live    (optional) - "true" to force BLS API call (default: try cached first)
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { user } = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await estimateApiLimiter.check(30, user.id);
  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { route: "pricing/labor" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const zipCode = req.nextUrl.searchParams.get("zipCode");
  if (!zipCode || !/^\d{5}$/.test(zipCode)) {
    return NextResponse.json({ error: "Valid 5-digit zipCode required" }, { status: 400 });
  }

  const tradesParam = req.nextUrl.searchParams.get("trades");
  const tradeSlugs = tradesParam
    ? tradesParam.split(",").map((t) => t.trim()).filter(Boolean)
    : Object.keys(TRADE_LABOR_RATES);

  const wantLive = req.nextUrl.searchParams.get("live") === "true";

  // Start with static rates adjusted for region
  const regional = getRegionalMultiplier(zipCode);
  const staticRates = tradeSlugs.map((slug) => {
    const trade = TRADE_LABOR_RATES[slug];
    if (!trade) return null;

    const adjusted = getAdjustedTradeRate(slug, zipCode, getRegionalMultiplier);
    if (!adjusted) return null;

    return {
      trade: slug,
      label: trade.label,
      socCode: trade.socCode,
      baseRate: trade.hourlyRate,
      adjustedRate: adjusted.hourlyRate,
      foremanRate: adjusted.foremanRate,
      apprenticeRate: adjusted.apprenticeRate,
      typicalCrewSize: trade.typicalCrewSize,
      annualGrowthPct: trade.annualGrowthPct,
      regionalMultiplier: regional.labor,
      source: "static" as const,
      lastVerified: trade.lastVerified,
    };
  }).filter(Boolean);

  // Try BLS live data if requested or if API key is available
  let blsRates: Array<Omit<NonNullable<(typeof staticRates)[number]>, "source"> & { source: "static" | "bls" }> = [];
  if (wantLive || process.env.BLS_API_KEY) {
    try {
      const blsData = await fetchBLSLaborRates(zipCode, tradeSlugs);
      if (blsData.length > 0) {
        blsRates = blsData.map((bls) => {
          const matchingSlug = tradeSlugs.find((s) => TRADE_LABOR_RATES[s]?.socCode === bls.socCode);
          const trade = matchingSlug ? TRADE_LABOR_RATES[matchingSlug] : null;

          return {
            trade: matchingSlug ?? bls.socCode,
            label: trade?.label ?? bls.trade,
            socCode: bls.socCode,
            baseRate: bls.medianHourly,
            adjustedRate: bls.medianHourly, // BLS data is already area-specific
            foremanRate: Math.round(bls.medianHourly * 1.25 * 100) / 100,
            apprenticeRate: Math.round(bls.medianHourly * 0.60 * 100) / 100,
            typicalCrewSize: trade?.typicalCrewSize ?? 2,
            annualGrowthPct: trade?.annualGrowthPct ?? 4.0,
            regionalMultiplier: 1.0, // Already regional
            source: "bls" as const,
            lastVerified: bls.period,
          };
        });
      }
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), {
        route: "pricing/labor",
        action: "bls_fetch",
      });
    }
  }

  // Merge: prefer BLS data where available, fill gaps with static
  const merged = staticRates.map((staticRate) => {
    if (!staticRate) return null;
    const blsMatch = blsRates.find((b) => b?.trade === staticRate.trade);
    return blsMatch ?? staticRate;
  }).filter(Boolean);

  return NextResponse.json({
    zipCode,
    regionalMultiplier: regional.labor,
    rates: merged,
    source: blsRates.length > 0 ? "bls+static" : "static",
    fetchedAt: new Date().toISOString(),
  });
}
