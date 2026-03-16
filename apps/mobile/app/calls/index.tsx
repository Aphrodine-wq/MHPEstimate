import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import { useVoiceCalls } from "@/lib/store-extra";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/lib/theme";
import type { VoiceCall } from "@proestimate/shared/types";

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " at " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function CallHistoryScreen() {
  const { data: calls, loading, refresh } = useVoiceCalls();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const renderItem = ({ item }: { item: VoiceCall }) => {
    const isExpanded = expandedId === item.id;
    const estimatesCreated = (item.estimates_created as string[] | null)?.length ?? 0;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.rowTop}>
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: item.source === "twilio" ? colors.accent + "18" : colors.green + "18" }]}>
            <Text style={[styles.iconText, { color: item.source === "twilio" ? colors.accent : colors.green }]}>
              {item.source === "twilio" ? "P" : "A"}
            </Text>
          </View>

          {/* Info */}
          <View style={styles.callInfo}>
            <View style={styles.callHeader}>
              <Text style={styles.callSource}>
                {item.source === "twilio" ? "Phone Call" : "In-App Call"}
              </Text>
              <View style={[styles.sourceBadge, { backgroundColor: item.source === "twilio" ? colors.accent + "18" : colors.green + "18" }]}>
                <Text style={[styles.sourceBadgeText, { color: item.source === "twilio" ? colors.accent : colors.green }]}>
                  {item.source}
                </Text>
              </View>
            </View>
            <View style={styles.callMeta}>
              <Text style={styles.metaText}>{formatDuration(item.duration_sec)}</Text>
              {estimatesCreated > 0 && (
                <Text style={styles.metaText}> · {estimatesCreated} estimate{estimatesCreated > 1 ? "s" : ""} created</Text>
              )}
            </View>
          </View>

          {/* Time */}
          <View style={styles.callTime}>
            <Text style={styles.timeText}>{formatDateTime(item.started_at ?? item.created_at)}</Text>
            <Text style={styles.chevron}>{isExpanded ? "^" : "v"}</Text>
          </View>
        </View>

        {/* Transcript */}
        {isExpanded && (
          <View style={styles.transcriptBox}>
            <Text style={styles.transcriptLabel}>Transcript</Text>
            <Text style={styles.transcriptText}>
              {item.transcript || "No transcript available."}
            </Text>
            {item.extracted_data && (
              <View style={styles.extractedBox}>
                <Text style={styles.transcriptLabel}>Extracted Data</Text>
                <Text style={styles.extractedText}>
                  {typeof item.extracted_data === "string"
                    ? item.extracted_data
                    : JSON.stringify(item.extracted_data, null, 2)}
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call History</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={calls}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={calls.length === 0 ? { flex: 1 } : styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          <EmptyState
            title="No Calls"
            message={loading ? "Loading..." : "Voice call history will appear here."}
          />
        }
      />
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
  backButton: { paddingVertical: 4, width: 60 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "500" },
  headerTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  row: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.sep,
    padding: 14,
  },
  rowTop: { flexDirection: "row", alignItems: "flex-start" },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  iconText: { fontSize: 16, fontWeight: "700" },
  callInfo: { flex: 1 },
  callHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  callSource: { fontSize: 14, fontWeight: "600", color: colors.text },
  sourceBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sourceBadgeText: { fontSize: 10, fontWeight: "600" },
  callMeta: { flexDirection: "row", marginTop: 4 },
  metaText: { fontSize: 12, color: colors.secondary },
  callTime: { alignItems: "flex-end" },
  timeText: { fontSize: 11, color: colors.secondary },
  chevron: { fontSize: 12, color: colors.gray3, marginTop: 4 },
  transcriptBox: {
    marginTop: 12, padding: 12,
    backgroundColor: colors.bg, borderRadius: 8,
    borderWidth: 1, borderColor: colors.sep,
  },
  transcriptLabel: { fontSize: 11, fontWeight: "600", color: colors.secondary, textTransform: "uppercase", marginBottom: 6 },
  transcriptText: { fontSize: 13, color: colors.text, lineHeight: 20 },
  extractedBox: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.sep },
  extractedText: { fontSize: 12, color: colors.text, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", lineHeight: 18 },
  separator: { height: 8 },
});
