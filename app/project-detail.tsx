
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
  getProjectById,
  getMediaFiles,
  getProcessedModels,
  getAccessKey,
  checkProcessingStatusMobile,
} from "@/utils/apiClient";

export default function ProjectDetailScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;
  const projectName = params.projectName as string;

  const [project, setProject] = useState<any>(null);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Processing status polling
  const [processingStatus, setProcessingStatus] = useState<any>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const loadProjectData = async () => {
    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        Alert.alert("Error", "Please login first");
        router.replace("/(tabs)/(home)/");
        return;
      }

      const [projectResult, mediaResult, modelsResult] = await Promise.all([
        getProjectById(accessKey, projectId),
        getMediaFiles(accessKey, projectId),
        getProcessedModels(accessKey, projectId),
      ]);

      if (projectResult.success && projectResult.data) {
        setProject(projectResult.data);
      }

      if (mediaResult.success && mediaResult.data) {
        setMediaFiles(mediaResult.data);
      }

      if (modelsResult.success && modelsResult.data) {
        setModels(modelsResult.data);
        
        // Check for processing models
        const processingModel = modelsResult.data.find(
          (model: any) => model.status === "processing" || model.status === "queued"
        );

        if (processingModel) {
          console.log("🔄 Found processing model:", processingModel.id);
          startStatusPolling(accessKey, processingModel.id);
        }
      }
    } catch (error) {
      console.error("Error loading project data:", error);
      Alert.alert("Error", "Failed to load project data");
    } finally {
      setIsLoading(false);
    }
  };

  const startStatusPolling = (accessKey: string, modelId: string) => {
    // Poll immediately
    checkStatus(accessKey, modelId);

    // Then poll every 5 seconds
    const interval = setInterval(() => {
      checkStatus(accessKey, modelId);
    }, 5000);

    setPollingInterval(interval);
  };

  const checkStatus = async (accessKey: string, modelId: string) => {
    try {
      const result = await checkProcessingStatusMobile(accessKey, modelId);
      
      if (result.success && result.data) {
        console.log("📊 Processing status:", result.data.status, "-", result.data.progress + "%");
        setProcessingStatus(result.data);

        // Stop polling if completed or failed
        if (result.data.status === "completed" || result.data.status === "failed") {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }

          if (result.data.status === "completed") {
            Alert.alert(
              "Processing Complete! 🎉",
              "Your 3D model has been successfully processed and is ready to view.",
              [
                {
                  text: "Refresh",
                  onPress: () => loadProjectData(),
                },
                {
                  text: "OK",
                  style: "cancel",
                },
              ]
            );
          }
        }
      }
    } catch (error) {
      console.error("❌ Error checking status:", error);
    }
  };

  const handleFlightPlanning = () => {
    console.log("🛫 Navigating to flight planning with:", { projectId, projectName });
    try {
      router.push({
        pathname: "/flight-planning",
        params: { 
          projectId: projectId || "unknown",
          projectName: projectName || "Unnamed Project"
        },
      });
    } catch (error) {
      console.error("❌ Navigation error:", error);
      Alert.alert("Error", "Failed to navigate to flight planning");
    }
  };

  const handleDownloadModel = (model: any, type: string) => {
    const downloadUrl = model.download_urls?.[type] || model.output_url;
    
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

  const getProcessingStatusColor = (status: string) => {
    switch (status) {
      case "queued":
        return colors.textSecondary;
      case "processing":
        return colors.warning;
      case "completed":
        return colors.success;
      case "failed":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "processing":
        return { ios: "gearshape.fill", android: "settings" };
      case "queued":
        return { ios: "clock.fill", android: "schedule" };
      case "completed":
        return { ios: "checkmark.circle.fill", android: "check_circle" };
      case "failed":
        return { ios: "xmark.circle.fill", android: "error" };
      default:
        return { ios: "circle.fill", android: "circle" };
    }
  };

  const renderCompletedModel = (model: any, index: number) => {
    const modelName = model.name || model.model_name || `Model ${index + 1}`;
    const hasDownloads = model.download_urls || model.output_url;

    return (
      <View key={model.id || index} style={styles.modelCard}>
        <View style={styles.modelHeader}>
          <View style={styles.modelTitleRow}>
            <IconSymbol
              ios_icon_name="cube.fill"
              android_material_icon_name="view_in_ar"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.modelName} numberOfLines={1}>
              {modelName}
            </Text>
          </View>
          {model.status && (
            <View style={[styles.statusBadge, { backgroundColor: getProcessingStatusColor(model.status) + "20" }]}>
              <Text style={[styles.statusBadgeText, { color: getProcessingStatusColor(model.status) }]}>
                {model.status}
              </Text>
            </View>
          )}
        </View>

        {model.model_type && (
          <Text style={styles.modelType}>Type: {model.model_type}</Text>
        )}

        {model.resolution && (
          <Text style={styles.modelDetail}>Resolution: {model.resolution}</Text>
        )}

        {model.file_size && (
          <Text style={styles.modelDetail}>
            Size: {(model.file_size / (1024 * 1024)).toFixed(2)} MB
          </Text>
        )}

        {model.created_date && (
          <Text style={styles.modelDetail}>
            Created: {new Date(model.created_date).toLocaleDateString()}
          </Text>
        )}

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
                    size={16}
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
                    size={16}
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
                    size={16}
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
                    size={16}
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
                    size={16}
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
          <Text style={styles.loadingText}>Loading project...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const completedModels = models.filter((m) => m.status === "completed");

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
          {projectName || "Project Details"}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {project && (
          <View style={styles.projectInfo}>
            <Text style={styles.projectName}>{project.name}</Text>
            {project.location && (
              <View style={styles.locationContainer}>
                <IconSymbol
                  ios_icon_name="location.fill"
                  android_material_icon_name="location_on"
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={styles.locationText}>{project.location}</Text>
              </View>
            )}
            {project.description && (
              <Text style={styles.description}>{project.description}</Text>
            )}
          </View>
        )}

        {/* Processing Status Bar */}
        {processingStatus && processingStatus.status && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusTitleRow}>
                <IconSymbol
                  ios_icon_name={getStatusIcon(processingStatus.status).ios}
                  android_material_icon_name={getStatusIcon(processingStatus.status).android}
                  size={24}
                  color={getProcessingStatusColor(processingStatus.status)}
                />
                <Text style={styles.statusTitle}>
                  {processingStatus.status ? 
                    processingStatus.status.charAt(0).toUpperCase() + processingStatus.status.slice(1) : 
                    "Unknown"}
                </Text>
              </View>
              <Text style={styles.statusProgress}>{processingStatus.progress || 0}%</Text>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${processingStatus.progress || 0}%`,
                    backgroundColor: getProcessingStatusColor(processingStatus.status)
                  }
                ]} 
              />
            </View>

            {processingStatus.status_message && (
              <Text style={styles.statusMessage}>{processingStatus.status_message}</Text>
            )}

            {processingStatus.uploaded_files !== undefined && processingStatus.total_files !== undefined && (
              <Text style={styles.statusMessage}>
                Files: {processingStatus.uploaded_files} / {processingStatus.total_files}
              </Text>
            )}

            {processingStatus.status === "processing" && (
              <View style={styles.statusSpinner}>
                <ActivityIndicator size="small" color={colors.warning} />
                <Text style={styles.statusSpinnerText}>Processing in progress...</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="photo.stack.fill"
              android_material_icon_name="collections"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.statNumber}>{mediaFiles.length}</Text>
            <Text style={styles.statLabel}>Media Files</Text>
          </View>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="cube.fill"
              android_material_icon_name="view_in_ar"
              size={32}
              color={colors.primaryDark}
            />
            <Text style={styles.statNumber}>{models.length}</Text>
            <Text style={styles.statLabel}>3D Models</Text>
          </View>
        </View>

        {/* Completed 3D Models Section */}
        {completedModels.length > 0 && (
          <View style={styles.modelsSection}>
            <Text style={styles.sectionTitle}>Completed 3D Models ({completedModels.length})</Text>
            {completedModels.map((model, index) => renderCompletedModel(model, index))}
          </View>
        )}

        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <Button
            onPress={() => {
              router.push({
                pathname: "/processing-workflow",
                params: { projectId, projectName },
              });
            }}
            style={styles.actionButton}
          >
            <View style={styles.buttonContent}>
              <IconSymbol
                ios_icon_name="cube.transparent"
                android_material_icon_name="view_in_ar"
                size={24}
                color={colors.surface}
              />
              <Text style={styles.buttonText}>3D Image Processing</Text>
            </View>
          </Button>

          <Button
            onPress={handleFlightPlanning}
            style={styles.actionButton}
          >
            <View style={styles.buttonContent}>
              <IconSymbol
                ios_icon_name="airplane"
                android_material_icon_name="flight"
                size={24}
                color={colors.surface}
              />
              <Text style={styles.buttonText}>Flight Planning</Text>
            </View>
          </Button>

          <Button
            onPress={() => {
              router.push({
                pathname: "/drone-control",
              });
            }}
            variant="outline"
            style={styles.actionButton}
          >
            <View style={styles.buttonContent}>
              <IconSymbol
                ios_icon_name="antenna.radiowaves.left.and.right"
                android_material_icon_name="settings_remote"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.buttonText, { color: colors.primary }]}>
                Drone Control
              </Text>
            </View>
          </Button>

          <Button
            onPress={() => {
              router.push("/donate");
            }}
            variant="outline"
            style={styles.actionButton}
          >
            <View style={styles.buttonContent}>
              <IconSymbol
                ios_icon_name="heart.fill"
                android_material_icon_name="favorite"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.buttonText, { color: colors.primary }]}>
                Support Project
              </Text>
            </View>
          </Button>
        </View>

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
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  locationText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  statusCard: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  statusProgress: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.accentBorder,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statusSpinner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  statusSpinnerText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  modelsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  modelCard: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  modelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  modelName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  modelType: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  modelDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  downloadSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.accentBorder,
  },
  downloadTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  downloadButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.primary + "20",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  downloadButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionButton: {
    marginBottom: 12,
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
    color: colors.surface,
  },
  copyrightSection: {
    marginTop: 32,
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
