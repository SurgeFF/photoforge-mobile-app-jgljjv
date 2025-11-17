
import { Platform } from 'react-native';

// Dynamically import Firebase Crashlytics only if available
let crashlytics: any = null;
let crashlyticsAvailable = false;

// Try to load Firebase Crashlytics
try {
  if (Platform.OS !== 'web') {
    crashlytics = require('@react-native-firebase/crashlytics').default;
    crashlyticsAvailable = true;
    console.log('✅ Firebase Crashlytics module loaded');
  }
} catch (error) {
  console.log('⚠️ Firebase Crashlytics not available (preview mode or not configured)');
  crashlyticsAvailable = false;
}

// Initialize Crashlytics
let isInitialized = false;

export const initializeCrashlytics = async () => {
  if (isInitialized) {
    console.log('🔥 Crashlytics already initialized');
    return;
  }

  if (!crashlyticsAvailable || !crashlytics) {
    console.log('⚠️ Crashlytics not available - running in preview mode');
    isInitialized = true;
    return;
  }

  try {
    // Check if Crashlytics is enabled
    const isCrashlyticsCollectionEnabled = crashlytics().isCrashlyticsCollectionEnabled;
    console.log('🔥 Crashlytics collection enabled:', isCrashlyticsCollectionEnabled);

    // Enable crash collection (this is enabled by default)
    await crashlytics().setCrashlyticsCollectionEnabled(true);

    console.log('✅ Firebase Crashlytics initialized');
    isInitialized = true;
  } catch (error) {
    console.error('❌ Error initializing Crashlytics:', error);
  }
};

// Log a non-fatal error
export const logError = (error: Error, context?: string) => {
  try {
    if (!crashlyticsAvailable || !crashlytics) {
      console.log('🔥 [Preview] Error logged:', error.message, context);
      return;
    }

    if (context) {
      crashlytics().log(`Error context: ${context}`);
    }
    crashlytics().recordError(error);
    console.log('🔥 Error logged to Crashlytics:', error.message);
  } catch (err) {
    console.error('Error logging to Crashlytics:', err);
  }
};

// Log a custom message
export const logMessage = (message: string) => {
  try {
    if (!crashlyticsAvailable || !crashlytics) {
      console.log('🔥 [Preview] Message logged:', message);
      return;
    }

    crashlytics().log(message);
    console.log('🔥 Message logged to Crashlytics:', message);
  } catch (error) {
    console.error('Error logging message to Crashlytics:', error);
  }
};

// Set user identifier
export const setUserId = (userId: string) => {
  try {
    if (!crashlyticsAvailable || !crashlytics) {
      console.log('🔥 [Preview] User ID set:', userId);
      return;
    }

    crashlytics().setUserId(userId);
    console.log('🔥 User ID set in Crashlytics:', userId);
  } catch (error) {
    console.error('Error setting user ID in Crashlytics:', error);
  }
};

// Set custom attributes
export const setAttribute = (key: string, value: string) => {
  try {
    if (!crashlyticsAvailable || !crashlytics) {
      console.log(`🔥 [Preview] Attribute set: ${key}=${value}`);
      return;
    }

    crashlytics().setAttribute(key, value);
    console.log(`🔥 Attribute set in Crashlytics: ${key}=${value}`);
  } catch (error) {
    console.error('Error setting attribute in Crashlytics:', error);
  }
};

// Set multiple custom attributes
export const setAttributes = (attributes: Record<string, string>) => {
  try {
    if (!crashlyticsAvailable || !crashlytics) {
      console.log('🔥 [Preview] Attributes set:', attributes);
      return;
    }

    crashlytics().setAttributes(attributes);
    console.log('🔥 Attributes set in Crashlytics:', attributes);
  } catch (error) {
    console.error('Error setting attributes in Crashlytics:', error);
  }
};

// Force a crash (for testing purposes only)
export const testCrash = () => {
  try {
    if (!crashlyticsAvailable || !crashlytics) {
      console.log('🔥 [Preview] Test crash requested (not available in preview)');
      return;
    }

    crashlytics().crash();
  } catch (error) {
    console.error('Error forcing crash:', error);
  }
};

// Check if crash reporting is enabled
export const isCrashlyticsEnabled = async (): Promise<boolean> => {
  try {
    if (!crashlyticsAvailable || !crashlytics) {
      return false;
    }

    return await crashlytics().isCrashlyticsCollectionEnabled;
  } catch (error) {
    console.error('Error checking Crashlytics status:', error);
    return false;
  }
};

// Enable/disable crash reporting
export const setCrashlyticsEnabled = async (enabled: boolean) => {
  try {
    if (!crashlyticsAvailable || !crashlytics) {
      console.log(`🔥 [Preview] Crashlytics collection ${enabled ? 'enabled' : 'disabled'} (not available in preview)`);
      return;
    }

    await crashlytics().setCrashlyticsCollectionEnabled(enabled);
    console.log(`🔥 Crashlytics collection ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Error setting Crashlytics collection:', error);
  }
};
