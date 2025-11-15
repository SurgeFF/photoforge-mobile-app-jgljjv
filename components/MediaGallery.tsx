
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  Modal,
  Alert,
  Dimensions,
} from "react-native";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import Button from "@/components/button";

interface MediaFile {
  id: string;
  file_url: string;
  thumbnail_url?: string;
  exif_data?: any;
  created_at?: string;
}

interface MediaGalleryProps {
  mediaFiles: MediaFile[];
  onDelete?: (fileId: string) => void;
  onRefresh?: () => void;
}

const { width } = Dimensions.get("window");
const ITEM_SIZE = (width - 48) / 3;

export default function MediaGallery({
  mediaFiles,
  onDelete,
  onRefresh,
}: MediaGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<MediaFile | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const handleDelete = (fileId: string) => {
    Alert.alert(
      "Delete Image",
      "Are you sure you want to delete this image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete?.(fileId);
            setSelectedImage(null);
          },
        },
      ]
    );
  };

  const renderGridItem = ({ item }: { item: MediaFile }) => (
    <Pressable
      style={styles.gridItem}
      onPress={() => setSelectedImage(item)}
    >
      <Image
        source={{ uri: item.thumbnail_url || item.file_url }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      {item.exif_data?.GPSLatitude && (
        <View style={styles.gpsIndicator}>
          <IconSymbol
            ios_icon_name="location.fill"
            android_material_icon_name="location_on"
            size={12}
            color={colors.surface}
          />
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Media Gallery ({mediaFiles.length} images)
        </Text>
        <View style={styles.viewToggle}>
          <Pressable
            style={[
              styles.toggleButton,
              viewMode === "grid" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("grid")}
          >
            <IconSymbol
              ios_icon_name="square.grid.3x3"
              android_material_icon_name="grid_view"
              size={20}
              color={viewMode === "grid" ? colors.surface : colors.textSecondary}
            />
          </Pressable>
          <Pressable
            style={[
              styles.toggleButton,
              viewMode === "map" && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode("map")}
          >
            <IconSymbol
              ios_icon_name="map"
              android_material_icon_name="map"
              size={20}
              color={viewMode === "map" ? colors.surface : colors.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      {viewMode === "grid" ? (
        <FlatList
          data={mediaFiles}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.mapPlaceholder}>
          <IconSymbol
            ios_icon_name="map"
            android_material_icon_name="map"
            size={48}
            color={colors.textSecondary}
          />
          <Text style={styles.mapPlaceholderText}>
            Map view showing GPS locations
          </Text>
          <Text style={styles.mapPlaceholderSubtext}>
            Feature coming soon
          </Text>
        </View>
      )}

      {/* Full Image Modal */}
      <Modal
        visible={selectedImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setSelectedImage(null)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setSelectedImage(null)}
                style={styles.closeButton}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.textPrimary}
                />
              </Pressable>
              {selectedImage && onDelete && (
                <Pressable
                  onPress={() => handleDelete(selectedImage.id)}
                  style={styles.deleteButton}
                >
                  <IconSymbol
                    ios_icon_name="trash"
                    android_material_icon_name="delete"
                    size={24}
                    color={colors.error}
                  />
                </Pressable>
              )}
            </View>
            {selectedImage && (
              <>
                <Image
                  source={{ uri: selectedImage.file_url }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
                {selectedImage.exif_data && (
                  <View style={styles.exifInfo}>
                    <Text style={styles.exifTitle}>Image Info</Text>
                    {selectedImage.exif_data.GPSLatitude && (
                      <Text style={styles.exifText}>
                        GPS: {selectedImage.exif_data.GPSLatitude},{" "}
                        {selectedImage.exif_data.GPSLongitude}
                      </Text>
                    )}
                    {selectedImage.exif_data.DateTime && (
                      <Text style={styles.exifText}>
                        Date: {selectedImage.exif_data.DateTime}
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: colors.surface + "CC",
    borderRadius: 8,
    padding: 4,
    gap: 4,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  gridContainer: {
    gap: 4,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: 2,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  gpsIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 4,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginTop: 16,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  closeButton: {
    padding: 8,
    backgroundColor: colors.surface + "CC",
    borderRadius: 20,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: colors.surface + "CC",
    borderRadius: 20,
  },
  fullImage: {
    width: "100%",
    height: "70%",
  },
  exifInfo: {
    padding: 16,
    backgroundColor: colors.surface + "CC",
    margin: 16,
    borderRadius: 12,
  },
  exifTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  exifText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
});
