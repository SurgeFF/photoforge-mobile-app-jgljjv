
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Button from "@/components/button";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { router } from "expo-router";
import TopographicBackground from "@/components/TopographicBackground";
import { validateAccessKey, getProjects, checkProcessingStatusMobile, getProcessedModels } from "@/utils/apiClient";
import { SafeAreaView } from "react-native-safe-area-context";

const ACCESS_KEY_STORAGE = "@photoforge_access_key";

interface ProcessingProject {
  id: string;
  name: string;
  modelId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  message?: string;
}

export default function HomeScreen() {
  const theme = useTheme();
  const [accessKey, setAccessKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [projectCount, setProjectCount] = useState(0);
  const [processingProjects, setProcessingProjects] = useState<ProcessingProject[]>([]);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    checkStoredAccessKey();
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessKey) {
      loadProjects();
    }
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [isAuthenticated, accessKey]);

  useEffect(() => {
    if (processingProjects.length > 0 && !pollingInterval) {
      const interval = setInterval(() => {
        checkProcessingStatuses();
      }, 5000);
      setPollingInterval(interval);
    } else if (processingProjects.length === 0 && pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
  }, [processingProjects]);

  const checkProcessingStatuses = async () => {
    if (!accessKey) return;

    const updatedProjects = await Promise.all(
      processingProjects.map(async (project) => {
        try {
          const result = await checkProcessingStatusMobile(accessKey, project.modelId);
          if (result.success && result.data) {
            return {
              ...project,
              status: result.data.status,
              progress: result.data.progress,
              message: result.data.message,
            };
          }
        } catch (error) {
          console.error("Error checking processing status:", error);
        }
        return project;
      })
    );

    setProcessingProjects(updatedProjects.filter(p => p.status === "processing" || p.status === "queued"));
  };

  const loadProjects = async () => {
    try {
      const result = await getProjects(accessKey);
      if (result.success && result.data) {
        setProjectCount(result.data.length);
        
        // Check for processing models
        const processing: ProcessingProject[] = [];
        for (const project of result.data) {
          try {
            const modelsResult = await getProcessedModels(accessKey, project.id);
            if (modelsResult.success && modelsResult.data) {
              const processingModel = modelsResult.data.find(
                (model: any) => model.status === "processing" || model.status === "queued"
              );
              
              if (processingModel) {
                const statusResult = await checkProcessingStatusMobile(accessKey, processingModel.id);
                if (statusResult.success && statusResult.data) {
                  processing.push({
                    id: project.id,
                    name: project.name,
                    modelId: processingModel.id,
                    status: statusResult.data.status,
                    progress: statusResult.data.progress,
                    message: statusResult.data.message,
                  });
                }
              }
            }
          } catch (error) {
            console.error("Error checking project models:", error);
          }
        }
        setProcessingProjects(processing);
      }
    } catch (error) {
      console.error("[HomeScreen] Error loading projects:", error);
    }
  };

  const checkStoredAccessKey = async () => {
    try {
      const storedKey = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);
      const storedUser = await AsyncStorage.getItem("@photoforge_user_name");
      
      console.log("[HomeScreen] Checking stored access key...");
      if (storedKey) {
        console.log("[HomeScreen] Found stored access key, length:", storedKey.length);
        setAccessKey(storedKey);
        setIsAuthenticated(true);
        if (storedUser) {
          setUserName(storedUser);
        }
      } else {
        console.log("[HomeScreen] No stored access key found");
      }
    } catch (error) {
      console.error("[HomeScreen] Error loading access key:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!accessKey.trim()) {
      setError("Please enter your access key");
      return;
    }

    setIsValidating(true);
    setError("");

    try {
      const result = await validateAccessKey(accessKey.trim());

      if (result.success && result.data) {
        console.log("[HomeScreen] ✅ Login successful");
        await AsyncStorage.setItem(ACCESS_KEY_STORAGE, accessKey.trim());
        await AsyncStorage.setItem("@photoforge_user_name", result.data.full_name || result.data.email);
        setIsAuthenticated(true);
        setUserName(result.data.full_name || result.data.email);
      } else {
        const errorMsg = result.error || "Invalid access key. Please check and try again.";
        console.log("[HomeScreen] ❌ Login failed:", errorMsg);
        setError(errorMsg);
        
        if (__DEV__) {
          Alert.alert(
            "Validation Failed",
            `Error: ${errorMsg}\n\nCheck console for detailed logs.`,
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      console.error("[HomeScreen] ❌ Exception during login:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Unable to validate: ${errorMessage}`);
      
      if (__DEV__) {
        Alert.alert(
          "Network Error",
          `Error: ${errorMessage}\n\nMake sure you have internet connection and the server is accessible.\n\nCheck console for detailed logs.`,
          [{ text: "OK" }]
        );
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            console.log("[HomeScreen] Logging out...");
            await AsyncStorage.removeItem(ACCESS_KEY_STORAGE);
            await AsyncStorage.removeItem("@photoforge_user_name");
            if (pollingInterval) {
              clearInterval(pollingInterval);
            }
            setIsAuthenticated(false);
            setAccessKey("");
            setUserName("");
            setProjectCount(0);
            setProcessingProjects([]);
            console.log("[HomeScreen] Logged out successfully");
          },
        },
      ]
    );
  };

  const handleFlightPlanning = () => {
    console.log("[HomeScreen] 🛫 Navigating to Flight Planning...");
    try {
      router.push({
        pathname: "/flight-planning",
        params: {
          projectId: "new",
          projectName: "New Flight Plan",
        },
      });
      console.log("[HomeScreen] ✅ Navigation initiated");
    } catch (error) {
      console.error("[HomeScreen] ❌ Navigation error:", error);
      Alert.alert("Error", "Failed to open Flight Planning. Please try again.");
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

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.backgroundLight }]}>
        <TopographicBackground />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <TopographicBackground />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.loginContainer}>
            <View style={styles.logoContainer}>
              <View style={styles.iconWrapper}>
                <IconSymbol
                  ios_icon_name="map.fill"
                  android_material_icon_name="map"
                  size={64}
                  color={colors.surface}
                />
              </View>
              <Text style={styles.title}>PhotoForge</Text>
              <Text style={styles.subtitle}>Drone Mapping & Photogrammetry</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Access Key</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: error ? colors.error : colors.accentBorder,
                  },
                ]}
                placeholder="Enter your access key"
                placeholderTextColor={colors.textSecondary}
                value={accessKey}
                onChangeText={(text) => {
                  setAccessKey(text);
                  setError("");
                }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              {error ? (
                <View style={styles.errorContainer}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle.fill"
                    android_material_icon_name="error"
                    size={16}
                    color={colors.error}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                onPress={handleLogin}
                loading={isValidating}
                disabled={isValidating}
                style={styles.loginButton}
              >
                {isValidating ? "Validating..." : "Login"}
              </Button>

              <View style={styles.infoContainer}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.infoText}>
                  Get your access key from PhotoForge.base44.app
                </Text>
              </View>
              
              {__DEV__ && (
                <View style={styles.debugContainer}>
                  <Text style={styles.debugText}>
                    🔍 Debug Mode Active
                  </Text>
                  <Text style={styles.debugSubtext}>
                    Check console logs for detailed validation information
                  </Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Main authenticated view - Dashboard
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopographicBackground />
      
      {/* Top Bar with Title Only */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>PhotoForge</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.mainContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="folder.fill"
              android_material_icon_name="folder"
              size={28}
              color={colors.primary}
            />
            <Text style={styles.statNumber}>{projectCount}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="photo.stack.fill"
              android_material_icon_name="collections"
              size={28}
              color={colors.primaryDark}
            />
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>Images</Text>
          </View>
          <View style={styles.statCard}>
            <IconSymbol
              ios_icon_name="cube.fill"
              android_material_icon_name="view_in_ar"
              size={28}
              color={colors.primary}
            />
            <Text style={styles.statNumber}>-</Text>
            <Text style={styles.statLabel}>Models</Text>
          </View>
        </View>

        {/* Processing Status Section */}
        {processingProjects.length > 0 && (
          <View style={styles.processingSection}>
            <Text style={styles.sectionTitle}>Processing</Text>
            {processingProjects.map((project, index) => (
              <View key={index} style={styles.processingCard}>
                <View style={styles.processingHeader}>
                  <View style={styles.processingTitleRow}>
                    <IconSymbol
                      ios_icon_name={project.status === "processing" ? "gearshape.fill" : "clock.fill"}
                      android_material_icon_name={project.status === "processing" ? "settings" : "schedule"}
                      size={20}
                      color={getStatusColor(project.status)}
                    />
                    <Text style={styles.processingProjectName} numberOfLines={1}>
                      {project.name}
                    </Text>
                  </View>
                  <Text style={styles.processingProgress}>{project.progress}%</Text>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { 
                        width: `${project.progress}%`,
                        backgroundColor: getStatusColor(project.status)
                      }
                    ]} 
                  />
                </View>

                {project.message && (
                  <Text style={styles.processingMessage} numberOfLines={1}>
                    {project.message}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        {/* Two-column grid */}
        <View style={styles.featuresGrid}>
          <FeatureCard
            icon="folder.badge.plus"
            androidIcon="create_new_folder"
            title="New Project"
            description="Create a new mapping project"
            onPress={() => router.push("/new-project")}
            color={colors.primary}
          />

          <FeatureCard
            icon="folder.fill"
            androidIcon="folder_open"
            title="My Projects"
            description="View and manage your projects"
            onPress={() => router.push("/projects")}
            color={colors.primaryDark}
          />

          <FeatureCard
            icon="airplane"
            androidIcon="flight"
            title="Flight Planning"
            description="Plan autonomous drone missions"
            onPress={handleFlightPlanning}
            color={colors.primary}
          />

          <FeatureCard
            icon="antenna.radiowaves.left.and.right"
            androidIcon="settings_remote"
            title="Drone Control"
            description="Connect and control your DJI drone"
            onPress={() => router.push("/drone-control")}
            color={colors.primaryDark}
          />

          <FeatureCard
            icon="cube.transparent"
            androidIcon="view_in_ar"
            title="3D Processing"
            description="Configure Autodesk 3D processing settings"
            onPress={() => router.push("/autodesk-settings")}
            color={colors.primary}
          />

          <FeatureCard
            icon="photo.stack"
            androidIcon="collections"
            title="Media Gallery"
            description="View project images and models"
            onPress={() => router.push("/gallery")}
            color={colors.primaryDark}
          />

          <FeatureCard
            icon="creditcard.fill"
            androidIcon="payment"
            title="Subscription"
            description="Manage your subscription plan"
            onPress={() => router.push("/subscription")}
            color={colors.primary}
          />

          <FeatureCard
            icon="heart.fill"
            androidIcon="favorite"
            title="Donate"
            description="Support PhotoForge development"
            onPress={() => router.push("/donate")}
            color={colors.primaryDark}
          />

          <FeatureCard
            icon="headphones"
            androidIcon="support_agent"
            title="Support"
            description="Get help and submit tickets"
            onPress={() => router.push("/support")}
            color={colors.primary}
          />
        </View>

        <Button
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
        >
          Logout
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

interface FeatureCardProps {
  icon: string;
  androidIcon: string;
  title: string;
  description: string;
  onPress: () => void;
  color: string;
}

function FeatureCard({ icon, androidIcon, title, description, onPress, color }: FeatureCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.featureCard,
        pressed && styles.featureCardPressed,
      ]}
    >
      <View style={styles.featureContent}>
        <View style={styles.iconContainer}>
          <IconSymbol
            ios_icon_name={icon}
            android_material_icon_name={androidIcon}
            size={32}
            color={color}
          />
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  mainContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 140,
  },
  loginContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  formContainer: {
    width: "100%",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    backgroundColor: colors.surface + '99',
    color: colors.textPrimary,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    flex: 1,
  },
  loginButton: {
    marginTop: 24,
    height: 56,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    padding: 16,
    backgroundColor: colors.surface + '99',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 12,
    flex: 1,
  },
  debugContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.warning + "20",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  debugText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.warning,
    marginBottom: 4,
  },
  debugSubtext: {
    fontSize: 12,
    color: colors.warning,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface + "99",
    borderBottomWidth: 1,
    borderBottomColor: colors.accentBorder,
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface + '99',
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  processingSection: {
    marginBottom: 24,
  },
  processingCard: {
    backgroundColor: colors.surface + "99",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  processingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  processingTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  processingProjectName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    flex: 1,
  },
  processingProgress: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.accentBorder,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  processingMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    minHeight: 160,
  },
  featureCardPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  featureContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
    color: colors.textPrimary,
    textAlign: "center",
  },
  featureDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 14,
  },
  logoutButton: {
    marginTop: 8,
    height: 48,
  },
});
