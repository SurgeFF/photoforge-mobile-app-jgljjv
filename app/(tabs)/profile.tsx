
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassView } from "expo-glass-effect";
import React, { useState } from "react";
import { useTheme } from "@react-navigation/native";
import { IconSymbol } from "@/components/IconSymbol";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Button from "@/components/button";
import { colors } from "@/styles/commonStyles";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Pressable,
} from "react-native";
import { router } from "expo-router";

const ACCESS_KEY_STORAGE = "@photoforge_access_key";

export default function ProfileScreen() {
  const theme = useTheme();
  const [showKey, setShowKey] = useState(false);
  const [accessKey, setAccessKey] = useState("");

  React.useEffect(() => {
    loadAccessKey();
  }, []);

  const loadAccessKey = async () => {
    try {
      const key = await AsyncStorage.getItem(ACCESS_KEY_STORAGE);
      if (key) {
        setAccessKey(key);
      }
    } catch (error) {
      console.error("Error loading access key:", error);
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
            router.replace("/(tabs)/(home)");
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear all cached images and data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            Alert.alert("Success", "Cache cleared successfully");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <IconSymbol
              ios_icon_name="person.circle.fill"
              android_material_icon_name="account_circle"
              size={80}
              color={colors.primary}
            />
          </View>
          <Text style={styles.title}>PhotoForge Account</Text>
          <Text style={styles.subtitle}>Manage your settings</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <GlassView
            style={[
              styles.card,
              { backgroundColor: theme.dark ? colors.backgroundAlt : "#f5f5f5" },
            ]}
            intensity={20}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardIcon}>
                <IconSymbol
                  ios_icon_name="key.fill"
                  android_material_icon_name="vpn_key"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Access Key</Text>
                <Text style={styles.cardValue}>
                  {showKey ? accessKey : "••••••••••••••••"}
                </Text>
              </View>
              <Pressable onPress={() => setShowKey(!showKey)}>
                <IconSymbol
                  ios_icon_name={showKey ? "eye.slash.fill" : "eye.fill"}
                  android_material_icon_name={showKey ? "visibility_off" : "visibility"}
                  size={24}
                  color={colors.grey}
                />
              </Pressable>
            </View>
          </GlassView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>

          <GlassView
            style={[
              styles.card,
              { backgroundColor: theme.dark ? colors.backgroundAlt : "#f5f5f5" },
            ]}
            intensity={20}
          >
            <Pressable style={styles.cardRow}>
              <View style={styles.cardIcon}>
                <IconSymbol
                  ios_icon_name="bell.fill"
                  android_material_icon_name="notifications"
                  size={24}
                  color={colors.accent}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Notifications</Text>
                <Text style={styles.cardDescription}>
                  Get notified when images are ready
                </Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={24}
                color={colors.grey}
              />
            </Pressable>
          </GlassView>

          <GlassView
            style={[
              styles.card,
              { backgroundColor: theme.dark ? colors.backgroundAlt : "#f5f5f5" },
            ]}
            intensity={20}
          >
            <Pressable style={styles.cardRow}>
              <View style={styles.cardIcon}>
                <IconSymbol
                  ios_icon_name="photo.fill"
                  android_material_icon_name="image"
                  size={24}
                  color={colors.secondary}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Image Quality</Text>
                <Text style={styles.cardDescription}>High quality (1024x1024)</Text>
              </View>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="chevron_right"
                size={24}
                color={colors.grey}
              />
            </Pressable>
          </GlassView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>

          <Button
            onPress={handleClearCache}
            variant="outline"
            style={styles.actionButton}
          >
            <View style={styles.buttonContent}>
              <IconSymbol
                ios_icon_name="trash.fill"
                android_material_icon_name="delete"
                size={20}
                color={theme.colors.text}
              />
              <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                Clear Cache
              </Text>
            </View>
          </Button>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <GlassView
            style={[
              styles.card,
              { backgroundColor: theme.dark ? colors.backgroundAlt : "#f5f5f5" },
            ]}
            intensity={20}
          >
            <View style={styles.cardRow}>
              <View style={styles.cardIcon}>
                <IconSymbol
                  ios_icon_name="info.circle.fill"
                  android_material_icon_name="info"
                  size={24}
                  color={colors.grey}
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Version</Text>
                <Text style={styles.cardDescription}>1.0.0</Text>
              </View>
            </View>
          </GlassView>

          <Pressable
            onPress={() => {
              Alert.alert(
                "PhotoForge Mobile",
                "A mobile companion app for PhotoForge.base44.app\n\nCreate stunning AI-powered images on the go."
              );
            }}
          >
            <GlassView
              style={[
                styles.card,
                { backgroundColor: theme.dark ? colors.backgroundAlt : "#f5f5f5" },
              ]}
              intensity={20}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardIcon}>
                  <IconSymbol
                    ios_icon_name="questionmark.circle.fill"
                    android_material_icon_name="help"
                    size={24}
                    color={colors.grey}
                  />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>Help & Support</Text>
                  <Text style={styles.cardDescription}>Get help using the app</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron_right"
                  size={24}
                  color={colors.grey}
                />
              </View>
            </GlassView>
          </Pressable>
        </View>

        <Button
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: Platform.OS === "android" ? 48 : 24,
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.grey,
    marginTop: 4,
    textAlign: "center",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.grey,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.1)",
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.background + "40",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 14,
    color: colors.grey,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  cardDescription: {
    fontSize: 14,
    color: colors.grey,
  },
  actionButton: {
    height: 56,
    marginBottom: 12,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    height: 56,
    marginTop: 16,
    borderColor: "#FF3B30",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF3B30",
  },
});
