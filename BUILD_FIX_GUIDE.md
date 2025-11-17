
# Build Fix Guide for Android Release Build

## Problem
The Android build was failing with the error:
```
Execution failed for task ':app:createBundleReleaseJsAndAssets'.
> Process 'command 'node'' finished with non-zero exit value 1
```

## Root Causes
1. **Multiple lock files** - Both `pnpm-lock.yaml` and `package-lock.json` existed, causing dependency resolution conflicts
2. **Duplicate dependencies** - `@react-native-async-storage/async-storage` had multiple versions
3. **New Architecture enabled** - This can cause compatibility issues with some packages
4. **Babel configuration** - The worklets plugin was incorrectly configured

## Fixes Applied

### 1. Updated package.json
- Kept dependency resolutions and overrides for `@react-native-async-storage/async-storage`
- Added postinstall script for patch-package

### 2. Updated metro.config.js
- Added explicit `nodeModulesPaths` configuration
- Configured minifier settings
- Set max workers to 2 for better performance

### 3. Updated babel.config.js
- Changed from `react-native-worklets/plugin` to `react-native-reanimated/plugin`
- Added `jsxRuntime: "automatic"` to babel-preset-expo

### 4. Updated app.json
- **Disabled New Architecture** (`newArchEnabled: false`) - This is the most critical fix
- Simplified scheme to "photoforge"
- Removed duplicate scheme configuration

### 5. Added .npmrc
- Configured proper hoisting for dependencies
- Set auto-install-peers to true
- Disabled strict peer dependencies

## Steps to Fix Your Build

### Step 1: Clean Everything
```bash
# Remove all lock files
rm -f package-lock.json pnpm-lock.yaml yarn.lock

# Remove node_modules
rm -rf node_modules

# Clean Android build
cd android
./gradlew clean
cd ..

# Clean Metro cache
rm -rf node_modules/.cache
```

### Step 2: Reinstall Dependencies
```bash
# Use npm (recommended for consistency)
npm install

# Or if you prefer pnpm, use only pnpm
pnpm install
```

### Step 3: Rebuild Android Folder
```bash
# Remove android folder
rm -rf android

# Regenerate with prebuild
npx expo prebuild -p android --clean
```

### Step 4: Build Again
```bash
# For development build
npx expo run:android

# For release build
cd android
./gradlew assembleRelease
```

## Important Notes

1. **Use Only One Package Manager**: Choose either npm or pnpm, not both. This prevents lock file conflicts.

2. **New Architecture**: We disabled the New Architecture (`newArchEnabled: false`) because:
   - Some packages may not be fully compatible yet
   - It can cause bundling issues during release builds
   - You can re-enable it later once all dependencies are compatible

3. **Dependency Deduplication**: The resolutions and overrides in package.json ensure only one version of async-storage is used.

4. **Metro Cache**: If you still have issues, clear the Metro cache:
   ```bash
   npx expo start --clear
   ```

5. **Gradle Cache**: If Android build still fails:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew --stop
   cd ..
   ```

## Verification

After applying these fixes, verify:
1. Only one lock file exists (either package-lock.json or pnpm-lock.yaml)
2. Run `npm ls @react-native-async-storage/async-storage` to verify only one version
3. The app builds successfully with `npx expo run:android`

## If Issues Persist

1. Check the full error logs in `android/build/reports/problems/problems-report.html`
2. Look for specific JavaScript errors in the Metro bundler output
3. Ensure all imports in your code are correct and files exist
4. Check for circular dependencies in your code

## Common JavaScript Errors to Check

- Missing or incorrect imports
- Syntax errors in TypeScript/JavaScript files
- Circular dependencies between files
- Missing dependencies in package.json
- Incorrect file paths in imports

Run the linter to catch potential issues:
```bash
npm run lint
```
