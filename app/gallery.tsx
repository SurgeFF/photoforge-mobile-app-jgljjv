
import Button from "@/components/button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@react-navigation/native";
import { IconSymbol } from "@/components/IconSymbol";
import { router } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import TopographicBackground from "@/components/TopographicBackground";
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
      setIsLoading(true);
      // TODO: Load gallery images from backend
      // For now, just show empty state
      setImages([]);
    } catch (error) {
      console.error("[Gallery] Error loading gallery:", error);
      Alert.alert("Error", "Failed to load gallery");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePress = (image: GalleryImage) => {
    console.log("[Gallery] Image pressed:", image.id);
    // TODO: Show full screen image viewer
  };

  const handleDelete = (imageId: string) => {
    Alert.alert(
      "Delete Image",
      "Are you sure you want to delete this image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            console.log("[Gallery] Deleting image:", imageId);
            // TODO: Delete image from backend
            setImages(images.filter((img) => img.id !== imageId));
          },
        },
      ]
    );
  };

  const renderImage = ({ item }: { item: GalleryImage }) => {
    return (
      <Pressable
        style={styles.imageCard}
        onPress={() => handleImagePress(item)}
      >
        <Image source={{ uri: item.url }} style={styles.image} />
        <View style={styles.imageOverlay}>
          <Pressable
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
          >
            <IconSymbol
              ios_icon_name="trash.fill"
              android_material_icon_name="delete"
              size={20}
              color={colors.surface}
            />
          </Pressable>
        </View>
        {item.prompt && (
          <View style={styles.promptContainer}>
            <Text style={styles.promptText} numberOfLines={2}>
              {item.prompt}
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopographicBackground />
      
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Media Gallery</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      ) : images.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="photo.stack"
            android_material_icon_name="collections"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>No Images Yet</Text>
          <Text style={styles.emptySubtitle}>
            Your generated images will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={images}
          renderItem={renderImage}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === "android" ? 48 : 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
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
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 24,
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  columnWrapper: {
    gap: 16,
  },
  imageCard: {
    flex: 1,
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: colors.backgroundLight,
  },
  imageOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.error,
    alignItems: "center",
    justifyContent: "center",
  },
  promptContainer: {
    padding: 12,
  },
  promptText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
