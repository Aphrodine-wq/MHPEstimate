import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { colors } from "@/lib/theme";

interface ErrorScreenProps {
  error: Error;
  retry?: () => void;
}

export default function ErrorScreen({ error, retry }: ErrorScreenProps) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>!</Text>
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          {error?.message || "An unexpected error occurred. Please try again."}
        </Text>
        <View style={styles.actions}>
          {retry && (
            <TouchableOpacity style={styles.primaryBtn} onPress={retry} activeOpacity={0.8}>
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace("/")}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.red + "18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  icon: { fontSize: 28, fontWeight: "700", color: colors.red },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: { gap: 12, width: "100%" },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  secondaryBtn: {
    backgroundColor: colors.card,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.sep,
  },
  secondaryBtnText: { color: colors.text, fontSize: 15, fontWeight: "500" },
});
