import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert, RefreshControl, Modal, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useState, useCallback, useMemo } from "react";
import { useProducts } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";
import type { Product } from "@proestimate/shared/types";

const CATEGORIES = [
  "All", "Flooring", "Countertops", "Cabinetry", "Paint",
  "Roofing", "Lumber", "Plumbing", "Electrical", "Other",
];

const TIER_COLORS: Record<string, string> = {
  budget: colors.orange,
  mid: colors.accent,
  premium: colors.purple,
};

export default function MaterialsScreen() {
  const { data: products, loading, refresh } = useProducts();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Other");
  const [formUnit, setFormUnit] = useState("each");
  const [formBrand, setFormBrand] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formTier, setFormTier] = useState("mid");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const filtered = useMemo(() => {
    let result = products;
    if (activeCategory !== "All") {
      result = result.filter((p) => p.category === activeCategory);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(s) ||
        p.brand?.toLowerCase().includes(s) ||
        p.category?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [products, activeCategory, search]);

  const openAddForm = () => {
    setEditingProduct(null);
    setFormName(""); setFormCategory("Other"); setFormUnit("each");
    setFormBrand(""); setFormSku(""); setFormTier("mid");
    setShowForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormCategory(product.category ?? "Other");
    setFormUnit(product.unit ?? "each");
    setFormBrand(product.brand ?? "");
    setFormSku(product.sku_hd ?? "");
    setFormTier(product.tier ?? "mid");
    setShowForm(true);
  };

  const handleSaveProduct = async () => {
    if (!supabase || !formName.trim()) {
      Alert.alert("Error", "Product name is required");
      return;
    }
    const payload = {
      name: formName.trim(),
      category: formCategory,
      unit: formUnit || "each",
      brand: formBrand.trim() || null,
      sku_hd: formSku.trim() || null,
      tier: formTier,
      is_active: true,
    };
    if (editingProduct) {
      const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
      if (error) { Alert.alert("Error", "Failed to update product"); return; }
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { Alert.alert("Error", "Failed to add product"); return; }
    }
    setShowForm(false);
    refresh();
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert("Delete Product", `Delete "${product.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        if (!supabase) return;
        await supabase.from("products").update({ is_active: false }).eq("id", product.id);
        refresh();
      }},
    ]);
  };

  const getPrice = (p: Product): string => {
    const pricing = (p as any).unified_pricing?.[0];
    if (!pricing?.unified_price) return "—";
    return "$" + Number(pricing.unified_price).toFixed(2);
  };

  const getFreshness = (p: Product): string => {
    const pricing = (p as any).unified_pricing?.[0];
    return pricing?.freshness ?? "red";
  };

  const FRESHNESS_COLORS: Record<string, string> = {
    green: colors.green,
    yellow: "#f5c542",
    orange: colors.orange,
    red: colors.red,
  };

  const renderItem = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.row} onPress={() => openEditForm(item)} onLongPress={() => handleDeleteProduct(item)}>
      <View style={styles.rowMain}>
        <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.rowMeta}>
          {item.brand && <Text style={styles.metaText}>{item.brand}</Text>}
          <Text style={styles.metaText}>{item.category}</Text>
          <View style={[styles.tierDot, { backgroundColor: TIER_COLORS[item.tier ?? "mid"] ?? colors.accent }]} />
          <Text style={styles.metaText}>{item.tier ?? "mid"}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.price}>{getPrice(item)}</Text>
        <View style={[styles.freshDot, { backgroundColor: FRESHNESS_COLORS[getFreshness(item)] ?? colors.red }]} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{"< Back"}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Materials</Text>
        <TouchableOpacity onPress={openAddForm}>
          <Text style={styles.addText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search products..."
          placeholderTextColor={colors.gray3}
        />
      </View>

      {/* Category Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Product List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={filtered.length === 0 ? { flex: 1 } : styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Products</Text>
            <Text style={styles.emptyText}>{search ? "No matches found." : "Add products to your pricing database."}</Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingProduct ? "Edit Product" : "New Product"}</Text>
              <TouchableOpacity onPress={handleSaveProduct}>
                <Text style={styles.doneText}>Save</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.formContent}>
              <Text style={styles.fieldLabel}>Product Name *</Text>
              <TextInput style={styles.input} value={formName} onChangeText={setFormName} placeholder="e.g. LVP Flooring" placeholderTextColor={colors.gray3} />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.pillRow}>
                {CATEGORIES.filter((c) => c !== "All").map((c) => (
                  <TouchableOpacity key={c} style={[styles.pill, formCategory === c && styles.pillActive]} onPress={() => setFormCategory(c)}>
                    <Text style={[styles.pillText, formCategory === c && styles.pillTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Unit</Text>
              <TextInput style={styles.input} value={formUnit} onChangeText={setFormUnit} placeholder="sqft, each, gallon..." placeholderTextColor={colors.gray3} />

              <Text style={styles.fieldLabel}>Brand</Text>
              <TextInput style={styles.input} value={formBrand} onChangeText={setFormBrand} placeholder="Optional" placeholderTextColor={colors.gray3} />

              <Text style={styles.fieldLabel}>Home Depot SKU</Text>
              <TextInput style={styles.input} value={formSku} onChangeText={setFormSku} placeholder="Optional" placeholderTextColor={colors.gray3} />

              <Text style={styles.fieldLabel}>Tier</Text>
              <View style={styles.tierRow}>
                {(["budget", "mid", "premium"] as const).map((t) => (
                  <TouchableOpacity key={t} style={[styles.tierBtn, formTier === t && styles.tierBtnActive]} onPress={() => setFormTier(t)}>
                    <Text style={[styles.tierBtnText, formTier === t && styles.tierBtnTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
  backButton: { paddingVertical: 4 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "500" },
  headerTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  addText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  searchBar: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: colors.card },
  searchInput: {
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.sep, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  categoryScroll: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  categoryPill: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.sep,
  },
  categoryPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  categoryText: { fontSize: 12, fontWeight: "500", color: colors.secondary },
  categoryTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  row: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.sep,
    padding: 14, flexDirection: "row", alignItems: "center",
  },
  rowMain: { flex: 1 },
  productName: { fontSize: 14, fontWeight: "600", color: colors.text },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  metaText: { fontSize: 11, color: colors.secondary },
  tierDot: { width: 6, height: 6, borderRadius: 3 },
  rowRight: { alignItems: "flex-end", gap: 4 },
  price: { fontSize: 15, fontWeight: "700", color: colors.text },
  freshDot: { width: 8, height: 8, borderRadius: 4 },
  separator: { height: 8 },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.secondary, textAlign: "center" },
  // Modal
  modalSafe: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.sep,
  },
  cancelText: { color: colors.secondary, fontSize: 14, fontWeight: "500" },
  modalTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  doneText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  formContent: { padding: 16, paddingBottom: 48 },
  fieldLabel: { fontSize: 12, fontWeight: "500", color: colors.secondary, marginBottom: 4, marginTop: 14 },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.sep, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.sep },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { fontSize: 12, color: colors.secondary },
  pillTextActive: { color: "#fff" },
  tierRow: { flexDirection: "row", gap: 8 },
  tierBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.sep, alignItems: "center", backgroundColor: colors.card },
  tierBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + "12" },
  tierBtnText: { fontSize: 13, fontWeight: "500", color: colors.secondary },
  tierBtnTextActive: { color: colors.accent },
});
