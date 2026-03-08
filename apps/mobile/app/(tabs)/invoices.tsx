import { View, Text, FlatList, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState, useCallback } from "react";
import { useInvoices } from "@/lib/store";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/lib/theme";
import type { Invoice } from "@proestimate/shared/types";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function InvoicesScreen() {
  const { data: invoices, loading, refresh } = useInvoices();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const renderItem = ({ item }: { item: Invoice }) => (
    <View style={styles.row}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>$</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>
          {item.supplier_name ?? `Invoice ${item.invoice_number ?? ""}`}
        </Text>
        {item.invoice_number && (
          <Text style={styles.detail}>#{item.invoice_number}</Text>
        )}
        <Text style={styles.detail}>{formatDate(item.created_at)}</Text>
      </View>
      <StatusBadge status={item.status} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <Text style={styles.count}>{invoices.length} total</Text>
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={invoices.length === 0 ? styles.emptyList : styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No Invoices"
            message="Upload supplier invoices to track pricing."
          />
        }
      />
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
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  emptyList: { flex: 1 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sep,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.purple + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 18, fontWeight: "600", color: colors.purple },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: "600", color: colors.text },
  detail: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  separator: { height: 8 },
});
