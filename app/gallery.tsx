
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Button from "@/components/button";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";

interface GalleryImage {
  id: string;
  url: string;
  prompt?: string;
  createdAt: string;
}

const ACCESS_KEY_STORAGE = "@photoforge_access_key";

export default function GalleryScreen() {
  const theme = useTheme();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGallery();
  }, []);

  const loadGallery = async () => {
    try {
      const accessKey = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);
      if (!accessKey) {
        router.replace("/");
        return;
      }

      console.log("\n========== GALLERY FETCH ==========");
      console.log("[Gallery] Fetching gallery images...");
      console.log("[Gallery] API Endpoint: https://photoforge.base44.app/api/gallery");

      const response = await fetch("https://photoforge.base44.app/api/gallery", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessKey}`,
        },
      });

      console.log("[Gallery] Response status:", response.status);
      
      const responseText = await response.text();
      console.log("[Gallery] Response body:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log("[Gallery] Parsed response:", JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error("[Gallery] JSON parse error:", parseError);
        console.log("========== GALLERY FETCH FAILED ==========\n");
        return;
      }

      if (data.images) {
        console.log("[Gallery] ✅ Gallery loaded successfully");
        console.log("[Gallery] Number of images:", data.images.length);
        setImages(data.images);
        console.log("========== GALLERY FETCH SUCCESS ==========\n");
      } else {
        console.log("[Gallery] ❌ No images in response");
        console.log("========== GALLERY FETCH FAILED ==========\n");
      }
    } catch (error) {
      console.error("[Gallery] ❌ EXCEPTION during gallery fetch:", error);
      console.error("[Gallery] Error details:", error instanceof Error ? error.message : "Unknown error");
      Alert.alert("Error", "Failed to load gallery. Check console for details.");
      console.log("========== GALLERY FETCH ERROR ==========\n");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePress = (image: GalleryImage) => {
    Alert.alert(
      "Image Details",
      image.prompt || "No prompt available",
      [{ text: "OK" }]
    );
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
              if (!accessKey) return;

              console.log("[Gallery] Deleting image:", imageId);

              const response = await fetch(
                `https://photoforge.base44.app/api/gallery/${imageId}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${accessKey}`,
                  },
                }
              );

              console.log("[Gallery] Delete response status:", response.status);

              if (response.ok) {
                console.log("[Gallery] ✅ Image deleted successfully");
                setImages(images.filter((img) => img.id !== imageId));
              } else {
                console.log("[Gallery] ❌ Delete failed");
                Alert.alert("Error", "Failed to delete image");
              }
            } catch (error) {
              console.error("[Gallery] Delete error:", error);
              Alert.alert("Error", "Failed to delete image");
            }
          },
        },
      ]
    );
  };

  const renderImage = ({ item }: { item: GalleryImage }) => (
    <Pressable
      style={styles.imageCard}
      onPress={() => handleImagePress(item)}
    >
      <Image source={{ uri: item.url }} style={styles.thumbnail} />
      <View style={styles.imageInfo}>
        {item.prompt && (
          <Text style={styles.promptText} numberOfLines={2}>
            {item.prompt}
          </Text>
        )}
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Pressable
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id)}
      >
        <IconSymbol
          ios_icon_name="trash.fill"
          android_material_icon_name="delete"
          size={20}
          color={colors.error}
        />
      </Pressable>
    </Pressable>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <TopographicBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopographicBackground />
      <View style={styles.content}>
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="photo.stack"
            android_material_icon_name="collections"
            size={48}
            color={colors.accent}
          />
          <Text style={styles.title}>Gallery</Text>
          <Text style={styles.subtitle}>Your created images</Text>
        </View>

        {images.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="photo.on.rectangle.angled"
              android_material_icon_name="image"
              size={64}
              color={colors.grey}
            />
            <Text style={styles.emptyText}>No images yet</Text>
            <Text style={styles.emptySubtext}>
              Generate or edit images to see them here
            </Text>
          </View>
        ) : (
          <FlatList
            data={images}
            renderItem={renderImage}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={styles.row}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 24 : 0,
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
  },
  listContent: {
    padding: 12,
    paddingBottom: 120,
  },
  row: {
    justifyContent: "space-between",
  },
  imageCard: {
    flex: 1,
    margin: 6,
    backgroundColor: colors.card,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: "100%",
    height: 150,
    backgroundColor: colors.backgroundAlt,
  },
  imageInfo: {
    padding: 12,
  },
  promptText: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  deleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.background + "CC",
    borderRadius: 20,
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 48,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
});
