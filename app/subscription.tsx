
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
import { router } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import { checkSubscription, getAccessKey } from "@/utils/apiClient";

export default function SubscriptionScreen() {
  const theme = useTheme();
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        Alert.alert("Error", "Please login first");
        router.replace("/(tabs)/(home)/");
        return;
      }

      const result = await checkSubscription(accessKey);
      if (result.success && result.data) {
        setSubscription(result.data);
      } else {
        Alert.alert("Error", result.error || "Failed to load subscription");
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
      Alert.alert("Error", "Failed to load subscription");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return colors.success;
      case "trial":
        return colors.warning;
      case "expired":
      case "cancelled":
        return colors.error;
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
          <Text style={styles.loadingText}>Loading subscription...</Text>
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
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {subscription && (
          <React.Fragment>
            <View style={styles.statusCard}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(subscription.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {subscription.status?.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.planTitle}>{subscription.plan_type || "Free"}</Text>
              {subscription.trial_end_date && (
                <Text style={styles.dateText}>
                  Trial ends: {new Date(subscription.trial_end_date).toLocaleDateString()}
                </Text>
              )}
              {subscription.subscription_end_date && (
                <Text style={styles.dateText}>
                  Renews: {new Date(subscription.subscription_end_date).toLocaleDateString()}
                </Text>
              )}
            </View>

            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}>Current Plan Features</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={styles.featureText}>Unlimited Projects</Text>
                </View>
                <View style={styles.featureItem}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={styles.featureText}>Drone Control</Text>
                </View>
                <View style={styles.featureItem}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={styles.featureText}>3D Processing</Text>
                </View>
                <View style={styles.featureItem}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={styles.featureText}>Cloud Storage</Text>
                </View>
              </View>
            </View>
          </React.Fragment>
        )}

        <View style={styles.actionsSection}>
          <Button
            onPress={() => {
              Alert.alert(
                "Upgrade",
                "Visit PhotoForge.base44.app to manage your subscription"
              );
            }}
            style={styles.actionButton}
          >
            Manage Subscription
          </Button>

          <Button
            onPress={() => {
              Alert.alert(
                "Billing",
                "Visit PhotoForge.base44.app to view billing history"
              );
            }}
            variant="outline"
            style={styles.actionButton}
          >
            View Billing History
          </Button>
        </View>

        <View style={styles.infoBox}>
          <IconSymbol
            ios_icon_name="info.circle.fill"
            android_material_icon_name="info"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.infoText}>
            To upgrade or manage your subscription, please visit the PhotoForge web
            app at PhotoForge.base44.app
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
  statusCard: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.surface,
  },
  planTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  featuresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface + "CC",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  featureText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionButton: {
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: colors.surface + "CC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
