
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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import SquarePaymentForm from "@/components/SquarePaymentForm";
import { checkSubscription, getAccessKey } from "@/utils/apiClient";
import { onNotification, refreshNotifications } from "@/utils/notificationService";

const SUBSCRIPTION_AMOUNT = 5; // $5 per month

export default function SubscriptionScreen() {
  const theme = useTheme();
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [hasNewNotification, setHasNewNotification] = useState(false);

  useEffect(() => {
    loadSubscription();
    
    // Listen for payment notifications
    const unsubscribe = onNotification((notification) => {
      console.log("📬 Received notification in subscription screen:", notification.type);
      
      if (notification.type === "subscription_renewed" || 
          notification.type === "subscription_cancelled" ||
          notification.type === "payment_success") {
        setHasNewNotification(true);
        loadSubscription();
      }
    });
    
    return () => {
      unsubscribe();
    };
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
        setHasNewNotification(false);
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

  const handleRefresh = async () => {
    setIsLoading(true);
    const accessKey = await getAccessKey();
    if (accessKey) {
      await refreshNotifications(accessKey);
      await loadSubscription();
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

  const handleUpgrade = () => {
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = (result: any) => {
    setShowPaymentForm(false);
    Alert.alert(
      "Subscription Activated!",
      `Your $${SUBSCRIPTION_AMOUNT}/month subscription has been activated successfully.\n\nYou now have access to all premium features.\n\nYou will receive a confirmation notification shortly.`,
      [
        {
          text: "OK",
          onPress: () => {
            loadSubscription();
          },
        },
      ]
    );
  };

  const handlePaymentError = (error: string) => {
    Alert.alert("Subscription Failed", error);
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
        <Pressable onPress={handleRefresh} style={styles.refreshButton}>
          {hasNewNotification && <View style={styles.notificationDot} />}
          <IconSymbol
            ios_icon_name="arrow.clockwise"
            android_material_icon_name="refresh"
            size={24}
            color={colors.textPrimary}
          />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        {hasNewNotification && (
          <View style={styles.notificationBanner}>
            <IconSymbol
              ios_icon_name="bell.badge.fill"
              android_material_icon_name="notifications_active"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.notificationText}>
              Your subscription status has been updated
            </Text>
          </View>
        )}

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

            <View style={styles.pricingCard}>
              <Text style={styles.pricingTitle}>Premium Plan</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.priceAmount}>${SUBSCRIPTION_AMOUNT}</Text>
                <Text style={styles.pricePeriod}>/month</Text>
              </View>
              <Text style={styles.pricingDescription}>
                Unlock all features and support PhotoForge development
              </Text>
            </View>

            <View style={styles.featuresSection}>
              <Text style={styles.sectionTitle}>Premium Features</Text>
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
                  <Text style={styles.featureText}>Advanced Drone Control</Text>
                </View>
                <View style={styles.featureItem}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={styles.featureText}>3D Processing Priority</Text>
                </View>
                <View style={styles.featureItem}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={styles.featureText}>Unlimited Cloud Storage</Text>
                </View>
                <View style={styles.featureItem}>
                  <IconSymbol
                    ios_icon_name="checkmark.circle.fill"
                    android_material_icon_name="check_circle"
                    size={24}
                    color={colors.success}
                  />
                  <Text style={styles.featureText}>Priority Support</Text>
                </View>
              </View>
            </View>
          </React.Fragment>
        )}

        <View style={styles.actionsSection}>
          <Button
            onPress={handleUpgrade}
            style={styles.actionButton}
          >
            Subscribe for ${SUBSCRIPTION_AMOUNT}/month
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
            Subscription payments are processed securely through Square. You can cancel anytime from your account settings. You will receive notifications when your subscription is renewed or if there are any payment issues.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showPaymentForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentForm(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => setShowPaymentForm(false)}
              style={styles.backButton}
            >
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="arrow_back"
                size={24}
                color={colors.textPrimary}
              />
            </Pressable>
            <Text style={styles.modalTitle}>Subscribe to Premium</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalContent}
          >
            <View style={styles.subscriptionSummary}>
              <Text style={styles.summaryTitle}>Subscription Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Plan:</Text>
                <Text style={styles.summaryValue}>Premium</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Billing:</Text>
                <Text style={styles.summaryValue}>Monthly</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.summaryTotalLabel}>Total:</Text>
                <Text style={styles.summaryTotalValue}>${SUBSCRIPTION_AMOUNT}/month</Text>
              </View>
            </View>

            <SquarePaymentForm
              amount={SUBSCRIPTION_AMOUNT}
              paymentType="subscription"
              customerEmail={userEmail}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  refreshButton: {
    padding: 8,
    position: "relative",
  },
  notificationDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surface,
    zIndex: 1,
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
  notificationBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.primary + "20",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 16,
    gap: 12,
  },
  notificationText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
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
  pricingCard: {
    backgroundColor: colors.primary + "20",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: "800",
    color: colors.primary,
  },
  pricePeriod: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textSecondary,
    marginLeft: 4,
  },
  pricingDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
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
  modalContainer: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  modalScrollView: {
    flex: 1,
  },
  modalContent: {
    padding: 24,
    paddingBottom: 120,
  },
  subscriptionSummary: {
    backgroundColor: colors.surface + "CC",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  summaryTotal: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.accentBorder,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  summaryTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
});
