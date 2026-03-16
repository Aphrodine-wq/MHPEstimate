import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState, useCallback } from "react";
import { useClients } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/EmptyState";
import { colors } from "@/lib/theme";
import type { Client } from "@proestimate/shared/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";
}

export default function ClientsScreen() {
  const { data: clients, loading, refresh } = useClients();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleAddClient = () => {
    Alert.prompt(
      "Add Client",
      "Enter client's full name:",
      async (name) => {
        if (!name?.trim() || !supabase) return;
        const { error } = await supabase.from("clients").insert({ full_name: name.trim() });
        if (error) {
          Alert.alert("Error", "Failed to add client");
        } else {
          Alert.alert("Success", "Client added");
        }
      },
      "plain-text"
    );
  };

  const filtered = search
    ? clients.filter((c) =>
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  const renderItem = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/client/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.full_name}</Text>
        {item.email && <Text style={styles.detail}>{item.email}</Text>}
        {item.phone && <Text style={styles.detail}>{item.phone}</Text>}
        {(item.city || item.state) && (
          <Text style={styles.detail}>
            {[item.city, item.state].filter(Boolean).join(", ")}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Clients</Text>
        <Text style={styles.count}>{clients.length} total</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search clients..."
          placeholderTextColor={colors.gray3}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No Clients"
            message={search ? "No clients match your search." : "Add your first client to get started."}
            actionLabel={search ? undefined : "Add Client"}
            onAction={search ? undefined : handleAddClient}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAddClient} activeOpacity={0.8}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text },
  count: { fontSize: 13, color: colors.secondary },
  searchContainer: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  emptyList: { flex: 1 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.sep,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  detail: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  separator: { height: 8 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: "#fff", fontSize: 28, fontWeight: "400", marginTop: -2 },
});
