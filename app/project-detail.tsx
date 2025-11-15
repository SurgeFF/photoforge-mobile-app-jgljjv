
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
import {
  getProjectById,
  getMediaFiles,
  getProcessedModels,
  getAccessKey,
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

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

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
      }
    } catch (error) {
      console.error("Error loading project data:", error);
      Alert.alert("Error", "Failed to load project data");
    } finally {
      setIsLoading(false);
    }
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
            onPress={() => {
              router.push({
                pathname: "/flight-planning",
                params: { projectId, projectName },
              });
            }}
            style={styles.actionButton}
          >
            <View style={styles.buttonContent}>
              <IconSymbol
                ios_icon_name="airplane"
                android_material_icon_name="flight"
                size={24}
                color={colors.surface}
              />
              <Text style={styles.buttonText}>Plan Flight</Text>
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
  actionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
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
});
