import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useLineItems, useClients } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { colors, spacing, fontSize } from "@/lib/theme";
import type { Estimate, EstimateLineItem, Client } from "@proestimate/shared/types";

function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const PROJECT_TYPES = [
  "General", "Kitchen Remodel", "Bathroom Remodel", "Flooring", "Roofing",
  "Siding", "Windows & Doors", "Deck / Patio", "Basement Finish",
  "Addition", "Full Renovation", "Paint Interior", "Paint Exterior",
  "Plumbing", "Electrical", "HVAC",
];

const TIERS = [
  { label: "Budget", value: "budget" },
  { label: "Midrange", value: "midrange" },
  { label: "High End", value: "high_end" },
];

type Tab = "details" | "lines" | "summary";

export default function EstimateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: lineItems, loading: linesLoading, refresh: refreshLines } = useLineItems(id ?? null);
  const { data: clients } = useClients();

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [refreshing, setRefreshing] = useState(false);

  // Editable fields
  const [projectType, setProjectType] = useState("General");
  const [tier, setTier] = useState("midrange");
  const [clientId, setClientId] = useState<string | null>(null);
  const [projectAddress, setProjectAddress] = useState("");
  const [squareFootage, setSquareFootage] = useState("");
  const [overheadPct, setOverheadPct] = useState("15");
  const [contingencyPct, setContingencyPct] = useState("5");
  const [taxPct, setTaxPct] = useState("0");
  const [permitsFees, setPermitsFees] = useState("0");
  const [inclusions, setInclusions] = useState("");
  const [exclusions, setExclusions] = useState("");

  // Line item form
  const [showAddLine, setShowAddLine] = useState(false);
  const [lineCategory, setLineCategory] = useState<"material" | "labor" | "subcontractor">("material");
  const [lineDesc, setLineDesc] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [lineUnit, setLineUnit] = useState("each");
  const [lineUnitPrice, setLineUnitPrice] = useState("");
  const [lineMaterialCost, setLineMaterialCost] = useState("");
  const [lineLaborCost, setLineLaborCost] = useState("");

  const fetchEstimate = useCallback(async () => {
    if (!supabase || !id) return;
    setLoading(true);
    const { data } = await supabase.from("estimates").select("*").eq("id", id).single();
    if (data) {
      const est = data as Estimate;
      setEstimate(est);
      setProjectType(est.project_type ?? "General");
      setTier(est.tier ?? "midrange");
      setClientId(est.client_id ?? null);
      setProjectAddress(est.project_address ?? "");
      setSquareFootage(est.square_footage?.toString() ?? "");
      setOverheadPct(est.overhead_pct?.toString() ?? "15");
      setContingencyPct(est.contingency_pct?.toString() ?? "5");
      setTaxPct(est.tax_pct?.toString() ?? "0");
      setPermitsFees(est.permits_fees?.toString() ?? "0");
      setInclusions((est.scope_inclusions as string[])?.join("\n") ?? "");
      setExclusions((est.scope_exclusions as string[])?.join("\n") ?? "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchEstimate(); }, [fetchEstimate]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchEstimate(), refreshLines()]);
    setRefreshing(false);
  }, [fetchEstimate, refreshLines]);

  // Calculations
  const totals = useMemo(() => {
    const materialTotal = lineItems.filter(l => l.category === "material").reduce((s, l) => s + Number(l.extended_price ?? 0), 0);
    const laborTotal = lineItems.filter(l => l.category === "labor").reduce((s, l) => s + Number(l.extended_price ?? 0), 0);
    const subTotal = lineItems.filter(l => l.category === "subcontractor").reduce((s, l) => s + Number(l.extended_price ?? 0), 0);
    const baseTotal = materialTotal + laborTotal + subTotal;
    const overhead = baseTotal * (parseFloat(overheadPct) || 0) / 100;
    const contingency = baseTotal * (parseFloat(contingencyPct) || 0) / 100;
    const tax = baseTotal * (parseFloat(taxPct) || 0) / 100;
    const permits = parseFloat(permitsFees) || 0;
    const grandTotal = baseTotal + overhead + contingency + tax + permits;
    const internalCost = lineItems.reduce((s, l) => s + Number(l.material_cost ?? 0) + Number(l.labor_cost ?? 0), 0);
    const marginPct = grandTotal > 0 ? ((grandTotal - internalCost) / grandTotal) * 100 : 0;
    const sqft = parseFloat(squareFootage) || 0;
    const costPerSqft = sqft > 0 ? grandTotal / sqft : 0;
    return { materialTotal, laborTotal, subTotal, baseTotal, overhead, contingency, tax, permits, grandTotal, internalCost, marginPct, costPerSqft };
  }, [lineItems, overheadPct, contingencyPct, taxPct, permitsFees, squareFootage]);

  const handleSave = async () => {
    if (!supabase || !id) return;
    setSaving(true);
    const { error } = await supabase.from("estimates").update({
      project_type: projectType,
      tier,
      client_id: clientId,
      project_address: projectAddress || null,
      square_footage: parseFloat(squareFootage) || null,
      overhead_pct: parseFloat(overheadPct) || 0,
      contingency_pct: parseFloat(contingencyPct) || 0,
      tax_pct: parseFloat(taxPct) || 0,
      permits_fees: parseFloat(permitsFees) || 0,
      scope_inclusions: inclusions.split("\n").filter(Boolean),
      scope_exclusions: exclusions.split("\n").filter(Boolean),
      materials_total: totals.materialTotal,
      labor_total: totals.laborTotal,
      subcontractor_total: totals.subTotal,
      overhead_total: totals.overhead,
      contingency_total: totals.contingency,
      tax_total: totals.tax,
      grand_total: totals.grandTotal,
      gross_margin_pct: totals.marginPct,
      cost_per_sqft: totals.costPerSqft,
    }).eq("id", id);
    setSaving(false);
    if (error) Alert.alert("Error", "Failed to save estimate");
    else Alert.alert("Saved", "Estimate updated");
  };

  const handleAddLineItem = async () => {
    if (!supabase || !id || !lineDesc.trim()) return;
    const nextNum = lineItems.length > 0 ? Math.max(...lineItems.map(l => l.line_number)) + 1 : 1;
    const qty = parseFloat(lineQty) || 1;
    const unitPrice = parseFloat(lineUnitPrice) || 0;
    const { error } = await supabase.from("estimate_line_items").insert({
      estimate_id: id,
      line_number: nextNum,
      category: lineCategory,
      description: lineDesc.trim(),
      quantity: qty,
      unit: lineUnit,
      unit_price: unitPrice,
      extended_price: qty * unitPrice,
      material_cost: parseFloat(lineMaterialCost) || 0,
      labor_cost: parseFloat(lineLaborCost) || 0,
      retail_price: unitPrice,
    });
    if (error) {
      Alert.alert("Error", "Failed to add line item");
    } else {
      setLineDesc(""); setLineQty("1"); setLineUnitPrice(""); setLineMaterialCost(""); setLineLaborCost("");
      setShowAddLine(false);
      refreshLines();
    }
  };

  const handleDeleteLine = (lineId: string) => {
    Alert.alert("Delete Line Item", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        if (!supabase) return;
        await supabase.from("estimate_line_items").delete().eq("id", lineId);
        refreshLines();
      }},
    ]);
  };

  const handleStatusChange = (newStatus: string) => {
    Alert.alert("Change Status", `Set status to "${newStatus.replace(/_/g, " ")}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: async () => {
        if (!supabase || !id) return;
        const updates: Record<string, any> = { status: newStatus };
        if (newStatus === "sent") updates.sent_at = new Date().toISOString();
        if (newStatus === "accepted") updates.accepted_at = new Date().toISOString();
        if (newStatus === "declined") updates.declined_at = new Date().toISOString();
        await supabase.from("estimates").update(updates).eq("id", id);
        fetchEstimate();
      }},
    ]);
  };

  const clientName = clients.find(c => c.id === clientId)?.full_name ?? "No client";

  if (loading || !estimate) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading estimate...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{"< Back"}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{estimate.estimate_number}</Text>
            <StatusBadge status={estimate.status} />
          </View>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
            <Text style={styles.saveText}>{saving ? "..." : "Save"}</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(["details", "lines", "summary"] as Tab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === "lines" ? `Lines (${lineItems.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        >
          {activeTab === "details" && (
            <DetailsTab
              projectType={projectType} setProjectType={setProjectType}
              tier={tier} setTier={setTier}
              clientId={clientId} setClientId={setClientId}
              clients={clients}
              clientName={clientName}
              projectAddress={projectAddress} setProjectAddress={setProjectAddress}
              squareFootage={squareFootage} setSquareFootage={setSquareFootage}
              inclusions={inclusions} setInclusions={setInclusions}
              exclusions={exclusions} setExclusions={setExclusions}
              status={estimate.status}
              onStatusChange={handleStatusChange}
            />
          )}

          {activeTab === "lines" && (
            <LinesTab
              lineItems={lineItems}
              loading={linesLoading}
              showAddLine={showAddLine} setShowAddLine={setShowAddLine}
              lineCategory={lineCategory} setLineCategory={setLineCategory}
              lineDesc={lineDesc} setLineDesc={setLineDesc}
              lineQty={lineQty} setLineQty={setLineQty}
              lineUnit={lineUnit} setLineUnit={setLineUnit}
              lineUnitPrice={lineUnitPrice} setLineUnitPrice={setLineUnitPrice}
              lineMaterialCost={lineMaterialCost} setLineMaterialCost={setLineMaterialCost}
              lineLaborCost={lineLaborCost} setLineLaborCost={setLineLaborCost}
              onAdd={handleAddLineItem}
              onDelete={handleDeleteLine}
            />
          )}

          {activeTab === "summary" && (
            <>
              <SummaryTab
                totals={totals}
                overheadPct={overheadPct} setOverheadPct={setOverheadPct}
                contingencyPct={contingencyPct} setContingencyPct={setContingencyPct}
                taxPct={taxPct} setTaxPct={setTaxPct}
                permitsFees={permitsFees} setPermitsFees={setPermitsFees}
                sqft={squareFootage}
              />

              {/* Quick Links */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Actions</Text>
                <TouchableOpacity style={styles.linkRow} onPress={() => router.push(`/change-orders/${id}`)}>
                  <Text style={styles.linkText}>Change Orders</Text>
                  <Text style={styles.linkChevron}>{">"}</Text>
                </TouchableOpacity>
                <View style={{ height: 1, backgroundColor: colors.sep }} />
                <TouchableOpacity style={styles.linkRow} onPress={() => router.push(`/job-actuals/${id}`)}>
                  <Text style={styles.linkText}>Job Actuals</Text>
                  <Text style={styles.linkChevron}>{">"}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ──── Details Tab ──── */
function DetailsTab({
  projectType, setProjectType, tier, setTier,
  clientId, setClientId, clients, clientName,
  projectAddress, setProjectAddress,
  squareFootage, setSquareFootage,
  inclusions, setInclusions, exclusions, setExclusions,
  status, onStatusChange,
}: any) {
  const [showProjectTypes, setShowProjectTypes] = useState(false);
  const [showClients, setShowClients] = useState(false);

  return (
    <View>
      {/* Status Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status Actions</Text>
        <View style={styles.statusActions}>
          {status === "draft" && (
            <ActionButton label="Submit for Review" color={colors.accent} onPress={() => onStatusChange("in_review")} />
          )}
          {(status === "in_review" || status === "approved") && (
            <ActionButton label="Mark as Sent" color={colors.accent} onPress={() => onStatusChange("sent")} />
          )}
          {status === "in_review" && (
            <ActionButton label="Approve" color={colors.green} onPress={() => onStatusChange("approved")} />
          )}
          {status === "sent" && (
            <>
              <ActionButton label="Mark Accepted" color={colors.green} onPress={() => onStatusChange("accepted")} />
              <ActionButton label="Mark Declined" color={colors.red} onPress={() => onStatusChange("declined")} />
            </>
          )}
        </View>
      </View>

      {/* Project Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Project Information</Text>

        <Text style={styles.fieldLabel}>Project Type</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowProjectTypes(!showProjectTypes)}>
          <Text style={styles.pickerText}>{projectType}</Text>
          <Text style={styles.pickerChevron}>{showProjectTypes ? "^" : "v"}</Text>
        </TouchableOpacity>
        {showProjectTypes && (
          <View style={styles.pickerOptions}>
            {PROJECT_TYPES.map((pt) => (
              <TouchableOpacity key={pt} style={styles.pickerOption} onPress={() => { setProjectType(pt); setShowProjectTypes(false); }}>
                <Text style={[styles.pickerOptionText, pt === projectType && { color: colors.accent, fontWeight: "600" }]}>{pt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.fieldLabel}>Tier</Text>
        <View style={styles.tierRow}>
          {TIERS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.tierButton, tier === t.value && styles.tierButtonActive]}
              onPress={() => setTier(t.value)}
            >
              <Text style={[styles.tierButtonText, tier === t.value && styles.tierButtonTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Client</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setShowClients(!showClients)}>
          <Text style={[styles.pickerText, !clientId && { color: colors.secondary }]}>{clientName}</Text>
          <Text style={styles.pickerChevron}>{showClients ? "^" : "v"}</Text>
        </TouchableOpacity>
        {showClients && (
          <View style={styles.pickerOptions}>
            <TouchableOpacity style={styles.pickerOption} onPress={() => { setClientId(null); setShowClients(false); }}>
              <Text style={styles.pickerOptionText}>No client</Text>
            </TouchableOpacity>
            {clients.map((c: any) => (
              <TouchableOpacity key={c.id} style={styles.pickerOption} onPress={() => { setClientId(c.id); setShowClients(false); }}>
                <Text style={[styles.pickerOptionText, c.id === clientId && { color: colors.accent, fontWeight: "600" }]}>{c.full_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.fieldLabel}>Project Address</Text>
        <TextInput style={styles.input} value={projectAddress} onChangeText={setProjectAddress} placeholder="123 Main St" placeholderTextColor={colors.gray3} />

        <Text style={styles.fieldLabel}>Square Footage</Text>
        <TextInput style={styles.input} value={squareFootage} onChangeText={setSquareFootage} placeholder="0" keyboardType="numeric" placeholderTextColor={colors.gray3} />
      </View>

      {/* Scope */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Scope</Text>
        <Text style={styles.fieldLabel}>Inclusions (one per line)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={inclusions} onChangeText={setInclusions} multiline numberOfLines={4} placeholder="Materials and labor for..." placeholderTextColor={colors.gray3} />
        <Text style={styles.fieldLabel}>Exclusions (one per line)</Text>
        <TextInput style={[styles.input, styles.multiline]} value={exclusions} onChangeText={setExclusions} multiline numberOfLines={4} placeholder="Permit fees, structural..." placeholderTextColor={colors.gray3} />
      </View>
    </View>
  );
}

/* ──── Lines Tab ──── */
function LinesTab({
  lineItems, loading, showAddLine, setShowAddLine,
  lineCategory, setLineCategory,
  lineDesc, setLineDesc, lineQty, setLineQty,
  lineUnit, setLineUnit, lineUnitPrice, setLineUnitPrice,
  lineMaterialCost, setLineMaterialCost, lineLaborCost, setLineLaborCost,
  onAdd, onDelete,
}: any) {
  const categories = ["material", "labor", "subcontractor"] as const;
  const grouped = {
    material: lineItems.filter((l: EstimateLineItem) => l.category === "material"),
    labor: lineItems.filter((l: EstimateLineItem) => l.category === "labor"),
    subcontractor: lineItems.filter((l: EstimateLineItem) => l.category === "subcontractor"),
  };

  return (
    <View>
      {/* Add Line Button */}
      <TouchableOpacity style={styles.addLineButton} onPress={() => setShowAddLine(!showAddLine)}>
        <Text style={styles.addLineText}>{showAddLine ? "Cancel" : "+ Add Line Item"}</Text>
      </TouchableOpacity>

      {/* Add Line Form */}
      {showAddLine && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Line Item</Text>
          <View style={styles.tierRow}>
            {categories.map(c => (
              <TouchableOpacity key={c} style={[styles.tierButton, lineCategory === c && styles.tierButtonActive]} onPress={() => setLineCategory(c)}>
                <Text style={[styles.tierButtonText, lineCategory === c && styles.tierButtonTextActive]}>{c.charAt(0).toUpperCase() + c.slice(1)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} value={lineDesc} onChangeText={setLineDesc} placeholder="Description *" placeholderTextColor={colors.gray3} />
          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Qty</Text>
              <TextInput style={styles.input} value={lineQty} onChangeText={setLineQty} keyboardType="numeric" />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Unit</Text>
              <TextInput style={styles.input} value={lineUnit} onChangeText={setLineUnit} placeholder="each" placeholderTextColor={colors.gray3} />
            </View>
          </View>
          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Unit Price (retail)</Text>
              <TextInput style={styles.input} value={lineUnitPrice} onChangeText={setLineUnitPrice} keyboardType="numeric" placeholder="$0.00" placeholderTextColor={colors.gray3} />
            </View>
          </View>
          <View style={styles.rowFields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Material Cost</Text>
              <TextInput style={styles.input} value={lineMaterialCost} onChangeText={setLineMaterialCost} keyboardType="numeric" placeholder="$0.00" placeholderTextColor={colors.gray3} />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>Labor Cost</Text>
              <TextInput style={styles.input} value={lineLaborCost} onChangeText={setLineLaborCost} keyboardType="numeric" placeholder="$0.00" placeholderTextColor={colors.gray3} />
            </View>
          </View>
          <TouchableOpacity style={styles.submitButton} onPress={onAdd}>
            <Text style={styles.submitText}>Add Line Item</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Line Items by Category */}
      {categories.map(cat => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        const catTotal = items.reduce((s: number, l: EstimateLineItem) => s + Number(l.extended_price ?? 0), 0);
        return (
          <View key={cat} style={styles.card}>
            <View style={styles.catHeader}>
              <Text style={styles.cardTitle}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
              <Text style={styles.catTotal}>{fmt(catTotal)}</Text>
            </View>
            {items.map((line: EstimateLineItem, i: number) => (
              <TouchableOpacity
                key={line.id}
                style={[styles.lineRow, i < items.length - 1 && styles.borderBottom]}
                onLongPress={() => onDelete(line.id)}
              >
                <View style={styles.lineInfo}>
                  <Text style={styles.lineDesc} numberOfLines={1}>{line.description}</Text>
                  <Text style={styles.lineMeta}>
                    {line.quantity} {line.unit} @ {fmt(Number(line.unit_price))}
                  </Text>
                </View>
                <Text style={styles.linePrice}>{fmt(Number(line.extended_price))}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}

      {lineItems.length === 0 && !showAddLine && (
        <View style={styles.emptyLines}>
          <Text style={styles.emptyLinesText}>No line items yet. Tap "+ Add Line Item" to start.</Text>
        </View>
      )}
    </View>
  );
}

/* ──── Summary Tab ──── */
function SummaryTab({
  totals, overheadPct, setOverheadPct,
  contingencyPct, setContingencyPct,
  taxPct, setTaxPct, permitsFees, setPermitsFees, sqft,
}: any) {
  return (
    <View>
      {/* Cost Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cost Breakdown</Text>
        <SummaryRow label="Materials" value={fmt(totals.materialTotal)} />
        <SummaryRow label="Labor" value={fmt(totals.laborTotal)} />
        <SummaryRow label="Subcontractor" value={fmt(totals.subTotal)} />
        <View style={styles.divider} />
        <SummaryRow label="Base Subtotal" value={fmt(totals.baseTotal)} bold />
      </View>

      {/* Adjustments */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Adjustments</Text>
        <View style={styles.adjustRow}>
          <Text style={styles.adjustLabel}>Overhead %</Text>
          <TextInput style={styles.adjustInput} value={overheadPct} onChangeText={setOverheadPct} keyboardType="numeric" />
          <Text style={styles.adjustValue}>{fmt(totals.overhead)}</Text>
        </View>
        <View style={styles.adjustRow}>
          <Text style={styles.adjustLabel}>Contingency %</Text>
          <TextInput style={styles.adjustInput} value={contingencyPct} onChangeText={setContingencyPct} keyboardType="numeric" />
          <Text style={styles.adjustValue}>{fmt(totals.contingency)}</Text>
        </View>
        <View style={styles.adjustRow}>
          <Text style={styles.adjustLabel}>Tax %</Text>
          <TextInput style={styles.adjustInput} value={taxPct} onChangeText={setTaxPct} keyboardType="numeric" />
          <Text style={styles.adjustValue}>{fmt(totals.tax)}</Text>
        </View>
        <View style={styles.adjustRow}>
          <Text style={styles.adjustLabel}>Permits / Fees</Text>
          <TextInput style={styles.adjustInput} value={permitsFees} onChangeText={setPermitsFees} keyboardType="numeric" />
        </View>
      </View>

      {/* Grand Total */}
      <View style={[styles.card, styles.grandTotalCard]}>
        <SummaryRow label="Grand Total" value={fmt(totals.grandTotal)} bold accent />
        <View style={styles.divider} />
        <SummaryRow label="Gross Margin" value={`${totals.marginPct.toFixed(1)}%`} color={totals.marginPct >= 35 ? colors.green : totals.marginPct >= 25 ? colors.orange : colors.red} />
        {parseFloat(sqft) > 0 && (
          <SummaryRow label="Cost / sqft" value={fmt(totals.costPerSqft)} />
        )}
        <SummaryRow label="Internal Cost" value={fmt(totals.internalCost)} />
      </View>
    </View>
  );
}

function SummaryRow({ label, value, bold, accent, color }: { label: string; value: string; bold?: boolean; accent?: boolean; color?: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && { fontWeight: "600" }]}>{label}</Text>
      <Text style={[styles.summaryValue, bold && { fontWeight: "700" }, accent && { color: colors.accent }, color ? { color } : {}]}>{value}</Text>
    </View>
  );
}

function ActionButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.actionButton, { backgroundColor: color + "18" }]} onPress={onPress}>
      <Text style={[styles.actionButtonText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: colors.secondary, fontSize: 14 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.sep,
  },
  backButton: { paddingVertical: 4, paddingRight: 12 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "500" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  saveButton: { backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  saveText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.sep,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { fontSize: 13, color: colors.secondary, fontWeight: "500" },
  activeTabText: { color: colors.accent },
  scrollContent: { padding: 16, paddingBottom: 48 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sep,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "500", color: colors.secondary, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pickerText: { fontSize: 14, color: colors.text },
  pickerChevron: { fontSize: 12, color: colors.secondary },
  pickerOptions: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    overflow: "hidden",
  },
  pickerOption: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.sep },
  pickerOptionText: { fontSize: 14, color: colors.text },
  tierRow: { flexDirection: "row", gap: 8 },
  tierButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.sep,
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  tierButtonActive: { borderColor: colors.accent, backgroundColor: colors.accent + "12" },
  tierButtonText: { fontSize: 13, color: colors.secondary, fontWeight: "500" },
  tierButtonTextActive: { color: colors.accent },
  statusActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionButtonText: { fontSize: 13, fontWeight: "600" },
  addLineButton: { backgroundColor: colors.accent + "12", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginBottom: 12 },
  addLineText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  rowFields: { flexDirection: "row", gap: 10 },
  halfField: { flex: 1 },
  submitButton: { backgroundColor: colors.accent, borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 12 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  catHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  catTotal: { fontSize: 14, fontWeight: "600", color: colors.accent },
  lineRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  lineInfo: { flex: 1 },
  lineDesc: { fontSize: 13, fontWeight: "500", color: colors.text },
  lineMeta: { fontSize: 11, color: colors.secondary, marginTop: 2 },
  linePrice: { fontSize: 14, fontWeight: "600", color: colors.text },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.sep },
  emptyLines: { padding: 32, alignItems: "center" },
  emptyLinesText: { color: colors.secondary, fontSize: 13, textAlign: "center" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  summaryLabel: { fontSize: 13, color: colors.secondary },
  summaryValue: { fontSize: 14, fontWeight: "500", color: colors.text },
  divider: { height: 1, backgroundColor: colors.sep, marginVertical: 8 },
  adjustRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, gap: 8 },
  adjustLabel: { flex: 1, fontSize: 13, color: colors.secondary },
  adjustInput: {
    width: 60,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: colors.text,
    textAlign: "center",
  },
  adjustValue: { width: 80, fontSize: 13, color: colors.text, textAlign: "right" },
  grandTotalCard: { borderColor: colors.accent + "40" },
  linkRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, paddingHorizontal: 4 },
  linkText: { fontSize: 14, fontWeight: "500", color: colors.accent },
  linkChevron: { fontSize: 14, color: colors.gray3 },
});
