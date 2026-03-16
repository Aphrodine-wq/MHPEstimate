import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { useState, useCallback, useEffect, useMemo } from "react";
import { useEstimates } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import { colors } from "@/lib/theme";
import type { Client, Estimate } from "@proestimate/shared/types";

function fmt(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: allEstimates } = useEstimates();

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");

  const fetchClient = useCallback(async () => {
    if (!supabase || !id) return;
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").eq("id", id).single();
    if (data) {
      const c = data as Client;
      setClient(c);
      setFullName(c.full_name ?? "");
      setEmail(c.email ?? "");
      setPhone(c.phone ?? "");
      setAddress(c.address ?? "");
      setCity(c.city ?? "");
      setState(c.state ?? "");
      setZip(c.zip ?? "");
      setNotes(c.notes ?? "");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchClient(); }, [fetchClient]);

  const clientEstimates = useMemo(() => {
    return allEstimates.filter((e) => e.client_id === id);
  }, [allEstimates, id]);

  const stats = useMemo(() => {
    const total = clientEstimates.reduce((s, e) => s + Number(e.grand_total ?? 0), 0);
    const accepted = clientEstimates.filter((e) => e.status === "accepted");
    const acceptedTotal = accepted.reduce((s, e) => s + Number(e.grand_total ?? 0), 0);
    return { total, accepted: accepted.length, acceptedTotal, count: clientEstimates.length };
  }, [clientEstimates]);

  const handleSave = async () => {
    if (!supabase || !id || !fullName.trim()) {
      Alert.alert("Error", "Client name is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("clients").update({
      full_name: fullName.trim(),
      email: email.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      zip: zip.trim() || null,
      notes: notes.trim() || null,
    }).eq("id", id);
    setSaving(false);
    if (error) Alert.alert("Error", "Failed to save client");
    else Alert.alert("Saved", "Client updated");
  };

  const initials = fullName
    ? fullName.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  if (loading || !client) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading client...</Text>
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
          <Text style={styles.headerTitle}>Client Details</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
            <Text style={styles.saveText}>{saving ? "..." : "Save"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Profile Header */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.count}</Text>
                <Text style={styles.statLabel}>Estimates</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.accepted}</Text>
                <Text style={styles.statLabel}>Accepted</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{fmt(stats.acceptedTotal)}</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
            </View>
          </View>

          {/* Contact Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact Information</Text>
            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="John Smith" placeholderTextColor={colors.gray3} />
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="john@example.com" keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.gray3} />
            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="(555) 123-4567" keyboardType="phone-pad" placeholderTextColor={colors.gray3} />
          </View>

          {/* Address */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Address</Text>
            <Text style={styles.fieldLabel}>Street Address</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="123 Main St" placeholderTextColor={colors.gray3} />
            <View style={styles.rowFields}>
              <View style={styles.flexField}>
                <Text style={styles.fieldLabel}>City</Text>
                <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Memphis" placeholderTextColor={colors.gray3} />
              </View>
              <View style={{ width: 80 }}>
                <Text style={styles.fieldLabel}>State</Text>
                <TextInput style={styles.input} value={state} onChangeText={setState} placeholder="TN" autoCapitalize="characters" placeholderTextColor={colors.gray3} />
              </View>
              <View style={{ width: 90 }}>
                <Text style={styles.fieldLabel}>ZIP</Text>
                <TextInput style={styles.input} value={zip} onChangeText={setZip} placeholder="38101" keyboardType="numeric" placeholderTextColor={colors.gray3} />
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} multiline numberOfLines={4} placeholder="Client notes..." placeholderTextColor={colors.gray3} />
          </View>

          {/* Client Estimates */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Estimates ({clientEstimates.length})</Text>
            {clientEstimates.length === 0 ? (
              <Text style={styles.emptyText}>No estimates for this client yet.</Text>
            ) : (
              clientEstimates.map((est, i) => (
                <TouchableOpacity
                  key={est.id}
                  style={[styles.estimateRow, i < clientEstimates.length - 1 && styles.borderBottom]}
                  onPress={() => router.push(`/estimate/${est.id}`)}
                >
                  <View style={styles.estInfo}>
                    <View style={styles.estHeader}>
                      <Text style={styles.estNumber}>{est.estimate_number}</Text>
                      <StatusBadge status={est.status} />
                    </View>
                    <Text style={styles.estType}>{est.project_type}</Text>
                  </View>
                  <Text style={styles.estTotal}>{fmt(Number(est.grand_total))}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  profileCard: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.sep,
    padding: 20, alignItems: "center", marginBottom: 12,
  },
  avatar: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "700" },
  profileStats: { flexDirection: "row", gap: 24 },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 11, color: colors.secondary, marginTop: 2 },
  card: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.sep,
    padding: 16, marginBottom: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "500", color: colors.secondary, marginBottom: 4, marginTop: 10 },
  input: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.sep, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  rowFields: { flexDirection: "row", gap: 10 },
  flexField: { flex: 1 },
  emptyText: { color: colors.secondary, fontSize: 13, textAlign: "center", paddingVertical: 12 },
  estimateRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  estInfo: { flex: 1 },
  estHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  estNumber: { fontSize: 13, fontWeight: "600", color: colors.text },
  estType: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  estTotal: { fontSize: 14, fontWeight: "600", color: colors.text },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: colors.sep },
});
