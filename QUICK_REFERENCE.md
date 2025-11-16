
# Quick Reference Guide

## Firebase Configuration

### Storage Bucket
```
gs://gen-lang-client-0688382477.firebasestorage.app
```

### App Identifiers
- **iOS**: `com.anonymous.Natively`
- **Android**: `com.anonymous.Natively`

### Required Files
- iOS: `GoogleService-Info.plist` (project root)
- Android: `google-services.json` (project root)

## Crashlytics Usage

### Import
```typescript
import { logError, logMessage, setAttribute, setUserId } from '@/utils/crashlytics';
```

### Log Error
```typescript
try {
  // code
} catch (error) {
  logError(error as Error, 'Optional context');
}
```

### Log Message
```typescript
logMessage('User completed flight planning');
```

### Set User Context
```typescript
setUserId('user_123');
setAttribute('subscription_tier', 'premium');
```

## Analytics Usage

### Import
```typescript
import { trackEvent, trackScreenView, setUserProperties } from '@/utils/analytics';
```

### Track Event
```typescript
await trackEvent('button_clicked', {
  button_name: 'submit',
  screen: 'settings'
});
```

### Track Screen View
```typescript
await trackScreenView('SettingsScreen');
```

### Set User Properties
```typescript
await setUserProperties({
  subscription_tier: 'premium',
  project_count: 5
});
```

## Build Commands

### Development Build (EAS)
```bash
# iOS
eas build --platform ios --profile development

# Android
eas build --platform android --profile development
```

### Local Development Build
```bash
# Generate native projects
npx expo prebuild

# Run iOS
npx expo run:ios

# Run Android
npx expo run:android
```

### Production Build (EAS)
```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

## Testing

### Test Crashlytics
```typescript
import { testCrash } from '@/utils/crashlytics';

// WARNING: Only use in development!
testCrash();
```

### Verify Analytics
1. Open Firebase Console → Analytics → DebugView
2. Run app in debug mode
3. Trigger events
4. Check DebugView for real-time events

### Verify Crashlytics
1. Trigger a crash or error
2. Wait 5 minutes
3. Open Firebase Console → Crashlytics
4. Check for crash report

## Common Issues

### "Module not found: @react-native-firebase/..."
- Run: `npm install` or `pnpm install`
- Rebuild: `npx expo prebuild --clean`

### "GoogleService-Info.plist not found"
- Download from Firebase Console
- Place in project root
- Rebuild app

### "Crashlytics not reporting crashes"
- Wait at least 5 minutes after crash
- Verify Firebase config files are correct
- Check bundle ID matches Firebase project
- Ensure running development build (not Expo Go)

### "Analytics events not appearing"
- Wait a few minutes for processing
- Check Firebase Console → DebugView
- Verify analytics are initialized
- Check internet connectivity

## File Locations

### Configuration
- `app.json` - Expo configuration with Firebase plugins
- `firebase-config.md` - Firebase project details
- `FIREBASE_CRASHLYTICS_SETUP.md` - Detailed setup guide

### Code
- `utils/crashlytics.ts` - Crashlytics utilities
- `utils/analytics.ts` - Analytics utilities
- `utils/apiClient.ts` - API client with Firebase storage config

### Documentation
- `ANALYTICS_SETUP.md` - Analytics and Crashlytics setup
- `WEBAPP_INTEGRATION_NOTES.md` - Backend integration notes
- `QUICK_REFERENCE.md` - This file

## Environment Variables

### Amplitude API Key
Set in your app initialization:
```typescript
initializeAnalytics('YOUR_AMPLITUDE_API_KEY');
```

Or use environment variables:
```bash
AMPLITUDE_API_KEY=your_key_here
```

## Deployment Checklist

- [ ] Firebase config files in place
- [ ] Bundle IDs match Firebase project
- [ ] Amplitude API key configured
- [ ] Test analytics in development
- [ ] Test Crashlytics in development
- [ ] Verify storage bucket access
- [ ] Test all API endpoints
- [ ] Create production build
- [ ] Test production build
- [ ] Monitor Firebase Console after release

## Support Resources

- Firebase Console: https://console.firebase.google.com/
- Amplitude Dashboard: https://amplitude.com/
- React Native Firebase Docs: https://rnfirebase.io/
- Expo Docs: https://docs.expo.dev/
- EAS Build Docs: https://docs.expo.dev/build/introduction/
