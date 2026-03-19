import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import { useEstimates } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/lib/theme";
import type { Estimate } from "@proestimate/shared/types";

function fmt(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EstimatesScreen() {
  const { data: estimates, loading, refresh } = useEstimates();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleNewEstimate = () => {
    router.push("/estimates/new");
  };

  const renderItem = ({ item }: { item: Estimate }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/estimate/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <View style={styles.rowHeader}>
          <Text style={styles.estNumber}>{item.estimate_number}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.projectType}>{item.project_type}</Text>
        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.total}>{fmt(Number(item.grand_total))}</Text>
        {item.gross_margin_pct != null && (
          <Text style={styles.margin}>{Number(item.gross_margin_pct).toFixed(1)}% margin</Text>
        )}
        <Text style={styles.tierBadge}>{item.tier}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Estimates</Text>
        <Text style={styles.count}>{estimates.length} total</Text>
      </View>
      <FlatList
        data={estimates}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={estimates.length === 0 ? styles.emptyList : styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No Estimates"
            message="Create your first estimate to get started."
            actionLabel="New Estimate"
            onAction={handleNewEstimate}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleNewEstimate} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  count: { fontSize: 13, color: colors.secondary },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyList: { flex: 1 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sep,
    padding: 14,
    flexDirection: "row",
  },
  rowLeft: { flex: 1 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  estNumber: { fontSize: 14, fontWeight: "600", color: colors.text },
  projectType: { fontSize: 13, color: colors.secondary, marginTop: 4 },
  date: { fontSize: 11, color: colors.tertiary, marginTop: 2 },
  rowRight: { alignItems: "flex-end", justifyContent: "center" },
  total: { fontSize: 16, fontWeight: "700", color: colors.text },
  margin: { fontSize: 11, color: colors.secondary, marginTop: 2 },
  tierBadge: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.accent,
    textTransform: "uppercase",
    marginTop: 4,
  },
  separator: { height: 8 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: "#fff", fontSize: 28, fontWeight: "400", marginTop: -2 },
});
