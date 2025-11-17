
# Build Configuration Fix

## Issues Found and Fixed

### 1. **Syntax Error in app.json**
**Problem:** The `extra` field was defined twice in your `app.json`:
- Once inside the `splash` object (incorrect placement)
- Once at the root level

This caused a JSON parsing error that prevented the project configuration from being updated.

**Solution:** Fixed the JSON structure by removing the duplicate `extra` field and ensuring proper nesting.

### 2. **Environment Variables in JSON**
**Problem:** You were trying to use `process.env.GOOGLE_MAPS_API_KEY` directly in `app.json`, which doesn't work because JSON files cannot execute JavaScript code.

**Solution:** 
- Created `app.config.js` (JavaScript configuration file) that can access environment variables
- Properly configured Google Maps API key for both iOS and Android platforms
- The key is now accessible via `process.env.GOOGLE_MAPS_API_KEY` from your `.env` file

### 3. **Firebase Configuration**
**Problem:** You're getting "Native Module RNFBAppModule not found" error because Firebase plugins weren't properly configured in the app config.

**Solution:** Added Firebase plugins to the configuration:
```javascript
plugins: [
  "@react-native-firebase/app",
  "@react-native-firebase/crashlytics"
]
```

## What You Need to Do Next

### 1. **Ensure .env File Exists**
Make sure you have a `.env` file in your project root with:
```
GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 2. **Firebase Setup (Important!)**
For Firebase to work properly in native builds, you need:

#### For Android:
1. Download `google-services.json` from your Firebase Console
2. Place it in `android/app/google-services.json`
3. The file should already be referenced in your `android/app/build.gradle`

#### For iOS:
1. Download `GoogleService-Info.plist` from your Firebase Console
2. Place it in `ios/` directory (when you build for iOS)

### 3. **Rebuild the Native Project**
Since you've made configuration changes, you need to rebuild:

```bash
# Clean the Android build
cd android
./gradlew clean
cd ..

# Rebuild with Expo
npx expo prebuild -p android --clean
```

### 4. **For Natively Platform**
When building with Natively:
1. Make sure your `.env` file is properly configured
2. Ensure Firebase configuration files are in place
3. The build should now succeed without the configuration error

## Understanding the Error

The error "Failed to update project configuration while building with natively" occurred because:

1. **Invalid JSON syntax** - The duplicate `extra` field and improper nesting made the JSON invalid
2. **Environment variable access** - JSON files cannot execute JavaScript, so `process.env` calls failed
3. **Missing plugin configuration** - Firebase native modules require proper plugin setup in the app config

## Configuration Files Hierarchy

- **app.json** - Static JSON configuration (use when you don't need environment variables)
- **app.config.js** - Dynamic JavaScript configuration (use when you need environment variables or computed values)
- **app.config.ts** - TypeScript configuration (alternative to .js)

We've provided both files, but **app.config.js takes precedence** over app.json when both exist.

## Testing the Fix

1. **Preview Mode:**
   ```bash
   npm run dev
   ```
   This should work without Firebase errors (Firebase is conditionally loaded)

2. **Native Build:**
   After adding Firebase configuration files, build with Natively or:
   ```bash
   npm run build:android
   ```

## Common Issues and Solutions

### Issue: "Native Module RNFBAppModule not found"
**Solution:** 
- Ensure Firebase plugins are in app.config.js
- Add google-services.json for Android
- Rebuild the native project

### Issue: "GOOGLE_MAPS_API_KEY is undefined"
**Solution:**
- Check that .env file exists
- Verify the key name matches exactly
- Restart the development server after changing .env

### Issue: Build fails with "duplicate entry"
**Solution:**
- Run `./gradlew clean` in the android directory
- Delete `android/.gradle` folder
- Rebuild

## Additional Notes

- The app is configured with **New Architecture enabled** (`newArchEnabled: true`)
- This requires all dependencies to support the New Architecture
- If you encounter issues, you may need to temporarily disable it by setting `newArchEnabled: false`

## Support

If you continue to experience issues:
1. Check the error logs carefully
2. Verify all configuration files are properly formatted
3. Ensure Firebase configuration files are in the correct locations
4. Try cleaning and rebuilding the project
