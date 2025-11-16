
# Security Setup Guide

## Environment Variables Configuration

This app uses environment variables to securely store sensitive information like API keys. The Google Maps API key is now stored in a `.env` file instead of being hardcoded in the source code.

### Setup Instructions

1. **Create a `.env` file** in the root directory of your project (if it doesn't exist already)

2. **Add your Google Maps API key** to the `.env` file:
   ```
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   ```

3. **Important**: The `.env` file is already added to `.gitignore` and will NOT be committed to your GitHub repository

### How It Works

- Environment variables prefixed with `EXPO_PUBLIC_` are exposed to the app at build-time
- The API key is accessed in the code using `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- When you push to GitHub, the `.env` file is ignored, keeping your API key secure

### For Team Members

If you're sharing this project with team members:

1. Share the `.env.example` file (which is committed to the repository)
2. Each team member should:
   - Copy `.env.example` to `.env`
   - Fill in their own API keys
   - Never commit the `.env` file

### Building the App

When building the app with Expo:

**Development:**
```bash
npx expo start
```

**Production Build:**
```bash
# For Android
eas build --platform android

# For iOS
eas build --platform ios
```

The environment variables will be automatically included in the build process.

### Local PC Build Instructions

If you want to build the app locally from your PC:

#### Prerequisites
1. Install Node.js (v18 or higher)
2. Install Expo CLI: `npm install -g expo-cli`
3. Install EAS CLI: `npm install -g eas-cli`

#### Android Local Build
```bash
# 1. Install dependencies
npm install

# 2. Configure EAS
eas build:configure

# 3. Build locally (requires Android Studio)
eas build --platform android --local

# Or use Expo's prebuild for development
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

#### iOS Local Build (Mac only)
```bash
# 1. Install dependencies
npm install

# 2. Install CocoaPods
cd ios && pod install && cd ..

# 3. Build locally (requires Xcode)
eas build --platform ios --local

# Or use Expo's prebuild for development
npx expo prebuild --platform ios
cd ios
xcodebuild -workspace YourApp.xcworkspace -scheme YourApp -configuration Release
```

### Security Best Practices

1. **Never commit `.env` files** - They contain sensitive information
2. **Use different API keys** for development and production
3. **Restrict API keys** in Google Cloud Console:
   - Set application restrictions (Android/iOS bundle IDs)
   - Set API restrictions (only enable Google Maps APIs)
4. **Rotate keys regularly** if they're exposed
5. **Monitor API usage** in Google Cloud Console

### Troubleshooting

**Map not loading:**
- Check that your `.env` file exists and contains the API key
- Verify the API key is correct
- Ensure the API key has Google Maps JavaScript API enabled
- Check that the API key restrictions allow your app's bundle ID

**Environment variable not found:**
- Restart the Expo development server after adding/changing `.env`
- Clear Metro cache: `npx expo start --clear`
- Verify the variable name starts with `EXPO_PUBLIC_`

### Additional Resources

- [Expo Environment Variables Guide](https://docs.expo.dev/guides/environment-variables/)
- [Google Maps API Key Setup](https://developers.google.com/maps/documentation/javascript/get-api-key)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
