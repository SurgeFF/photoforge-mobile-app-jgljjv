
# Firebase Configuration

## Project Information

- **Firebase Storage Bucket**: `gs://gen-lang-client-0688382477.firebasestorage.app`
- **iOS Bundle ID**: `com.anonymous.Natively`
- **Android Package Name**: `com.anonymous.Natively`

## Required Files

### iOS Configuration
- **File**: `GoogleService-Info.plist`
- **Location**: Project root (`./GoogleService-Info.plist`)
- **Download from**: Firebase Console → Project Settings → iOS App

### Android Configuration
- **File**: `google-services.json`
- **Location**: Project root (`./google-services.json`)
- **Download from**: Firebase Console → Project Settings → Android App

## Gradle Dependencies (Android)

### Firebase BoM Version
```gradle
implementation platform('com.google.firebase:firebase-bom:34.5.0')
```

### Crashlytics Dependencies
```gradle
implementation 'com.google.firebase:firebase-crashlytics-ndk'
implementation 'com.google.firebase:firebase-analytics'
```

### Gradle Plugins
```gradle
// Project-level build.gradle
classpath 'com.google.gms:google-services:4.4.4'
classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.6'

// App-level build.gradle
apply plugin: 'com.google.gms.google-services'
apply plugin: 'com.google.firebase.crashlytics'
```

## iOS SDK

- **Repository**: https://github.com/firebase/firebase-ios-sdk.git
- **Integration**: Automatic via Expo config plugins

## Installed Packages

```json
{
  "@react-native-firebase/app": "^23.5.0",
  "@react-native-firebase/analytics": "^23.5.0",
  "@react-native-firebase/crashlytics": "^23.5.0"
}
```

## App Configuration (app.json)

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.anonymous.Natively",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "package": "com.anonymous.Natively",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics"
    ]
  }
}
```

## Features Enabled

1. **Firebase Analytics** - User behavior tracking
2. **Firebase Crashlytics** - Crash reporting and error tracking
3. **Firebase Storage** - Media file storage

## Usage in Code

### Initialize (Automatic)
```typescript
import { initializeAnalytics } from '@/utils/analytics';

// Called in app startup
await initializeAnalytics();
```

### Log Errors
```typescript
import { logError } from '@/utils/crashlytics';

logError(error, 'Context information');
```

### Track Events
```typescript
import { trackEvent } from '@/utils/analytics';

await trackEvent('flight_plan_generated', {
  project_id: 'proj_123',
  waypoint_count: 50
});
```

## Build Requirements

Firebase Crashlytics requires native code and cannot run in Expo Go. You must use:

- **EAS Build** (recommended): `eas build --platform ios/android`
- **Local Development Build**: `npx expo prebuild && npx expo run:ios/android`

## Verification Steps

1. Place Firebase config files in project root
2. Run `eas build` or `npx expo prebuild`
3. Install and run the app
4. Check Firebase Console for:
   - Analytics events
   - Crash reports (after triggering a test crash)
   - User sessions

## Support

For issues with Firebase setup, refer to:
- `FIREBASE_CRASHLYTICS_SETUP.md` - Detailed setup guide
- [React Native Firebase Docs](https://rnfirebase.io/)
- [Firebase Console](https://console.firebase.google.com/)
