import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState } from "react";
import { useClients, createEstimate } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import type { Client } from "@proestimate/shared/types";

const PROJECT_TYPES = [
  "General",
  "Kitchen Remodel",
  "Bathroom Remodel",
  "Flooring",
  "Roofing",
  "Siding",
  "Windows & Doors",
  "Deck / Patio",
  "Basement Finish",
  "Addition",
  "Full Renovation",
  "Paint Interior",
  "Paint Exterior",
  "Plumbing",
  "Electrical",
  "HVAC",
];

const TIERS = [
  { label: "Budget", value: "budget", sub: "Economy materials" },
  { label: "Midrange", value: "midrange", sub: "Quality standard" },
  { label: "High End", value: "high_end", sub: "Premium finish" },
] as const;

export default function NewEstimateScreen() {
  const { data: clients } = useClients();

  const [projectType, setProjectType] = useState("General");
  const [showProjectTypes, setShowProjectTypes] = useState(false);
  const [tier, setTier] = useState<string>("midrange");
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);

  const filteredClients = clientSearch
    ? clients.filter(
        (c) =>
          c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          c.email?.toLowerCase().includes(clientSearch.toLowerCase())
      )
    : clients;

  const handleCreate = async () => {
    if (!supabase) {
      Alert.alert("Error", "Not connected to database");
      return;
    }

    setLoading(true);

    try {
      // Use the existing createEstimate from store, but we need to customize it
      // with the selected project type, tier, and client
      const MAX_RETRIES = 3;
      let estimate = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const { data: settings } = await supabase
          .from("company_settings")
          .select("value")
          .eq("key", "estimate_numbering")
          .single();

        const numbering = settings?.value as
          | { prefix: string; year_format: string; next_sequence: number }
          | undefined;
        const seq = numbering?.next_sequence ?? 1;
        const prefix = numbering?.prefix ?? "EST";
        const year = new Date().getFullYear();
        const estimate_number = `${prefix}-${year}-${String(seq).padStart(4, "0")}`;

        const { data, error: insertError } = await supabase
          .from("estimates")
          .insert({
            estimate_number,
            project_type: projectType,
            status: "draft",
            tier: tier === "midrange" ? "better" : tier === "budget" ? "good" : "best",
            source: "manual",
            client_id: clientId,
            scope_inclusions: [],
            scope_exclusions: [],
          })
          .select()
          .single();

        if (insertError) {
          if (insertError.code === "23505") continue;
          console.error("Failed to create estimate:", insertError);
          Alert.alert("Error", "Failed to create estimate");
          setLoading(false);
          return;
        }

        if (numbering) {
          await supabase
            .from("company_settings")
            .update({ value: { ...numbering, next_sequence: seq + 1 } })
            .eq("key", "estimate_numbering");
        }

        estimate = data;
        break;
      }

      setLoading(false);

      if (estimate) {
        router.replace(`/estimate/${estimate.id}`);
      } else {
        Alert.alert("Error", "Failed to create estimate after retries");
      }
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", "Something went wrong creating the estimate");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backText}>{"< Cancel"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Estimate</Text>
          <View style={{ width: 70 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Project Type */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Project Type</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowProjectTypes(!showProjectTypes)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerText}>{projectType}</Text>
              <Text style={styles.pickerChevron}>
                {showProjectTypes ? "^" : "v"}
              </Text>
            </TouchableOpacity>
            {showProjectTypes && (
              <View style={styles.pickerOptions}>
                <ScrollView
                  style={{ maxHeight: 260 }}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {PROJECT_TYPES.map((pt) => (
                    <TouchableOpacity
                      key={pt}
                      style={styles.pickerOption}
                      onPress={() => {
                        setProjectType(pt);
                        setShowProjectTypes(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          pt === projectType && {
                            color: colors.accent,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {pt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Client */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Client</Text>
            {selectedClient ? (
              <View style={styles.selectedClient}>
                <View style={styles.clientAvatar}>
                  <Text style={styles.clientAvatarText}>
                    {selectedClient.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </Text>
                </View>
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {selectedClient.full_name}
                  </Text>
                  {selectedClient.email && (
                    <Text style={styles.clientDetail}>
                      {selectedClient.email}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setClientId(null);
                    setShowClientPicker(true);
                  }}
                  style={styles.changeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowClientPicker(!showClientPicker)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pickerText, { color: colors.secondary }]}>
                    Select a client (optional)
                  </Text>
                  <Text style={styles.pickerChevron}>
                    {showClientPicker ? "^" : "v"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {showClientPicker && (
              <View style={styles.pickerOptions}>
                <TextInput
                  style={styles.clientSearchInput}
                  value={clientSearch}
                  onChangeText={setClientSearch}
                  placeholder="Search clients..."
                  placeholderTextColor={colors.gray3}
                  autoFocus
                />
                <ScrollView
                  style={{ maxHeight: 200 }}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setClientId(null);
                      setShowClientPicker(false);
                      setClientSearch("");
                    }}
                  >
                    <Text style={[styles.pickerOptionText, { color: colors.secondary }]}>
                      No client
                    </Text>
                  </TouchableOpacity>
                  {filteredClients.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.pickerOption}
                      onPress={() => {
                        setClientId(c.id);
                        setShowClientPicker(false);
                        setClientSearch("");
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          c.id === clientId && {
                            color: colors.accent,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {c.full_name}
                      </Text>
                      {c.email && (
                        <Text style={styles.pickerOptionSub}>{c.email}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                  {filteredClients.length === 0 && (
                    <View style={styles.noResults}>
                      <Text style={styles.noResultsText}>
                        No clients found
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Pricing Tier */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pricing Tier</Text>
            <View style={styles.tierGrid}>
              {TIERS.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.tierCard,
                    tier === t.value && styles.tierCardActive,
                  ]}
                  onPress={() => setTier(t.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.tierLabel,
                      tier === t.value && styles.tierLabelActive,
                    ]}
                  >
                    {t.label}
                  </Text>
                  <Text
                    style={[
                      styles.tierSub,
                      tier === t.value && styles.tierSubActive,
                    ]}
                  >
                    {t.sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Estimate</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.hint}>
            You can add line items, photos, and more details after creating.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
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
  headerTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  scrollContent: { padding: 16, paddingBottom: 48 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sep,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
  },
  pickerText: { fontSize: 15, color: colors.text },
  pickerChevron: { fontSize: 12, color: colors.secondary },
  pickerOptions: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 10,
    marginTop: 8,
    overflow: "hidden",
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.sep,
    minHeight: 44,
    justifyContent: "center",
  },
  pickerOptionText: { fontSize: 15, color: colors.text },
  pickerOptionSub: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  clientSearchInput: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.sep,
    backgroundColor: colors.card,
  },
  selectedClient: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  clientAvatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 15, fontWeight: "600", color: colors.text },
  clientDetail: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  changeButton: { paddingHorizontal: 12, paddingVertical: 6 },
  changeText: { color: colors.accent, fontSize: 13, fontWeight: "600" },
  noResults: { padding: 16, alignItems: "center" },
  noResultsText: { color: colors.secondary, fontSize: 13 },
  tierGrid: { gap: 10 },
  tierCard: {
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.bg,
    minHeight: 56,
    justifyContent: "center",
  },
  tierCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + "0D",
  },
  tierLabel: { fontSize: 16, fontWeight: "600", color: colors.text },
  tierLabelActive: { color: colors.accent },
  tierSub: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  tierSubActive: { color: colors.accent },
  createButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    minHeight: 52,
    justifyContent: "center",
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  hint: {
    fontSize: 12,
    color: colors.secondary,
    textAlign: "center",
    marginTop: 12,
  },
});
