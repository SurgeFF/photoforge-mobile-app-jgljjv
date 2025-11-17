
# Build Instructions for PhotoForge Mobile

## Fixing Build Errors

If you encounter the error `Execution failed for task ':app:createBundleReleaseJsAndAssets'`, follow these steps:

### Step 1: Clean Lock Files

You should only have ONE lock file in your project. Remove any extra lock files:

- If using npm: Keep `package-lock.json`, delete `pnpm-lock.yaml` and `yarn.lock`
- If using pnpm: Keep `pnpm-lock.yaml`, delete `package-lock.json` and `yarn.lock`
- If using yarn: Keep `yarn.lock`, delete `package-lock.json` and `pnpm-lock.yaml`

### Step 2: Clean Dependencies

```bash
# Remove node_modules and lock files
rm -rf node_modules
rm -rf android/.gradle
rm -rf android/app/build

# If using npm:
rm package-lock.json
npm install

# If using pnpm:
rm pnpm-lock.yaml
pnpm install

# If using yarn:
rm yarn.lock
yarn install
```

### Step 3: Verify Dependencies

Run the following command to check for dependency issues:

```bash
npx expo install --check
```

This will identify any version mismatches and suggest fixes.

### Step 4: Clean Metro Cache

```bash
npx expo start -c
```

This clears the Metro bundler cache.

### Step 5: Rebuild Android

```bash
# Clean the Android build
cd android
./gradlew clean
cd ..

# Prebuild again
npx expo prebuild -p android --clean
```

### Step 6: Build with Natively

Now try building again with Natively. The build should succeed.

## Common Issues

### Duplicate Dependencies

If you see warnings about duplicate dependencies (especially `@react-native-async-storage/async-storage`), the `package.json` now includes `overrides` and `resolutions` fields to force a single version.

### Firebase Configuration

Make sure you have the `google-services.json` file in the root directory of your project before building.

### Node Version

Ensure you're using a compatible Node.js version. Expo 54 works best with Node.js 18.x or 20.x.

```bash
node --version
```

### Environment Variables

Make sure your `.env` file exists and contains all required variables, especially:
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- Any other API keys your app uses

## Building Locally (Alternative)

If you want to build locally instead of using Natively:

### Prerequisites

1. Install Android Studio
2. Set up Android SDK (API 34)
3. Configure environment variables:
   - `ANDROID_HOME`
   - `JAVA_HOME`

### Build Steps

```bash
# 1. Install dependencies
npm install

# 2. Prebuild native projects
npx expo prebuild -p android

# 3. Build the APK
cd android
./gradlew assembleRelease

# The APK will be at:
# android/app/build/outputs/apk/release/app-release.apk
```

### Build AAB (for Play Store)

```bash
cd android
./gradlew bundleRelease

# The AAB will be at:
# android/app/build/outputs/bundle/release/app-release.aab
```

## Troubleshooting

### "Could not resolve all files for configuration"

This usually means a dependency version conflict. Run:

```bash
npx expo install --fix
```

### "Execution failed for task ':app:mergeReleaseResources'"

This is often caused by duplicate resources. Check for:
- Duplicate image files in `assets/`
- Conflicting resource names in native modules

### "Unable to load script from assets 'index.android.bundle'"

This means the JS bundle wasn't created. Try:

```bash
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res
```

Then rebuild.

## Support

If you continue to have issues:

1. Check the full error log in `android/build/reports/problems/problems-report.html`
2. Review the Gradle build output for specific error messages
3. Ensure all native dependencies are properly linked
4. Try building with EAS Build as an alternative: `eas build -p android`
