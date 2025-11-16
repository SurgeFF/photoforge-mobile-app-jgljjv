
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Pressable,
  Switch,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import { 
  startProcessingMobile, 
  checkProcessingStatusMobile, 
  getAccessKey, 
  getProjectsMobile 
} from "@/utils/apiClient";

interface Project {
  id: string;
  name: string;
  location?: string;
  status: string;
}

interface ProcessingStatus {
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  message?: string;
  ai_selection_info?: any;
  output_url?: string;
  error?: string;
}

export default function AutodeskSettingsScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const initialProjectId = params.projectId as string;
  const initialProjectName = params.projectName as string;

  // Project selection
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");
  const [selectedProjectName, setSelectedProjectName] = useState(initialProjectName || "");
  const [projects, setProjects] = useState<Project[]>([]);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Quality Settings
  const [quality, setQuality] = useState<"low" | "medium" | "high" | "ultra">("high");
  
  // Output Types
  const [generate3DMesh, setGenerate3DMesh] = useState(true);
  const [generateOrthomosaic, setGenerateOrthomosaic] = useState(true);
  const [generatePointCloud, setGeneratePointCloud] = useState(true);
  const [generateDEM, setGenerateDEM] = useState(false);
  
  // Output Formats
  const [meshFormat, setMeshFormat] = useState<"obj" | "fbx" | "ply" | "stl">("obj");
  const [pointCloudFormat, setPointCloudFormat] = useState<"las" | "laz" | "ply">("las");
  const [orthomosaicFormat, setOrthomosaicFormat] = useState<"geotiff" | "jpg" | "png">("geotiff");
  
  // Advanced Settings
  const [coordinateSystem, setCoordinateSystem] = useState("WGS84");
  const [useGCP, setUseGCP] = useState(false);
  const [gcpFile, setGcpFile] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Processing status polling
  const [processingModelId, setProcessingModelId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Start polling when processing starts
  useEffect(() => {
    if (processingModelId && !pollingInterval) {
      console.log("🔄 Starting status polling for model:", processingModelId);
      startStatusPolling(processingModelId);
    }
  }, [processingModelId]);

  const startStatusPolling = (modelId: string) => {
    // Poll immediately
    checkStatus(modelId);

    // Then poll every 5 seconds
    const interval = setInterval(() => {
      checkStatus(modelId);
    }, 5000);

    setPollingInterval(interval);
  };

  const checkStatus = async (modelId: string) => {
    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        console.log("❌ No access key for status check");
        return;
      }

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
                  text: "View Project",
                  onPress: () => router.back(),
                },
                {
                  text: "OK",
                  style: "cancel",
                },
              ]
            );
          } else if (result.data.status === "failed") {
            Alert.alert(
              "Processing Failed",
              result.data.error || "An error occurred during processing. Please try again.",
              [{ text: "OK" }]
            );
          }
        }
      }
    } catch (error) {
      console.error("❌ Error checking status:", error);
    }
  };

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        console.log("[AutodeskSettings] No access key found");
        return;
      }

      const result = await getProjectsMobile(accessKey);
      if (result.success && result.data) {
        setProjects(result.data);
        console.log("[AutodeskSettings] Loaded projects:", result.data.length);
      }
    } catch (error) {
      console.error("[AutodeskSettings] Error loading projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProjectId(project.id);
    setSelectedProjectName(project.name);
    setShowProjectPicker(false);
  };

  const handleStartProcessing = async () => {
    if (!selectedProjectId) {
      Alert.alert("Error", "Please select a project");
      return;
    }

    // Validate at least one output type is selected
    if (!generate3DMesh && !generateOrthomosaic && !generatePointCloud && !generateDEM) {
      Alert.alert("Error", "Please select at least one output type");
      return;
    }

    setIsProcessing(true);

    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        Alert.alert("Error", "Please login first");
        router.replace("/(tabs)/(home)/");
        return;
      }

      // Build output types array
      const outputTypes = [];
      if (generate3DMesh) outputTypes.push("mesh");
      if (generateOrthomosaic) outputTypes.push("orthomosaic");
      if (generatePointCloud) outputTypes.push("point_cloud");
      if (generateDEM) outputTypes.push("dem");

      const processingSettings = {
        quality,
        output_types: outputTypes,
        formats: {
          mesh: meshFormat,
          point_cloud: pointCloudFormat,
          orthomosaic: orthomosaicFormat,
        },
        coordinate_system: coordinateSystem,
        use_gcp: useGCP,
        gcp_file: gcpFile || undefined,
      };

      console.log("[AutodeskSettings] Starting 3D processing with settings:", processingSettings);

      const result = await startProcessingMobile(accessKey, {
        project_id: selectedProjectId,
        processing_settings: processingSettings,
      });

      if (result.success && result.data) {
        console.log("✅ Processing started successfully");
        console.log("   - Model ID:", result.data.model_id);
        console.log("   - Job ID:", result.data.job_id);

        // Start polling for status
        setProcessingModelId(result.data.model_id);
        
        Alert.alert(
          "Processing Started! 🚀",
          `Your 3D model processing has been queued.\n\nJob ID: ${result.data.job_id}\n\nProcessing status will be displayed below.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to start processing");
      }
    } catch (error) {
      console.error("Error starting 3D processing:", error);
      Alert.alert("Error", "Failed to start processing");
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
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
      case "queued":
        return { ios: "clock.fill", android: "schedule" };
      case "processing":
        return { ios: "gearshape.fill", android: "settings" };
      case "completed":
        return { ios: "checkmark.circle.fill", android: "check_circle" };
      case "failed":
        return { ios: "xmark.circle.fill", android: "error" };
      default:
        return { ios: "circle.fill", android: "circle" };
    }
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
        <Text style={styles.headerTitle}>3D Processing Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.iconContainer}>
          <IconSymbol
            ios_icon_name="cube.transparent"
            android_material_icon_name="view_in_ar"
            size={48}
            color={colors.primary}
          />
        </View>

        <Text style={styles.subtitle}>
          Configure Autodesk Reality Capture settings for 3D model generation
        </Text>

        {/* Processing Status Bar */}
        {processingStatus && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusTitleRow}>
                <IconSymbol
                  ios_icon_name={getStatusIcon(processingStatus.status).ios}
                  android_material_icon_name={getStatusIcon(processingStatus.status).android}
                  size={24}
                  color={getStatusColor(processingStatus.status)}
                />
                <Text style={styles.statusTitle}>
                  {processingStatus.status.charAt(0).toUpperCase() + processingStatus.status.slice(1)}
                </Text>
              </View>
              <Text style={styles.statusProgress}>{processingStatus.progress}%</Text>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${processingStatus.progress}%`,
                    backgroundColor: getStatusColor(processingStatus.status)
                  }
                ]} 
              />
            </View>

            {processingStatus.message && (
              <Text style={styles.statusMessage}>{processingStatus.message}</Text>
            )}

            {processingStatus.status === "processing" && (
              <View style={styles.statusSpinner}>
                <ActivityIndicator size="small" color={colors.warning} />
                <Text style={styles.statusSpinnerText}>Processing in progress...</Text>
              </View>
            )}
          </View>
        )}

        {/* Project Selection */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Select Project</Text>
          <Pressable
            style={styles.projectSelector}
            onPress={() => setShowProjectPicker(true)}
          >
            <View style={styles.projectSelectorContent}>
              <IconSymbol
                ios_icon_name="folder.fill"
                android_material_icon_name="folder"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.projectSelectorText}>
                {selectedProjectName || "Choose a project..."}
              </Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.down"
              android_material_icon_name="arrow_drop_down"
              size={24}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* Quality Settings */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Quality Settings</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Processing Quality</Text>
            <View style={styles.segmentedControl}>
              {(["low", "medium", "high", "ultra"] as const).map((q) => (
                <Pressable
                  key={q}
                  style={[
                    styles.segmentButton,
                    quality === q && styles.segmentButtonActive,
                  ]}
                  onPress={() => setQuality(q)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      quality === q && styles.segmentTextActive,
                    ]}
                  >
                    {q.charAt(0).toUpperCase() + q.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.helpText}>
              {quality === "low" && "Preview quality - Fast processing (1-2 hours)"}
              {quality === "medium" && "Standard quality - Balanced (2-4 hours)"}
              {quality === "high" && "Professional quality - Recommended (4-6 hours)"}
              {quality === "ultra" && "Maximum quality - Slow (6+ hours)"}
            </Text>
          </View>
        </View>

        {/* Output Types */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Output Types</Text>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <IconSymbol
                ios_icon_name="cube.fill"
                android_material_icon_name="view_in_ar"
                size={20}
                color={colors.textPrimary}
              />
              <Text style={styles.switchText}>3D Mesh</Text>
            </View>
            <Switch
              value={generate3DMesh}
              onValueChange={setGenerate3DMesh}
              trackColor={{ false: colors.accentBorder, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <IconSymbol
                ios_icon_name="map.fill"
                android_material_icon_name="map"
                size={20}
                color={colors.textPrimary}
              />
              <Text style={styles.switchText}>Orthomosaic (2D Map)</Text>
            </View>
            <Switch
              value={generateOrthomosaic}
              onValueChange={setGenerateOrthomosaic}
              trackColor={{ false: colors.accentBorder, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <IconSymbol
                ios_icon_name="circle.grid.3x3.fill"
                android_material_icon_name="grain"
                size={20}
                color={colors.textPrimary}
              />
              <Text style={styles.switchText}>Point Cloud</Text>
            </View>
            <Switch
              value={generatePointCloud}
              onValueChange={setGeneratePointCloud}
              trackColor={{ false: colors.accentBorder, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <IconSymbol
                ios_icon_name="mountain.2.fill"
                android_material_icon_name="terrain"
                size={20}
                color={colors.textPrimary}
              />
              <Text style={styles.switchText}>DEM (Elevation Model)</Text>
            </View>
            <Switch
              value={generateDEM}
              onValueChange={setGenerateDEM}
              trackColor={{ false: colors.accentBorder, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        {/* Output Formats */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Output Formats</Text>

          {generate3DMesh && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>3D Mesh Format</Text>
              <View style={styles.segmentedControl}>
                {(["obj", "fbx", "ply", "stl"] as const).map((format) => (
                  <Pressable
                    key={format}
                    style={[
                      styles.segmentButton,
                      meshFormat === format && styles.segmentButtonActive,
                    ]}
                    onPress={() => setMeshFormat(format)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        meshFormat === format && styles.segmentTextActive,
                      ]}
                    >
                      {format.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {generatePointCloud && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Point Cloud Format</Text>
              <View style={styles.segmentedControl}>
                {(["las", "laz", "ply"] as const).map((format) => (
                  <Pressable
                    key={format}
                    style={[
                      styles.segmentButton,
                      pointCloudFormat === format && styles.segmentButtonActive,
                    ]}
                    onPress={() => setPointCloudFormat(format)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        pointCloudFormat === format && styles.segmentTextActive,
                      ]}
                    >
                      {format.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {generateOrthomosaic && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Orthomosaic Format</Text>
              <View style={styles.segmentedControl}>
                {(["geotiff", "jpg", "png"] as const).map((format) => (
                  <Pressable
                    key={format}
                    style={[
                      styles.segmentButton,
                      orthomosaicFormat === format && styles.segmentButtonActive,
                    ]}
                    onPress={() => setOrthomosaicFormat(format)}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        orthomosaicFormat === format && styles.segmentTextActive,
                      ]}
                    >
                      {format === "geotiff" ? "GeoTIFF" : format.toUpperCase()}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Advanced Settings */}
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Advanced Settings</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Coordinate System</Text>
            <TextInput
              style={styles.input}
              placeholder="WGS84"
              placeholderTextColor={colors.textSecondary}
              value={coordinateSystem}
              onChangeText={setCoordinateSystem}
            />
            <Text style={styles.helpText}>
              Default: WGS84 (GPS coordinates)
            </Text>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <IconSymbol
                ios_icon_name="location.circle.fill"
                android_material_icon_name="my_location"
                size={20}
                color={colors.textPrimary}
              />
              <Text style={styles.switchText}>Use Ground Control Points (GCP)</Text>
            </View>
            <Switch
              value={useGCP}
              onValueChange={setUseGCP}
              trackColor={{ false: colors.accentBorder, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          {useGCP && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>GCP File URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/gcp.txt"
                placeholderTextColor={colors.textSecondary}
                value={gcpFile}
                onChangeText={setGcpFile}
              />
              <Text style={styles.helpText}>
                Optional: Provide GCP file for survey-grade accuracy
              </Text>
            </View>
          )}
        </View>

        <View style={styles.infoBox}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={24}
            color={colors.primary}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Processing Information</Text>
            <Text style={styles.infoText}>
              • Processing time varies based on quality and image count{'\n'}
              • Maximum 250 files per processing job{'\n'}
              • You&apos;ll receive a notification when complete{'\n'}
              • You can leave this page and continue using the app
            </Text>
          </View>
        </View>

        <Button
          onPress={handleStartProcessing}
          loading={isProcessing}
          disabled={isProcessing || !selectedProjectId || !!processingModelId}
          style={styles.processButton}
        >
          {isProcessing ? "Starting Processing..." : "Start 3D Processing"}
        </Button>
      </ScrollView>

      {/* Project Picker Modal */}
      <Modal
        visible={showProjectPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowProjectPicker(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowProjectPicker(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Project</Text>
              <Pressable
                onPress={() => setShowProjectPicker(false)}
                style={styles.modalCloseButton}
              >
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.textPrimary}
                />
              </Pressable>
            </View>
            {loadingProjects ? (
              <View style={styles.modalLoading}>
                <Text style={styles.modalLoadingText}>Loading projects...</Text>
              </View>
            ) : projects.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No projects found</Text>
              </View>
            ) : (
              <FlatList
                data={projects}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <Pressable
                    style={[
                      styles.projectItem,
                      selectedProjectId === item.id && styles.projectItemSelected,
                    ]}
                    onPress={() => handleProjectSelect(item)}
                  >
                    <View style={styles.projectItemContent}>
                      <IconSymbol
                        ios_icon_name="folder.fill"
                        android_material_icon_name="folder"
                        size={24}
                        color={selectedProjectId === item.id ? colors.primary : colors.textSecondary}
                      />
                      <View style={styles.projectItemText}>
                        <Text style={styles.projectItemName}>{item.name}</Text>
                        {item.location && (
                          <Text style={styles.projectItemLocation}>{item.location}</Text>
                        )}
                      </View>
                    </View>
                    {selectedProjectId === item.id && (
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check_circle"
                        size={24}
                        color={colors.primary}
                      />
                    )}
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
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
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  projectSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  projectSelectorContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  projectSelectorText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    color: colors.textPrimary,
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.surface,
  },
  helpText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  switchText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  infoBox: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: colors.primary + "20",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 24,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  processButton: {
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: Platform.OS === "android" ? 24 : 0,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.accentBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalLoading: {
    padding: 40,
    alignItems: "center",
  },
  modalLoadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalEmpty: {
    padding: 40,
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  projectItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.accentBorder,
  },
  projectItemSelected: {
    backgroundColor: colors.primary + "10",
  },
  projectItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  projectItemText: {
    flex: 1,
  },
  projectItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  projectItemLocation: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
