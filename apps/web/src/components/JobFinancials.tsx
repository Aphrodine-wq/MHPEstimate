"use client";

import { useState, useEffect, useMemo } from "react";

// ── Types ──

interface FinancialReport {
  estimate: {
    materials: number;
    labor: number;
    subs: number;
    overhead: number;
    contingency: number;
    tax: number;
    total: number;
  };
  actuals: {
    materials: number;
    labor: number;
    subs: number;
    total: number;
    effectiveLabor: number;
    effectiveTotal: number;
  };
  timeTracking: {
    totalHours: number;
    totalLaborCost: number;
    entriesCount: number;
    avgCostPerHour: number;
    byTrade: Array<{
      trade: string;
      hours: number;
      cost: number;
      entries: number;
    }>;
  };
  variances: {
    materials: number;
    materialsPercent: number;
    labor: number;
    laborPercent: number;
    subs: number;
    subsPercent: number;
    total: number;
    totalPercent: number;
  };
  profitability: {
    grossProfit: number;
    grossMarginPct: number;
    estimatedMarginPct: number;
  };
}

// ── Helpers ──

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDec(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const TRADE_LABELS: Record<string, string> = {
  general: "General",
  framing: "Framing",
  electrical: "Electrical",
  plumbing: "Plumbing",
  hvac: "HVAC",
  drywall: "Drywall",
  painting: "Painting",
  flooring: "Flooring",
  roofing: "Roofing",
  concrete: "Concrete",
  demolition: "Demolition",
  finish_carpentry: "Finish Carpentry",
  tile: "Tile",
  insulation: "Insulation",
  landscaping: "Landscaping",
  siding: "Siding",
  gutters: "Gutters",
  windows_doors: "Windows & Doors",
  other: "Other",
};

// ── Stat Card ──

function StatCard({
  label,
  value,
  comparison,
  comparisonLabel,
  variant,
}: {
  label: string;
  value: string;
  comparison?: string;
  comparisonLabel?: string;
  variant?: "positive" | "negative" | "neutral";
}) {
  const variantColor =
    variant === "positive"
      ? "text-[var(--green)]"
      : variant === "negative"
      ? "text-[var(--red)]"
      : "text-[var(--secondary)]";

  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-1">
        {label}
      </p>
      <p className="text-[28px] font-bold tabular-nums leading-tight">{value}</p>
      {comparison && (
        <p className={`mt-1.5 text-[12px] font-medium ${variantColor}`}>
          {comparison}
          {comparisonLabel && (
            <span className="text-[var(--secondary)] font-normal"> {comparisonLabel}</span>
          )}
        </p>
      )}
    </div>
  );
}

// ── Variance Cell ──

function VarianceCell({ value, percent }: { value: number; percent: number }) {
  if (value === 0) {
    return <span className="text-[var(--secondary)]">--</span>;
  }
  const isOver = value > 0;
  const color = isOver ? "text-[var(--red)]" : "text-[var(--green)]";
  const prefix = isOver ? "+" : "";
  return (
    <span className={`font-medium tabular-nums ${color}`}>
      {prefix}${fmt(value)}{" "}
      <span className="text-[11px] opacity-70">({prefix}{percent}%)</span>
    </span>
  );
}

// ── Trade Bar ──

function TradeBar({
  trade,
  hours,
  cost,
  maxHours,
}: {
  trade: string;
  hours: number;
  cost: number;
  maxHours: number;
}) {
  const pct = maxHours > 0 ? (hours / maxHours) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-32 shrink-0 text-[12px] font-medium truncate">
        {TRADE_LABELS[trade] ?? trade}
      </span>
      <div className="flex-1 h-5 rounded-full bg-[var(--fill)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="w-16 shrink-0 text-right text-[12px] tabular-nums font-medium">
        {fmtDec(hours)}h
      </span>
      <span className="w-20 shrink-0 text-right text-[12px] tabular-nums text-[var(--secondary)]">
        ${fmt(cost)}
      </span>
    </div>
  );
}

// ── Profit Waterfall ──

function ProfitWaterfall({
  materials,
  labor,
  subs,
  profit,
  total,
}: {
  materials: number;
  labor: number;
  subs: number;
  profit: number;
  total: number;
}) {
  if (total <= 0) return null;

  const segments = [
    { label: "Materials", value: materials, color: "bg-[var(--accent)]" },
    { label: "Labor", value: labor, color: "bg-[var(--orange)]" },
    { label: "Subs", value: subs, color: "bg-[var(--teal)]" },
    { label: "Profit", value: Math.max(profit, 0), color: "bg-[var(--green)]" },
  ].filter((s) => s.value > 0);

  const segTotal = segments.reduce((s, seg) => s + seg.value, 0);

  return (
    <div>
      <div className="flex h-8 rounded-lg overflow-hidden">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className={`${seg.color} transition-all duration-500 relative group`}
            style={{ width: `${(seg.value / segTotal) * 100}%` }}
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[10px] font-bold text-white drop-shadow-sm">
                ${fmt(seg.value)}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${seg.color}`} />
            <span className="text-[11px] text-[var(--secondary)]">
              {seg.label} (${fmt(seg.value)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ──

interface JobFinancialsProps {
  estimateId: string;
}

export function JobFinancials({ estimateId }: JobFinancialsProps) {
  const [data, setData] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!estimateId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/job-financials/${estimateId}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        setData(json as FinancialReport);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [estimateId]);

  const hasActuals = useMemo(() => {
    if (!data) return false;
    return (
      data.actuals.materials > 0 ||
      data.actuals.labor > 0 ||
      data.actuals.subs > 0 ||
      data.actuals.total > 0
    );
  }, [data]);

  const hasTimeEntries = useMemo(() => {
    if (!data) return false;
    return data.timeTracking.entriesCount > 0;
  }, [data]);

  const maxTradeHours = useMemo(() => {
    if (!data) return 0;
    return Math.max(...data.timeTracking.byTrade.map((t) => t.hours), 0);
  }, [data]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-[var(--gray5)] animate-pulse" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-[var(--gray5)] animate-pulse" />
          <div className="h-48 rounded-xl bg-[var(--gray5)] animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--red)]/10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <p className="text-[14px] font-semibold mb-1">Failed to load financials</p>
          <p className="text-[13px] text-[var(--secondary)]">{error}</p>
        </div>
      </div>
    );
  }

  // ── No estimate ID ──
  if (!data) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[15px] font-semibold mb-1">No estimate selected</p>
          <p className="text-[13px] text-[var(--secondary)]">
            Select an estimate to view its financial breakdown.
          </p>
        </div>
      </div>
    );
  }

  const { estimate, actuals, timeTracking, variances, profitability } = data;

  // Determine comparison text for stat cards
  const actualSpend = actuals.effectiveTotal || actuals.total;
  const spendVariant: "positive" | "negative" | "neutral" =
    actualSpend > 0
      ? actualSpend <= estimate.materials + estimate.labor + estimate.subs
        ? "positive"
        : "negative"
      : "neutral";

  const profitVariant: "positive" | "negative" | "neutral" =
    profitability.grossProfit >= 0 ? "positive" : "negative";

  const marginVariant: "positive" | "negative" | "neutral" =
    profitability.grossMarginPct >= profitability.estimatedMarginPct ? "positive" : "negative";

  // ── Breakdown rows ──
  const breakdownRows = [
    {
      category: "Materials",
      estimated: estimate.materials,
      actual: actuals.materials,
      variance: variances.materials,
      pct: variances.materialsPercent,
      hasActual: actuals.materials > 0,
    },
    {
      category: "Labor",
      estimated: estimate.labor,
      actual: actuals.effectiveLabor,
      variance: variances.labor,
      pct: variances.laborPercent,
      hasActual: actuals.effectiveLabor > 0,
    },
    {
      category: "Subcontractors",
      estimated: estimate.subs,
      actual: actuals.subs,
      variance: variances.subs,
      pct: variances.subsPercent,
      hasActual: actuals.subs > 0,
    },
    {
      category: "Overhead & Profit",
      estimated: estimate.overhead,
      actual: null as number | null,
      variance: null as number | null,
      pct: null as number | null,
      hasActual: false,
    },
    {
      category: "Contingency",
      estimated: estimate.contingency,
      actual: null as number | null,
      variance: null as number | null,
      pct: null as number | null,
      hasActual: false,
    },
    {
      category: "Tax",
      estimated: estimate.tax,
      actual: null as number | null,
      variance: null as number | null,
      pct: null as number | null,
      hasActual: false,
    },
  ];

  const estCostBasis = estimate.materials + estimate.labor + estimate.subs;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* ── Header ── */}
        <div>
          <h2 className="text-[22px] font-bold font-display">Job P&L Dashboard</h2>
          <p className="text-[13px] text-[var(--secondary)] mt-0.5">
            Financial overview and variance tracking
          </p>
        </div>

        {/* ── Top Stats Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Estimated Total"
            value={`$${fmt(estimate.total)}`}
            comparison={`$${fmt(estCostBasis)} cost basis`}
            variant="neutral"
          />
          <StatCard
            label="Actual Spend"
            value={hasActuals ? `$${fmt(actualSpend)}` : "--"}
            comparison={
              hasActuals
                ? `${variances.total >= 0 ? "+" : ""}$${fmt(variances.total)} vs estimated`
                : "No actuals recorded yet"
            }
            variant={hasActuals ? spendVariant : "neutral"}
          />
          <StatCard
            label="Gross Profit"
            value={hasActuals ? `$${fmt(profitability.grossProfit)}` : `$${fmt(estimate.total - estCostBasis)}`}
            comparison={
              hasActuals
                ? `${profitability.grossProfit >= 0 ? "Under" : "Over"} budget`
                : "Estimated (no actuals)"
            }
            variant={hasActuals ? profitVariant : "neutral"}
          />
          <StatCard
            label="Margin %"
            value={`${hasActuals ? profitability.grossMarginPct : profitability.estimatedMarginPct}%`}
            comparison={
              hasActuals
                ? `${profitability.estimatedMarginPct}% estimated`
                : "Estimated margin"
            }
            comparisonLabel={hasActuals ? "target" : undefined}
            variant={hasActuals ? marginVariant : "neutral"}
          />
        </div>

        {/* ── Profit Waterfall ── */}
        <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-[14px] font-semibold mb-4">Cost Breakdown</h3>
          <ProfitWaterfall
            materials={hasActuals ? actuals.materials || estimate.materials : estimate.materials}
            labor={hasActuals ? actuals.effectiveLabor || estimate.labor : estimate.labor}
            subs={hasActuals ? actuals.subs || estimate.subs : estimate.subs}
            profit={profitability.grossProfit}
            total={estimate.total}
          />
        </div>

        {/* ── Breakdown Table ── */}
        <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--sep)]">
            <h3 className="text-[14px] font-semibold">Estimated vs Actual Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--sep)] bg-[var(--fill)]">
                  <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                    Category
                  </th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                    Estimated
                  </th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                    Actual
                  </th>
                  <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody>
                {breakdownRows.map((row) => (
                  <tr key={row.category} className="border-b border-[var(--sep)] last:border-b-0">
                    <td className="px-5 py-3 font-medium">{row.category}</td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      ${fmt(row.estimated)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {row.hasActual ? `$${fmt(row.actual!)}` : (
                        <span className="text-[var(--tertiary)]">--</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {row.hasActual && row.variance !== null && row.pct !== null ? (
                        <VarianceCell value={row.variance} percent={row.pct} />
                      ) : (
                        <span className="text-[var(--tertiary)]">--</span>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="border-t-2 border-[var(--sep)] bg-[var(--fill)]">
                  <td className="px-5 py-3 font-bold">Total</td>
                  <td className="px-5 py-3 text-right font-bold tabular-nums">
                    ${fmt(estimate.total)}
                  </td>
                  <td className="px-5 py-3 text-right font-bold tabular-nums">
                    {hasActuals ? `$${fmt(actualSpend)}` : (
                      <span className="text-[var(--tertiary)]">--</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {hasActuals ? (
                      <VarianceCell value={variances.total} percent={variances.totalPercent} />
                    ) : (
                      <span className="text-[var(--tertiary)]">--</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Labor Hours Breakdown ── */}
        <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
          <h3 className="text-[14px] font-semibold mb-1">Labor Hours Breakdown</h3>
          <p className="text-[12px] text-[var(--secondary)] mb-4">
            Time tracking data from crew clock-ins
          </p>

          {hasTimeEntries ? (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="rounded-lg bg-[var(--fill)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                    Total Hours
                  </p>
                  <p className="text-[20px] font-bold tabular-nums">{fmtDec(timeTracking.totalHours)}</p>
                </div>
                <div className="rounded-lg bg-[var(--fill)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                    Total Cost
                  </p>
                  <p className="text-[20px] font-bold tabular-nums">
                    ${fmt(timeTracking.totalLaborCost)}
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--fill)] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                    Avg $/Hour
                  </p>
                  <p className="text-[20px] font-bold tabular-nums">
                    ${fmtDec(timeTracking.avgCostPerHour)}
                  </p>
                </div>
              </div>

              {/* Trade bars */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-3 pb-2 border-b border-[var(--sep)]">
                  <span className="w-32 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                    Trade
                  </span>
                  <span className="flex-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                    Hours
                  </span>
                  <span className="w-16 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                    Hours
                  </span>
                  <span className="w-20 shrink-0 text-right text-[10px] font-semibold uppercase tracking-wide text-[var(--secondary)]">
                    Cost
                  </span>
                </div>
                {timeTracking.byTrade.map((t) => (
                  <TradeBar
                    key={t.trade}
                    trade={t.trade}
                    hours={t.hours}
                    cost={t.cost}
                    maxHours={maxTradeHours}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--sep)] p-10 text-center">
              <svg
                className="mx-auto mb-3 text-[var(--tertiary)]"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <p className="text-[14px] font-semibold mb-1">No time entries yet</p>
              <p className="text-[13px] text-[var(--secondary)]">
                Start tracking time to see labor breakdown by trade
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
