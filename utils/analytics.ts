
import * as amplitude from '@amplitude/analytics-react-native';
import analytics from '@react-native-firebase/analytics';
import { initializeCrashlytics, setUserId as setCrashlyticsUserId, setAttribute } from './crashlytics';

// Initialize analytics services
let isInitialized = false;

export const initializeAnalytics = async (amplitudeApiKey?: string) => {
  if (isInitialized) {
    console.log('📊 Analytics already initialized');
    return;
  }

  try {
    // Initialize Amplitude if API key is provided
    if (amplitudeApiKey) {
      await amplitude.init(amplitudeApiKey);
      console.log('✅ Amplitude initialized');
    } else {
      console.log('⚠️ Amplitude API key not provided, skipping initialization');
    }

    // Firebase Analytics is automatically initialized with the app
    console.log('✅ Firebase Analytics ready');

    // Initialize Crashlytics
    await initializeCrashlytics();

    isInitialized = true;
  } catch (error) {
    console.error('❌ Error initializing analytics:', error);
  }
};

// Track screen views
export const trackScreenView = async (screenName: string, screenClass?: string) => {
  try {
    // Firebase Analytics
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });

    // Amplitude
    amplitude.track('Screen View', {
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });

    console.log(`📊 Screen view tracked: ${screenName}`);
  } catch (error) {
    console.error('Error tracking screen view:', error);
  }
};

// Track custom events
export const trackEvent = async (eventName: string, properties?: Record<string, any>) => {
  try {
    // Firebase Analytics
    await analytics().logEvent(eventName, properties);

    // Amplitude
    amplitude.track(eventName, properties);

    console.log(`📊 Event tracked: ${eventName}`, properties);
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

// Track user login
export const trackLogin = async (method: string, userId?: string) => {
  try {
    // Firebase Analytics
    await analytics().logLogin({ method });

    // Amplitude
    amplitude.track('Login', { method });

    if (userId) {
      await analytics().setUserId(userId);
      amplitude.setUserId(userId);
      // Set user ID in Crashlytics as well
      setCrashlyticsUserId(userId);
    }

    console.log(`📊 Login tracked: ${method}`);
  } catch (error) {
    console.error('Error tracking login:', error);
  }
};

// Track user logout
export const trackLogout = async () => {
  try {
    // Firebase Analytics
    await analytics().logEvent('logout');

    // Amplitude
    amplitude.track('Logout');

    // Reset user ID
    await analytics().setUserId(null);
    amplitude.reset();

    console.log('📊 Logout tracked');
  } catch (error) {
    console.error('Error tracking logout:', error);
  }
};

// Track project creation
export const trackProjectCreated = async (projectId: string, projectName: string) => {
  try {
    await trackEvent('project_created', {
      project_id: projectId,
      project_name: projectName,
    });
  } catch (error) {
    console.error('Error tracking project creation:', error);
  }
};

// Track flight plan generation
export const trackFlightPlanGenerated = async (projectId: string, waypointCount: number) => {
  try {
    await trackEvent('flight_plan_generated', {
      project_id: projectId,
      waypoint_count: waypointCount,
    });
  } catch (error) {
    console.error('Error tracking flight plan:', error);
  }
};

// Track drone connection
export const trackDroneConnection = async (connectionType: string, success: boolean) => {
  try {
    await trackEvent('drone_connection', {
      connection_type: connectionType,
      success,
    });
    
    // Set Crashlytics attribute for drone connection
    setAttribute('last_drone_connection', connectionType);
  } catch (error) {
    console.error('Error tracking drone connection:', error);
  }
};

// Track mission start
export const trackMissionStart = async (missionId: string, waypointCount: number) => {
  try {
    await trackEvent('mission_started', {
      mission_id: missionId,
      waypoint_count: waypointCount,
    });
  } catch (error) {
    console.error('Error tracking mission start:', error);
  }
};

// Track 3D processing
export const trackProcessingStarted = async (projectId: string, imageCount: number) => {
  try {
    await trackEvent('processing_started', {
      project_id: projectId,
      image_count: imageCount,
    });
  } catch (error) {
    console.error('Error tracking processing:', error);
  }
};

// Track payment
export const trackPayment = async (paymentType: string, amount: number, success: boolean) => {
  try {
    if (success) {
      await analytics().logPurchase({
        value: amount,
        currency: 'USD',
        items: [{ item_name: paymentType }],
      });
    }

    await trackEvent('payment', {
      payment_type: paymentType,
      amount,
      success,
    });
  } catch (error) {
    console.error('Error tracking payment:', error);
  }
};

// Track support ticket
export const trackSupportTicket = async (category: string, priority: string) => {
  try {
    await trackEvent('support_ticket_submitted', {
      category,
      priority,
    });
  } catch (error) {
    console.error('Error tracking support ticket:', error);
  }
};

// Set user properties
export const setUserProperties = async (properties: Record<string, any>) => {
  try {
    // Firebase Analytics
    await analytics().setUserProperties(properties);

    // Amplitude
    const identify = new amplitude.Identify();
    Object.entries(properties).forEach(([key, value]) => {
      identify.set(key, value);
    });
    amplitude.identify(identify);

    console.log('📊 User properties set:', properties);
  } catch (error) {
    console.error('Error setting user properties:', error);
  }
};
