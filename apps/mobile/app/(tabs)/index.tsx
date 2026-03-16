import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import { useEstimates, useActivityFeed, createEstimate } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { colors, spacing, fontSize } from "@/lib/theme";
import type { Estimate } from "@proestimate/shared/types";
import type { ActivityEntry } from "@/lib/store";

function fmt(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ACTIVITY_COLORS: Record<ActivityEntry["type"], string> = {
  estimate: colors.accent,
  client: colors.green,
  invoice: colors.purple,
  call: colors.orange,
};

export default function DashboardScreen() {
  const { data: estimates, loading, refresh } = useEstimates();
  const activityEntries = useActivityFeed();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleNewEstimate = async () => {
    await createEstimate();
  };

  const sent = estimates.filter((e) => e.status === "sent" || e.status === "approved");
  const accepted = estimates.filter((e) => e.status === "accepted");
  const drafts = estimates.filter((e) => e.status === "draft" || e.status === "in_review");
  const totalPipeline = sent.reduce((sum, e) => sum + Number(e.grand_total), 0);
  const totalWon = accepted.reduce((sum, e) => sum + Number(e.grand_total), 0);
  const avgMargin = estimates.length
    ? estimates.reduce((sum, e) => sum + Number(e.gross_margin_pct ?? 0), 0) / estimates.length
    : 0;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{today}</Text>
          <TouchableOpacity style={styles.newButton} onPress={handleNewEstimate} activeOpacity={0.8}>
            <Text style={styles.newButtonText}>New Estimate</Text>
          </TouchableOpacity>
        </View>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <MetricCard label="Pipeline" value={fmt(totalPipeline)} sub={`${sent.length} pending`} />
          <MetricCard label="Won" value={fmt(totalWon)} sub={`${accepted.length} accepted`} />
        </View>
        <View style={styles.kpiRow}>
          <MetricCard label="Avg Margin" value={avgMargin ? `${avgMargin.toFixed(1)}%` : "—"} sub="Target 35-42%" />
          <MetricCard label="Drafts" value={drafts.length.toString()} sub="In progress" />
        </View>

        {/* Recent Estimates */}
        <Text style={styles.sectionTitle}>Recent Estimates</Text>
        <View style={styles.card}>
          {loading ? (
            <LoadingRows count={4} />
          ) : estimates.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No estimates yet</Text>
            </View>
          ) : (
            estimates.slice(0, 6).map((est, i, arr) => (
              <EstimateRow key={est.id} estimate={est} last={i === arr.length - 1} />
            ))
          )}
        </View>

        {/* Activity Feed */}
        <Text style={styles.sectionTitle}>Activity Feed</Text>
        <View style={styles.card}>
          {activityEntries.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No recent activity</Text>
            </View>
          ) : (
            activityEntries.slice(0, 10).map((entry, i, arr) => (
              <View
                key={entry.id}
                style={[styles.activityRow, i < arr.length - 1 && styles.borderBottom]}
              >
                <View style={[styles.activityDot, { backgroundColor: ACTIVITY_COLORS[entry.type] }]} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityDesc} numberOfLines={1}>{entry.description}</Text>
                  <Text style={styles.activityMeta}>
                    {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)} · {entry.action}
                  </Text>
                </View>
                <Text style={styles.activityTime}>{timeAgo(entry.timestamp)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricSub}>{sub}</Text>
    </View>
  );
}

function EstimateRow({ estimate, last }: { estimate: Estimate; last: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.estimateRow, !last && styles.borderBottom]}
      onPress={() => router.push(`/estimate/${estimate.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.estimateLeft}>
        <View style={styles.estimateHeader}>
          <Text style={styles.estimateNumber}>{estimate.estimate_number}</Text>
          <StatusBadge status={estimate.status} />
        </View>
        <Text style={styles.estimateType}>{estimate.project_type}</Text>
      </View>
      <View style={styles.estimateRight}>
        <Text style={styles.estimateTotal}>{fmt(Number(estimate.grand_total))}</Text>
        {estimate.gross_margin_pct != null && (
          <Text style={styles.estimateMargin}>{Number(estimate.gross_margin_pct).toFixed(1)}%</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function LoadingRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.loadingRow, i < count - 1 && styles.borderBottom]}>
          <View style={styles.loadingBar} />
          <View style={[styles.loadingBar, { width: 60 }]} />
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateText: { fontSize: 12, color: colors.secondary },
  newButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  kpiRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sep,
    padding: 14,
  },
  metricLabel: { fontSize: 11, fontWeight: "500", color: colors.secondary, textTransform: "uppercase", letterSpacing: 0.5 },
  metricValue: { fontSize: 22, fontWeight: "700", color: colors.text, marginTop: 4 },
  metricSub: { fontSize: 11, color: colors.secondary, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 20, marginBottom: 8 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sep,
    overflow: "hidden",
  },
  emptyContainer: { padding: 32, alignItems: "center" },
  emptyText: { fontSize: 13, color: colors.secondary },
  estimateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  estimateLeft: { flex: 1 },
  estimateHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  estimateNumber: { fontSize: 13, fontWeight: "500", color: colors.text },
  estimateType: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  estimateRight: { alignItems: "flex-end" },
  estimateTotal: { fontSize: 13, fontWeight: "600", color: colors.text },
  estimateMargin: { fontSize: 11, color: colors.secondary, marginTop: 2 },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  activityContent: { flex: 1 },
  activityDesc: { fontSize: 13, color: colors.text },
  activityMeta: { fontSize: 11, color: colors.secondary, marginTop: 2 },
  activityTime: { fontSize: 11, color: colors.secondary },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.sep },
  loadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  loadingBar: {
    height: 12,
    width: 120,
    backgroundColor: colors.gray5,
    borderRadius: 4,
  },
});
