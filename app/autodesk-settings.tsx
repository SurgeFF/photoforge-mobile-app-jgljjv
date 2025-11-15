
import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import { autodeskRealityCapture, getAccessKey } from "@/utils/apiClient";

export default function AutodeskSettingsScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;
  const projectName = params.projectName as string;

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

  const handleStartProcessing = async () => {
    if (!projectId) {
      Alert.alert("Error", "No project selected");
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

      const result = await autodeskRealityCapture({
        project_id: projectId,
        image_urls: [], // Will be fetched from project media files on backend
        processing_settings: processingSettings,
      });

      if (result.success) {
        Alert.alert(
          "Processing Started",
          `Your 3D model processing has been queued.\n\nJob ID: ${result.job_id}\n\nYou will be notified when it's complete.`,
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
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

        {projectName && (
          <View style={styles.projectInfo}>
            <IconSymbol
              ios_icon_name="folder.fill"
              android_material_icon_name="folder"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.projectName}>{projectName}</Text>
          </View>
        )}

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
            <Text style={styles.infoTitle}>Processing Time</Text>
            <Text style={styles.infoText}>
              Processing time varies based on quality settings and number of images (50-500+). 
              You&apos;ll receive a notification when processing is complete. You can leave this 
              page and continue using the app.
            </Text>
          </View>
        </View>

        <Button
          onPress={handleStartProcessing}
          loading={isProcessing}
          disabled={isProcessing}
          style={styles.processButton}
        >
          {isProcessing ? "Starting Processing..." : "Start 3D Processing"}
        </Button>
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
  projectInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
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
});
