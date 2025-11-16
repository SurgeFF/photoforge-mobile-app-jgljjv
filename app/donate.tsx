
import React, { useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { router } from "expo-router";
import { colors } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import TopographicBackground from "@/components/TopographicBackground";
import Button from "@/components/button";
import SquarePaymentForm from "@/components/SquarePaymentForm";

const PRESET_AMOUNTS = [5, 10, 25, 50, 100];

export default function DonateScreen() {
  const theme = useTheme();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [message, setMessage] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const handleDonate = () => {
    const amount = selectedAmount || parseFloat(customAmount);

    if (!amount || amount <= 0 || isNaN(amount)) {
      Alert.alert("Error", "Please enter a valid donation amount");
      return;
    }

    if (!donorEmail.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = (result: any) => {
    setShowPaymentForm(false);
    Alert.alert(
      "Thank You!",
      `Your donation of $${selectedAmount || parseFloat(customAmount)} has been processed successfully.\n\nYou will receive a confirmation email shortly.`,
      [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]
    );
  };

  const handlePaymentError = (error: string) => {
    Alert.alert("Payment Failed", error);
  };

  const handleCustomAmountChange = (text: string) => {
    // Remove any non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, "");
    
    // Ensure only one decimal point
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      return;
    }
    
    setCustomAmount(cleaned);
    setSelectedAmount(null);
  };

  const currentAmount = selectedAmount || parseFloat(customAmount) || 0;

  return (
    <SafeAreaView style={styles.container}>
      <TopographicBackground />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Support PhotoForge</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <View style={styles.iconContainer}>
          <IconSymbol
            ios_icon_name="heart.fill"
            android_material_icon_name="favorite"
            size={64}
            color={colors.primaryDark}
          />
        </View>

        <Text style={styles.title}>Support Our Mission</Text>
        <Text style={styles.subtitle}>
          Your donation helps us continue developing and improving PhotoForge for the drone mapping community.
        </Text>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Select Amount</Text>

          <View style={styles.amountGrid}>
            {PRESET_AMOUNTS.map((amount) => (
              <Pressable
                key={amount}
                style={[
                  styles.amountButton,
                  selectedAmount === amount && styles.amountButtonActive,
                ]}
                onPress={() => {
                  setSelectedAmount(amount);
                  setCustomAmount("");
                }}
              >
                <Text
                  style={[
                    styles.amountText,
                    selectedAmount === amount && styles.amountTextActive,
                  ]}
                >
                  ${amount}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Custom Amount</Text>
            <View style={styles.currencyInput}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Your Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Name (Optional)</Text>
            <TextInput
              style={styles.inputFull}
              placeholder="John Doe"
              placeholderTextColor={colors.textSecondary}
              value={donorName}
              onChangeText={setDonorName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={styles.inputFull}
              placeholder="your@email.com"
              placeholderTextColor={colors.textSecondary}
              value={donorEmail}
              onChangeText={setDonorEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Message (Optional)</Text>
            <TextInput
              style={[styles.inputFull, styles.textArea]}
              placeholder="Leave a message..."
              placeholderTextColor={colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        <View style={styles.infoBox}>
          <IconSymbol
            ios_icon_name="lock.shield.fill"
            android_material_icon_name="security"
            size={24}
            color={colors.primary}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Secure Payment via Square</Text>
            <Text style={styles.infoText}>
              All donations are processed securely through Square. Your payment information is encrypted and never stored on our servers.
            </Text>
          </View>
        </View>

        <Button
          onPress={handleDonate}
          style={styles.donateButton}
        >
          Continue to Payment
        </Button>

        <Text style={styles.disclaimer}>
          By donating, you agree to our terms of service. Donations are non-refundable.
        </Text>
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
                android_material_icon_name="arrow-back"
                size={24}
                color={colors.textPrimary}
              />
            </Pressable>
            <Text style={styles.modalTitle}>Payment Details</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView
            style={styles.modalScrollView}
            contentContainerStyle={styles.modalContent}
          >
            <SquarePaymentForm
              amount={currentAmount}
              paymentType="donation"
              customerEmail={donorEmail}
              customerName={donorName}
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
  content: {
    padding: 24,
    paddingBottom: 120,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  formSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  amountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  amountButton: {
    flex: 1,
    minWidth: "30%",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: colors.surface + "CC",
    borderWidth: 2,
    borderColor: colors.accentBorder,
    alignItems: "center",
  },
  amountButtonActive: {
    backgroundColor: colors.primaryDark + "20",
    borderColor: colors.primaryDark,
  },
  amountText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  amountTextActive: {
    color: colors.primaryDark,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  currencyInput: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  inputFull: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    color: colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: "top",
  },
  infoBox: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: colors.primary + "20",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 24,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  donateButton: {
    marginTop: 16,
    height: 56,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
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
});
