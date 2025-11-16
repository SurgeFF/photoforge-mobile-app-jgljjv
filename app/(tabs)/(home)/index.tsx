
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Linking,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { validateAccessKey, getProjectsMobile, checkProcessingStatusMobile, getProcessedModels } from "@/utils/apiClient";
import { startNotificationPolling, stopNotificationPolling, onNotification } from "@/utils/notificationService";
import { initializeAnalytics, trackScreenView, trackLogin, trackLogout, trackEvent } from "@/utils/analytics";
import Constants from "expo-constants";

interface FeatureCardProps {
  icon: string;
  androidIcon: string;
  title: string;
  description: string;
  onPress: () => void;
  color: string;
}

interface ProcessingProject {
  id: string;
  name: string;
  modelId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  message?: string;
}

const ACCESS_KEY_STORAGE = "@photoforge_access_key";
const PRIVACY_POLICY_URL = "https://drone1337.com/photoforgemobileprivacy";

export default function HomeScreen() {
  const theme = useTheme();
  const [accessKey, setAccessKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [projectCount, setProjectCount] = useState(0);
  const [processingProjects, setProcessingProjects] = useState<ProcessingProject[]>([]);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Get app version from app.json
  const appVersion = Constants.expoConfig?.version || "1.0.0";

  useEffect(() => {
    // Initialize analytics on app start
    initializeAnalytics().then(() => {
      trackScreenView('Home');
    });
    
    checkStoredAccessKey();
  }, []);

  useEffect(() => {
    if (isAuthenticated && accessKey) {
      loadProjects();
      
      // Start polling for payment notifications
      startNotificationPolling(accessKey);
      
      // Register notification callback
      const unsubscribe = onNotification((notification) => {
        console.log("📬 Received notification in home screen:", notification.type);
        
        // Reload projects if subscription status changed
        if (notification.type === "subscription_renewed" || notification.type === "subscription_cancelled") {
          loadProjects();
        }
      });
      
      // Cleanup on unmount
      return () => {
        unsubscribe();
        stopNotificationPolling();
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
      };
    }
  }, [isAuthenticated, accessKey]);

  // Poll for processing status
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
              progress: result.data.progress || 0,
              message: result.data.status_message || result.data.message,
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
      const result = await getProjectsMobile(accessKey);
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
                    progress: statusResult.data.progress || 0,
                    message: statusResult.data.status_message || statusResult.data.message,
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
      console.error("Error loading projects:", error);
    }
  };

  const checkStoredAccessKey = async () => {
    try {
      const storedKey = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);
      if (storedKey) {
        console.log("🔑 Found stored access key, validating...");
        const result = await validateAccessKey(storedKey);
        if (result.success) {
          setAccessKey(storedKey);
          setIsAuthenticated(true);
          console.log("✅ Auto-login successful");
          
          // Track auto-login
          trackLogin('auto_login', storedKey);
        } else {
          console.log("❌ Stored key invalid, clearing...");
          await AsyncStorage.removeItem(ACCESS_KEY_STORAGE);
        }
      }
    } catch (error) {
      console.error("Error checking stored key:", error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLogin = async () => {
    if (!accessKey.trim()) {
      Alert.alert("Error", "Please enter your access key");
      return;
    }

    setIsLoading(true);

    try {
      const result = await validateAccessKey(accessKey);

      if (result.success) {
        await AsyncStorage.setItem(ACCESS_KEY_STORAGE, accessKey);
        setIsAuthenticated(true);
        Alert.alert("Success", "Logged in successfully!");
        
        // Track login
        trackLogin('manual_login', accessKey);
      } else {
        Alert.alert("Error", result.error || "Invalid access key");
        trackEvent('login_failed', { reason: result.error || 'invalid_key' });
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Error", "Failed to login. Please try again.");
      trackEvent('login_error', { error: String(error) });
    } finally {
      setIsLoading(false);
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
            await AsyncStorage.removeItem(ACCESS_KEY_STORAGE);
            stopNotificationPolling();
            if (pollingInterval) {
              clearInterval(pollingInterval);
            }
            setAccessKey("");
            setIsAuthenticated(false);
            setProjectCount(0);
            setProcessingProjects([]);
            
            // Track logout
            trackLogout();
          },
        },
      ]
    );
  };

  const handleFlightPlanning = () => {
    if (projectCount === 0) {
      Alert.alert(
        "No Projects",
        "You need to create a project first before planning a flight.",
        [
          {
            text: "Create Project",
            onPress: () => router.push("/new-project"),
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else {
      router.push("/projects");
    }
  };

  const handlePrivacyPolicy = async () => {
    try {
      const supported = await Linking.canOpenURL(PRIVACY_POLICY_URL);
      if (supported) {
        await Linking.openURL(PRIVACY_POLICY_URL);
        trackEvent('privacy_policy_opened');
      } else {
        Alert.alert("Error", "Cannot open privacy policy URL");
      }
    } catch (error) {
      console.error("Error opening privacy policy:", error);
      Alert.alert("Error", "Failed to open privacy policy");
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

  if (isCheckingAuth) {
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

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <TopographicBackground />
        <ScrollView
          contentContainerStyle={styles.loginContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/e179f277-739f-4333-be1a-52fe84f4ba16.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.appTitle}>PhotoForge</Text>
            <Text style={styles.appSubtitle}>Drone Mapping & 3D Processing</Text>
          </View>

          <View style={styles.loginCard}>
            <Text style={styles.loginTitle}>Welcome Back</Text>
            <Text style={styles.loginSubtitle}>
              Enter your access key from PhotoForge.base44.app
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Access Key</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your access key"
                placeholderTextColor={colors.textSecondary}
                value={accessKey}
                onChangeText={setAccessKey}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </View>

            <Button
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading}
              style={styles.loginButton}
            >
              Login
            </Button>

            <View style={styles.helpBox}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.helpText}>
                Don&apos;t have an access key? Visit PhotoForge.base44.app to generate one.
              </Text>
            </View>
          </View>

          {/* Copyright Notices */}
          <View style={styles.copyrightSection}>
            <Text style={styles.copyrightText}>© DronE1337 - All rights reserved</Text>
            <Text style={styles.copyrightText}>© PhotoForge - All rights reserved</Text>
          </View>

          {/* Privacy Policy Link */}
          <Pressable onPress={handlePrivacyPolicy} style={styles.privacyPolicyContainer}>
            <Text style={styles.privacyPolicyText}>Privacy Policy</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TopographicBackground />
      
      {/* Top Bar with Home and Profile buttons */}
      <View style={styles.topBar}>
        <Pressable 
          onPress={() => router.push("/(tabs)/(home)/")} 
          style={styles.topBarButton}
        >
          <IconSymbol
            ios_icon_name="house.fill"
            android_material_icon_name="home"
            size={24}
            color={colors.primary}
          />
        </Pressable>
        
        <Text style={styles.topBarTitle}>PhotoForge</Text>
        
        <Pressable 
          onPress={() => router.push("/(tabs)/profile")} 
          style={styles.topBarButton}
        >
          <IconSymbol
            ios_icon_name="person.fill"
            android_material_icon_name="person"
            size={24}
            color={colors.primary}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <IconSymbol
              ios_icon_name="folder.fill"
              android_material_icon_name="folder"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.statValue}>{projectCount}</Text>
            <Text style={styles.statLabel}>Projects</Text>
          </View>
        </View>

        {/* Processing Status Section - Above Quick Actions */}
        {processingProjects.length > 0 && (
          <View style={styles.processingSection}>
            <Text style={styles.sectionTitle}>3D Processing Status</Text>
            {processingProjects.map((project, index) => (
              <Pressable
                key={index}
                style={styles.processingCard}
                onPress={() => {
                  router.push({
                    pathname: "/project-detail",
                    params: {
                      projectId: project.id,
                      projectName: project.name,
                    },
                  });
                }}
              >
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

                <View style={styles.processingFooter}>
                  <Text style={styles.processingFooterText}>Tap to view details</Text>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron_right"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>

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
            androidIcon="folder"
            title="My Projects"
            description="View and manage your projects"
            onPress={() => router.push("/projects")}
            color={colors.primaryDark}
          />

          <FeatureCard
            icon="map.fill"
            androidIcon="map"
            title="Flight Planning"
            description="Plan autonomous drone missions"
            onPress={handleFlightPlanning}
            color={colors.accent}
          />

          <FeatureCard
            icon="antenna.radiowaves.left.and.right"
            androidIcon="settings_remote"
            title="Drone Control"
            description="Connect and control your drone"
            onPress={() => router.push("/drone-control")}
            color={colors.success}
          />

          <FeatureCard
            icon="cube.fill"
            androidIcon="view_in_ar"
            title="3D Processing"
            description="Process images into 3D models"
            onPress={() => router.push("/autodesk-settings")}
            color={colors.warning}
          />

          <FeatureCard
            icon="creditcard.fill"
            androidIcon="payment"
            title="Subscription"
            description="Manage your subscription"
            onPress={() => router.push("/subscription")}
            color={colors.primaryDark}
          />

          <FeatureCard
            icon="heart.fill"
            androidIcon="favorite"
            title="Support Us"
            description="Make a donation"
            onPress={() => router.push("/donate")}
            color={colors.error}
          />

          <FeatureCard
            icon="questionmark.circle.fill"
            androidIcon="help"
            title="Support"
            description="Get help and submit tickets"
            onPress={() => router.push("/support")}
            color={colors.textSecondary}
          />
        </View>

        <Button
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
        >
          Logout
        </Button>

        {/* Version and Copyright Section */}
        <View style={styles.footerSection}>
          <Text style={styles.versionText}>Version {appVersion}</Text>
          <View style={styles.copyrightSection}>
            <Text style={styles.copyrightText}>© DronE1337 - All rights reserved</Text>
            <Text style={styles.copyrightText}>© PhotoForge - All rights reserved</Text>
          </View>
        </View>

        {/* Privacy Policy Link */}
        <Pressable onPress={handlePrivacyPolicy} style={styles.privacyPolicyContainer}>
          <Text style={styles.privacyPolicyText}>Privacy Policy</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
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
        <View style={styles.featureIconContainer}>
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
  loginContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoImage: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.textPrimary,
    marginTop: 16,
  },
  appSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
  },
  loginCard: {
    backgroundColor: colors.surface + "99",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
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
    backgroundColor: colors.surface + "99",
    color: colors.textPrimary,
  },
  loginButton: {
    marginBottom: 16,
  },
  helpBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    backgroundColor: colors.primary + "20",
    borderRadius: 8,
    gap: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: Platform.OS === "android" ? 48 : 12,
    backgroundColor: colors.surface + "99",
    borderBottomWidth: 1,
    borderBottomColor: colors.accentBorder,
  },
  topBarButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.backgroundLight,
  },
  topBarTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  statsCard: {
    backgroundColor: colors.surface + "99",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
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
    marginBottom: 8,
  },
  processingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  processingFooterText: {
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
  featureIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 14,
  },
  logoutButton: {
    marginTop: 8,
  },
  footerSection: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.accentBorder,
    alignItems: "center",
  },
  versionText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  copyrightSection: {
    alignItems: "center",
    gap: 8,
  },
  copyrightText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  privacyPolicyContainer: {
    alignItems: "center",
    paddingVertical: 20,
    marginTop: 16,
  },
  privacyPolicyText: {
    fontSize: 14,
    color: colors.primary,
    textDecorationLine: "underline",
  },
});
