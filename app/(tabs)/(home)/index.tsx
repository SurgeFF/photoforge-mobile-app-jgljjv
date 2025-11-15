
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
      if (storedKey) {
        console.log("Found stored access key");
        setAccessKey(storedKey);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error loading access key:", error);
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
      // Validate the access key with PhotoForge backend
      const response = await fetch("https://photoforge.base44.app/api/validate-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessKey: accessKey.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.isValid) {
        // Store the access key securely
        await AsyncStorage.setItem(ACCESS_KEY_STORAGE, accessKey.trim());
        setIsAuthenticated(true);
        console.log("Access key validated successfully");
      } else {
        setError(data.message || "Invalid access key. Please check and try again.");
      }
    } catch (error) {
      console.error("Validation error:", error);
      setError("Unable to validate access key. Please check your internet connection.");
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
            await AsyncStorage.removeItem(ACCESS_KEY_STORAGE);
            setIsAuthenticated(false);
            setAccessKey("");
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.loginContainer}>
          <View style={styles.logoContainer}>
            <IconSymbol
              ios_icon_name="photo.stack.fill"
              android_material_icon_name="photo_library"
              size={80}
              color={colors.primary}
            />
            <Text style={styles.title}>PhotoForge</Text>
            <Text style={styles.subtitle}>Mobile Edition</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Access Key</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.dark ? colors.backgroundAlt : "#f5f5f5",
                  color: theme.colors.text,
                  borderColor: error ? "#FF3B30" : colors.grey,
                },
              ]}
              placeholder="Enter your access key"
              placeholderTextColor={theme.dark ? "#888" : "#999"}
              value={accessKey}
              onChangeText={(text) => {
                setAccessKey(text);
                setError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

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
                color={colors.grey}
              />
              <Text style={styles.infoText}>
                Get your access key from PhotoForge.base44.app
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  // Main authenticated view
  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
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
  const theme = useTheme();

  return (
    <Button onPress={onPress} style={[styles.featureCard, { borderColor: color }]}>
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
          <Text style={[styles.featureTitle, { color: theme.colors.text }]}>{title}</Text>
          <Text style={[styles.featureDescription, { color: theme.colors.text + "99" }]}>
            {description}
          </Text>
        </View>
        <IconSymbol
          ios_icon_name="chevron.right"
          android_material_icon_name="chevron_right"
          size={24}
          color={theme.colors.text + "66"}
        />
      </View>
    </Button>
  );
}

const styles = StyleSheet.create({
  container: {
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
  title: {
    fontSize: 36,
    fontWeight: "800",
    color: colors.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 18,
    color: colors.grey,
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
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    marginTop: 8,
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
    backgroundColor: colors.backgroundAlt,
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: colors.grey,
    marginLeft: 12,
    flex: 1,
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
    color: colors.grey,
    marginTop: 8,
    textAlign: "center",
  },
  featuresContainer: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 16,
    padding: 0,
    borderWidth: 2,
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
  },
  featureDescription: {
    fontSize: 14,
  },
  logoutButton: {
    marginTop: 32,
    height: 48,
  },
});
