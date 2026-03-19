import { useState, useEffect } from "react";
import { PriceFreshnessBadge } from "../PriceFreshnessBadge";
import type { PriceFreshness } from "@proestimate/shared/types";
import { fmt } from "./types";

interface SourcePrice {
  price: number | null;
  freshness: PriceFreshness;
}

interface HistoryEntry {
  source: string;
  price: number;
  observed_at: string;
}

interface MarketPriceData {
  sources: {
    home_depot: SourcePrice;
    lowes: SourcePrice;
  };
  history: HistoryEntry[];
  unified: {
    unified_price: number | null;
    freshness: PriceFreshness;
    last_updated: string | null;
  };
}

interface MarketPriceDetailProps {
  productId: string | undefined;
  description: string;
}

function TrendIndicator({ history }: { history: HistoryEntry[] }) {
  if (history.length < 2) return null;
  const prices = history.map((h) => h.price);
  const first = prices[prices.length - 1]!;
  const last = prices[0]!;
  const pctChange = ((last - first) / first) * 100;
  if (Math.abs(pctChange) < 1) return <span className="text-[10px] text-[var(--tertiary)]">Stable</span>;
  return (
    <span className={`text-[10px] font-medium ${pctChange > 0 ? "text-[var(--red)]" : "text-[var(--green)]"}`}>
      {pctChange > 0 ? "+" : ""}{pctChange.toFixed(1)}% (30d)
    </span>
  );
}

function MiniSparkline({ history }: { history: HistoryEntry[] }) {
  if (history.length < 2) return null;
  const prices = history.map((h) => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const width = 120;
  const height = 28;
  const padding = 2;
  const points = prices.map((p, i) => {
    const x = padding + (i / (prices.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((p - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MarketPriceDetail({ productId, description }: MarketPriceDetailProps) {
  const [data, setData] = useState<MarketPriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/pricing?productId=${encodeURIComponent(productId)}`)
      .then(async (res) => { if (!res.ok) throw new Error("Failed to fetch market prices"); const json = await res.json(); setData(json); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [productId]);

  if (!productId) return (<div className="flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--tertiary)]"><PriceFreshnessBadge freshness="gray" /><span>No product linked to this line item</span></div>);
  if (loading) return (<div className="px-3 py-2"><div className="h-3 w-48 animate-pulse rounded bg-[var(--gray5)]" /></div>);
  if (error || !data) return (<div className="flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--tertiary)]"><PriceFreshnessBadge freshness="gray" /><span>{error ?? "No market data available"}</span></div>);

  const { sources, history, unified } = data;
  const hasHD = sources.home_depot.price !== null;
  const hasLowes = sources.lowes.price !== null;
  if (!hasHD && !hasLowes) return (<div className="flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--tertiary)]"><PriceFreshnessBadge freshness="gray" /><span>No market data for &ldquo;{description}&rdquo;</span></div>);

  return (
    <div className="rounded-md border border-[var(--sep)] bg-[var(--card)] px-3 py-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--secondary)]">Market Reference Prices</span>
        <span className="text-[9px] text-[var(--tertiary)] italic">Reference only</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[#F96302]">HD</span>
          {hasHD ? (<span className="flex items-center gap-1.5"><span className="text-[12px] font-semibold tabular-nums">${fmt(sources.home_depot.price!)}</span><PriceFreshnessBadge freshness={sources.home_depot.freshness} /></span>) : (<span className="text-[11px] text-[var(--tertiary)]">--</span>)}
        </div>
        <span className="h-4 w-px bg-[var(--sep)]" />
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-[#004990]">Lowe&apos;s</span>
          {hasLowes ? (<span className="flex items-center gap-1.5"><span className="text-[12px] font-semibold tabular-nums">${fmt(sources.lowes.price!)}</span><PriceFreshnessBadge freshness={sources.lowes.freshness} /></span>) : (<span className="text-[11px] text-[var(--tertiary)]">--</span>)}
        </div>
        {hasHD && hasLowes && (<><span className="h-4 w-px bg-[var(--sep)]" /><span className="text-[10px] text-[var(--secondary)]">{sources.home_depot.price! < sources.lowes.price! ? `HD saves $${fmt(sources.lowes.price! - sources.home_depot.price!)}` : sources.lowes.price! < sources.home_depot.price! ? `Lowe's saves $${fmt(sources.home_depot.price! - sources.lowes.price!)}` : "Same price"}</span></>)}
      </div>
      {history.length > 1 && (
        <div className="flex items-center gap-3 pt-1 border-t border-[var(--sep)]">
          <MiniSparkline history={history} />
          <TrendIndicator history={history} />
          {unified.last_updated && (<span className="text-[9px] text-[var(--tertiary)]">Last updated {new Date(unified.last_updated).toLocaleDateString()}</span>)}
        </div>
      )}
    </div>
  );
}
