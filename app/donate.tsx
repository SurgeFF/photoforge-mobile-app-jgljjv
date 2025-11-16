
import React, { useState } from "react";
import { useTheme } from "@react-navigation/native";
import { colors } from "@/styles/commonStyles";
import TopographicBackground from "@/components/TopographicBackground";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { router } from "expo-router";
import Button from "@/components/button";
import SquarePaymentForm from "@/components/SquarePaymentForm";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Pressable,
  Modal,
} from "react-native";

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

export default function DonateScreen() {
  const theme = useTheme();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [donationMessage, setDonationMessage] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleDonate = () => {
    const amount = selectedAmount || parseFloat(customAmount);
    
    if (!amount || amount <= 0) {
      Alert.alert("Invalid Amount", "Please select or enter a donation amount");
      return;
    }

    if (amount < 1) {
      Alert.alert("Minimum Amount", "Minimum donation amount is $1.00");
      return;
    }

    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (result: any) => {
    console.log("Payment successful:", result);
    setShowPaymentModal(false);
    
    Alert.alert(
      "Thank You! 🎉",
      `Your donation of $${(selectedAmount || parseFloat(customAmount)).toFixed(2)} has been processed successfully!\n\nYour support helps us continue developing PhotoForge and providing the best drone photogrammetry tools.`,
      [
        {
          text: "Done",
          onPress: () => router.back(),
        },
      ]
    );
  };

  const handlePaymentError = (error: string) => {
    console.error("Payment error:", error);
    setShowPaymentModal(false);
    
    Alert.alert(
      "Payment Failed",
      `We couldn't process your donation: ${error}\n\nPlease try again or contact support if the problem persists.`,
      [{ text: "OK" }]
    );
  };

  const handleCustomAmountChange = (text: string) => {
    // Remove any non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, "");
    
    // Ensure only one decimal point
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      return;
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setCustomAmount(cleaned);
    setSelectedAmount(null);
  };

  const finalAmount = selectedAmount || parseFloat(customAmount) || 0;

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
        <Text style={styles.headerTitle}>Support PhotoForge</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <IconSymbol
            ios_icon_name="heart.fill"
            android_material_icon_name="favorite"
            size={64}
            color={colors.error}
          />
        </View>

        <Text style={styles.title}>Support PhotoForge</Text>
        <Text style={styles.subtitle}>
          Your donation helps us continue developing cutting-edge drone photogrammetry tools and maintaining our services.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Amount</Text>
          <View style={styles.presetAmounts}>
            {PRESET_AMOUNTS.map((amount) => (
              <Pressable
                key={amount}
                style={[
                  styles.presetButton,
                  selectedAmount === amount && styles.presetButtonActive,
                ]}
                onPress={() => {
                  setSelectedAmount(amount);
                  setCustomAmount("");
                }}
              >
                <Text
                  style={[
                    styles.presetButtonText,
                    selectedAmount === amount && styles.presetButtonTextActive,
                  ]}
                >
                  ${amount}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.customAmountContainer}>
            <Text style={styles.customAmountLabel}>Or enter custom amount</Text>
            <TextInput
              style={styles.customAmountInput}
              placeholder="$0.00"
              placeholderTextColor={colors.textSecondary}
              value={customAmount}
              onChangeText={handleCustomAmountChange}
              keyboardType="decimal-pad"
            />
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Add a message (optional)</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Leave a message with your donation..."
              placeholderTextColor={colors.textSecondary}
              value={donationMessage}
              onChangeText={setDonationMessage}
              multiline
              maxLength={500}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.impactSection}>
            <Text style={styles.impactTitle}>Your Impact</Text>
            <View style={styles.impactItem}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.impactText}>
                Support ongoing development of new features
              </Text>
            </View>
            <View style={styles.impactItem}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.impactText}>
                Help maintain and improve server infrastructure
              </Text>
            </View>
            <View style={styles.impactItem}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.impactText}>
                Enable better customer support and documentation
              </Text>
            </View>
            <View style={styles.impactItem}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={20}
                color={colors.success}
              />
              <Text style={styles.impactText}>
                Keep PhotoForge accessible to everyone
              </Text>
            </View>
          </View>
        </View>

        <Button
          onPress={handleDonate}
          style={styles.donateButton}
          disabled={finalAmount <= 0}
        >
          {finalAmount > 0 ? `Donate $${finalAmount.toFixed(2)}` : "Select Amount"}
        </Button>
      </ScrollView>

      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Donation</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setShowPaymentModal(false)}
              >
                <IconSymbol
                  ios_icon_name="xmark.circle.fill"
                  android_material_icon_name="cancel"
                  size={28}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <ScrollView 
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <SquarePaymentForm
                amount={finalAmount}
                paymentType="donation"
                message={donationMessage}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </ScrollView>
          </View>
        </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 120,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  presetAmounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  presetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
  },
  presetButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "20",
  },
  presetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  presetButtonTextActive: {
    color: colors.primary,
  },
  customAmountContainer: {
    marginTop: 16,
  },
  customAmountLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  customAmountInput: {
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 20,
    fontSize: 24,
    fontWeight: "700",
    borderWidth: 2,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    color: colors.textPrimary,
  },
  messageContainer: {
    marginTop: 16,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  messageInput: {
    height: 100,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 2,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    color: colors.textPrimary,
    textAlignVertical: "top",
  },
  impactSection: {
    padding: 20,
    backgroundColor: colors.primary + "15",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: 12,
  },
  impactItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  impactText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  donateButton: {
    height: 56,
  },
  modal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 500,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  closeButton: {
    padding: 8,
  },
  modalScroll: {
    maxHeight: 500,
  },
});
