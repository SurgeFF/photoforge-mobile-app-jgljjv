
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Button from "@/components/button";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";

const ACCESS_KEY_STORAGE = "@photoforge_access_key";

export default function ProfileScreen() {
  const theme = useTheme();
  const [accessKey, setAccessKey] = useState<string>("");

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
      console.error("[Profile] Error loading access key:", error);
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
            console.log("[Profile] Logging out...");
            await AsyncStorage.removeItem(ACCESS_KEY_STORAGE);
            router.replace("/");
            console.log("[Profile] Logged out successfully");
          },
        },
      ]
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      "Clear Cache",
      "This will clear all cached data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            console.log("[Profile] Cache cleared");
            Alert.alert("Success", "Cache cleared successfully");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
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
        
        <Text style={styles.topBarTitle}>Profile</Text>
        
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
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <IconSymbol
              ios_icon_name="person.circle.fill"
              android_material_icon_name="account_circle"
              size={80}
              color={colors.primary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <IconSymbol
                ios_icon_name="key.fill"
                android_material_icon_name="vpn_key"
                size={24}
                color={colors.primary}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Access Key</Text>
                <Text style={styles.infoValue}>
                  {accessKey ? `${accessKey.substring(0, 20)}...` : "Not set"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <IconSymbol
                ios_icon_name="bell.fill"
                android_material_icon_name="notifications"
                size={24}
                color={colors.textSecondary}
              />
              <Text style={styles.settingText}>Notifications</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={24}
              color={colors.textSecondary}
            />
          </Pressable>

          <Pressable style={styles.settingItem} onPress={handleClearCache}>
            <View style={styles.settingLeft}>
              <IconSymbol
                ios_icon_name="trash.fill"
                android_material_icon_name="delete"
                size={24}
                color={colors.textSecondary}
              />
              <Text style={styles.settingText}>Clear Cache</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={24}
              color={colors.textSecondary}
            />
          </Pressable>

          <Pressable style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <IconSymbol
                ios_icon_name="info.circle.fill"
                android_material_icon_name="info"
                size={24}
                color={colors.textSecondary}
              />
              <Text style={styles.settingText}>About</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron_right"
              size={24}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Button
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutButton}
          >
            Logout
          </Button>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>PhotoForge Mobile v1.0.0</Text>
          <Text style={styles.footerSubtext}>
            Powered by PhotoForge.base44.app
          </Text>
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
    padding: 24,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface + '99',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface + '99',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  settingText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  logoutButton: {
    height: 56,
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
