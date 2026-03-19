/**
 * Live Pricing Services
 *
 * Server-side services for fetching real-time pricing data:
 * 1. BLS labor rates by trade and metro area
 * 2. Commodity prices from FRED (Federal Reserve) and EIA
 *
 * All sources are free public APIs — no paid API keys required.
 */

import { COMMODITY_INDICES, type CommodityIndex } from "@proestimate/shared/constants/commodity-indices";
import { TRADE_LABOR_RATES, type TradeRate } from "@proestimate/shared/constants/trade-labor-rates";

export interface BLSWageResult { socCode: string; trade: string; areaCode: string; areaName: string; medianHourly: number; meanHourly: number; p25Hourly: number; p75Hourly: number; annualMean: number; period: string; lastFetched: string; }
export interface CommodityPriceResult { commodityId: string; name: string; currentPrice: number; unit: string; date: string; source: string; lastFetched: string; }
export interface LivePricingSnapshot { laborRates: BLSWageResult[]; commodityPrices: Record<string, CommodityPriceResult>; fetchedAt: string; errors: string[]; }

const BLS_METRO_CODES: Record<string, { code: string; name: string }> = {
  "386": { code: "0027260", name: "Jackson, MS" }, "394": { code: "0025060", name: "Gulfport-Biloxi, MS" },
  "350": { code: "0013820", name: "Birmingham, AL" }, "358": { code: "0026620", name: "Huntsville, AL" }, "365": { code: "0033660", name: "Mobile, AL" },
  "370": { code: "0034980", name: "Nashville, TN" }, "380": { code: "0032820", name: "Memphis, TN" }, "377": { code: "0028940", name: "Knoxville, TN" },
  "300": { code: "0012060", name: "Atlanta, GA" },
  "330": { code: "0033100", name: "Miami, FL" }, "327": { code: "0036740", name: "Orlando, FL" }, "335": { code: "0045300", name: "Tampa, FL" },
  "750": { code: "0019100", name: "Dallas, TX" }, "770": { code: "0026420", name: "Houston, TX" }, "787": { code: "0012420", name: "Austin, TX" },
  "000": { code: "0000000", name: "National" },
};

function buildOEWSSeriesId(socCode: string, metroCode: string, dataType: string): string {
  return `OEUM${metroCode}00000${socCode.replace("-", "")}${dataType}`;
}

export async function fetchBLSLaborRates(zipCode: string, trades?: string[]): Promise<BLSWageResult[]> {
  const apiKey = process.env.BLS_API_KEY;
  const blsUrl = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
  const zip3 = zipCode.replace(/\D/g, "").padStart(5, "0").slice(0, 3);
  const metro = BLS_METRO_CODES[zip3] ?? BLS_METRO_CODES["000"]!;
  const tradeSlugs = trades ?? Object.keys(TRADE_LABOR_RATES);
  const seriesIds: Array<{ seriesId: string; tradeSlug: string; dataType: string }> = [];
  for (const slug of tradeSlugs) {
    const trade = TRADE_LABOR_RATES[slug];
    if (!trade) continue;
    seriesIds.push({ seriesId: buildOEWSSeriesId(trade.socCode, metro.code, "08"), tradeSlug: slug, dataType: "median" });
    seriesIds.push({ seriesId: buildOEWSSeriesId(trade.socCode, metro.code, "04"), tradeSlug: slug, dataType: "mean" });
  }
  const batchSize = 50;
  const results: BLSWageResult[] = [];
  for (let i = 0; i < seriesIds.length; i += batchSize) {
    const batch = seriesIds.slice(i, i + batchSize);
    try {
      const payload: Record<string, unknown> = { seriesid: batch.map((s) => s.seriesId), startyear: String(new Date().getFullYear() - 1), endyear: String(new Date().getFullYear()) };
      if (apiKey) payload.registrationkey = apiKey;
      const res = await fetch(blsUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const data = await res.json() as { status: string; Results?: { series: Array<{ seriesID: string; data: Array<{ year: string; period: string; value: string }> }> } };
      if (data.status !== "REQUEST_SUCCEEDED" || !data.Results?.series) continue;
      const tradeMap = new Map<string, Partial<BLSWageResult>>();
      for (const series of data.Results.series) {
        const match = batch.find((b) => b.seriesId === series.seriesID);
        if (!match || !series.data?.[0]) continue;
        const value = parseFloat(series.data[0].value);
        if (isNaN(value)) continue;
        const existing = tradeMap.get(match.tradeSlug) ?? { socCode: TRADE_LABOR_RATES[match.tradeSlug]?.socCode ?? "", trade: TRADE_LABOR_RATES[match.tradeSlug]?.trade ?? "", areaCode: metro.code, areaName: metro.name, period: `${series.data[0].period} ${series.data[0].year}`, lastFetched: new Date().toISOString() };
        if (match.dataType === "median") existing.medianHourly = value;
        if (match.dataType === "mean") existing.meanHourly = value;
        tradeMap.set(match.tradeSlug, existing);
      }
      for (const partial of tradeMap.values()) {
        if (partial.medianHourly || partial.meanHourly) {
          results.push({ socCode: partial.socCode ?? "", trade: partial.trade ?? "", areaCode: partial.areaCode ?? "", areaName: partial.areaName ?? "", medianHourly: partial.medianHourly ?? partial.meanHourly ?? 0, meanHourly: partial.meanHourly ?? partial.medianHourly ?? 0, p25Hourly: partial.p25Hourly ?? 0, p75Hourly: partial.p75Hourly ?? 0, annualMean: partial.annualMean ?? (partial.meanHourly ?? 0) * 2080, period: partial.period ?? "", lastFetched: partial.lastFetched ?? new Date().toISOString() } satisfies BLSWageResult);
        }
      }
    } catch { continue; }
  }
  return results;
}

export async function fetchFREDPrice(seriesId: string): Promise<number | null> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&sort_order=desc&limit=1&api_key=${apiKey}&file_type=json`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json() as { observations?: Array<{ date: string; value: string }> };
    const obs = data.observations?.[0];
    if (!obs || obs.value === ".") return null;
    return parseFloat(obs.value);
  } catch { return null; }
}

export async function fetchEIAPrice(seriesId: string): Promise<number | null> {
  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://api.eia.gov/v2/natural-gas/pri/fut/data/?api_key=${apiKey}&frequency=daily&data[0]=value&sort[0][column]=period&sort[0][direction]=desc&length=1&facets[series][]=${seriesId}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json() as { response?: { data?: Array<{ value: number }> } };
    return data.response?.data?.[0]?.value ?? null;
  } catch { return null; }
}

export async function fetchAllCommodityPrices(): Promise<Record<string, CommodityPriceResult>> {
  const results: Record<string, CommodityPriceResult> = {};
  const fetchPromises = Object.entries(COMMODITY_INDICES).map(async ([id, index]: [string, CommodityIndex]) => {
    let price: number | null = null; let source = "";
    if (index.source.type === "fred") { price = await fetchFREDPrice(index.source.seriesId); source = `FRED:${index.source.seriesId}`; }
    else if (index.source.type === "eia") { price = await fetchEIAPrice(index.source.seriesId); source = `EIA:${index.source.seriesId}`; }
    if (price !== null && price > 0) results[id] = { commodityId: id, name: index.name, currentPrice: price, unit: index.unit, date: new Date().toISOString().split("T")[0]!, source, lastFetched: new Date().toISOString() };
  });
  await Promise.allSettled(fetchPromises);
  return results;
}

export async function fetchLivePricingSnapshot(zipCode: string, trades?: string[]): Promise<LivePricingSnapshot> {
  const errors: string[] = [];
  const [laborRates, commodityPrices] = await Promise.allSettled([fetchBLSLaborRates(zipCode, trades), fetchAllCommodityPrices()]);
  return {
    laborRates: laborRates.status === "fulfilled" ? laborRates.value : (() => { errors.push(`BLS fetch failed: ${laborRates.reason}`); return []; })(),
    commodityPrices: commodityPrices.status === "fulfilled" ? commodityPrices.value : (() => { errors.push(`Commodity fetch failed: ${commodityPrices.reason}`); return {}; })(),
    fetchedAt: new Date().toISOString(), errors,
  };
}
