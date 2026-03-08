import { View, Text, StyleSheet } from "react-native";
import type { EstimateStatus, InvoiceStatus } from "@proestimate/shared/types";
import { colors } from "@/lib/theme";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "#e5e5ea", text: "#636366" },
  in_review: { bg: "#fff3e0", text: "#e65100" },
  revision_requested: { bg: "#fff3e0", text: "#e65100" },
  approved: { bg: "#e8f5e9", text: "#2e7d32" },
  sent: { bg: "#e3f2fd", text: "#1565c0" },
  accepted: { bg: "#e8f5e9", text: "#2e7d32" },
  declined: { bg: "#ffebee", text: "#c62828" },
  expired: { bg: "#e5e5ea", text: "#636366" },
  pending: { bg: "#fff3e0", text: "#e65100" },
  processing: { bg: "#e3f2fd", text: "#1565c0" },
  review: { bg: "#fff3e0", text: "#e65100" },
  confirmed: { bg: "#e8f5e9", text: "#2e7d32" },
  error: { bg: "#ffebee", text: "#c62828" },
};

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return (
    <View style={[styles.badge, { backgroundColor: color.bg }]}>
      <Text style={[styles.text, { color: color.text }]}>{formatStatus(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});
