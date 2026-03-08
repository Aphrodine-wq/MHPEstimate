import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useCurrentUser } from "@/lib/store";
import { signOut } from "@/lib/supabase";
import { colors } from "@/lib/theme";

export default function SettingsScreen() {
  const { user } = useCurrentUser();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/auth");
        },
      },
    ]);
  };

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "--";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.full_name ?? "Not signed in"}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? ""}</Text>
            <Text style={styles.profileRole}>
              {user?.role
                ? user.role.charAt(0).toUpperCase() + user.role.slice(1).replace(/_/g, " ")
                : ""}
            </Text>
          </View>
        </View>

        {/* Sections */}
        <Text style={styles.sectionLabel}>General</Text>
        <View style={styles.sectionCard}>
          <SettingsRow label="Analytics" sub="View performance metrics" />
          <View style={styles.rowSep} />
          <SettingsRow label="Call History" sub="Voice call logs" />
          <View style={styles.rowSep} />
          <SettingsRow label="Materials" sub="Product & pricing database" />
        </View>

        <Text style={styles.sectionLabel}>About</Text>
        <View style={styles.sectionCard}>
          <SettingsRow label="Version" value="1.0.0" />
          <View style={styles.rowSep} />
          <SettingsRow label="Build" value="1" />
          <View style={styles.rowSep} />
          <SettingsRow label="Platform" value="Expo + React Native" />
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.8}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({ label, sub, value }: { label: string; sub?: string; value?: string }) {
  return (
    <View style={styles.settingsRow}>
      <View style={styles.settingsRowLeft}>
        <Text style={styles.settingsLabel}>{label}</Text>
        {sub && <Text style={styles.settingsSub}>{sub}</Text>}
      </View>
      {value && <Text style={styles.settingsValue}>{value}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },
  pageTitle: { fontSize: 20, fontWeight: "700", color: colors.text, marginBottom: 20 },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.sep,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: "600", color: colors.text },
  profileEmail: { fontSize: 13, color: colors.secondary, marginTop: 2 },
  profileRole: { fontSize: 12, color: colors.accent, fontWeight: "500", marginTop: 4 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sep,
    overflow: "hidden",
    marginBottom: 20,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsRowLeft: { flex: 1 },
  settingsLabel: { fontSize: 15, color: colors.text },
  settingsSub: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  settingsValue: { fontSize: 14, color: colors.secondary },
  rowSep: { height: 1, backgroundColor: colors.sep, marginLeft: 16 },
  signOutButton: {
    backgroundColor: colors.red + "12",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  signOutText: { fontSize: 15, fontWeight: "600", color: colors.red },
});
