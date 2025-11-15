
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
} from "react-native";
import { useTheme } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Button from "@/components/button";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import { router } from "expo-router";
import TopographicBackground from "@/components/TopographicBackground";

const ACCESS_KEY_STORAGE = "@photoforge_access_key";

export default function HomeScreen() {
  const theme = useTheme();
  const [accessKey, setAccessKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkStoredAccessKey();
  }, []);

  const checkStoredAccessKey = async () => {
    try {
      const storedKey = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);
      console.log("[HomeScreen] Checking stored access key...");
      if (storedKey) {
        console.log("[HomeScreen] Found stored access key, length:", storedKey.length);
        setAccessKey(storedKey);
        setIsAuthenticated(true);
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
      console.log("\n========== ACCESS KEY VALIDATION ==========");
      console.log("[Validation] Starting validation process...");
      console.log("[Validation] API Endpoint: https://photoforge.base44.app/api/validate-key");
      console.log("[Validation] Access key (first 10 chars):", accessKey.trim().substring(0, 10) + "...");
      console.log("[Validation] Access key length:", accessKey.trim().length);
      console.log("[Validation] Timestamp:", new Date().toISOString());
      
      const requestBody = { accessKey: accessKey.trim() };
      console.log("[Validation] Request body:", JSON.stringify(requestBody));
      
      const response = await fetch("https://photoforge.base44.app/api/validate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("[Validation] Response received");
      console.log("[Validation] Response status:", response.status);
      console.log("[Validation] Response ok:", response.ok);
      console.log("[Validation] Response status text:", response.statusText);
      
      const responseText = await response.text();
      console.log("[Validation] Response body (raw):", responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log("[Validation] Parsed response data:", JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error("[Validation] JSON parse error:", parseError);
        console.error("[Validation] Failed to parse response as JSON");
        console.error("[Validation] Raw response:", responseText.substring(0, 200));
        setError(`Server error: Invalid response format`);
        console.log("========== VALIDATION FAILED ==========\n");
        return;
      }

      if (response.ok && data.isValid) {
        console.log("[Validation] ✅ Access key is VALID");
        await AsyncStorage.setItem(ACCESS_KEY_STORAGE, accessKey.trim());
        console.log("[Validation] Access key stored successfully");
        setIsAuthenticated(true);
        console.log("========== VALIDATION SUCCESS ==========\n");
      } else {
        const errorMsg = data.message || data.error || "Invalid access key. Please check and try again.";
        console.log("[Validation] ❌ Access key is INVALID");
        console.log("[Validation] Error message:", errorMsg);
        console.log("[Validation] Full error data:", JSON.stringify(data, null, 2));
        setError(errorMsg);
        
        if (__DEV__) {
          Alert.alert(
            "Validation Failed",
            `Status: ${response.status}\nMessage: ${errorMsg}\n\nCheck console for detailed logs.`,
            [{ text: "OK" }]
          );
        }
        console.log("========== VALIDATION FAILED ==========\n");
      }
    } catch (error) {
      console.error("[Validation] ❌ EXCEPTION occurred during validation");
      console.error("[Validation] Error type:", error?.constructor?.name);
      console.error("[Validation] Error message:", error instanceof Error ? error.message : "Unknown error");
      console.error("[Validation] Error stack:", error instanceof Error ? error.stack : "No stack trace");
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setError(`Unable to validate: ${errorMessage}`);
      
      if (__DEV__) {
        Alert.alert(
          "Network Error",
          `Error: ${errorMessage}\n\nMake sure you have internet connection and the server is accessible.\n\nCheck console for detailed logs.`,
          [{ text: "OK" }]
        );
      }
      console.log("========== VALIDATION ERROR ==========\n");
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
            setIsAuthenticated(false);
            setAccessKey("");
            console.log("[HomeScreen] Logged out successfully");
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
                  ios_icon_name="photo.stack.fill"
                  android_material_icon_name="photo_library"
                  size={64}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.title}>PhotoForge</Text>
              <Text style={styles.subtitle}>AI-Powered Image Generation</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Access Key</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: error ? colors.error : colors.border,
                  },
                ]}
                placeholder="Enter your access key"
                placeholderTextColor={colors.grey}
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

  // Main authenticated view
  return (
    <View style={styles.container}>
      <TopographicBackground />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.mainContent}
      >
        <View style={styles.header}>
          <Text style={styles.welcomeTitle}>PhotoForge Studio</Text>
          <Text style={styles.welcomeSubtitle}>Create stunning AI-powered images</Text>
        </View>

        <View style={styles.featuresContainer}>
          <FeatureCard
            icon="wand.and.stars"
            androidIcon="auto_fix_high"
            title="Generate Images"
            description="Create images from text descriptions"
            onPress={() => router.push("/generate")}
            color={colors.primary}
          />

          <FeatureCard
            icon="photo.on.rectangle.angled"
            androidIcon="edit"
            title="Edit Images"
            description="Enhance and modify your photos"
            onPress={() => router.push("/edit")}
            color={colors.secondary}
          />

          <FeatureCard
            icon="photo.stack"
            androidIcon="collections"
            title="Gallery"
            description="View your created images"
            onPress={() => router.push("/gallery")}
            color={colors.accent}
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
    </View>
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
    <Button onPress={onPress} style={[styles.featureCard, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <View style={styles.featureContent}>
        <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
          <IconSymbol
            ios_icon_name={icon}
            android_material_icon_name={androidIcon}
            size={32}
            color={color}
          />
        </View>
        <View style={styles.featureTextContainer}>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDescription}>
            {description}
          </Text>
        </View>
        <IconSymbol
          ios_icon_name="chevron.right"
          android_material_icon_name="chevron_right"
          size={24}
          color={colors.grey}
        />
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "android" ? 48 : 0,
    paddingBottom: 120,
  },
  mainContent: {
    paddingTop: Platform.OS === "android" ? 48 : 24,
    paddingHorizontal: 24,
    paddingBottom: 120,
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
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.text,
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
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 2,
    backgroundColor: colors.card,
    color: colors.text,
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
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  featuresContainer: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 0,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 0,
  },
  featureContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
    color: colors.text,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  logoutButton: {
    marginTop: 32,
    height: 48,
  },
});
