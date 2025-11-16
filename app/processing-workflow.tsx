
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import MediaUploadZone from "@/components/MediaUploadZone";
import MediaGallery from "@/components/MediaGallery";
import ProcessingPanel from "@/components/ProcessingPanel";
import ModelsList from "@/components/ModelsList";
import {
  getMediaFiles,
  getProcessedModels,
  getAccessKey,
} from "@/utils/apiClient";

type WorkflowStep = "upload" | "review" | "configure" | "processing" | "results";

export default function ProcessingWorkflowScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams();
  const projectId = params.projectId as string;
  const projectName = params.projectName as string;

  const [currentStep, setCurrentStep] = useState<WorkflowStep>("upload");
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingStatus, setProcessingStatus] = useState<{
    jobId?: string;
    status: "idle" | "processing" | "completed" | "failed";
    progress?: number;
    stage?: string;
    estimatedTime?: string;
  }>({
    status: "idle",
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        Alert.alert("Error", "Please login first");
        router.replace("/(tabs)/(home)/");
        return;
      }

      const [mediaResult, modelsResult] = await Promise.all([
        getMediaFiles(accessKey, projectId),
        getProcessedModels(accessKey, projectId),
      ]);

      if (mediaResult.success && mediaResult.data) {
        setMediaFiles(mediaResult.data);
        if (mediaResult.data.length > 0) {
          setCurrentStep("review");
        }
      }

      if (modelsResult.success && modelsResult.data) {
        setModels(modelsResult.data);
        if (modelsResult.data.length > 0) {
          setCurrentStep("results");
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load project data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadComplete = (files: any[]) => {
    setMediaFiles([...mediaFiles, ...files]);
    setCurrentStep("review");
  };

  const handleDeleteMedia = (fileId: string) => {
    setMediaFiles(mediaFiles.filter((f) => f.id !== fileId));
  };

  const handleStartProcessing = () => {
    router.push({
      pathname: "/autodesk-settings",
      params: { projectId, projectName },
    });
  };

  const handleViewResults = () => {
    setCurrentStep("results");
  };

  const handleModelPress = (model: any) => {
    Alert.alert(
      "3D Model Viewer",
      "3D model viewer feature coming soon!\n\nYou can download the model files for now.",
      [{ text: "OK" }]
    );
  };

  const handleDownload = (model: any, type: string) => {
    Alert.alert(
      "Download",
      `Downloading ${type} for ${model.name}...\n\nFeature coming soon!`,
      [{ text: "OK" }]
    );
  };

  const renderStepIndicator = () => {
    const steps: { key: WorkflowStep; label: string; icon: string; androidIcon: string }[] = [
      { key: "upload", label: "Upload", icon: "arrow.up.circle", androidIcon: "upload" },
      { key: "review", label: "Review", icon: "eye", androidIcon: "visibility" },
      { key: "configure", label: "Configure", icon: "gearshape", androidIcon: "settings" },
      { key: "processing", label: "Processing", icon: "gearshape.2", androidIcon: "sync" },
      { key: "results", label: "Results", icon: "checkmark.circle", androidIcon: "check_circle" },
    ];

    const currentIndex = steps.findIndex((s) => s.key === currentStep);

    return (
      <View style={styles.stepIndicator}>
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  index <= currentIndex && styles.stepCircleActive,
                ]}
              >
                <IconSymbol
                  ios_icon_name={step.icon}
                  android_material_icon_name={step.androidIcon}
                  size={20}
                  color={index <= currentIndex ? colors.surface : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  index <= currentIndex && styles.stepLabelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  index < currentIndex && styles.stepConnectorActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopographicBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
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
          {projectName || "3D Processing"}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {renderStepIndicator()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {/* Step 1: Upload Images */}
        {currentStep === "upload" && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 1: Upload Drone Images</Text>
            <Text style={styles.stepDescription}>
              Upload 50-500+ drone photos with GPS/EXIF data for best results
            </Text>
            <View style={styles.warningBox}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={20}
                color={colors.warning}
              />
              <Text style={styles.warningText}>
                Maximum 250 files per processing job
              </Text>
            </View>
            <MediaUploadZone
              projectId={projectId}
              onUploadComplete={handleUploadComplete}
            />
          </View>
        )}

        {/* Step 2: Review Images */}
        {currentStep === "review" && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 2: Review Images</Text>
            <Text style={styles.stepDescription}>
              Verify complete coverage and delete poor quality images
            </Text>
            <View style={styles.infoBox}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.infoText}>
                {mediaFiles.length} files uploaded (max 250 per job)
              </Text>
            </View>
            <MediaGallery
              mediaFiles={mediaFiles}
              onDelete={handleDeleteMedia}
              onRefresh={loadData}
            />
            <View style={styles.actionButtons}>
              <Button
                onPress={() => setCurrentStep("upload")}
                variant="outline"
                style={styles.actionButton}
              >
                Upload More
              </Button>
              <Button
                onPress={handleStartProcessing}
                style={styles.actionButton}
                disabled={mediaFiles.length === 0}
              >
                Configure Processing
              </Button>
            </View>
          </View>
        )}

        {/* Step 3: Processing */}
        {currentStep === "processing" && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 3: Processing</Text>
            <Text style={styles.stepDescription}>
              Your 3D model is being generated using photogrammetry
            </Text>
            <ProcessingPanel
              jobId={processingStatus.jobId}
              status={processingStatus.status}
              progress={processingStatus.progress}
              stage={processingStatus.stage}
              estimatedTimeRemaining={processingStatus.estimatedTime}
              onViewResults={handleViewResults}
            />
          </View>
        )}

        {/* Step 4: Results */}
        {currentStep === "results" && (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Step 4: View Results</Text>
            <Text style={styles.stepDescription}>
              Your processed 3D models are ready to view and download
            </Text>
            <ModelsList
              models={models}
              onModelPress={handleModelPress}
              onDownload={handleDownload}
            />
            <View style={styles.actionButtons}>
              <Button
                onPress={() => setCurrentStep("review")}
                variant="outline"
                style={styles.actionButton}
              >
                Process More Images
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
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface + "CC",
    borderBottomWidth: 1,
    borderBottomColor: colors.accentBorder,
  },
  stepItem: {
    alignItems: "center",
    gap: 4,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundLight,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.accentBorder,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  stepLabelActive: {
    color: colors.primary,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.accentBorder,
    marginHorizontal: 4,
  },
  stepConnectorActive: {
    backgroundColor: colors.primary,
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
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.warning + "20",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: colors.primary + "20",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
  },
});
