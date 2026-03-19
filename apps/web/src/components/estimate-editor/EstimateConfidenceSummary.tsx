import { useMemo } from "react";
import { suggestPrice, type PricingSuggestion } from "@proestimate/estimation-engine";
import type { DraftLine } from "./types";
import { CONFIDENCE_CONFIG } from "./ConfidenceBadge";

interface EstimateConfidenceSummaryProps {
  lines: DraftLine[];
  className?: string;
}

interface AggregateConfidence {
  pct: number;
  rangeMin: number;
  rangeMax: number;
  matchedCount: number;
  totalCount: number;
  breakdown: { high: number; medium: number; low: number };
  suggestions: Map<string, PricingSuggestion>;
}

function computeAggregateConfidence(lines: DraftLine[]): AggregateConfidence {
  const validLines = lines.filter((l) => l.description.trim().length >= 3);
  const suggestions = new Map<string, PricingSuggestion>();
  const breakdown = { high: 0, medium: 0, low: 0 };

  let weightedConfidenceSum = 0;
  let totalWeight = 0;
  let rangeMin = 0;
  let rangeMax = 0;
  let matchedCount = 0;

  for (const line of validLines) {
    const suggestion = suggestPrice(line.description.trim());
    suggestions.set(line._key, suggestion);

    if (!suggestion.match) continue;
    matchedCount++;
    breakdown[suggestion.confidence]++;

    const lineTotal = line.quantity * line.retail_price;
    const weight = Math.max(lineTotal, 1);

    const confidencePct = suggestion.confidence === "high" ? 90
      : suggestion.confidence === "medium" ? 70
      : 40;

    weightedConfidenceSum += confidencePct * weight;
    totalWeight += weight;

    rangeMin += suggestion.priceRange.min * line.quantity;
    rangeMax += suggestion.priceRange.max * line.quantity;
  }

  const pct = totalWeight > 0 ? Math.round(weightedConfidenceSum / totalWeight) : 0;

  return {
    pct,
    rangeMin,
    rangeMax,
    matchedCount,
    totalCount: validLines.length,
    breakdown,
    suggestions,
  };
}

function ConfidenceRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const stroke = 3.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const color = pct >= 75 ? "var(--green)"
    : pct >= 50 ? "var(--accent)"
    : "var(--yellow)";

  return (
    <svg width={size} height={size} className="flex-shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--fill)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-700 ease-out" />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" className="rotate-90 origin-center" style={{ fontSize: size * 0.24, fontWeight: 700, fill: color }}>{pct}%</text>
    </svg>
  );
}

export function EstimateConfidenceSummary({ lines, className = "" }: EstimateConfidenceSummaryProps) {
  const agg = useMemo(() => computeAggregateConfidence(lines), [lines]);

  if (agg.totalCount === 0) return null;

  const confidenceLevel: "high" | "medium" | "low" =
    agg.pct >= 75 ? "high" : agg.pct >= 50 ? "medium" : "low";

  const cfg = CONFIDENCE_CONFIG[confidenceLevel];

  return (
    <div className={`rounded-xl border border-[var(--sep)] bg-[var(--bg)] p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Pricing Confidence</p>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          {agg.matchedCount}/{agg.totalCount} items matched
        </span>
      </div>

      <div className="flex items-center gap-4">
        <ConfidenceRing pct={agg.pct} size={56} />
        <div className="flex-1 min-w-0">
          {agg.rangeMin > 0 && (
            <div className="text-[14px] font-bold tabular-nums text-[var(--label)]">
              ${agg.rangeMin.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              {" "}&ndash;{" "}
              ${agg.rangeMax.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
          )}
          <div className="text-[11px] text-[var(--secondary)] mt-0.5">Estimated range at {agg.pct}% confidence</div>

          <div className="flex items-center gap-1 mt-2">
            {agg.breakdown.high > 0 && (
              <div className="h-1.5 rounded-full bg-[var(--green)] transition-all" style={{ width: `${(agg.breakdown.high / agg.matchedCount) * 100}%`, minWidth: 4 }} title={`${agg.breakdown.high} high confidence`} />
            )}
            {agg.breakdown.medium > 0 && (
              <div className="h-1.5 rounded-full bg-[var(--accent)] transition-all" style={{ width: `${(agg.breakdown.medium / agg.matchedCount) * 100}%`, minWidth: 4 }} title={`${agg.breakdown.medium} medium confidence`} />
            )}
            {agg.breakdown.low > 0 && (
              <div className="h-1.5 rounded-full bg-[var(--yellow)] transition-all" style={{ width: `${(agg.breakdown.low / agg.matchedCount) * 100}%`, minWidth: 4 }} title={`${agg.breakdown.low} low confidence`} />
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5">
            {agg.breakdown.high > 0 && (<span className="flex items-center gap-1 text-[10px] text-[var(--secondary)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--green)]" />{agg.breakdown.high} high</span>)}
            {agg.breakdown.medium > 0 && (<span className="flex items-center gap-1 text-[10px] text-[var(--secondary)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />{agg.breakdown.medium} med</span>)}
            {agg.breakdown.low > 0 && (<span className="flex items-center gap-1 text-[10px] text-[var(--secondary)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--yellow)]" />{agg.breakdown.low} low</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

export { computeAggregateConfidence, type AggregateConfidence };
