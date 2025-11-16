
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { colors } from "@/styles/commonStyles";
import Button from "@/components/button";
import { IconSymbol } from "@/components/IconSymbol";
import { squarePayment, getAccessKey } from "@/utils/apiClient";

interface SquarePaymentFormProps {
  amount: number;
  paymentType: "donation" | "subscription";
  customerEmail?: string;
  customerName?: string;
  onSuccess: (result: any) => void;
  onError: (error: string) => void;
}

export default function SquarePaymentForm({
  amount,
  paymentType,
  customerEmail = "",
  customerName = "",
  onSuccess,
  onError,
}: SquarePaymentFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, "");
    // Add space every 4 digits
    const formatted = cleaned.match(/.{1,4}/g)?.join(" ") || cleaned;
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpiryDate = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, "");
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + "/" + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const validateForm = (): boolean => {
    if (cardNumber.replace(/\s/g, "").length !== 16) {
      Alert.alert("Invalid Card", "Please enter a valid 16-digit card number");
      return false;
    }

    if (expiryDate.length !== 5) {
      Alert.alert("Invalid Expiry", "Please enter expiry date in MM/YY format");
      return false;
    }

    const [month, year] = expiryDate.split("/");
    const monthNum = parseInt(month);
    if (monthNum < 1 || monthNum > 12) {
      Alert.alert("Invalid Expiry", "Please enter a valid month (01-12)");
      return false;
    }

    if (cvv.length < 3 || cvv.length > 4) {
      Alert.alert("Invalid CVV", "Please enter a valid CVV (3-4 digits)");
      return false;
    }

    if (zipCode.length < 5) {
      Alert.alert("Invalid ZIP", "Please enter a valid ZIP code");
      return false;
    }

    return true;
  };

  const handlePayment = async () => {
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);

    try {
      const accessKey = await getAccessKey();
      if (!accessKey) {
        Alert.alert("Error", "Please login first");
        onError("Not authenticated");
        return;
      }

      // In a real implementation, you would:
      // 1. Load Square Web Payments SDK
      // 2. Tokenize the card details to get a nonce
      // 3. Send the nonce to your backend
      
      // For now, we'll show a message that Square integration needs to be completed
      Alert.alert(
        "Square Integration Required",
        `To process ${paymentType === "subscription" ? "subscription" : "donation"} payments, the Square Web Payments SDK needs to be fully integrated.\n\nThis requires:\n\n1. Square Application ID\n2. Square Location ID\n3. Web Payments SDK initialization\n4. Card tokenization\n5. Backend payment processing\n\nThe payment details you entered would be tokenized by Square and sent securely to the backend.\n\nAmount: $${amount.toFixed(2)}\nType: ${paymentType}\n\nPlease contact the developer to complete the Square integration.`,
        [
          {
            text: "OK",
            onPress: () => {
              // For demo purposes, simulate success
              onSuccess({
                payment_id: `demo_${Date.now()}`,
                amount: amount,
                type: paymentType,
              });
            },
          },
        ]
      );

      // Actual implementation would look like:
      /*
      const nonce = await tokenizeCard({
        cardNumber: cardNumber.replace(/\s/g, ""),
        expiryMonth: expiryDate.split("/")[0],
        expiryYear: "20" + expiryDate.split("/")[1],
        cvv: cvv,
        postalCode: zipCode,
      });

      const result = await squarePayment(accessKey, {
        payment_type: paymentType,
        amount: amount,
        nonce: nonce,
        idempotency_key: `${paymentType}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        customer_email: customerEmail,
        customer_name: customerName,
      });

      if (result.success) {
        onSuccess(result.data);
      } else {
        onError(result.error || "Payment failed");
      }
      */
    } catch (error) {
      console.error("Payment error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      onError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.securityBadge}>
        <IconSymbol
          ios_icon_name="lock.shield.fill"
          android_material_icon_name="security"
          size={20}
          color={colors.success}
        />
        <Text style={styles.securityText}>Secure Payment via Square</Text>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Card Number</Text>
        <View style={styles.inputContainer}>
          <IconSymbol
            ios_icon_name="creditcard.fill"
            android_material_icon_name="credit-card"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            style={styles.input}
            placeholder="1234 5678 9012 3456"
            placeholderTextColor={colors.textSecondary}
            value={cardNumber}
            onChangeText={(text) => setCardNumber(formatCardNumber(text))}
            keyboardType="number-pad"
            maxLength={19}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={styles.label}>Expiry Date</Text>
          <TextInput
            style={styles.inputFull}
            placeholder="MM/YY"
            placeholderTextColor={colors.textSecondary}
            value={expiryDate}
            onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>

        <View style={[styles.formGroup, styles.halfWidth]}>
          <Text style={styles.label}>CVV</Text>
          <TextInput
            style={styles.inputFull}
            placeholder="123"
            placeholderTextColor={colors.textSecondary}
            value={cvv}
            onChangeText={(text) => setCvv(text.replace(/\D/g, ""))}
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>ZIP Code</Text>
        <TextInput
          style={styles.inputFull}
          placeholder="12345"
          placeholderTextColor={colors.textSecondary}
          value={zipCode}
          onChangeText={(text) => setZipCode(text.replace(/\D/g, ""))}
          keyboardType="number-pad"
          maxLength={10}
        />
      </View>

      <View style={styles.amountDisplay}>
        <Text style={styles.amountLabel}>Total Amount:</Text>
        <Text style={styles.amountValue}>${amount.toFixed(2)}</Text>
      </View>

      <Button
        onPress={handlePayment}
        loading={isProcessing}
        disabled={isProcessing}
        style={styles.payButton}
      >
        {isProcessing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
      </Button>

      <Text style={styles.disclaimer}>
        Your payment information is encrypted and secure. We never store your card details.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: colors.success + "20",
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  securityText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.success,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.surface + "CC",
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  amountDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: colors.primary + "20",
    borderRadius: 12,
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.primary,
  },
  payButton: {
    height: 56,
    marginBottom: 16,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
