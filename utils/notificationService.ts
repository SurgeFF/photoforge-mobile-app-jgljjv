
/**
 * Notification Service
 * 
 * Handles payment notifications and subscription updates from the backend
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import { checkPaymentNotifications, PaymentNotification } from "./apiClient";

const NOTIFICATION_CHECK_INTERVAL = 30000; // Check every 30 seconds
const LAST_NOTIFICATION_KEY = "@last_notification_timestamp";

let notificationInterval: NodeJS.Timeout | null = null;
let notificationCallbacks: Array<(notification: PaymentNotification) => void> = [];

/**
 * Start polling for payment notifications
 */
export async function startNotificationPolling(accessKey: string) {
  console.log("🔔 Starting payment notification polling...");
  
  // Clear any existing interval
  if (notificationInterval) {
    clearInterval(notificationInterval);
  }

  // Check immediately
  await checkForNotifications(accessKey);

  // Then check periodically
  notificationInterval = setInterval(async () => {
    await checkForNotifications(accessKey);
  }, NOTIFICATION_CHECK_INTERVAL);
}

/**
 * Stop polling for payment notifications
 */
export function stopNotificationPolling() {
  console.log("🔕 Stopping payment notification polling...");
  
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}

/**
 * Register a callback to be called when a notification is received
 */
export function onNotification(callback: (notification: PaymentNotification) => void) {
  notificationCallbacks.push(callback);
  
  // Return unsubscribe function
  return () => {
    notificationCallbacks = notificationCallbacks.filter(cb => cb !== callback);
  };
}

/**
 * Check for new payment notifications
 */
async function checkForNotifications(accessKey: string) {
  try {
    const result = await checkPaymentNotifications(accessKey);
    
    if (result.success && result.data && result.data.length > 0) {
      const lastTimestamp = await AsyncStorage.getItem(LAST_NOTIFICATION_KEY);
      const lastTime = lastTimestamp ? parseInt(lastTimestamp) : 0;

      for (const notification of result.data) {
        const notificationTime = new Date(notification.timestamp).getTime();
        
        // Only process notifications newer than the last one we've seen
        if (notificationTime > lastTime) {
          console.log("🔔 New notification:", notification.type);
          
          // Show alert to user
          showNotificationAlert(notification);
          
          // Call registered callbacks
          notificationCallbacks.forEach(callback => {
            try {
              callback(notification);
            } catch (error) {
              console.error("Error in notification callback:", error);
            }
          });
          
          // Update last notification timestamp
          await AsyncStorage.setItem(LAST_NOTIFICATION_KEY, notificationTime.toString());
        }
      }
    }
  } catch (error) {
    console.error("❌ Error checking notifications:", error);
  }
}

/**
 * Show an alert for a payment notification
 */
function showNotificationAlert(notification: PaymentNotification) {
  let title = "";
  let message = notification.message;
  let icon = "💳";

  switch (notification.type) {
    case "payment_success":
      title = "Payment Successful";
      icon = "✅";
      if (notification.payment_type === "subscription") {
        message = `Your subscription payment of $${notification.amount} has been processed successfully.`;
      } else {
        message = `Your donation of $${notification.amount} has been received. Thank you for your support!`;
      }
      break;

    case "payment_failed":
      title = "Payment Failed";
      icon = "❌";
      message = notification.message || "Your payment could not be processed. Please check your payment method and try again.";
      break;

    case "subscription_renewed":
      title = "Subscription Renewed";
      icon = "🔄";
      message = `Your subscription has been renewed successfully. Next billing date: ${notification.subscription_end_date ? new Date(notification.subscription_end_date).toLocaleDateString() : "N/A"}`;
      break;

    case "subscription_cancelled":
      title = "Subscription Cancelled";
      icon = "⚠️";
      message = notification.message || "Your subscription has been cancelled. You will retain access until the end of your billing period.";
      break;

    default:
      title = "Notification";
      message = notification.message;
  }

  Alert.alert(
    `${icon} ${title}`,
    message,
    [{ text: "OK" }]
  );
}

/**
 * Manually check for notifications (useful for pull-to-refresh)
 */
export async function refreshNotifications(accessKey: string) {
  console.log("🔄 Manually refreshing notifications...");
  await checkForNotifications(accessKey);
}
