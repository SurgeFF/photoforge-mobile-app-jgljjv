
# Analytics & Crashlytics Setup Guide

This app integrates **Firebase Analytics**, **Firebase Crashlytics**, and **Amplitude** for comprehensive analytics tracking and crash reporting.

## Firebase Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

### 2. Add iOS App

1. In Firebase Console, click "Add app" and select iOS
2. Enter your iOS Bundle ID (found in `app.json` under `ios.bundleIdentifier`)
3. Download the `GoogleService-Info.plist` file
4. Place it in the root of your project

### 3. Add Android App

1. In Firebase Console, click "Add app" and select Android
2. Enter your Android Package Name (found in `app.json` under `android.package`)
3. Download the `google-services.json` file
4. Place it in the root of your project

### 4. Configure app.json

Add the Firebase plugins to your `app.json`:

```json
{
  "expo": {
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/analytics",
      "@react-native-firebase/crashlytics"
    ]
  }
}
```

**Note**: The configuration has already been added to `app.json`.

### 5. Rebuild Your App

Since Firebase requires native configuration, you'll need to rebuild:

```bash
npx expo prebuild
npx expo run:ios
npx expo run:android
```

## Firebase Crashlytics

Firebase Crashlytics is automatically initialized with Firebase Analytics. It provides:

- **Automatic crash reporting** for JavaScript and native crashes
- **Custom error logging** for non-fatal errors
- **User context** tracking (user ID, custom attributes)
- **Real-time crash alerts**

### Usage

```typescript
import { logError, logMessage, setAttribute } from '@/utils/crashlytics';

// Log a non-fatal error
try {
  // Some code
} catch (error) {
  logError(error as Error, 'Context information');
}

// Log a custom message
logMessage('User completed important action');

// Set custom attributes
setAttribute('drone_model', 'DJI Mavic 3');
```

For detailed Crashlytics setup, see `FIREBASE_CRASHLYTICS_SETUP.md`.

## Amplitude Setup

### 1. Create an Amplitude Account

1. Go to [Amplitude](https://amplitude.com/)
2. Sign up or log in
3. Create a new project

### 2. Get Your API Key

1. In Amplitude dashboard, go to Settings → Projects
2. Copy your API Key

### 3. Initialize Amplitude in Your App

Update the `initializeAnalytics` call in `app/(tabs)/(home)/index.tsx` and `app/(tabs)/(home)/index.ios.tsx`:

```typescript
// Replace 'YOUR_AMPLITUDE_API_KEY' with your actual API key
initializeAnalytics('YOUR_AMPLITUDE_API_KEY');
```

Or set it as an environment variable and load it from your config.

## Analytics Events

The app automatically tracks the following events:

### Screen Views
- Home screen
- All other screens (when you add tracking)

### User Actions
- **Login**: Tracks when users log in (manual or auto-login)
- **Logout**: Tracks when users log out
- **Privacy Policy**: Tracks when users open the privacy policy

### Project Events
- **project_created**: When a new project is created
- **flight_plan_generated**: When a flight plan is generated

### Drone Events
- **drone_connection**: When drone connects/disconnects
- **mission_started**: When a mission starts

### Processing Events
- **processing_started**: When 3D processing begins

### Payment Events
- **payment**: When a payment is made (donation or subscription)

### Support Events
- **support_ticket_submitted**: When a support ticket is submitted

## Adding Custom Events

To track custom events in your app, use the analytics utility:

```typescript
import { trackEvent, trackScreenView } from '@/utils/analytics';

// Track a screen view
trackScreenView('ScreenName');

// Track a custom event
trackEvent('button_clicked', {
  button_name: 'submit',
  screen: 'settings'
});
```

## User Properties

Set user properties to segment your analytics:

```typescript
import { setUserProperties } from '@/utils/analytics';

setUserProperties({
  subscription_tier: 'premium',
  project_count: 5,
  user_type: 'professional'
});
```

## Testing

### Firebase Analytics

1. Open Firebase Console
2. Go to Analytics → DebugView
3. Run your app in debug mode
4. Events should appear in real-time

### Amplitude

1. Open Amplitude dashboard
2. Go to User Lookup
3. Search for your user ID or device ID
4. View events in real-time

## Privacy Considerations

- Analytics are initialized on app start
- User IDs are set on login and cleared on logout
- All events are anonymized by default
- Users can view the Privacy Policy at: https://drone1337.com/photoforgemobileprivacy

## Troubleshooting

### Firebase Not Working

1. Verify `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) are in the correct location
2. Rebuild the app with `npx expo prebuild`
3. Check Firebase Console for any configuration errors

### Amplitude Not Working

1. Verify your API key is correct
2. Check console logs for initialization errors
3. Ensure you have internet connectivity

### Events Not Appearing

1. Wait a few minutes for events to process
2. Check that analytics are initialized before tracking events
3. Verify you're looking at the correct project in the dashboard

## Production Deployment

When deploying to production:

1. Ensure Firebase configuration files are included in your build
2. Set Amplitude API key via environment variables (don't commit it)
3. Test analytics in production build before releasing
4. Monitor analytics dashboards for any issues

## Additional Documentation

- **Firebase Crashlytics Setup**: See `FIREBASE_CRASHLYTICS_SETUP.md` for detailed Crashlytics configuration
- **Firebase Configuration**: See `firebase-config.md` for Firebase project details
- **Webapp Integration**: See `WEBAPP_INTEGRATION_NOTES.md` for backend integration details

## Support

For issues with:
- **Firebase**: [Firebase Support](https://firebase.google.com/support)
- **Firebase Crashlytics**: [Crashlytics Documentation](https://firebase.google.com/docs/crashlytics)
- **Amplitude**: [Amplitude Support](https://help.amplitude.com/)
- **App Integration**: Submit a support ticket in the app
