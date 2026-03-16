import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, Modal, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/lib/theme";
import type { EstimateChangeOrder } from "@proestimate/shared/types";

function fmt(n: number): string {
  const prefix = n >= 0 ? "+" : "-";
  return prefix + "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const STATUS_COLORS: Record<string, string> = {
  pending: colors.orange,
  approved: colors.green,
  rejected: colors.red,
};

export default function ChangeOrdersScreen() {
  const { estimateId } = useLocalSearchParams<{ estimateId: string }>();
  const [changeOrders, setChangeOrders] = useState<EstimateChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [description, setDescription] = useState("");
  const [costImpact, setCostImpact] = useState("");
  const [timelineImpact, setTimelineImpact] = useState("");

  const fetchCOs = useCallback(async () => {
    if (!supabase || !estimateId) return;
    setLoading(true);
    const { data } = await supabase
      .from("estimate_change_orders")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("change_number");
    setChangeOrders((data as EstimateChangeOrder[]) ?? []);
    setLoading(false);
  }, [estimateId]);

  useEffect(() => { fetchCOs(); }, [fetchCOs]);

  useEffect(() => {
    if (!supabase || !estimateId) return;
    const channel = supabase
      .channel(`co-${estimateId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "estimate_change_orders", filter: `estimate_id=eq.${estimateId}` }, () => fetchCOs())
      .subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [estimateId, fetchCOs]);

  const handleSubmit = async () => {
    if (!supabase || !estimateId || !description.trim()) {
      Alert.alert("Error", "Description is required");
      return;
    }
    const cost = parseFloat(costImpact);
    if (isNaN(cost)) {
      Alert.alert("Error", "Cost impact must be a valid number");
      return;
    }
    const nextNum = changeOrders.length > 0 ? Math.max(...changeOrders.map((c) => c.change_number)) + 1 : 1;
    const { error } = await supabase.from("estimate_change_orders").insert({
      estimate_id: estimateId,
      change_number: nextNum,
      description: description.trim(),
      cost_impact: cost,
      timeline_impact: timelineImpact.trim() || null,
      status: "pending",
    });
    if (error) {
      Alert.alert("Error", "Failed to create change order");
    } else {
      setDescription(""); setCostImpact(""); setTimelineImpact("");
      setShowForm(false);
      fetchCOs();
    }
  };

  const handleStatusChange = (co: EstimateChangeOrder, newStatus: string) => {
    Alert.alert(
      `${newStatus === "approved" ? "Approve" : "Reject"} CO #${co.change_number}`,
      newStatus === "approved"
        ? `This will add ${fmt(Number(co.cost_impact))} to the estimate total.`
        : "This change order will be rejected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: newStatus === "approved" ? "Approve" : "Reject",
          style: newStatus === "rejected" ? "destructive" : "default",
          onPress: async () => {
            if (!supabase) return;
            await supabase.from("estimate_change_orders").update({ status: newStatus }).eq("id", co.id);
            if (newStatus === "approved") {
              // Add cost impact to estimate grand total
              const { data: est } = await supabase.from("estimates").select("grand_total").eq("id", estimateId).single();
              if (est) {
                const newTotal = Number(est.grand_total ?? 0) + Number(co.cost_impact);
                await supabase.from("estimates").update({ grand_total: newTotal }).eq("id", estimateId);
              }
            }
            fetchCOs();
          },
        },
      ],
    );
  };

  const handleDelete = (co: EstimateChangeOrder) => {
    Alert.alert("Delete Change Order", `Delete CO #${co.change_number}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        if (!supabase) return;
        await supabase.from("estimate_change_orders").delete().eq("id", co.id);
        fetchCOs();
      }},
    ]);
  };

  const totalImpact = changeOrders
    .filter((c) => c.status === "approved")
    .reduce((s, c) => s + Number(c.cost_impact ?? 0), 0);

  const renderItem = ({ item }: { item: EstimateChangeOrder }) => (
    <View style={styles.row}>
      <View style={styles.rowHeader}>
        <Text style={styles.coNumber}>CO #{item.change_number}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.coDesc}>{item.description}</Text>
      <View style={styles.rowFooter}>
        <Text style={[styles.costImpact, { color: Number(item.cost_impact) >= 0 ? colors.red : colors.green }]}>
          {fmt(Number(item.cost_impact))}
        </Text>
        {item.timeline_impact && <Text style={styles.timeline}>{item.timeline_impact}</Text>}
      </View>
      {item.status === "pending" && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.green + "18" }]} onPress={() => handleStatusChange(item, "approved")}>
            <Text style={[styles.actionText, { color: colors.green }]}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.red + "18" }]} onPress={() => handleStatusChange(item, "rejected")}>
            <Text style={[styles.actionText, { color: colors.red }]}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.gray5 }]} onPress={() => handleDelete(item)}>
            <Text style={[styles.actionText, { color: colors.secondary }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Orders</Text>
        <TouchableOpacity onPress={() => setShowForm(true)}>
          <Text style={styles.addText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Bar */}
      {changeOrders.length > 0 && (
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>{changeOrders.length} change order{changeOrders.length !== 1 ? "s" : ""}</Text>
          <Text style={[styles.summaryImpact, { color: totalImpact >= 0 ? colors.red : colors.green }]}>
            Net impact: {fmt(totalImpact)}
          </Text>
        </View>
      )}

      <FlatList
        data={changeOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={changeOrders.length === 0 ? { flex: 1 } : styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            title="No Change Orders"
            message={loading ? "Loading..." : "Create a change order to modify the estimate scope."}
            actionLabel="New Change Order"
            onAction={() => setShowForm(true)}
          />
        }
      />

      {/* New CO Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Change Order</Text>
              <TouchableOpacity onPress={handleSubmit}>
                <Text style={styles.doneText}>Create</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formContent}>
              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline numberOfLines={3} placeholder="Describe the change..." placeholderTextColor={colors.gray3} />

              <Text style={styles.fieldLabel}>Cost Impact ($) *</Text>
              <TextInput style={styles.input} value={costImpact} onChangeText={setCostImpact} keyboardType="numeric" placeholder="e.g. 2500 or -500" placeholderTextColor={colors.gray3} />

              <Text style={styles.fieldLabel}>Timeline Impact</Text>
              <TextInput style={styles.input} value={timelineImpact} onChangeText={setTimelineImpact} placeholder="e.g. +3 days" placeholderTextColor={colors.gray3} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.sep,
  },
  backButton: { paddingVertical: 4 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "500" },
  headerTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  addText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  summaryBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.sep,
  },
  summaryText: { fontSize: 13, color: colors.secondary },
  summaryImpact: { fontSize: 14, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  row: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.sep, padding: 14,
  },
  rowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  coNumber: { fontSize: 14, fontWeight: "700", color: colors.text },
  coDesc: { fontSize: 13, color: colors.text, lineHeight: 20, marginBottom: 8 },
  rowFooter: { flexDirection: "row", alignItems: "center", gap: 12 },
  costImpact: { fontSize: 15, fontWeight: "700" },
  timeline: { fontSize: 12, color: colors.secondary },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  actionText: { fontSize: 13, fontWeight: "600" },
  separator: { height: 8 },
  // Modal
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.sep,
  },
  cancelText: { color: colors.secondary, fontSize: 14, fontWeight: "500" },
  modalTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  doneText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  formContent: { padding: 16, paddingBottom: 48 },
  fieldLabel: { fontSize: 12, fontWeight: "500", color: colors.secondary, marginBottom: 4, marginTop: 14 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.sep, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
});
