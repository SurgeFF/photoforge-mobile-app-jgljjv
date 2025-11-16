
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import {
  getProcessedModels,
  getAccessKey,
  getProjectById,
} from "@/utils/apiClient";

interface ProcessedModel {
  id: string;
  name?: string;
  model_name?: string;
  model_type?: string;
  status: string;
  output_url?: string;
  thumbnail_url?: string;
  file_size?: number;
  resolution?: string;
  created_date?: string;
  download_urls?: {
    mesh?: string;
    textures?: string;
    point_cloud?: string;
    orthomosaic?: string;
  };
  coordinate_system?: string;
  poly_count?: number;
}

export default function CompletedModelsScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;
  const projectName = params.projectName as string;

  const [models, setModels] = useState<ProcessedModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "user">("user");

  useEffect(() => {
    loadCompletedModels();
  }, [projectId]);

  const loadCompletedModels = async () => {
    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        Alert.alert("Error", "Please login first");
        router.replace("/(tabs)/(home)/");
        return;
      }

      // Get project to check user role
      const projectResult = await getProjectById(accessKey, projectId);
      if (projectResult.success && projectResult.data) {
        // TODO: Get actual user role from project data
        // For now, assume user role
        setUserRole("user");
      }

      const modelsResult = await getProcessedModels(accessKey, projectId);

      if (modelsResult.success && modelsResult.data) {
        // Filter only completed models
        const completedModels = modelsResult.data.filter(
          (model: ProcessedModel) => model.status === "completed"
        );
        setModels(completedModels);
      }
    } catch (error) {
      console.error("Error loading completed models:", error);
      Alert.alert("Error", "Failed to load completed models");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadModel = (model: ProcessedModel, type: string) => {
    const downloadUrl = model.download_urls?.[type as keyof typeof model.download_urls] || model.output_url;
    
    if (!downloadUrl) {
      Alert.alert("Error", "Download URL not available for this model");
      return;
    }

    Alert.alert(
      "Download Model",
      `Download ${type} for ${model.name || model.model_name}?\n\nThis will open in your browser.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Download",
          onPress: async () => {
            try {
              const supported = await Linking.canOpenURL(downloadUrl);
              if (supported) {
                await Linking.openURL(downloadUrl);
              } else {
                Alert.alert("Error", "Cannot open download URL");
              }
            } catch (error) {
              console.error("Download error:", error);
              Alert.alert("Error", "Failed to open download link");
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) {
      return `${mb.toFixed(2)} MB`;
    }
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const formatPolyCount = (count?: number): string => {
    if (!count) return "N/A";
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };

  const renderModel = (model: ProcessedModel, index: number) => {
    const modelName = model.name || model.model_name || `Model ${index + 1}`;
    const hasDownloads = model.download_urls || model.output_url;

    return (
      <View key={model.id || index} style={styles.modelCard}>
        <View style={styles.modelHeader}>
          <View style={styles.modelTitleRow}>
            <IconSymbol
              ios_icon_name="cube.fill"
              android_material_icon_name="view_in_ar"
              size={28}
              color={colors.primary}
            />
            <Text style={styles.modelName} numberOfLines={2}>
              {modelName}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <IconSymbol
              ios_icon_name="checkmark.circle.fill"
              android_material_icon_name="check_circle"
              size={16}
              color={colors.success}
            />
            <Text style={[styles.statusBadgeText, { color: colors.success }]}>
              COMPLETED
            </Text>
          </View>
        </View>

        <View style={styles.modelDetails}>
          {model.model_type && (
            <View style={styles.detailRow}>
              <IconSymbol
                ios_icon_name="tag.fill"
                android_material_icon_name="label"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.detailText}>Type: {model.model_type}</Text>
            </View>
          )}

          {model.resolution && (
            <View style={styles.detailRow}>
              <IconSymbol
                ios_icon_name="viewfinder"
                android_material_icon_name="aspect_ratio"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.detailText}>Resolution: {model.resolution}</Text>
            </View>
          )}

          {model.file_size && (
            <View style={styles.detailRow}>
              <IconSymbol
                ios_icon_name="doc.fill"
                android_material_icon_name="description"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.detailText}>Size: {formatFileSize(model.file_size)}</Text>
            </View>
          )}

          {model.poly_count && (
            <View style={styles.detailRow}>
              <IconSymbol
                ios_icon_name="square.grid.3x3.fill"
                android_material_icon_name="grid_on"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.detailText}>Polygons: {formatPolyCount(model.poly_count)}</Text>
            </View>
          )}

          {model.coordinate_system && (
            <View style={styles.detailRow}>
              <IconSymbol
                ios_icon_name="globe"
                android_material_icon_name="public"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.detailText}>Coordinate System: {model.coordinate_system}</Text>
            </View>
          )}

          {model.created_date && (
            <View style={styles.detailRow}>
              <IconSymbol
                ios_icon_name="calendar"
                android_material_icon_name="event"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles.detailText}>
                Created: {new Date(model.created_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {hasDownloads && (
          <View style={styles.downloadSection}>
            <Text style={styles.downloadTitle}>Download Options:</Text>
            <View style={styles.downloadButtons}>
              {model.download_urls?.mesh && (
                <Pressable
                  style={styles.downloadButton}
                  onPress={() => handleDownloadModel(model, "mesh")}
                >
                  <IconSymbol
                    ios_icon_name="arrow.down.circle.fill"
                    android_material_icon_name="download"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.downloadButtonText}>Mesh</Text>
                </Pressable>
              )}
              {model.download_urls?.textures && (
                <Pressable
                  style={styles.downloadButton}
                  onPress={() => handleDownloadModel(model, "textures")}
                >
                  <IconSymbol
                    ios_icon_name="arrow.down.circle.fill"
                    android_material_icon_name="download"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.downloadButtonText}>Textures</Text>
                </Pressable>
              )}
              {model.download_urls?.point_cloud && (
                <Pressable
                  style={styles.downloadButton}
                  onPress={() => handleDownloadModel(model, "point_cloud")}
                >
                  <IconSymbol
                    ios_icon_name="arrow.down.circle.fill"
                    android_material_icon_name="download"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.downloadButtonText}>Point Cloud</Text>
                </Pressable>
              )}
              {model.download_urls?.orthomosaic && (
                <Pressable
                  style={styles.downloadButton}
                  onPress={() => handleDownloadModel(model, "orthomosaic")}
                >
                  <IconSymbol
                    ios_icon_name="arrow.down.circle.fill"
                    android_material_icon_name="download"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.downloadButtonText}>Orthomosaic</Text>
                </Pressable>
              )}
              {model.output_url && !model.download_urls && (
                <Pressable
                  style={styles.downloadButton}
                  onPress={() => handleDownloadModel(model, "output")}
                >
                  <IconSymbol
                    ios_icon_name="arrow.down.circle.fill"
                    android_material_icon_name="download"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.downloadButtonText}>Download</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopographicBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading completed models...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle} numberOfLines={1}>
          Completed 3D Models
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.projectInfo}>
          <Text style={styles.projectName}>{projectName || "Project"}</Text>
          <Text style={styles.projectSubtitle}>
            All completed 3D models ready for download
          </Text>
        </View>

        {userRole === "user" && (
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="info.circle.fill"
              android_material_icon_name="info"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              You have view and download access to these completed models.
            </Text>
          </View>
        )}

        <View style={styles.statsCard}>
          <IconSymbol
            ios_icon_name="cube.fill"
            android_material_icon_name="view_in_ar"
            size={40}
            color={colors.primary}
          />
          <Text style={styles.statsNumber}>{models.length}</Text>
          <Text style={styles.statsLabel}>Completed Models</Text>
        </View>

        {models.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="cube.transparent"
              android_material_icon_name="view_in_ar"
              size={64}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyStateTitle}>No Completed Models</Text>
            <Text style={styles.emptyStateText}>
              There are no completed 3D models for this project yet. Start processing to create your first model.
            </Text>
            <Button
              onPress={() => {
                router.push({
                  pathname: "/processing-workflow",
                  params: { projectId, projectName },
                });
              }}
              style={styles.emptyStateButton}
            >
              Start Processing
            </Button>
          </View>
        ) : (
          <View style={styles.modelsSection}>
            {models.map((model, index) => renderModel(model, index))}
          </View>
        )}

        {/* Copyright Notices */}
        <View style={styles.copyrightSection}>
          <Text style={styles.copyrightText}>© DronE1337 - All rights reserved</Text>
          <Text style={styles.copyrightText}>© PhotoForge - All rights reserved</Text>
        </View>
      </ScrollView>
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
    marginHorizontal: 8,
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  projectInfo: {
    marginBottom: 24,
  },
  projectName: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  projectSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.primary + "20",
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  statsCard: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  statsNumber: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 12,
  },
  statsLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyStateButton: {
    minWidth: 200,
  },
  modelsSection: {
    gap: 16,
  },
  modelCard: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  modelHeader: {
    marginBottom: 16,
  },
  modelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  modelName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.success + "20",
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  modelDetails: {
    gap: 10,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  downloadSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.accentBorder,
  },
  downloadTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  downloadButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.primary + "20",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  copyrightSection: {
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.accentBorder,
    alignItems: "center",
    gap: 8,
  },
  copyrightText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
