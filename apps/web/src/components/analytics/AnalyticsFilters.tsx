import { useMemo } from "react";
import type { Estimate, Client } from "@proestimate/shared/types";

/** By Project Type breakdown + margin analysis data. */
export interface ProjectTypeAnalysis {
  byType: Record<string, { count: number; total: number }>;
  byTypeMax: number;
  marginByType: Record<string, { count: number; totalMargin: number; totalRevenue: number }>;
}

export function useProjectTypeAnalysis(estimates: Estimate[]): ProjectTypeAnalysis {
  return useMemo(() => {
    const byType: Record<string, { count: number; total: number }> = {};
    const marginByType: Record<string, { count: number; totalMargin: number; totalRevenue: number }> = {};
    for (const e of estimates) {
      if (!byType[e.project_type]) byType[e.project_type] = { count: 0, total: 0 };
      byType[e.project_type]!.count++;
      byType[e.project_type]!.total += Number(e.grand_total);

      if (!marginByType[e.project_type]) marginByType[e.project_type] = { count: 0, totalMargin: 0, totalRevenue: 0 };
      marginByType[e.project_type]!.count++;
      marginByType[e.project_type]!.totalMargin += Number(e.gross_margin_pct ?? 0);
      marginByType[e.project_type]!.totalRevenue += Number(e.grand_total);
    }
    const byTypeMax = Math.max(...Object.values(byType).map((d) => d.total), 1);
    return { byType, byTypeMax, marginByType };
  }, [estimates]);
}

/** Monthly trends data. */
export interface MonthlyTrend {
  label: string;
  count: number;
  value: number;
}

export interface MonthlyTrends {
  monthlyData: MonthlyTrend[];
  maxMonthlyCount: number;
  maxMonthlyValue: number;
}

export function useMonthlyTrends(estimates: Estimate[]): MonthlyTrends {
  return useMemo(() => {
    const now = new Date();
    const monthlyData: MonthlyTrend[] = [];
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
    return {
      monthlyData,
      maxMonthlyCount: Math.max(...monthlyData.map((m) => m.count), 1),
      maxMonthlyValue: Math.max(...monthlyData.map((m) => m.value), 1),
    };
  }, [estimates]);
}

/** Top clients ranking. */
export interface TopClient {
  name: string;
  count: number;
  total: number;
}

export function useTopClients(estimates: Estimate[], clients: Client[]): TopClient[] {
  return useMemo(() => {
    const clientEstimates: Record<string, TopClient> = {};
    for (const e of estimates) {
      if (!e.client_id) continue;
      if (!clientEstimates[e.client_id]) {
        const client = clients.find((c) => c.id === e.client_id);
        clientEstimates[e.client_id] = { name: client?.full_name ?? "Unknown", count: 0, total: 0 };
      }
      clientEstimates[e.client_id]!.count++;
      clientEstimates[e.client_id]!.total += Number(e.grand_total);
    }
    return Object.values(clientEstimates).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [estimates, clients]);
}

/** Estimate age / lifecycle analysis. */
export interface AgeAnalysis {
  draftEstimates: Estimate[];
  sentEstimates: Estimate[];
  acceptedEstimates: Estimate[];
  declinedEstimates: Estimate[];
  avgDaysInDraft: number;
  avgDaysToSent: number;
  avgDaysToAccepted: number;
  avgDaysToDeclined: number;
}

export function useAgeAnalysis(estimates: Estimate[]): AgeAnalysis {
  return useMemo(() => {
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

    return { draftEstimates, sentEstimates, acceptedEstimates, declinedEstimates, avgDaysInDraft, avgDaysToSent, avgDaysToAccepted, avgDaysToDeclined };
  }, [estimates]);
}

/* ---- Presentational sub-components for the detail panels ---- */

export function ProjectTypeBreakdown({ byType, byTypeMax }: { byType: Record<string, { count: number; total: number }>; byTypeMax: number }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold">By Project Type</p>
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)]">
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
                <p className="text-[13px] font-semibold">${data.total.toLocaleString()}</p>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--gray5)]">
                <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${(data.total / byTypeMax) * 100}%`, minWidth: "4px" }} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function ConversionFunnel({ estimates, sent, accepted, declined }: { estimates: Estimate[]; sent: Estimate[]; accepted: Estimate[]; declined: Estimate[] }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold">Conversion Funnel</p>
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-3">
        <FunnelRow label="Created" count={estimates.length} total={estimates.length} />
        <FunnelRow label="Sent" count={sent.length} total={estimates.length} />
        <FunnelRow label="Accepted" count={accepted.length} total={estimates.length} color="#22c55e" />
        <FunnelRow label="Declined" count={declined.length} total={estimates.length} color="#ef4444" />
      </div>
    </div>
  );
}

export function MonthlyTrendsSection({ monthlyData, maxMonthlyCount, maxMonthlyValue }: MonthlyTrends) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-8 pb-6">
      <div>
        <p className="mb-2 text-[13px] font-semibold">Monthly Estimates</p>
        <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-2">
          {monthlyData.map((m) => (
            <div key={m.label} className="flex items-center gap-3">
              <p className="w-14 shrink-0 text-right text-[11px] text-[var(--secondary)]">{m.label}</p>
              <div className="flex-1 h-5 rounded bg-[var(--bg)] overflow-hidden">
                <div
                  className="h-full rounded bg-[var(--accent)] transition-all"
                  style={{ width: `${(m.count / maxMonthlyCount) * 100}%`, minWidth: m.count > 0 ? "8px" : "0" }}
                />
              </div>
              <p className="w-6 shrink-0 text-[13px] font-medium">{m.count}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-[13px] font-semibold">Monthly Value</p>
        <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-2">
          {monthlyData.map((m) => (
            <div key={m.label} className="flex items-center gap-3">
              <p className="w-14 shrink-0 text-right text-[11px] text-[var(--secondary)]">{m.label}</p>
              <div className="flex-1 h-5 rounded bg-[var(--bg)] overflow-hidden">
                <div
                  className="h-full rounded bg-[#22c55e] transition-all"
                  style={{ width: `${(m.value / maxMonthlyValue) * 100}%`, minWidth: m.value > 0 ? "8px" : "0" }}
                />
              </div>
              <p className="w-16 shrink-0 text-right text-[13px] font-medium">{m.value > 0 ? `$${(m.value / 1000).toFixed(0)}K` : "$0"}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MarginAnalysisTable({ marginByType }: { marginByType: Record<string, { count: number; totalMargin: number; totalRevenue: number }> }) {
  return (
    <div className="px-4 md:px-8 pb-6">
      <p className="mb-2 text-[13px] font-semibold">Margin Analysis by Project Type</p>
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] overflow-x-auto">
        {Object.keys(marginByType).length === 0 ? (
          <p className="p-4 text-center text-[13px] text-[var(--secondary)]">No data yet</p>
        ) : (
          <table className="w-full min-w-[400px]">
            <thead>
              <tr className="border-b border-[var(--sep)]">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Project Type</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Count</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Avg Margin</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wide text-[var(--secondary)]">Total Revenue</th>
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
                      <td className="px-4 py-2.5 text-right text-[13px]">{data.count}</td>
                      <td className="px-4 py-2.5 text-right text-[13px] font-semibold" style={{ color }}>
                        {avg.toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 text-right text-[13px] font-medium">${data.totalRevenue.toLocaleString()}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function TopClientsSection({ topClients }: { topClients: TopClient[] }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold">Top Clients</p>
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)]">
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
              <p className="text-[13px] font-semibold">${c.total.toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function EstimateAgeSection({ ageAnalysis }: { ageAnalysis: AgeAnalysis }) {
  const { draftEstimates, sentEstimates, acceptedEstimates, declinedEstimates, avgDaysInDraft, avgDaysToSent, avgDaysToAccepted, avgDaysToDeclined } = ageAnalysis;
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold">Estimate Age Analysis</p>
      <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4 space-y-3">
        <AgeRow label="Avg days in Draft" value={avgDaysInDraft} count={draftEstimates.length} />
        <AgeRow label="Avg days Draft to Sent" value={avgDaysToSent} count={sentEstimates.length} />
        <AgeRow label="Avg days Sent to Accepted" value={avgDaysToAccepted} count={acceptedEstimates.length} />
        <AgeRow label="Avg days Sent to Declined" value={avgDaysToDeclined} count={declinedEstimates.length} />
      </div>
    </div>
  );
}

/* ---- Shared small components ---- */

function FunnelRow({ label, count, total, color }: { label: string; count: number; total: number; color?: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between mb-1">
        <p className="text-[12px] text-[var(--secondary)]">{label}</p>
        <p className="text-[12px] font-medium">{count}{total > 0 ? ` (${pct.toFixed(0)}%)` : ""}</p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--gray5)]">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color ?? "var(--accent)" }} />
      </div>
    </div>
  );
}

function AgeRow({ label, value, count }: { label: string; value: number; count: number }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[13px] font-medium">{label}</p>
        <p className="text-[11px] text-[var(--secondary)]">{count} estimate{count !== 1 ? "s" : ""}</p>
      </div>
      <p className="text-[13px] font-semibold">
        {count > 0 ? `${value.toFixed(1)} days` : "\u2014"}
      </p>
    </div>
  );
}
