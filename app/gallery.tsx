
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Button from "@/components/button";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCESS_KEY_STORAGE = "@photoforge_access_key";

interface GalleryImage {
  id: string;
  url: string;
  prompt?: string;
  createdAt: string;
}

export default function GalleryScreen() {
  const theme = useTheme();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    setIsLoading(true);

    try {
      const accessKey = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);

      const response = await fetch("https://photoforge.base44.app/api/gallery", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessKey}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.images) {
        setImages(data.images);
        console.log(`Loaded ${data.images.length} images`);
      } else {
        console.error("Failed to load gallery:", data.message);
      }
    } catch (error) {
      console.error("Gallery loading error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePress = (image: GalleryImage) => {
    setSelectedImage(image);
  };

  const handleDelete = async (imageId: string) => {
    Alert.alert(
      "Delete Image",
      "Are you sure you want to delete this image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const accessKey = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);

              const response = await fetch(
                `https://photoforge.base44.app/api/gallery/${imageId}`,
                {
                  method: "DELETE",
                  headers: {
                    "Authorization": `Bearer ${accessKey}`,
                  },
                }
              );

              if (response.ok) {
                setImages(images.filter((img) => img.id !== imageId));
                setSelectedImage(null);
                Alert.alert("Success", "Image deleted successfully");
              }
            } catch (error) {
              console.error("Delete error:", error);
              Alert.alert("Error", "Failed to delete image");
            }
          },
        },
      ]
    );
  };

  const renderImage = ({ item }: { item: GalleryImage }) => (
    <Pressable
      style={styles.imageItem}
      onPress={() => handleImagePress(item)}
    >
      <Image source={{ uri: item.url }} style={styles.thumbnail} resizeMode="cover" />
    </Pressable>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      <View style={styles.header}>
        <Button
          onPress={() => router.back()}
          variant="outline"
          size="small"
          style={styles.backButton}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={20}
            color={colors.text}
          />
        </Button>
        <Text style={styles.headerTitle}>Gallery</Text>
        <Button
          onPress={loadGallery}
          variant="outline"
          size="small"
          style={styles.refreshButton}
        >
          <IconSymbol
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={20}
            color={colors.text}
          />
        </Button>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      ) : images.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol
            ios_icon_name="photo.stack"
            android_material_icon_name="collections"
            size={80}
            color={colors.grey}
          />
          <Text style={styles.emptyTitle}>No Images Yet</Text>
          <Text style={styles.emptyDescription}>
            Your generated and edited images will appear here
          </Text>
          <Button
            onPress={() => router.push("/generate")}
            style={styles.createButton}
          >
            Create Your First Image
          </Button>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderImage}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.gridContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectedImage && (
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedImage(null)}
        >
          <View style={styles.modalContent}>
            <Image
              source={{ uri: selectedImage.url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            {selectedImage.prompt && (
              <View style={styles.promptContainer}>
                <Text style={styles.promptLabel}>Prompt:</Text>
                <Text style={styles.promptText}>{selectedImage.prompt}</Text>
              </View>
            )}
            <View style={styles.modalActions}>
              <Button
                onPress={() => handleDelete(selectedImage.id)}
                variant="outline"
                style={styles.modalButton}
              >
                Delete
              </Button>
              <Button
                onPress={() => setSelectedImage(null)}
                style={styles.modalButton}
              >
                Close
              </Button>
            </View>
          </View>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey + "33",
  },
  backButton: {
    width: 40,
    height: 40,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  refreshButton: {
    width: 40,
    height: 40,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    color: colors.grey,
    marginTop: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginTop: 24,
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.grey,
    textAlign: "center",
    marginTop: 8,
  },
  createButton: {
    marginTop: 32,
    height: 48,
  },
  gridContainer: {
    padding: 4,
    paddingBottom: 120,
  },
  imageItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 4,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: colors.backgroundAlt,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 500,
  },
  fullImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: colors.backgroundAlt,
  },
  promptContainer: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.grey,
    marginBottom: 4,
  },
  promptText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    height: 48,
  },
});
