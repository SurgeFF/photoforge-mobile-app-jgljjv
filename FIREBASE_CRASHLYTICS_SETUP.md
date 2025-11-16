
# Firebase Crashlytics Setup Guide

This guide will help you set up Firebase Crashlytics for the PhotoForge Mobile app to track crashes and errors in production.

## Overview

Firebase Crashlytics is now integrated into the app with the following configuration:

- **Firebase Storage Bucket**: `gs://gen-lang-client-0688382477.firebasestorage.app`
- **iOS SDK**: https://github.com/firebase/firebase-ios-sdk.git
- **Android Dependencies**: Firebase BoM 34.5.0 with Crashlytics NDK and Analytics

## Prerequisites

1. A Firebase project (create one at https://console.firebase.google.com)
2. Firebase configuration files for iOS and Android
3. EAS Build or bare workflow (Crashlytics requires native code)

## Step 1: Download Firebase Configuration Files

### For iOS:
1. Go to Firebase Console → Project Settings → Your Apps
2. Select your iOS app (or add one if not exists)
3. Download `GoogleService-Info.plist`
4. Place it in the root of your project: `./GoogleService-Info.plist`

### For Android:
1. Go to Firebase Console → Project Settings → Your Apps
2. Select your Android app (or add one if not exists)
3. Download `google-services.json`
4. Place it in the root of your project: `./google-services.json`

## Step 2: Update app.json (Already Done)

The `app.json` has been updated with:

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
      "@react-native-firebase/crashlytics"
    ]
  }
}
```

## Step 3: Android Gradle Configuration

The following Gradle configurations are required for Android. These will be automatically applied when you run `expo prebuild` or create a development build with EAS.

### Project-level build.gradle

```gradle
buildscript {
  dependencies {
    // Google Services plugin
    classpath 'com.google.gms:google-services:4.4.4'
    
    // Crashlytics Gradle plugin
    classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.6'
  }
}
```

### App-level build.gradle

```gradle
plugins {
  id 'com.android.application'
  id 'com.google.gms.google-services'
  id 'com.google.firebase.crashlytics'
}

dependencies {
  // Import the Firebase BoM
  implementation platform('com.google.firebase:firebase-bom:34.5.0')
  
  // Crashlytics NDK (for native crash reporting)
  implementation 'com.google.firebase:firebase-crashlytics-ndk'
  
  // Firebase Analytics
  implementation 'com.google.firebase:firebase-analytics'
}
```

## Step 4: iOS Configuration

For iOS, the Firebase SDK will be automatically linked when you build with EAS or run `expo prebuild`.

The iOS SDK repository is: https://github.com/firebase/firebase-ios-sdk.git

## Step 5: Build the App

Since Crashlytics requires native code, you need to create a development build:

### Using EAS Build:

```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS Build
eas build:configure

# Build for iOS
eas build --platform ios --profile development

# Build for Android
eas build --platform android --profile development
```

### Using Local Prebuild:

```bash
# Generate native projects
npx expo prebuild

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

## Step 6: Initialize Crashlytics in Your App

Crashlytics is automatically initialized when the app starts. The initialization code is in `utils/crashlytics.ts` and is called from `utils/analytics.ts`.

## Usage

### Automatic Crash Reporting

All JavaScript errors and native crashes are automatically reported to Firebase Crashlytics.

### Manual Error Logging

```typescript
import { logError, logMessage, setAttribute } from '@/utils/crashlytics';

// Log a non-fatal error
try {
  // Some code that might throw
} catch (error) {
  logError(error as Error, 'Context about what was happening');
}

// Log a custom message
logMessage('User completed flight planning');

// Set custom attributes for debugging
setAttribute('drone_model', 'DJI Mavic 3');
setAttribute('flight_mode', 'autonomous');
```

### Set User Identifier

User IDs are automatically set when users log in via the analytics system:

```typescript
import { trackLogin } from '@/utils/analytics';

// This also sets the user ID in Crashlytics
await trackLogin('access_key', userId);
```

### Test Crashlytics (Development Only)

```typescript
import { testCrash } from '@/utils/crashlytics';

// Force a crash to test Crashlytics integration
// WARNING: Only use this in development!
testCrash();
```

## Verification

1. Build and run your app on a device or simulator
2. Trigger a crash or error
3. Wait a few minutes for the crash report to upload
4. Check Firebase Console → Crashlytics to see the crash report

## Available Functions

### From `utils/crashlytics.ts`:

- `initializeCrashlytics()` - Initialize Crashlytics (called automatically)
- `logError(error, context?)` - Log a non-fatal error
- `logMessage(message)` - Log a custom message
- `setUserId(userId)` - Set user identifier
- `setAttribute(key, value)` - Set a custom attribute
- `setAttributes(attributes)` - Set multiple custom attributes
- `testCrash()` - Force a crash (testing only)
- `isCrashlyticsEnabled()` - Check if crash reporting is enabled
- `setCrashlyticsEnabled(enabled)` - Enable/disable crash reporting

## Integration with Analytics

Crashlytics is integrated with the existing analytics system. When you call `trackLogin()`, the user ID is automatically set in both Firebase Analytics and Crashlytics.

## Troubleshooting

### Crashes not appearing in Firebase Console

1. Make sure you've waited at least 5 minutes after the crash
2. Verify that `google-services.json` and `GoogleService-Info.plist` are in the correct locations
3. Check that the bundle identifier matches your Firebase project
4. Ensure you're running a development build, not Expo Go

### Build errors

1. Make sure you have the latest version of EAS CLI: `npm install -g eas-cli@latest`
2. Clear the build cache: `eas build --clear-cache`
3. Check that your Firebase configuration files are valid JSON/plist

### Crashlytics not initializing

1. Check the console logs for initialization messages
2. Verify that the Firebase app is properly configured
3. Make sure you're not running in Expo Go (native modules required)

## Additional Resources

- [Firebase Crashlytics Documentation](https://firebase.google.com/docs/crashlytics)
- [React Native Firebase Crashlytics](https://rnfirebase.io/crashlytics/usage)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## What to Relay to the Webapp Team

The mobile app is now configured to use:

1. **Firebase Storage Bucket**: `gs://gen-lang-client-0688382477.firebasestorage.app`
2. **Firebase Crashlytics**: Enabled for crash reporting
3. **Firebase Analytics**: Already integrated and working

The webapp backend should ensure that:

- File uploads are directed to the correct Firebase Storage bucket
- Any storage URLs returned to the mobile app use the correct bucket
- The Firebase project has the mobile app's bundle identifiers registered:
  - iOS: `com.anonymous.Natively`
  - Android: `com.anonymous.Natively`

## Next Steps

1. Download `GoogleService-Info.plist` and `google-services.json` from Firebase Console
2. Place them in the project root
3. Create a development build using EAS Build
4. Test the app and verify crashes appear in Firebase Console
5. Deploy to production when ready
