
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { IconSymbol } from "@/components/IconSymbol";
import { colors } from "@/styles/commonStyles";
import { uploadFile } from "@/utils/apiClient";

interface MediaUploadZoneProps {
  projectId: string;
  onUploadComplete: (files: any[]) => void;
}

export default function MediaUploadZone({
  projectId,
  onUploadComplete,
}: MediaUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSelectImages = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 1,
        exif: true,
      });

      if (!result.canceled && result.assets) {
        await uploadImages(result.assets);
      }
    } catch (error) {
      console.error("Error selecting images:", error);
      Alert.alert("Error", "Failed to select images");
    }
  };

  const uploadImages = async (assets: any[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedFiles = [];
      const totalFiles = assets.length;

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        console.log(`[MediaUpload] Uploading image ${i + 1}/${totalFiles}`);

        // Create file object for upload
        const file = {
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}_${i}.jpg`,
          type: asset.type || "image/jpeg",
        };

        const result = await uploadFile(file);

        if (result.success && result.file_url) {
          uploadedFiles.push({
            file_url: result.file_url,
            project_id: projectId,
            exif_data: asset.exif || {},
            width: asset.width,
            height: asset.height,
          });
        }

        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      console.log(
        `[MediaUpload] Successfully uploaded ${uploadedFiles.length} files`
      );
      onUploadComplete(uploadedFiles);
      Alert.alert(
        "Success",
        `Uploaded ${uploadedFiles.length} image${uploadedFiles.length > 1 ? "s" : ""} successfully`
      );
    } catch (error) {
      console.error("Error uploading images:", error);
      Alert.alert("Error", "Failed to upload some images");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.uploadZone, isUploading && styles.uploadZoneDisabled]}
        onPress={handleSelectImages}
        disabled={isUploading}
      >
        {isUploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.uploadingText}>
              Uploading... {Math.round(uploadProgress)}%
            </Text>
          </View>
        ) : (
          <>
            <IconSymbol
              ios_icon_name="photo.badge.plus"
              android_material_icon_name="add_photo_alternate"
              size={48}
              color={colors.primary}
            />
            <Text style={styles.uploadTitle}>Upload Drone Images</Text>
            <Text style={styles.uploadSubtitle}>
              Tap to select 50-500+ images with GPS data
            </Text>
            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="info.circle"
                android_material_icon_name="info"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.infoText}>
                Images should have GPS/EXIF data for best results
              </Text>
            </View>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  uploadZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    backgroundColor: colors.surface + "40",
  },
  uploadZoneDisabled: {
    opacity: 0.6,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 16,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.backgroundLight,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  uploadingContainer: {
    alignItems: "center",
    gap: 16,
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
});
