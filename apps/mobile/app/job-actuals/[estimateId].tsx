import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import type { Estimate, JobActual } from "@proestimate/shared/types";

function fmt(n: number): string {
  return "$" + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function JobActualsScreen() {
  const { estimateId } = useLocalSearchParams<{ estimateId: string }>();
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [actuals, setActuals] = useState<JobActual | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [actualMaterials, setActualMaterials] = useState("");
  const [actualLabor, setActualLabor] = useState("");
  const [actualSubs, setActualSubs] = useState("");
  const [actualDays, setActualDays] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = useCallback(async () => {
    if (!supabase || !estimateId) return;
    setLoading(true);
    const [estRes, actualsRes] = await Promise.all([
      supabase.from("estimates").select("*").eq("id", estimateId).single(),
      supabase.from("job_actuals").select("*").eq("estimate_id", estimateId).single(),
    ]);
    if (estRes.data) setEstimate(estRes.data as Estimate);
    if (actualsRes.data) {
      const a = actualsRes.data as JobActual;
      setActuals(a);
      setActualMaterials(a.actual_materials?.toString() ?? "");
      setActualLabor(a.actual_labor?.toString() ?? "");
      setActualSubs(a.actual_subs?.toString() ?? "");
      setActualDays(a.actual_duration_days?.toString() ?? "");
      setNotes(a.notes ?? "");
    }
    setLoading(false);
  }, [estimateId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const calculations = useMemo(() => {
    if (!estimate) return null;
    const estMaterials = Number(estimate.materials_total ?? 0);
    const estLabor = Number(estimate.labor_total ?? 0);
    const estSubs = Number(estimate.subcontractor_total ?? 0);
    const estTotal = Number(estimate.grand_total ?? 0);

    const actMat = parseFloat(actualMaterials) || 0;
    const actLab = parseFloat(actualLabor) || 0;
    const actSub = parseFloat(actualSubs) || 0;
    const actTotal = actMat + actLab + actSub;

    const varMat = actMat ? actMat - estMaterials : null;
    const varLab = actLab ? actLab - estLabor : null;
    const varSub = actSub ? actSub - estSubs : null;
    const varTotal = actTotal > 0 ? actTotal - estTotal : null;
    const actualMargin = actTotal > 0 ? ((estTotal - actTotal) / estTotal) * 100 : null;

    return {
      estMaterials, estLabor, estSubs, estTotal,
      actMat, actLab, actSub, actTotal,
      varMat, varLab, varSub, varTotal,
      actualMargin,
    };
  }, [estimate, actualMaterials, actualLabor, actualSubs]);

  const handleSave = async () => {
    if (!supabase || !estimateId || !calculations) return;
    setSaving(true);
    const payload = {
      estimate_id: estimateId,
      actual_materials: calculations.actMat || null,
      actual_labor: calculations.actLab || null,
      actual_subs: calculations.actSub || null,
      actual_total: calculations.actTotal || null,
      actual_duration_days: parseFloat(actualDays) || null,
      actual_margin_pct: calculations.actualMargin,
      variance_materials: calculations.varMat,
      variance_labor: calculations.varLab,
      variance_total: calculations.varTotal,
      notes: notes.trim() || null,
      completed_at: new Date().toISOString(),
    };

    if (actuals) {
      const { error } = await supabase.from("job_actuals").update(payload).eq("id", actuals.id);
      if (error) { Alert.alert("Error", "Failed to update actuals"); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("job_actuals").insert(payload);
      if (error) { Alert.alert("Error", "Failed to save actuals"); setSaving(false); return; }
    }
    setSaving(false);
    Alert.alert("Saved", "Job actuals recorded successfully");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{"< Back"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Actuals</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
            <Text style={styles.saveText}>{saving ? "..." : "Save"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {estimate && (
            <View style={styles.estInfo}>
              <Text style={styles.estNumber}>{estimate.estimate_number}</Text>
              <Text style={styles.estType}>{estimate.project_type}</Text>
            </View>
          )}

          {/* Actuals vs Estimated */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Actual Costs</Text>
            <ActualRow
              label="Materials"
              estimated={calculations?.estMaterials ?? 0}
              actual={actualMaterials}
              onChangeActual={setActualMaterials}
              variance={calculations?.varMat ?? null}
            />
            <ActualRow
              label="Labor"
              estimated={calculations?.estLabor ?? 0}
              actual={actualLabor}
              onChangeActual={setActualLabor}
              variance={calculations?.varLab ?? null}
            />
            <ActualRow
              label="Subcontractor"
              estimated={calculations?.estSubs ?? 0}
              actual={actualSubs}
              onChangeActual={setActualSubs}
              variance={calculations?.varSub ?? null}
            />
          </View>

          {/* Totals */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Summary</Text>
            <SummaryRow label="Estimated Total" value={fmt(calculations?.estTotal ?? 0)} />
            <SummaryRow label="Actual Total" value={fmt(calculations?.actTotal ?? 0)} bold />
            {calculations?.varTotal !== null && (
              <SummaryRow
                label="Variance"
                value={(calculations!.varTotal! >= 0 ? "+" : "-") + fmt(Math.abs(calculations!.varTotal!))}
                color={calculations!.varTotal! <= 0 ? colors.green : colors.red}
              />
            )}
            {calculations?.actualMargin !== null && (
              <SummaryRow
                label="Actual Margin"
                value={`${calculations!.actualMargin!.toFixed(1)}%`}
                color={calculations!.actualMargin! >= 35 ? colors.green : calculations!.actualMargin! >= 25 ? colors.orange : colors.red}
              />
            )}
          </View>

          {/* Duration */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Duration</Text>
            <Text style={styles.fieldLabel}>Actual Days</Text>
            <TextInput style={styles.input} value={actualDays} onChangeText={setActualDays} keyboardType="numeric" placeholder="e.g. 14" placeholderTextColor={colors.gray3} />
          </View>

          {/* Notes */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} multiline numberOfLines={4} placeholder="Job completion notes..." placeholderTextColor={colors.gray3} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ActualRow({ label, estimated, actual, onChangeActual, variance }: {
  label: string; estimated: number; actual: string; onChangeActual: (v: string) => void; variance: number | null;
}) {
  return (
    <View style={styles.actualRow}>
      <View style={styles.actualLabel}>
        <Text style={styles.labelText}>{label}</Text>
        <Text style={styles.estimatedText}>Est: {fmt(estimated)}</Text>
      </View>
      <TextInput style={styles.actualInput} value={actual} onChangeText={onChangeActual} keyboardType="numeric" placeholder="$0.00" placeholderTextColor={colors.gray3} />
      {variance !== null && (
        <View style={[styles.variancePill, { backgroundColor: variance <= 0 ? colors.green + "18" : colors.red + "18" }]}>
          <Text style={[styles.varianceText, { color: variance <= 0 ? colors.green : colors.red }]}>
            {variance >= 0 ? "+" : "-"}{fmt(Math.abs(variance))}
          </Text>
        </View>
      )}
    </View>
  );
}

function SummaryRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && { fontWeight: "600" }]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && { fontWeight: "700" }, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: colors.secondary, fontSize: 14 },
  headerBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.sep,
  },
  backButton: { paddingVertical: 4, paddingRight: 12 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "500" },
  headerTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  saveButton: { backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  saveText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  scrollContent: { padding: 16, paddingBottom: 48 },
  estInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  estNumber: { fontSize: 15, fontWeight: "600", color: colors.text },
  estType: { fontSize: 13, color: colors.secondary },
  card: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.sep,
    padding: 16, marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "500", color: colors.secondary, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.sep, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  actualRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.sep },
  actualLabel: { flex: 1 },
  labelText: { fontSize: 14, fontWeight: "500", color: colors.text },
  estimatedText: { fontSize: 11, color: colors.secondary, marginTop: 2 },
  actualInput: {
    width: 90, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.sep,
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13, color: colors.text, textAlign: "right",
  },
  variancePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, minWidth: 70, alignItems: "center" },
  varianceText: { fontSize: 11, fontWeight: "600" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: colors.secondary },
  summaryValue: { fontSize: 14, fontWeight: "500", color: colors.text },
});
