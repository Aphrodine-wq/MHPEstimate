import { useMemo } from "react";
import type { Estimate } from "@proestimate/shared/types";

const TIER_MAP: Record<string, string> = {
  budget: "Budget", good: "Budget",
  midrange: "Midrange", mid: "Midrange", better: "Midrange",
  high_end: "High End", premium: "High End", best: "High End",
};

export interface AnalyticsSummary {
  accepted: Estimate[];
  declined: Estimate[];
  sent: Estimate[];
  winRate: number;
  avgMargin: number;
  totalRevenue: number;
  pipelineValue: number;
}

export function useAnalyticsSummary(estimates: Estimate[]): AnalyticsSummary {
  return useMemo(() => {
    const accepted = estimates.filter((e) => e.status === "accepted");
    const declined = estimates.filter((e) => e.status === "declined");
    const sent = estimates.filter((e) => ["sent", "accepted", "declined"].includes(e.status));
    const winRate = sent.length > 0 ? (accepted.length / sent.length) * 100 : 0;
    const avgMargin = estimates.length
      ? estimates.reduce((s, e) => s + Number(e.gross_margin_pct ?? 0), 0) / estimates.length : 0;
    const totalRevenue = accepted.reduce((s, e) => s + Number(e.grand_total), 0);
    const pipelineValue = estimates
      .filter((e) => ["draft", "in_review", "sent"].includes(e.status))
      .reduce((s, e) => s + Number(e.grand_total), 0);
    return { accepted, declined, sent, winRate, avgMargin, totalRevenue, pipelineValue };
  }, [estimates]);
}

export function SummaryCards({ estimates, summary }: { estimates: Estimate[]; summary: AnalyticsSummary }) {
  const { pipelineValue, totalRevenue, accepted, winRate, declined, sent, avgMargin } = summary;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 md:px-8 py-4">
      <StatCard label="Pipeline Value" value={pipelineValue > 0 ? `$${(pipelineValue / 1000).toFixed(0)}K` : "$0"} sub={`${estimates.filter((e) => ["draft", "in_review", "sent"].includes(e.status)).length} active`} />
      <StatCard label="Total Revenue" value={totalRevenue > 0 ? `$${(totalRevenue / 1000).toFixed(0)}K` : "$0"} sub={`${accepted.length} accepted`} />
      <StatCard label="Win Rate" value={winRate > 0 ? `${winRate.toFixed(0)}%` : "\u2014"} sub={sent.length > 0 ? `${accepted.length}W / ${declined.length}L of ${sent.length} sent` : "No sent estimates"} />
      <StatCard label="Avg Margin" value={avgMargin > 0 ? `${avgMargin.toFixed(1)}%` : "\u2014"} sub="Target 35-42%" />
    </div>
  );
}

export function RevenueByTier({ accepted }: { accepted: Estimate[] }) {
  const revenueByTier = useMemo(() => {
    const result: Record<string, number> = { Budget: 0, Midrange: 0, "High End": 0 };
    for (const e of accepted) {
      const tierLabel = TIER_MAP[e.tier] ?? "Midrange";
      result[tierLabel] = (result[tierLabel] ?? 0) + Number(e.grand_total);
    }
    return result;
  }, [accepted]);

  return (
    <div className="px-4 md:px-8 pb-8">
      <p className="mb-2 text-[13px] font-semibold">Revenue by Tier</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["Budget", "Midrange", "High End"] as const).map((tier) => (
          <div key={tier} className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">{tier}</p>
            <p className="mt-1 text-[22px] font-bold tracking-tight">
              {(revenueByTier[tier] ?? 0) > 0 ? `$${((revenueByTier[tier] ?? 0) / 1000).toFixed(1)}K` : "$0"}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--secondary)]">
              {accepted.filter((e) => (TIER_MAP[e.tier] ?? "Midrange") === tier).length} accepted estimate{accepted.filter((e) => (TIER_MAP[e.tier] ?? "Midrange") === tier).length !== 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">{label}</p>
      <p className="mt-1 text-[22px] font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[var(--secondary)]">{sub}</p>}
    </div>
  );
}
