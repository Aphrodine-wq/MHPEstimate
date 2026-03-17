import { useMemo } from "react";
import { useEstimates, useClients } from "../lib/store";

const TIER_MAP: Record<string, string> = {
  budget: "Budget", good: "Budget",
  midrange: "Midrange", mid: "Midrange", better: "Midrange",
  high_end: "High End", premium: "High End", best: "High End",
};

export function AnalyticsPage() {
  const { data: estimates } = useEstimates();
  const { data: clients } = useClients();

  const analytics = useMemo(() => {
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

    const byType: Record<string, { count: number; total: number }> = {};
    for (const e of estimates) {
      if (!byType[e.project_type]) byType[e.project_type] = { count: 0, total: 0 };
      byType[e.project_type]!.count++;
      byType[e.project_type]!.total += Number(e.grand_total);
    }

    const now = new Date();
    const monthlyData: { label: string; count: number; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const monthEstimates = estimates.filter((e) => {
        const cd = new Date(e.created_at);
        return cd.getFullYear() === year && cd.getMonth() === month;
      });
      monthlyData.push({
        label,
        count: monthEstimates.length,
        value: monthEstimates.reduce((s, e) => s + Number(e.grand_total), 0),
      });
    }
    const maxMonthlyCount = Math.max(...monthlyData.map((m) => m.count), 1);
    const maxMonthlyValue = Math.max(...monthlyData.map((m) => m.value), 1);

    const marginByType: Record<string, { count: number; totalMargin: number; totalRevenue: number }> = {};
    for (const e of estimates) {
      if (!marginByType[e.project_type]) marginByType[e.project_type] = { count: 0, totalMargin: 0, totalRevenue: 0 };
      marginByType[e.project_type]!.count++;
      marginByType[e.project_type]!.totalMargin += Number(e.gross_margin_pct ?? 0);
      marginByType[e.project_type]!.totalRevenue += Number(e.grand_total);
    }

    const clientEstimates: Record<string, { name: string; count: number; total: number }> = {};
    for (const e of estimates) {
      if (!e.client_id) continue;
      if (!clientEstimates[e.client_id]) {
        const client = clients.find((c) => c.id === e.client_id);
        clientEstimates[e.client_id] = { name: client?.full_name ?? "Unknown", count: 0, total: 0 };
      }
      clientEstimates[e.client_id]!.count++;
      clientEstimates[e.client_id]!.total += Number(e.grand_total);
    }
    const topClients = Object.values(clientEstimates)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    const draftEstimates = estimates.filter((e) => e.status === "draft");
    const sentEstimates = estimates.filter((e) => e.sent_at);
    const acceptedEstimates = estimates.filter((e) => e.accepted_at);
    const declinedEstimates = estimates.filter((e) => e.declined_at);

    const DAY_MS = 1000 * 60 * 60 * 24;

    const avgDaysInDraft = draftEstimates.length > 0
      ? draftEstimates.reduce((s, e) => {
          const created = new Date(e.created_at).getTime();
          const end = e.sent_at ? new Date(e.sent_at).getTime() : Date.now();
          return s + (end - created) / DAY_MS;
        }, 0) / draftEstimates.length
      : 0;

    const avgDaysToSent = sentEstimates.length > 0
      ? sentEstimates.reduce((s, e) => {
          return s + (new Date(e.sent_at!).getTime() - new Date(e.created_at).getTime()) / DAY_MS;
        }, 0) / sentEstimates.length
      : 0;

    const avgDaysToAccepted = acceptedEstimates.length > 0
      ? acceptedEstimates.reduce((s, e) => {
          const sentTime = e.sent_at ? new Date(e.sent_at).getTime() : new Date(e.created_at).getTime();
          return s + (new Date(e.accepted_at!).getTime() - sentTime) / DAY_MS;
        }, 0) / acceptedEstimates.length
      : 0;

    const avgDaysToDeclined = declinedEstimates.length > 0
      ? declinedEstimates.reduce((s, e) => {
          const sentTime = e.sent_at ? new Date(e.sent_at).getTime() : new Date(e.created_at).getTime();
          return s + (new Date(e.declined_at!).getTime() - sentTime) / DAY_MS;
        }, 0) / declinedEstimates.length
      : 0;

    const revenueByTier: Record<string, number> = { Budget: 0, Midrange: 0, "High End": 0 };
    for (const e of accepted) {
      const tierLabel = TIER_MAP[e.tier] ?? "Midrange";
      revenueByTier[tierLabel] = (revenueByTier[tierLabel] ?? 0) + Number(e.grand_total);
    }

    return {
      accepted, declined, sent, winRate, avgMargin, totalRevenue, pipelineValue,
      byType, monthlyData, maxMonthlyCount, maxMonthlyValue, marginByType, topClients,
      draftEstimates, sentEstimates, acceptedEstimates, declinedEstimates,
      avgDaysInDraft, avgDaysToSent, avgDaysToAccepted, avgDaysToDeclined,
      revenueByTier,
    };
  }, [estimates, clients]);

  const {
    accepted, declined, sent, winRate, avgMargin, totalRevenue, pipelineValue,
    byType, monthlyData, maxMonthlyCount, maxMonthlyValue, marginByType, topClients,
    draftEstimates, sentEstimates, acceptedEstimates, declinedEstimates,
    avgDaysInDraft, avgDaysToSent, avgDaysToAccepted, avgDaysToDeclined,
    revenueByTier,
  } = analytics;

  const byTypeMax = Math.max(...Object.values(byType).map((d) => d.total), 1);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="px-8 pt-6 pb-4 slide-up">
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-4 w-1 rounded-full bg-[var(--accent)]" />
              <p className="caps">Performance metrics and trends</p>
            </div>
            <h1 className="text-[20px] font-extrabold tight">Business Overview</h1>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-3 px-8 py-4 slide-up stagger-1">
        <StatCard label="Pipeline Value" value={pipelineValue > 0 ? `$${(pipelineValue / 1000).toFixed(0)}K` : "$0"} sub={`${estimates.filter((e) => ["draft", "in_review", "sent"].includes(e.status)).length} active`} />
        <StatCard label="Total Revenue" value={totalRevenue > 0 ? `$${(totalRevenue / 1000).toFixed(0)}K` : "$0"} sub={`${accepted.length} accepted`} />
        <StatCard label="Win Rate" value={winRate > 0 ? `${winRate.toFixed(0)}%` : "\u2014"} sub={sent.length > 0 ? `${accepted.length}W / ${declined.length}L of ${sent.length} sent` : "No sent estimates"} accentTop={sent.length > 0 ? (winRate >= 60 ? "#22c55e" : winRate < 40 ? "#ef4444" : undefined) : undefined} />
        <StatCard label="Avg Margin" value={avgMargin > 0 ? `${avgMargin.toFixed(1)}%` : "\u2014"} sub="Target 35-42%" />
      </div>

      <div className="grid grid-cols-2 gap-4 px-8 pb-6 slide-up stagger-2">
        {/* By Project Type */}
        <div>
          <p className="caps mb-2">By Project Type</p>
          <div className="surface-elevated">
            {Object.keys(byType).length === 0 ? (
              <p className="p-4 text-center text-[13px] text-[var(--secondary)]">No data yet</p>
            ) : (
              Object.entries(byType).sort((a, b) => b[1].total - a[1].total).map(([type, data], i, arr) => (
                <div key={type} className={`px-4 py-3 ${i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-[13px] font-medium">{type}</p>
                      <p className="text-[11px] text-[var(--secondary)]">{data.count} estimate{data.count !== 1 ? "s" : ""}</p>
                    </div>
                    <p className="text-[13px] font-semibold tabular">${data.total.toLocaleString()}</p>
                  </div>
                  <div className="h-[6px] overflow-hidden rounded-full bg-[var(--gray5)]">
                    <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${(data.total / byTypeMax) * 100}%`, minWidth: data.total > 0 ? "6px" : "0" }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div>
          <p className="caps mb-2">Conversion Funnel</p>
          <div className="surface-elevated p-4 space-y-3">
            <FunnelRow label="Created" count={estimates.length} total={estimates.length} />
            <FunnelRow label="Sent" count={sent.length} total={estimates.length} />
            <FunnelRow label="Accepted" count={accepted.length} total={estimates.length} color="#22c55e" />
            <FunnelRow label="Declined" count={declined.length} total={estimates.length} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="grid grid-cols-2 gap-4 px-8 pb-6 slide-up stagger-3">
        <div>
          <p className="caps mb-2">Monthly Estimates</p>
          <div className="surface-elevated p-4 space-y-2">
            {monthlyData.map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <p className="w-14 shrink-0 text-right text-[11px] text-[var(--secondary)]">{m.label}</p>
                <div className="flex-1 h-[8px] rounded-full bg-[var(--bg)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all"
                    style={{ width: `${(m.count / maxMonthlyCount) * 100}%`, minWidth: m.count > 0 ? "8px" : "0" }}
                  />
                </div>
                <p className="w-6 shrink-0 text-[13px] font-medium tabular">{m.count}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="caps mb-2">Monthly Value</p>
          <div className="surface-elevated p-4 space-y-2">
            {monthlyData.map((m) => (
              <div key={m.label} className="flex items-center gap-3">
                <p className="w-14 shrink-0 text-right text-[11px] text-[var(--secondary)]">{m.label}</p>
                <div className="flex-1 h-[8px] rounded-full bg-[var(--bg)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#22c55e] transition-all"
                    style={{ width: `${(m.value / maxMonthlyValue) * 100}%`, minWidth: m.value > 0 ? "8px" : "0" }}
                  />
                </div>
                <p className="w-16 shrink-0 text-right text-[13px] font-medium tabular">{m.value > 0 ? `$${(m.value / 1000).toFixed(0)}K` : "$0"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Margin Analysis by Project Type */}
      <div className="px-8 pb-6 slide-up stagger-4">
        <p className="caps mb-2">Margin Analysis by Project Type</p>
        <div className="surface-elevated overflow-x-auto">
          {Object.keys(marginByType).length === 0 ? (
            <p className="p-4 text-center text-[13px] text-[var(--secondary)]">No data yet</p>
          ) : (
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-[var(--sep)]">
                  <th className="caps px-4 py-2.5 text-left">Project Type</th>
                  <th className="caps px-4 py-2.5 text-right">Count</th>
                  <th className="caps px-4 py-2.5 text-right">Avg Margin</th>
                  <th className="caps px-4 py-2.5 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(marginByType)
                  .sort((a, b) => b[1].totalRevenue - a[1].totalRevenue)
                  .map(([type, data], i, arr) => {
                    const avg = data.count > 0 ? data.totalMargin / data.count : 0;
                    const color = avg >= 35 ? "#22c55e" : avg >= 25 ? "#f59e0b" : "#ef4444";
                    return (
                      <tr key={type} className={i < arr.length - 1 ? "border-b border-[var(--sep)]" : ""}>
                        <td className="px-4 py-2.5 text-[13px] font-medium">{type}</td>
                        <td className="px-4 py-2.5 text-right text-[13px] tabular">{data.count}</td>
                        <td className="px-4 py-2.5 text-right text-[13px] font-semibold tabular" style={{ color }}>
                          {avg.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13px] font-medium tabular">${data.totalRevenue.toLocaleString()}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 px-8 pb-6 slide-up stagger-5">
        {/* Top Clients */}
        <div>
          <p className="caps mb-2">Top Clients</p>
          <div className="surface-elevated">
            {topClients.length === 0 ? (
              <p className="p-4 text-center text-[13px] text-[var(--secondary)]">No client data yet</p>
            ) : (
              topClients.map((c, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-3 ${i < topClients.length - 1 ? "border-b border-[var(--sep)]" : ""}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-[13px] font-medium">{c.name}</p>
                      <p className="text-[11px] text-[var(--secondary)]">{c.count} estimate{c.count !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <p className="text-[13px] font-semibold tabular">${c.total.toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Estimate Age Analysis */}
        <div>
          <p className="caps mb-2">Estimate Age Analysis</p>
          <div className="surface-elevated p-4 space-y-0">
            <AgeRow label="Avg days in Draft" value={avgDaysInDraft} count={draftEstimates.length} />
            <AgeRow label="Avg days Draft to Sent" value={avgDaysToSent} count={sentEstimates.length} />
            <AgeRow label="Avg days Sent to Accepted" value={avgDaysToAccepted} count={acceptedEstimates.length} />
            <AgeRow label="Avg days Sent to Declined" value={avgDaysToDeclined} count={declinedEstimates.length} />
          </div>
        </div>
      </div>

      {/* Revenue by Tier */}
      <div className="px-8 pb-8 slide-up stagger-5">
        <p className="caps mb-2">Revenue by Tier</p>
        <div className="grid grid-cols-3 gap-3">
          {(["Budget", "Midrange", "High End"] as const).map((tier) => (
            <div key={tier} className="surface-elevated p-5 card-hover">
              <p className="caps">{tier}</p>
              <p className="mt-1 text-[22px] font-bold tight tabular">
                {(revenueByTier[tier] ?? 0) > 0 ? `$${((revenueByTier[tier] ?? 0) / 1000).toFixed(1)}K` : "$0"}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--secondary)]">
                {accepted.filter((e) => (TIER_MAP[e.tier] ?? "Midrange") === tier).length} accepted estimate{accepted.filter((e) => (TIER_MAP[e.tier] ?? "Midrange") === tier).length !== 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accentTop }: { label: string; value: string; sub?: string; accentTop?: string }) {
  return (
    <div className={`surface-elevated p-5 card-hover ${accentTop ? "border-t-2" : ""}`} style={accentTop ? { borderTopColor: accentTop } : undefined}>
      <p className="caps">{label}</p>
      <p className="mt-1 text-[22px] font-bold tight tabular">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[var(--secondary)]">{sub}</p>}
    </div>
  );
}

function FunnelRow({ label, count, total, color }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <p className="text-[12px] text-[var(--secondary)]">{label}</p>
        <p className="text-[12px] font-medium tabular">{count}{total > 0 ? ` (${pct.toFixed(0)}%)` : ""}</p>
      </div>
      <div className="h-[6px] overflow-hidden rounded-full bg-[var(--gray5)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, minWidth: count > 0 ? "6px" : "0", backgroundColor: color ?? "var(--accent)" }} />
      </div>
    </div>
  );
}

function AgeRow({ label, value, count }: { label: string; value: number; count: number }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--sep)] last:border-b-0 py-3 first:pt-0 last:pb-0">
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[11px] text-[var(--secondary)]">{count} estimate{count !== 1 ? "s" : ""}</p>
      </div>
      <p className="text-[13px] font-semibold tabular">
        {count > 0 ? `${value.toFixed(1)} days` : "\u2014"}
      </p>
    </div>
  );
}
