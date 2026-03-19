/**
 * Photo gallery for estimate job photos.
 * Supports camera capture via expo-image-picker (works without native build).
 * Photos stored in Supabase Storage under estimate-photos/{estimateId}/.
 */
import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PHOTO_SIZE = (SCREEN_WIDTH - 64 - 16) / 3; // 3 columns with gaps

const CATEGORIES = [
  "before",
  "during",
  "after",
  "issue",
  "material",
  "inspection",
] as const;

type PhotoCategory = (typeof CATEGORIES)[number];

interface JobPhoto {
  id: string;
  estimate_id: string;
  url: string;
  category: PhotoCategory;
  notes: string | null;
  created_at: string;
}

interface PhotoGalleryProps {
  estimateId: string;
}

export function PhotoGallery({ estimateId }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<JobPhoto | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<PhotoCategory | "all">("all");

  const fetchPhotos = useCallback(async () => {
    if (!supabase || !estimateId) return;
    setLoading(true);
    const { data } = await supabase
      .from("job_photos")
      .select("*")
      .eq("estimate_id", estimateId)
      .order("created_at", { ascending: false });
    setPhotos((data as JobPhoto[]) ?? []);
    setLoading(false);
  }, [estimateId]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Listen for realtime changes
  useEffect(() => {
    if (!supabase || !estimateId) return;
    const channel = supabase
      .channel(`photos-${estimateId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_photos",
          filter: `estimate_id=eq.${estimateId}`,
        },
        () => fetchPhotos()
      )
      .subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  }, [estimateId, fetchPhotos]);

  const handleTakePhoto = async () => {
    try {
      // Dynamic import to avoid crashes if not installed
      const ImagePicker = await import("expo-image-picker");

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Camera access is needed to take photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        setPendingUri(result.assets[0].uri);
        setShowCategoryPicker(true);
      }
    } catch (err) {
      Alert.alert("Error", "Camera is not available. Please try picking from gallery.");
    }
  };

  const handlePickPhoto = async () => {
    try {
      const ImagePicker = await import("expo-image-picker");

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library access is needed to select photos."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        setPendingUri(result.assets[0].uri);
        setShowCategoryPicker(true);
      }
    } catch (err) {
      Alert.alert("Error", "Could not open photo library.");
    }
  };

  const handleUploadWithCategory = async (category: PhotoCategory) => {
    if (!supabase || !pendingUri) return;
    setShowCategoryPicker(false);
    setUploading(true);

    try {
      const response = await fetch(pendingUri);
      const blob = await response.blob();

      const ext = "jpg";
      const fileName = `${estimateId}/${Date.now()}-${category}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("estimate-photos")
        .upload(fileName, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        // If bucket doesn't exist, try with a fallback approach
        // Store the photo URL as-is (local uri) and save metadata
        console.warn("Storage upload failed:", uploadError.message);

        // Save photo record with local URI as fallback
        const { error: dbError } = await supabase.from("job_photos").insert({
          estimate_id: estimateId,
          url: pendingUri,
          category,
          notes: null,
        });

        if (dbError) {
          Alert.alert("Error", "Failed to save photo record");
        } else {
          fetchPhotos();
        }
        setUploading(false);
        setPendingUri(null);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("estimate-photos").getPublicUrl(uploadData.path);

      // Save photo metadata
      const { error: dbError } = await supabase.from("job_photos").insert({
        estimate_id: estimateId,
        url: publicUrl,
        category,
        notes: null,
      });

      if (dbError) {
        Alert.alert("Error", "Photo uploaded but failed to save record");
      } else {
        fetchPhotos();
      }
    } catch (err) {
      Alert.alert(
        "Upload Failed",
        err instanceof Error ? err.message : "Could not upload photo"
      );
    }

    setUploading(false);
    setPendingUri(null);
  };

  const handleDeletePhoto = (photo: JobPhoto) => {
    Alert.alert("Delete Photo", "Remove this photo from the estimate?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!supabase) return;
          await supabase.from("job_photos").delete().eq("id", photo.id);
          setSelectedPhoto(null);
          fetchPhotos();
        },
      },
    ]);
  };

  const filteredPhotos =
    activeFilter === "all"
      ? photos
      : photos.filter((p) => p.category === activeFilter);

  const categoryLabel = (cat: string) =>
    cat.charAt(0).toUpperCase() + cat.slice(1);

  const CATEGORY_COLORS: Record<string, string> = {
    before: colors.accent,
    during: colors.orange,
    after: colors.green,
    issue: colors.red,
    material: colors.purple,
    inspection: "#8B7355",
  };

  return (
    <View style={styles.container}>
      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleTakePhoto}
          activeOpacity={0.7}
          disabled={uploading}
        >
          <Text style={styles.captureIcon}>[ ]</Text>
          <Text style={styles.captureText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={handlePickPhoto}
          activeOpacity={0.7}
          disabled={uploading}
        >
          <Text style={styles.galleryText}>From Gallery</Text>
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={styles.uploadingBar}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.uploadingText}>Uploading photo...</Text>
        </View>
      )}

      {/* Category Filter */}
      {photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[
              styles.filterPill,
              activeFilter === "all" && styles.filterPillActive,
            ]}
            onPress={() => setActiveFilter("all")}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === "all" && styles.filterTextActive,
              ]}
            >
              All ({photos.length})
            </Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => {
            const count = photos.filter((p) => p.category === cat).length;
            if (count === 0) return null;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterPill,
                  activeFilter === cat && styles.filterPillActive,
                ]}
                onPress={() => setActiveFilter(cat)}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === cat && styles.filterTextActive,
                  ]}
                >
                  {categoryLabel(cat)} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Photo Grid */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : filteredPhotos.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            {photos.length === 0
              ? "No photos yet. Take a photo to document this job."
              : "No photos in this category."}
          </Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {filteredPhotos.map((photo) => (
            <TouchableOpacity
              key={photo.id}
              style={styles.photoThumb}
              onPress={() => setSelectedPhoto(photo)}
              activeOpacity={0.7}
            >
              <Image source={{ uri: photo.url }} style={styles.thumbImage} />
              <View
                style={[
                  styles.categoryBadge,
                  {
                    backgroundColor:
                      CATEGORY_COLORS[photo.category] ?? colors.accent,
                  },
                ]}
              >
                <Text style={styles.categoryBadgeText}>
                  {categoryLabel(photo.category)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.categorySheet}>
            <Text style={styles.sheetTitle}>Photo Category</Text>
            <Text style={styles.sheetSub}>What type of photo is this?</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    {
                      borderColor: CATEGORY_COLORS[cat] ?? colors.accent,
                    },
                  ]}
                  onPress={() => handleUploadWithCategory(cat)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.categoryDot,
                      {
                        backgroundColor:
                          CATEGORY_COLORS[cat] ?? colors.accent,
                      },
                    ]}
                  />
                  <Text style={styles.categoryOptionText}>
                    {categoryLabel(cat)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowCategoryPicker(false);
                setPendingUri(null);
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Full-screen Photo Viewer */}
      <Modal
        visible={!!selectedPhoto}
        animationType="fade"
        presentationStyle="fullScreen"
      >
        <View style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <TouchableOpacity
              onPress={() => setSelectedPhoto(null)}
              style={styles.viewerClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.viewerCloseText}>Close</Text>
            </TouchableOpacity>
            {selectedPhoto && (
              <View
                style={[
                  styles.viewerCategoryBadge,
                  {
                    backgroundColor:
                      CATEGORY_COLORS[selectedPhoto.category] ?? colors.accent,
                  },
                ]}
              >
                <Text style={styles.viewerCategoryText}>
                  {categoryLabel(selectedPhoto.category)}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto)}
              style={styles.viewerDelete}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.viewerDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto.url }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          )}
          {selectedPhoto && (
            <Text style={styles.viewerDate}>
              {new Date(selectedPhoto.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  captureButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    minHeight: 48,
  },
  captureIcon: { color: "#fff", fontSize: 16, fontWeight: "600" },
  captureText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  galleryButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.sep,
    borderRadius: 10,
    paddingVertical: 14,
    minHeight: 48,
  },
  galleryText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  uploadingBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: colors.accent + "0D",
    borderRadius: 8,
    marginBottom: 12,
  },
  uploadingText: { color: colors.accent, fontSize: 13, fontWeight: "500" },
  filterRow: { gap: 8, marginBottom: 12, paddingRight: 16 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.sep,
  },
  filterPillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  filterText: { fontSize: 12, fontWeight: "500", color: colors.secondary },
  filterTextActive: { color: "#fff" },
  loadingBox: { padding: 32, alignItems: "center" },
  emptyBox: { padding: 24, alignItems: "center" },
  emptyText: { color: colors.secondary, fontSize: 13, textAlign: "center" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoThumb: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.gray5,
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  categoryBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  // Category picker sheet
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  categorySheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  sheetSub: {
    fontSize: 13,
    color: colors.secondary,
    textAlign: "center",
    marginBottom: 20,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryOption: {
    width: (SCREEN_WIDTH - 48 - 20) / 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    backgroundColor: colors.bg,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: { color: colors.secondary, fontSize: 15, fontWeight: "500" },
  // Full-screen viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  viewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
  },
  viewerClose: { paddingVertical: 8, paddingRight: 16 },
  viewerCloseText: { color: "#fff", fontSize: 15, fontWeight: "500" },
  viewerCategoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  viewerCategoryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  viewerDelete: { paddingVertical: 8, paddingLeft: 16 },
  viewerDeleteText: { color: colors.red, fontSize: 15, fontWeight: "500" },
  viewerImage: {
    flex: 1,
    width: "100%",
  },
  viewerDate: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 16,
  },
});
