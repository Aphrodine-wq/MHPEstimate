import { View, Text, ScrollView, StyleSheet, RefreshControl, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState, useCallback, useMemo } from "react";
import { useEstimates, useClients } from "@/lib/store";
import { TouchableOpacity } from "react-native";
import { colors } from "@/lib/theme";

function fmt(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toLocaleString()}`;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function AnalyticsScreen() {
  const { data: estimates, refresh } = useEstimates();
  const { data: clients } = useClients();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const stats = useMemo(() => {
    const accepted = estimates.filter((e) => e.status === "accepted");
    const declined = estimates.filter((e) => e.status === "declined");
    const sent = estimates.filter((e) => ["sent", "accepted", "declined"].includes(e.status));
    const drafts = estimates.filter((e) => e.status === "draft");

    const winRate = sent.length > 0 ? (accepted.length / sent.length) * 100 : 0;
    const totalRevenue = accepted.reduce((s, e) => s + Number(e.grand_total ?? 0), 0);
    const pipelineValue = estimates
      .filter((e) => ["draft", "in_review", "sent", "approved"].includes(e.status))
      .reduce((s, e) => s + Number(e.grand_total ?? 0), 0);
    const avgMargin = estimates.length
      ? estimates.reduce((s, e) => s + Number(e.gross_margin_pct ?? 0), 0) / estimates.length
      : 0;

    return {
      total: estimates.length, accepted: accepted.length, declined: declined.length,
      sent: sent.length, drafts: drafts.length, winRate, totalRevenue, pipelineValue, avgMargin,
    };
  }, [estimates]);

  // Revenue by project type
  const byProjectType = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; margin: number }> = {};
    estimates.forEach((e) => {
      const pt = e.project_type ?? "Other";
      if (!map[pt]) map[pt] = { count: 0, revenue: 0, margin: 0 };
      map[pt].count++;
      map[pt].revenue += Number(e.grand_total ?? 0);
      map[pt].margin += Number(e.gross_margin_pct ?? 0);
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d, avgMargin: d.count > 0 ? d.margin / d.count : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [estimates]);

  // Monthly trends (last 6 months)
  const monthlyTrends = useMemo(() => {
    const months: { label: string; count: number; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString("en-US", { month: "short" });
      const inMonth = estimates.filter((e) => {
        const ed = new Date(e.created_at);
        return ed.getFullYear() === year && ed.getMonth() === month;
      });
      months.push({ label, count: inMonth.length, value: inMonth.reduce((s, e) => s + Number(e.grand_total ?? 0), 0) });
    }
    return months;
  }, [estimates]);

  // Top clients
  const topClients = useMemo(() => {
    const map: Record<string, { name: string; count: number; revenue: number }> = {};
    estimates.forEach((e) => {
      if (!e.client_id) return;
      if (!map[e.client_id]) {
        const client = clients.find((c) => c.id === e.client_id);
        map[e.client_id] = { name: client?.full_name ?? "Unknown", count: 0, revenue: 0 };
      }
      map[e.client_id].count++;
      map[e.client_id].revenue += Number(e.grand_total ?? 0);
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [estimates, clients]);

  const maxMonthVal = Math.max(...monthlyTrends.map((m) => m.value), 1);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <KPICard label="Total Revenue" value={fmt(stats.totalRevenue)} color={colors.green} />
          <KPICard label="Pipeline" value={fmt(stats.pipelineValue)} color={colors.accent} />
          <KPICard label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} color={stats.winRate >= 50 ? colors.green : colors.orange} />
          <KPICard label="Avg Margin" value={`${stats.avgMargin.toFixed(1)}%`} color={stats.avgMargin >= 35 ? colors.green : colors.orange} />
          <KPICard label="Accepted" value={stats.accepted.toString()} color={colors.green} />
          <KPICard label="Declined" value={stats.declined.toString()} color={colors.red} />
        </View>

        {/* Monthly Trend Chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Monthly Trends (Last 6 Months)</Text>
          <View style={styles.chartContainer}>
            {monthlyTrends.map((m) => (
              <View key={m.label} style={styles.barCol}>
                <Text style={styles.barValue}>{m.count}</Text>
                <View style={[styles.bar, { height: Math.max((m.value / maxMonthVal) * 100, 4) }]} />
                <Text style={styles.barLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* By Project Type */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>By Project Type</Text>
          {byProjectType.length === 0 ? (
            <Text style={styles.emptyText}>No data yet</Text>
          ) : (
            byProjectType.slice(0, 8).map((pt, i) => (
              <View key={pt.name} style={[styles.typeRow, i < byProjectType.length - 1 && styles.borderBottom]}>
                <View style={styles.typeInfo}>
                  <Text style={styles.typeName}>{pt.name}</Text>
                  <Text style={styles.typeMeta}>{pt.count} estimates · {pt.avgMargin.toFixed(0)}% avg margin</Text>
                </View>
                <Text style={styles.typeRevenue}>{fmt(pt.revenue)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Top Clients */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top Clients</Text>
          {topClients.length === 0 ? (
            <Text style={styles.emptyText}>No client data yet</Text>
          ) : (
            topClients.map((cl, i) => (
              <View key={cl.name + i} style={[styles.typeRow, i < topClients.length - 1 && styles.borderBottom]}>
                <View style={styles.typeInfo}>
                  <Text style={styles.typeName}>{cl.name}</Text>
                  <Text style={styles.typeMeta}>{cl.count} estimates</Text>
                </View>
                <Text style={styles.typeRevenue}>{fmt(cl.revenue)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Estimate Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estimate Breakdown</Text>
          <StatusRow label="Total Estimates" value={stats.total} />
          <StatusRow label="Drafts" value={stats.drafts} color={colors.secondary} />
          <StatusRow label="Sent" value={stats.sent} color={colors.accent} />
          <StatusRow label="Accepted" value={stats.accepted} color={colors.green} />
          <StatusRow label="Declined" value={stats.declined} color={colors.red} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function KPICard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

function StatusRow({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.sep,
  },
  backButton: { paddingVertical: 4, width: 60 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "500" },
  headerTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  scrollContent: { padding: 16, paddingBottom: 48 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  kpiCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.sep,
    padding: 14,
  },
  kpiLabel: { fontSize: 11, fontWeight: "500", color: colors.secondary, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValue: { fontSize: 22, fontWeight: "700", marginTop: 4 },
  card: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.sep,
    padding: 16, marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 12 },
  chartContainer: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 130, paddingTop: 10 },
  barCol: { alignItems: "center", flex: 1 },
  bar: { width: 28, backgroundColor: colors.accent, borderRadius: 4, marginVertical: 4 },
  barValue: { fontSize: 10, color: colors.secondary, fontWeight: "600" },
  barLabel: { fontSize: 10, color: colors.secondary },
  typeRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  typeInfo: { flex: 1 },
  typeName: { fontSize: 14, fontWeight: "500", color: colors.text },
  typeMeta: { fontSize: 11, color: colors.secondary, marginTop: 2 },
  typeRevenue: { fontSize: 14, fontWeight: "600", color: colors.text },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.sep },
  emptyText: { color: colors.secondary, fontSize: 13, textAlign: "center", paddingVertical: 12 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  statusLabel: { fontSize: 14, color: colors.secondary },
  statusValue: { fontSize: 14, fontWeight: "600", color: colors.text },
});
