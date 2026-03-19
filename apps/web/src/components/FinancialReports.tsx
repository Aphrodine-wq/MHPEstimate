"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FinancialSummary {
  totalEstimated: number;
  totalActual: number;
  totalProfit: number;
  avgMarginPct: number;
  jobCount: number;
}

interface JobRow {
  estimateId: string;
  estimateNumber: string;
  clientName: string;
  projectType: string;
  estimated: number;
  actual: number;
  profit: number;
  marginPct: number;
  status: string;
}

interface MonthlyData {
  month: string;
  invoiced: number;
  collected: number;
  outstanding: number;
}

interface Overhead {
  totalLabor: number;
  totalMaterials: number;
  totalSubs: number;
  laborPct: number;
  materialsPct: number;
  subsPct: number;
}

interface FinancialReport {
  summary: FinancialSummary;
  byJob: JobRow[];
  cashFlow: { monthlyData: MonthlyData[] };
  overhead: Overhead;
}

type Period = "this_month" | "this_quarter" | "this_year" | "all";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return fmt(n);
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

const PROJECT_TYPE_LABELS: Record<string, string> = {
  kitchen_renovation: "Kitchen",
  bathroom_renovation: "Bathroom",
  basement_finishing: "Basement",
  deck_patio: "Deck/Patio",
  addition: "Addition",
  whole_house: "Whole House",
  roofing: "Roofing",
  siding: "Siding",
  general: "General",
  commercial: "Commercial",
  new_construction: "New Build",
};

const PERIOD_LABELS: Record<Period, string> = {
  this_month: "This Month",
  this_quarter: "This Quarter",
  this_year: "This Year",
  all: "All Time",
};

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)] mb-1">{label}</p>
      <p className={`text-[28px] font-bold tabular-nums leading-tight ${accent ?? ""}`}>{value}</p>
      {sub && <p className="mt-1 text-[12px] text-[var(--secondary)]">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revenue Bars (simple div-based chart)
// ---------------------------------------------------------------------------

function RevenueBars({ data }: { data: MonthlyData[] }) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.invoiced, d.collected)), 1);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-[13px] text-[var(--secondary)]">
        No invoice data for this period
      </div>
    );
  }

  return (
    <div className="flex items-end gap-1 h-[200px]">
      {data.map((d) => {
        const invH = (d.invoiced / maxVal) * 100;
        const colH = (d.collected / maxVal) * 100;
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1 min-w-0">
            <div className="w-full flex gap-0.5 items-end h-[170px]">
              <div
                className="flex-1 rounded-t-sm bg-[var(--accent)]/20 transition-all duration-500"
                style={{ height: `${Math.max(invH, 2)}%` }}
                title={`Invoiced: $${fmt(d.invoiced)}`}
              />
              <div
                className="flex-1 rounded-t-sm bg-[var(--accent)] transition-all duration-500"
                style={{ height: `${Math.max(colH, 2)}%` }}
                title={`Collected: $${fmt(d.collected)}`}
              />
            </div>
            <span className="text-[9px] text-[var(--secondary)] tabular-nums truncate w-full text-center">
              {monthLabel(d.month)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cost Breakdown Bar (horizontal stacked)
// ---------------------------------------------------------------------------

function CostBreakdown({ overhead }: { overhead: Overhead }) {
  const total = overhead.totalLabor + overhead.totalMaterials + overhead.totalSubs;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-[13px] text-[var(--secondary)]">
        No cost data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="flex h-8 rounded-full overflow-hidden">
        {overhead.laborPct > 0 && (
          <div
            className="bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white transition-all"
            style={{ width: `${overhead.laborPct}%` }}
          >
            {overhead.laborPct > 8 ? `${overhead.laborPct}%` : ""}
          </div>
        )}
        {overhead.materialsPct > 0 && (
          <div
            className="bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white transition-all"
            style={{ width: `${overhead.materialsPct}%` }}
          >
            {overhead.materialsPct > 8 ? `${overhead.materialsPct}%` : ""}
          </div>
        )}
        {overhead.subsPct > 0 && (
          <div
            className="bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white transition-all"
            style={{ width: `${overhead.subsPct}%` }}
          >
            {overhead.subsPct > 8 ? `${overhead.subsPct}%` : ""}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-6 text-[12px]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-[var(--secondary)]">Labor</span>
          <span className="font-semibold tabular-nums">${fmtCompact(overhead.totalLabor)}</span>
          <span className="text-[var(--secondary)]">({overhead.laborPct}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-[var(--secondary)]">Materials</span>
          <span className="font-semibold tabular-nums">${fmtCompact(overhead.totalMaterials)}</span>
          <span className="text-[var(--secondary)]">({overhead.materialsPct}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-[var(--secondary)]">Subs</span>
          <span className="font-semibold tabular-nums">${fmtCompact(overhead.totalSubs)}</span>
          <span className="text-[var(--secondary)]">({overhead.subsPct}%)</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function FinancialReports() {
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("this_year");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/financial?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch financial report");
      const data = await res.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Sort jobs by margin (worst first)
  const sortedJobs = useMemo(() => {
    if (!report?.byJob) return [];
    return [...report.byJob].sort((a, b) => a.marginPct - b.marginPct);
  }, [report]);

  // ── Loading / Error ──
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--sep)] border-t-[var(--accent)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <p className="text-[15px] font-semibold mb-1 text-red-400">Error loading reports</p>
          <p className="text-[13px] text-[var(--secondary)]">{error}</p>
          <button onClick={fetchReport} className="mt-3 text-[13px] text-[var(--accent)] hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const { summary, cashFlow, overhead } = report;

  return (
    <div className="h-full overflow-y-auto px-6 py-6 space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold">Financial Overview</h2>
        <div className="flex items-center rounded-lg bg-[var(--fill)] p-0.5">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors ${
                period === p
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--secondary)] hover:text-[var(--text)]"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Revenue"
          value={`$${fmtCompact(summary.totalEstimated)}`}
          sub={`${summary.jobCount} jobs`}
        />
        <StatCard
          label="Total Profit"
          value={`$${fmtCompact(summary.totalProfit)}`}
          accent={summary.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}
        />
        <StatCard
          label="Avg Margin"
          value={`${summary.avgMarginPct}%`}
          accent={
            summary.avgMarginPct >= 20
              ? "text-emerald-400"
              : summary.avgMarginPct >= 10
              ? "text-amber-400"
              : "text-red-400"
          }
        />
        <StatCard label="Jobs" value={String(summary.jobCount)} />
      </div>

      {/* Revenue by Month */}
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[14px] font-semibold">Revenue by Month</h3>
          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[var(--accent)]/20" />
              <span className="text-[var(--secondary)]">Invoiced</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[var(--accent)]" />
              <span className="text-[var(--secondary)]">Collected</span>
            </div>
          </div>
        </div>
        <RevenueBars data={cashFlow.monthlyData} />
      </div>

      {/* Job Profitability Table */}
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--sep)]">
          <h3 className="text-[14px] font-semibold">Job Profitability</h3>
          <p className="text-[11px] text-[var(--secondary)] mt-0.5">Sorted by margin (worst first)</p>
        </div>
        {sortedJobs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-[13px] text-[var(--secondary)]">
            No job data for this period
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--secondary)] border-b border-[var(--sep)]">
                  <th className="px-5 py-3">Estimate</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3 text-right">Estimated</th>
                  <th className="px-3 py-3 text-right">Actual</th>
                  <th className="px-3 py-3 text-right">Profit</th>
                  <th className="px-5 py-3 text-right">Margin</th>
                </tr>
              </thead>
              <tbody>
                {sortedJobs.map((job) => {
                  const marginColor =
                    job.marginPct >= 20
                      ? "text-emerald-400"
                      : job.marginPct >= 10
                      ? "text-amber-400"
                      : "text-red-400";
                  const rowBg =
                    job.marginPct >= 20
                      ? "hover:bg-emerald-500/5"
                      : job.marginPct >= 10
                      ? "hover:bg-amber-500/5"
                      : "hover:bg-red-500/5";

                  return (
                    <tr
                      key={job.estimateId}
                      className={`border-b border-[var(--sep)] last:border-0 transition-colors ${rowBg}`}
                    >
                      <td className="px-5 py-3 font-medium">{job.estimateNumber}</td>
                      <td className="px-3 py-3">{job.clientName}</td>
                      <td className="px-3 py-3 text-[var(--secondary)]">
                        {PROJECT_TYPE_LABELS[job.projectType] ?? job.projectType}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">${fmt(job.estimated)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">${fmt(job.actual)}</td>
                      <td className={`px-3 py-3 text-right tabular-nums font-medium ${job.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {job.profit >= 0 ? "+" : ""}${fmt(job.profit)}
                      </td>
                      <td className={`px-5 py-3 text-right tabular-nums font-bold ${marginColor}`}>
                        {job.marginPct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cost Breakdown */}
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-5 shadow-[var(--shadow-card)]">
        <h3 className="text-[14px] font-semibold mb-4">Cost Breakdown</h3>
        <CostBreakdown overhead={overhead} />
      </div>
    </div>
  );
}
