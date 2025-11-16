
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import { getProjectsMobile, getAccessKey } from "@/utils/apiClient";

interface Project {
  id: string;
  name: string;
  location?: string;
  status: string;
  created_at: string;
  created_date?: string;
  updated_at?: string;
}

export default function ProjectsScreen() {
  const theme = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        Alert.alert("Error", "Please login first");
        router.replace("/(tabs)/(home)/");
        return;
      }

      console.log("📂 Loading projects from mobile endpoint...");
      const result = await getProjectsMobile(accessKey);
      
      if (result.success && result.data) {
        console.log("✅ Projects loaded:", result.data.length);
        setProjects(result.data);
      } else {
        console.error("❌ Failed to load projects:", result.error);
        Alert.alert("Error", result.error || "Failed to load projects");
      }
    } catch (error) {
      console.error("❌ Error loading projects:", error);
      Alert.alert("Error", "Failed to load projects");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  const handleProjectPress = (project: Project) => {
    router.push({
      pathname: "/project-detail",
      params: { projectId: project.id, projectName: project.name },
    });
  };

  const renderProject = ({ item }: { item: Project }) => (
    <Pressable
      style={styles.projectCard}
      onPress={() => handleProjectPress(item)}
    >
      <View style={styles.projectHeader}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.projectName}>{item.name}</Text>
      {item.location && (
        <View style={styles.locationContainer}>
          <IconSymbol
            ios_icon_name="location.fill"
            android_material_icon_name="location_on"
            size={16}
            color={colors.textSecondary}
          />
          <Text style={styles.projectLocation}>{item.location}</Text>
        </View>
      )}
      <Text style={styles.projectDate}>
        Created: {new Date(item.created_at || item.created_date || Date.now()).toLocaleDateString()}
      </Text>
      <View style={styles.projectFooter}>
        <IconSymbol
          ios_icon_name="chevron.right"
          android_material_icon_name="chevron_right"
          size={20}
          color={colors.textSecondary}
        />
      </View>
    </Pressable>
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return colors.success;
      case "processing":
        return colors.warning;
      case "completed":
        return colors.primary;
      case "archived":
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopographicBackground />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading projects...</Text>
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
        <Text style={styles.headerTitle}>My Projects</Text>
        <Pressable onPress={() => router.push("/new-project")} style={styles.addButton}>
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={24}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>

      {projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <IconSymbol
            ios_icon_name="folder.badge.plus"
            android_material_icon_name="create_new_folder"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.emptyTitle}>No Projects Yet</Text>
          <Text style={styles.emptyText}>
            Create your first mapping project to get started
          </Text>
          <Button
            onPress={() => router.push("/new-project")}
            style={styles.createButton}
          >
            Create Project
          </Button>
        </View>
      ) : (
        <FlatList
          data={projects}
          renderItem={renderProject}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
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
  addButton: {
    padding: 8,
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
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  projectCard: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.surface,
  },
  projectName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  projectLocation: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  projectDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  projectFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  createButton: {
    minWidth: 200,
  },
});
