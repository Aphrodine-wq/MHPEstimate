import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { supabase } from "../../lib/supabase";

const CHART_COLORS = ["#cc0000", "#e34444", "#ff6b6b", "#ff9a9a", "#ffbaba", "#ffd5d5"];
const BRAND_RED = "#cc0000";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";

export function AnalyticsCharts() {
  const [revenueByMonth, setRevenueByMonth] = useState<{ month: string; revenue: number }[]>([]);
  const [winRateByMonth, setWinRateByMonth] = useState<{ month: string; winRate: number }[]>([]);
  const [revenueByType, setRevenueByType] = useState<{ name: string; value: number }[]>([]);
  const [marginTrend, setMarginTrend] = useState<{ month: string; margin: number }[]>([]);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setChartsLoading(false); return; }

    async function fetchChartData() {
      setChartsLoading(true);

      const { data: acceptedRaw } = await supabase!
        .from("estimates")
        .select("grand_total, created_at")
        .eq("status", "accepted")
        .order("created_at", { ascending: true });

      const { data: allRaw } = await supabase!
        .from("estimates")
        .select("status, created_at")
        .in("status", ["sent", "accepted", "declined"])
        .order("created_at", { ascending: true });

      const { data: byTypeRaw } = await supabase!
        .from("estimates")
        .select("project_type, grand_total")
        .eq("status", "accepted");

      const { data: marginRaw } = await supabase!
        .from("estimates")
        .select("gross_margin_pct, created_at")
        .not("gross_margin_pct", "is", null)
        .order("created_at", { ascending: true });

      const now = new Date();
      const monthBuckets: Record<string, { label: string; revenue: number; accepted: number; sent: number; totalMargin: number; marginCount: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        monthBuckets[key] = { label, revenue: 0, accepted: 0, sent: 0, totalMargin: 0, marginCount: 0 };
      }

      for (const row of acceptedRaw ?? []) {
        const d = new Date(row.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthBuckets[key]) {
          monthBuckets[key]!.revenue += Number(row.grand_total ?? 0);
        }
      }

      for (const row of allRaw ?? []) {
        const d = new Date(row.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthBuckets[key]) {
          monthBuckets[key]!.sent++;
          if (row.status === "accepted") monthBuckets[key]!.accepted++;
        }
      }

      for (const row of marginRaw ?? []) {
        const d = new Date(row.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthBuckets[key]) {
          monthBuckets[key]!.totalMargin += Number(row.gross_margin_pct ?? 0);
          monthBuckets[key]!.marginCount++;
        }
      }

      setRevenueByMonth(Object.values(monthBuckets).map((m) => ({ month: m.label, revenue: Math.round(m.revenue) })));
      setWinRateByMonth(Object.values(monthBuckets).map((m) => ({
        month: m.label,
        winRate: m.sent > 0 ? Math.round((m.accepted / m.sent) * 100) : 0,
      })));
      setMarginTrend(Object.values(monthBuckets).map((m) => ({
        month: m.label,
        margin: m.marginCount > 0 ? parseFloat((m.totalMargin / m.marginCount).toFixed(1)) : 0,
      })));

      const typeMap: Record<string, number> = {};
      for (const row of byTypeRaw ?? []) {
        const t = row.project_type ?? "Other";
        typeMap[t] = (typeMap[t] ?? 0) + Number(row.grand_total ?? 0);
      }
      setRevenueByType(
        Object.entries(typeMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([name, value]) => ({ name, value: Math.round(value) }))
      );

      setChartsLoading(false);
    }

    fetchChartData();
  }, []);

  return (
    <>
      <div className="px-4 md:px-8 pb-2">
        <p className="mb-1 text-[15px] font-bold tracking-tight">Revenue Charts</p>
        <p className="text-[12px] text-[var(--secondary)]">Live data from your estimates database</p>
      </div>

      {chartsLoading ? (
        <div className="flex items-center justify-center py-16 px-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--sep)] border-t-[var(--accent)]" />
        </div>
      ) : (
        <>
          {/* Row 1: Revenue by Month + Win Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-8 pb-6">
            <div>
              <p className="mb-2 text-[13px] font-semibold">Revenue by Month (Accepted)</p>
              <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4">
                {revenueByMonth.every((m) => m.revenue === 0) ? (
                  <p className="py-12 text-center text-[13px] text-[var(--secondary)]">No accepted estimates yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={revenueByMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--secondary)" }} />
                      <YAxis tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: "var(--secondary)" }} />
                      <Tooltip
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--sep)", borderRadius: "8px", fontSize: "12px" }}
                        labelStyle={{ color: "var(--foreground)" }}
                      />
                      <Bar dataKey="revenue" fill={BRAND_RED} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold">Win Rate by Month (%)</p>
              <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4">
                {winRateByMonth.every((m) => m.winRate === 0) ? (
                  <p className="py-12 text-center text-[13px] text-[var(--secondary)]">No sent estimates yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={winRateByMonth} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--secondary)" }} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "var(--secondary)" }} />
                      <Tooltip
                        formatter={(value) => [`${Number(value)}%`, "Win Rate"]}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--sep)", borderRadius: "8px", fontSize: "12px" }}
                        labelStyle={{ color: "var(--foreground)" }}
                      />
                      <Line type="monotone" dataKey="winRate" stroke={GREEN} strokeWidth={2} dot={{ r: 4, fill: GREEN }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Revenue by Project Type + Margin Trend */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-8 pb-8">
            <div>
              <p className="mb-2 text-[13px] font-semibold">Revenue by Project Type (Accepted)</p>
              <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4">
                {revenueByType.length === 0 ? (
                  <p className="py-12 text-center text-[13px] text-[var(--secondary)]">No accepted estimates yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={revenueByType}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {revenueByType.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, "Revenue"]}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--sep)", borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold">Avg Margin Trend by Month (%)</p>
              <div className="rounded-xl border border-[var(--sep)] bg-[var(--card)] p-4">
                {marginTrend.every((m) => m.margin === 0) ? (
                  <p className="py-12 text-center text-[13px] text-[var(--secondary)]">No margin data yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={marginTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--sep)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--secondary)" }} />
                      <YAxis domain={[0, 60]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "var(--secondary)" }} />
                      <Tooltip
                        formatter={(value) => [`${Number(value)}%`, "Avg Margin"]}
                        contentStyle={{ background: "var(--card)", border: "1px solid var(--sep)", borderRadius: "8px", fontSize: "12px" }}
                        labelStyle={{ color: "var(--foreground)" }}
                      />
                      <Line type="monotone" dataKey="margin" stroke={AMBER} strokeWidth={2} dot={{ r: 4, fill: AMBER }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
