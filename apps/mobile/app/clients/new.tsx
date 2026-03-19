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
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function NewClientScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Required", "Client name is required");
      return;
    }
    if (!supabase) {
      Alert.alert("Error", "Not connected to database");
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("clients")
      .insert({
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address_line1: address.trim() || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zip: zip.trim() || null,
        notes: notes.trim() || null,
        source: "mobile",
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      Alert.alert("Error", "Failed to create client");
      return;
    }

    if (data) {
      router.replace(`/client/${data.id}`);
    } else {
      router.back();
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
          <Text style={styles.headerTitle}>New Client</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={styles.saveButton}
            disabled={saving}
          >
            <Text style={styles.saveText}>{saving ? "..." : "Save"}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Contact Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Contact Information</Text>

            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="John Smith"
              placeholderTextColor={colors.gray3}
              autoFocus
              autoComplete="name"
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="john@example.com"
              placeholderTextColor={colors.gray3}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />

            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor={colors.gray3}
              keyboardType="phone-pad"
              autoComplete="tel"
              returnKeyType="next"
            />
          </View>

          {/* Address */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Address</Text>

            <Text style={styles.fieldLabel}>Street Address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main St"
              placeholderTextColor={colors.gray3}
              autoComplete="street-address"
              returnKeyType="next"
            />

            <View style={styles.rowFields}>
              <View style={styles.flexField}>
                <Text style={styles.fieldLabel}>City</Text>
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Memphis"
                  placeholderTextColor={colors.gray3}
                  returnKeyType="next"
                />
              </View>
              <View style={{ width: 80 }}>
                <Text style={styles.fieldLabel}>State</Text>
                <TextInput
                  style={styles.input}
                  value={state}
                  onChangeText={setState}
                  placeholder="TN"
                  placeholderTextColor={colors.gray3}
                  autoCapitalize="characters"
                  maxLength={2}
                  returnKeyType="next"
                />
              </View>
              <View style={{ width: 90 }}>
                <Text style={styles.fieldLabel}>ZIP</Text>
                <TextInput
                  style={styles.input}
                  value={zip}
                  onChangeText={setZip}
                  placeholder="38101"
                  placeholderTextColor={colors.gray3}
                  keyboardType="numeric"
                  maxLength={5}
                  returnKeyType="next"
                />
              </View>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="Anything to remember about this client..."
              placeholderTextColor={colors.gray3}
              returnKeyType="done"
            />
          </View>

          {/* Save Button (bottom) */}
          <TouchableOpacity
            style={[styles.createButton, saving && styles.createButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Save Client</Text>
            )}
          </TouchableOpacity>
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
  saveButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveText: { color: "#fff", fontSize: 13, fontWeight: "600" },
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
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.secondary,
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    minHeight: 48,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  rowFields: { flexDirection: "row", gap: 10 },
  flexField: { flex: 1 },
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
});
