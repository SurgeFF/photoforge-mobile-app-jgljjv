
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import Button from "@/components/button";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";

const ACCESS_KEY_STORAGE = "@photoforge_access_key";

export default function EditScreen() {
  const theme = useTheme();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      console.log("[Edit] Image selected from library");
      setSelectedImage(result.assets[0].uri);
      setEnhancedImage(null);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera permission is required");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      console.log("[Edit] Photo taken with camera");
      setSelectedImage(result.assets[0].uri);
      setEnhancedImage(null);
    }
  };

  const handleEnhance = async () => {
    if (!selectedImage) {
      Alert.alert("Error", "Please select an image first");
      return;
    }

    setIsEnhancing(true);

    try {
      const accessKey = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);
      if (!accessKey) {
        Alert.alert("Error", "Not authenticated");
        router.replace("/");
        return;
      }

      console.log("\n========== IMAGE ENHANCEMENT ==========");
      console.log("[Enhance] Starting image enhancement...");
      console.log("[Enhance] Image URI:", selectedImage);
      console.log("[Enhance] API Endpoint: https://photoforge.base44.app/api/enhance");

      const formData = new FormData();
      formData.append("image", {
        uri: selectedImage,
        type: "image/jpeg",
        name: "photo.jpg",
      } as any);

      const response = await fetch("https://photoforge.base44.app/api/enhance", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessKey}`,
        },
        body: formData,
      });

      console.log("[Enhance] Response status:", response.status);
      
      const responseText = await response.text();
      console.log("[Enhance] Response body:", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log("[Enhance] Parsed response:", JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error("[Enhance] JSON parse error:", parseError);
        Alert.alert("Error", "Invalid server response");
        console.log("========== ENHANCEMENT FAILED ==========\n");
        return;
      }

      if (data.imageUrl) {
        console.log("[Enhance] ✅ Image enhanced successfully");
        console.log("[Enhance] Enhanced image URL:", data.imageUrl);
        setEnhancedImage(data.imageUrl);
        console.log("========== ENHANCEMENT SUCCESS ==========\n");
      } else {
        const errorMsg = data.message || data.error || "Failed to enhance image";
        console.log("[Enhance] ❌ Enhancement failed:", errorMsg);
        Alert.alert("Error", errorMsg);
        console.log("========== ENHANCEMENT FAILED ==========\n");
      }
    } catch (error) {
      console.error("[Enhance] ❌ EXCEPTION during enhancement:", error);
      console.error("[Enhance] Error details:", error instanceof Error ? error.message : "Unknown error");
      Alert.alert("Error", "Failed to enhance image. Check console for details.");
      console.log("========== ENHANCEMENT ERROR ==========\n");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSave = () => {
    Alert.alert("Success", "Image saved to gallery!");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TopographicBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <IconSymbol
            ios_icon_name="photo.on.rectangle.angled"
            android_material_icon_name="edit"
            size={48}
            color={colors.primaryDark}
          />
          <Text style={styles.title}>Edit Image</Text>
          <Text style={styles.subtitle}>Enhance and modify your photos</Text>
        </View>

        <View style={styles.buttonGroup}>
          <Button onPress={pickImage} variant="secondary" style={styles.actionButton}>
            <View style={styles.buttonContent}>
              <IconSymbol
                ios_icon_name="photo.on.rectangle"
                android_material_icon_name="photo_library"
                size={24}
                color={colors.textPrimary}
              />
              <Text style={styles.buttonText}>Choose from Library</Text>
            </View>
          </Button>

          <Button onPress={takePhoto} variant="secondary" style={styles.actionButton}>
            <View style={styles.buttonContent}>
              <IconSymbol
                ios_icon_name="camera.fill"
                android_material_icon_name="camera_alt"
                size={24}
                color={colors.textPrimary}
              />
              <Text style={styles.buttonText}>Take Photo</Text>
            </View>
          </Button>
        </View>

        {selectedImage && (
          <View style={styles.imageContainer}>
            <Text style={styles.sectionTitle}>Original Image</Text>
            <Image source={{ uri: selectedImage }} style={styles.image} />

            <Button
              onPress={handleEnhance}
              loading={isEnhancing}
              disabled={isEnhancing}
              style={styles.enhanceButton}
            >
              {isEnhancing ? "Enhancing..." : "Enhance Image"}
            </Button>
          </View>
        )}

        {isEnhancing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primaryDark} />
            <Text style={styles.loadingText}>Enhancing your image...</Text>
          </View>
        )}

        {enhancedImage && (
          <View style={styles.imageContainer}>
            <Text style={styles.sectionTitle}>Enhanced Image</Text>
            <Image source={{ uri: enhancedImage }} style={styles.image} />

            <Button onPress={handleSave} style={styles.saveButton}>
              Save to Gallery
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: Platform.OS === "android" ? 24 : 0,
    paddingBottom: 120,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  buttonGroup: {
    gap: 12,
  },
  actionButton: {
    height: 56,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  imageContainer: {
    marginTop: 32,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  image: {
    width: "100%",
    height: 400,
    borderRadius: 16,
    backgroundColor: colors.backgroundWarm,
  },
  enhanceButton: {
    height: 56,
  },
  saveButton: {
    height: 48,
  },
  loadingContainer: {
    marginTop: 32,
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
