
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
import { uploadMediaMobile, uploadMediaBatchMobile, getAccessKey } from "@/utils/apiClient";

interface MediaUploadZoneProps {
  projectId: string;
  onUploadComplete: (files: any[]) => void;
}

const MAX_FILES = 250;

export default function MediaUploadZone({
  projectId,
  onUploadComplete,
}: MediaUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");

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
        if (result.assets.length > MAX_FILES) {
          Alert.alert(
            "Too Many Files",
            `You can upload a maximum of ${MAX_FILES} files at once. Only the first ${MAX_FILES} files will be uploaded.`,
            [{ text: "OK" }]
          );
        }
        await uploadImages(result.assets.slice(0, MAX_FILES));
      }
    } catch (error) {
      console.error("Error selecting images:", error);
      Alert.alert("Error", "Failed to select images");
    }
  };

  const uploadImages = async (assets: any[]) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus("Preparing upload...");

    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        Alert.alert("Error", "Please login first");
        return;
      }

      const totalFiles = assets.length;
      console.log(`[MediaUpload] Starting upload of ${totalFiles} files to project ${projectId}`);

      // Prepare files for batch upload
      const files = assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName || `image_${Date.now()}_${index}.jpg`,
        type: asset.type || "image/jpeg",
        metadata: {
          width: asset.width,
          height: asset.height,
          exif: asset.exif || {},
        },
      }));

      setUploadStatus(`Uploading ${totalFiles} files...`);

      // Use batch upload for multiple files
      if (files.length > 1) {
        const result = await uploadMediaBatchMobile(accessKey, projectId, files);

        if (result.success && result.data) {
          const { uploaded_count, failed_count, errors } = result.data;
          
          console.log(`[MediaUpload] Batch upload completed:`);
          console.log(`  - Uploaded: ${uploaded_count}`);
          console.log(`  - Failed: ${failed_count}`);
          
          if (errors && errors.length > 0) {
            console.log(`  - Errors:`, errors);
          }

          setUploadProgress(100);
          
          // Show result to user
          if (failed_count > 0) {
            Alert.alert(
              "Upload Completed with Errors",
              `Successfully uploaded ${uploaded_count} of ${totalFiles} files.\n${failed_count} files failed to upload.`,
              [{ text: "OK" }]
            );
          } else {
            Alert.alert(
              "Success",
              `Successfully uploaded all ${uploaded_count} files!`,
              [{ text: "OK" }]
            );
          }

          // Notify parent component to refresh
          onUploadComplete([]);
        } else {
          throw new Error(result.error || "Batch upload failed");
        }
      } else if (files.length === 1) {
        // Use single upload for one file
        const file = files[0];
        setUploadStatus("Uploading file...");
        
        const result = await uploadMediaMobile(
          accessKey,
          projectId,
          file,
          file.metadata
        );

        if (result.success && result.data) {
          console.log(`[MediaUpload] Single file uploaded successfully`);
          setUploadProgress(100);
          
          Alert.alert(
            "Success",
            "File uploaded successfully!",
            [{ text: "OK" }]
          );

          // Notify parent component to refresh
          onUploadComplete([result.data]);
        } else {
          throw new Error(result.error || "Upload failed");
        }
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      Alert.alert(
        "Upload Failed",
        `Failed to upload images: ${errorMessage}`,
        [{ text: "OK" }]
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatus("");
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
            <Text style={styles.uploadingText}>{uploadStatus}</Text>
            {uploadProgress > 0 && (
              <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
            )}
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
              Tap to select images with GPS data
            </Text>
            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="info.circle"
                android_material_icon_name="info"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.infoText}>
                Max {MAX_FILES} files per upload. Images should have GPS/EXIF data for best results.
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
    textAlign: "center",
  },
  progressText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
