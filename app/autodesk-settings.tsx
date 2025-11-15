
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

  const [quality, setQuality] = useState("high");
  const [outputFormat, setOutputFormat] = useState("obj");
  const [generateTextures, setGenerateTextures] = useState(true);
  const [generatePointCloud, setGeneratePointCloud] = useState(true);
  const [generateMesh, setGenerateMesh] = useState(true);
  const [decimationLevel, setDecimationLevel] = useState("medium");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartProcessing = async () => {
    if (!projectId) {
      Alert.alert("Error", "No project selected");
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

      const processingSettings = {
        quality,
        output_format: outputFormat,
        generate_textures: generateTextures,
        generate_point_cloud: generatePointCloud,
        generate_mesh: generateMesh,
        decimation_level: decimationLevel,
      };

      console.log("[AutodeskSettings] Starting 3D processing with settings:", processingSettings);

      const result = await autodeskRealityCapture({
        project_id: projectId,
        image_urls: [],
        processing_settings: processingSettings,
      });

      if (result.success) {
        Alert.alert(
          "Processing Started",
          "Your 3D model processing has been queued. You will be notified when it's complete.",
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

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Quality Settings</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Processing Quality</Text>
            <View style={styles.segmentedControl}>
              {["low", "medium", "high", "ultra"].map((q) => (
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
              Higher quality takes longer but produces better results
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Decimation Level</Text>
            <View style={styles.segmentedControl}>
              {["low", "medium", "high"].map((d) => (
                <Pressable
                  key={d}
                  style={[
                    styles.segmentButton,
                    decimationLevel === d && styles.segmentButtonActive,
                  ]}
                  onPress={() => setDecimationLevel(d)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      decimationLevel === d && styles.segmentTextActive,
                    ]}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.helpText}>
              Controls polygon count reduction for optimized models
            </Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Output Options</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Output Format</Text>
            <View style={styles.segmentedControl}>
              {["obj", "fbx", "ply", "stl"].map((format) => (
                <Pressable
                  key={format}
                  style={[
                    styles.segmentButton,
                    outputFormat === format && styles.segmentButtonActive,
                  ]}
                  onPress={() => setOutputFormat(format)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      outputFormat === format && styles.segmentTextActive,
                    ]}
                  >
                    {format.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <IconSymbol
                ios_icon_name="paintbrush.fill"
                android_material_icon_name="palette"
                size={20}
                color={colors.textPrimary}
              />
              <Text style={styles.switchText}>Generate Textures</Text>
            </View>
            <Switch
              value={generateTextures}
              onValueChange={setGenerateTextures}
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
              <Text style={styles.switchText}>Generate Point Cloud</Text>
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
                ios_icon_name="cube.fill"
                android_material_icon_name="view_in_ar"
                size={20}
                color={colors.textPrimary}
              />
              <Text style={styles.switchText}>Generate 3D Mesh</Text>
            </View>
            <Switch
              value={generateMesh}
              onValueChange={setGenerateMesh}
              trackColor={{ false: colors.accentBorder, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
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
              Processing time varies based on quality settings and number of images. 
              You&apos;ll receive a notification when processing is complete.
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
