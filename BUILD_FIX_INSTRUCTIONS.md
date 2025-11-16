
# Build Issues Fixed - Next Steps

## Issues Resolved:

### 1. ✅ Multiple Lock Files
- **Problem**: Both `pnpm-lock.yaml` and `package-lock.json` were present
- **Solution**: Removed `pnpm-lock.yaml` since you're using npm

### 2. ✅ Duplicate Dependencies
- **Problem**: `@amplitude/analytics-react-native` was pulling in an older version of `@react-native-async-storage/async-storage`
- **Solution**: Added `resolutions` and `overrides` to `package.json` to force version 2.2.0

### 3. ✅ App Config Issues
- **Problem**: Duplicate `scheme` property in `app.json` (both inside and outside expo object)
- **Solution**: Removed the duplicate, kept only the one inside the `expo` object

### 4. ✅ NPM Config Warning
- **Problem**: `.npmrc` had unsupported `node-linker` config
- **Solution**: Cleaned up `.npmrc` file

## Next Steps - Run These Commands:

### Step 1: Clean Everything
```bash
# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# If android/ios folders exist and you want to regenerate them
rm -rf android ios
```

### Step 2: Fresh Install
```bash
# Install dependencies with npm
npm install

# Deduplicate dependencies
npm dedupe
```

### Step 3: Verify Dependencies
```bash
# Check for any remaining issues
npx expo install --check

# If it suggests any updates, run:
npx expo install --fix
```

### Step 4: Prebuild (if needed)
```bash
# Only if you need native folders
npx expo prebuild --clean
```

### Step 5: Start Development
```bash
# Start the dev server
npm run dev
```

## Important Notes:

1. **Native Folders**: Since you have `android` and `ios` folders, EAS Build won't sync properties from `app.json`. If you need to change native configurations, you'll need to either:
   - Manage them directly in the native folders, OR
   - Delete the native folders and let Expo manage them via Prebuild

2. **Dependency Management**: The `resolutions` and `overrides` fields in `package.json` will force all packages to use the same version of `@react-native-async-storage/async-storage`.

3. **Lock File**: After running `npm install`, a new `package-lock.json` will be created. Commit this to your repository.

4. **EAS Build**: For EAS Build, make sure your `eas.json` is properly configured. The build service will use the `package-lock.json` to determine the package manager.

## Verification:

After completing the steps above, run:
```bash
npx expo-doctor
```

This should show all checks passing. If there are still issues, the doctor command will provide specific guidance.

## If You Still See Issues:

1. **Duplicate Dependencies**: Run `npm ls @react-native-async-storage/async-storage` to see if duplicates still exist
2. **Cache Issues**: Try `npm cache clean --force` and reinstall
3. **Native Build Issues**: If prebuild fails, check the error messages carefully - they usually indicate missing configuration or incompatible packages
