"use client";

import { useEstimates } from "../lib/store";

export function AnalyticsPage() {
  const { data: estimates } = useEstimates();

  const accepted = estimates.filter((e) => e.status === "accepted");
  const declined = estimates.filter((e) => e.status === "declined");
  const sent = estimates.filter((e) => ["sent", "accepted", "declined"].includes(e.status));
  const winRate = sent.length > 0 ? (accepted.length / sent.length) * 100 : 0;
  const avgMargin = estimates.length
    ? estimates.reduce((s, e) => s + Number(e.gross_margin_pct ?? 0), 0) / estimates.length : 0;
  const totalRevenue = accepted.reduce((s, e) => s + Number(e.grand_total), 0);

  const byType: Record<string, { count: number; total: number }> = {};
  for (const e of estimates) {
    if (!byType[e.project_type]) byType[e.project_type] = { count: 0, total: 0 };
    byType[e.project_type]!.count++;
    byType[e.project_type]!.total += Number(e.grand_total);
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="px-8 pt-6 pb-1">
        <h1 className="text-[24px] font-bold tracking-tight">Analytics</h1>
        <p className="text-[12px] text-[var(--secondary)]">Performance metrics and trends</p>
      </header>

      <div className="grid grid-cols-4 gap-3 px-8 py-4">
        <StatCard label="Total Revenue" value={totalRevenue > 0 ? `$${(totalRevenue / 1000).toFixed(0)}K` : "$0"} />
        <StatCard label="Win Rate" value={winRate > 0 ? `${winRate.toFixed(0)}%` : "—"} />
        <StatCard label="Avg Margin" value={avgMargin > 0 ? `${avgMargin.toFixed(1)}%` : "—"} />
        <StatCard label="Total Estimates" value={estimates.length.toString()} />
      </div>

      <div className="grid grid-cols-2 gap-4 px-8 pb-6">
        {/* By Project Type */}
        <div>
          <p className="mb-2 text-[13px] font-semibold">By Project Type</p>
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)]">
            {Object.keys(byType).length === 0 ? (
              <p className="p-4 text-center text-[13px] text-[var(--secondary)]">No data yet</p>
            ) : (
              Object.entries(byType).sort((a, b) => b[1].total - a[1].total).map(([type, data], i, arr) => (
                <div key={type} className={`flex items-center justify-between px-4 py-3 ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}>
                  <div>
                    <p className="text-[13px] font-medium">{type}</p>
                    <p className="text-[11px] text-[var(--secondary)]">{data.count} estimate{data.count !== 1 ? "s" : ""}</p>
                  </div>
                  <p className="text-[13px] font-semibold">${data.total.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div>
          <p className="mb-2 text-[13px] font-semibold">Conversion Funnel</p>
          <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-3">
            <FunnelRow label="Created" count={estimates.length} total={estimates.length} />
            <FunnelRow label="Sent" count={sent.length} total={estimates.length} />
            <FunnelRow label="Accepted" count={accepted.length} total={estimates.length} />
            <FunnelRow label="Declined" count={declined.length} total={estimates.length} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">{label}</p>
      <p className="mt-1 text-[22px] font-bold tracking-tight">{value}</p>
    </div>
  );
}

function FunnelRow({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <p className="text-[12px] text-[var(--secondary)]">{label}</p>
        <p className="text-[12px] font-medium">{count}{total > 0 ? ` (${pct.toFixed(0)}%)` : ""}</p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--gray5)]">
        <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
