
import crashlytics from '@react-native-firebase/crashlytics';

// Initialize Crashlytics
let isInitialized = false;

export const initializeCrashlytics = async () => {
  if (isInitialized) {
    console.log('🔥 Crashlytics already initialized');
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
    crashlytics().log(message);
    console.log('🔥 Message logged to Crashlytics:', message);
  } catch (error) {
    console.error('Error logging message to Crashlytics:', error);
  }
};

// Set user identifier
export const setUserId = (userId: string) => {
  try {
    crashlytics().setUserId(userId);
    console.log('🔥 User ID set in Crashlytics:', userId);
  } catch (error) {
    console.error('Error setting user ID in Crashlytics:', error);
  }
};

// Set custom attributes
export const setAttribute = (key: string, value: string) => {
  try {
    crashlytics().setAttribute(key, value);
    console.log(`🔥 Attribute set in Crashlytics: ${key}=${value}`);
  } catch (error) {
    console.error('Error setting attribute in Crashlytics:', error);
  }
};

// Set multiple custom attributes
export const setAttributes = (attributes: Record<string, string>) => {
  try {
    crashlytics().setAttributes(attributes);
    console.log('🔥 Attributes set in Crashlytics:', attributes);
  } catch (error) {
    console.error('Error setting attributes in Crashlytics:', error);
  }
};

// Force a crash (for testing purposes only)
export const testCrash = () => {
  try {
    crashlytics().crash();
  } catch (error) {
    console.error('Error forcing crash:', error);
  }
};

// Check if crash reporting is enabled
export const isCrashlyticsEnabled = async (): Promise<boolean> => {
  try {
    return await crashlytics().isCrashlyticsCollectionEnabled;
  } catch (error) {
    console.error('Error checking Crashlytics status:', error);
    return false;
  }
};

// Enable/disable crash reporting
export const setCrashlyticsEnabled = async (enabled: boolean) => {
  try {
    await crashlytics().setCrashlyticsCollectionEnabled(enabled);
    console.log(`🔥 Crashlytics collection ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Error setting Crashlytics collection:', error);
  }
};
