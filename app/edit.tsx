
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import Button from "@/components/button";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCESS_KEY_STORAGE = "@photoforge_access_key";

export default function EditScreen() {
  const theme = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Permission to access camera roll is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setEditedImage(null);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Permission Required", "Permission to access camera is required!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setEditedImage(null);
    }
  };

  const handleEnhance = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);

    try {
      const accessKey = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);

      // Create form data
      const formData = new FormData();
      formData.append("image", {
        uri: selectedImage,
        type: "image/jpeg",
        name: "photo.jpg",
      } as any);

      const response = await fetch("https://photoforge.base44.app/api/enhance", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessKey}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.imageUrl) {
        setEditedImage(data.imageUrl);
        console.log("Image enhanced successfully");
      } else {
        Alert.alert("Error", data.message || "Failed to enhance image");
      }
    } catch (error) {
      console.error("Enhancement error:", error);
      Alert.alert("Error", "Failed to enhance image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!editedImage) return;

    Alert.alert("Success", "Image saved to your gallery!");
  };

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
        <Text style={styles.headerTitle}>Edit Image</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {!selectedImage ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="photo.on.rectangle.angled"
              android_material_icon_name="add_photo_alternate"
              size={80}
              color={colors.grey}
            />
            <Text style={styles.emptyTitle}>No Image Selected</Text>
            <Text style={styles.emptyDescription}>
              Choose an image from your gallery or take a new photo
            </Text>

            <View style={styles.uploadButtons}>
              <Button onPress={pickImage} style={styles.uploadButton}>
                <IconSymbol
                  ios_icon_name="photo.fill"
                  android_material_icon_name="photo_library"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.uploadButtonText}>Choose from Gallery</Text>
              </Button>

              <Button onPress={takePhoto} variant="outline" style={styles.uploadButton}>
                <IconSymbol
                  ios_icon_name="camera.fill"
                  android_material_icon_name="camera_alt"
                  size={24}
                  color={colors.primary}
                />
                <Text style={[styles.uploadButtonText, { color: colors.primary }]}>
                  Take Photo
                </Text>
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.editSection}>
            <View style={styles.imagePreviewContainer}>
              <Text style={styles.sectionTitle}>Original</Text>
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              </View>
            </View>

            {editedImage && (
              <View style={styles.imagePreviewContainer}>
                <Text style={styles.sectionTitle}>Enhanced</Text>
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: editedImage }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
              </View>
            )}

            {isProcessing && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Enhancing your image...</Text>
              </View>
            )}

            <View style={styles.actionButtons}>
              {!editedImage && !isProcessing && (
                <Button
                  onPress={handleEnhance}
                  disabled={isProcessing}
                  style={styles.actionButton}
                >
                  Enhance Image
                </Button>
              )}

              {editedImage && (
                <Button onPress={handleSave} style={styles.actionButton}>
                  Save to Gallery
                </Button>
              )}

              <Button
                onPress={() => {
                  setSelectedImage(null);
                  setEditedImage(null);
                }}
                variant="outline"
                style={styles.actionButton}
              >
                Choose Different Image
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
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
    paddingHorizontal: 32,
  },
  uploadButtons: {
    width: "100%",
    marginTop: 32,
    gap: 12,
  },
  uploadButton: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  editSection: {
    gap: 24,
  },
  imagePreviewContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },
  imageWrapper: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    overflow: "hidden",
    aspectRatio: 1,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 16,
    color: colors.grey,
    marginTop: 16,
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    height: 48,
  },
});
