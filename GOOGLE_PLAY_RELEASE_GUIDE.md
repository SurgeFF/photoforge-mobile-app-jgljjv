
# Google Play Store Release Guide

This guide provides complete instructions for building and releasing an Android App Bundle (AAB) to the Google Play Store using the zip file downloaded from Natively.

## Prerequisites

Before you begin, ensure you have:

1. **Android Studio** installed on your computer
   - Download from: https://developer.android.com/studio
   - Minimum version: Android Studio Hedgehog (2023.1.1) or later

2. **Java Development Kit (JDK)** 
   - JDK 17 or later is recommended
   - Verify installation: `java -version`

3. **Google Play Console Account**
   - Create an account at: https://play.google.com/console/
   - Pay the one-time $25 registration fee

4. **Signing Key** (for production releases)
   - You'll need to generate a keystore file for signing your app

## Step 1: Download and Extract the Project

1. Download the zip file from Natively
2. Extract the zip file to a location on your computer
3. Navigate to the extracted folder

## Step 2: Prepare Your Project Configuration

### Update app.json

Ensure your `app.json` has the correct configuration:

```json
{
  "expo": {
    "name": "PhotoForge Mobile",
    "slug": "photoforge-mobile-app",
    "version": "1.0.0",
    "android": {
      "package": "com.droneelite.photoforgemobile",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/final_quest_240x240.png",
        "backgroundColor": "#ffffff"
      }
    }
  }
}
```

**Important fields:**
- `version`: User-facing version (e.g., "1.0.0")
- `android.versionCode`: Integer that must increment with each release (e.g., 1, 2, 3...)
- `android.package`: Your unique package identifier

## Step 3: Generate a Signing Key

You need a keystore file to sign your app for production release.

### Create a Keystore

Open a terminal and run:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

You'll be prompted to enter:
- Keystore password (remember this!)
- Key password (remember this!)
- Your name, organization, city, state, country

**CRITICAL: Back up this keystore file and passwords securely!**
- If you lose this keystore, you cannot update your app on Google Play
- Store it in a secure location (password manager, encrypted backup)

## Step 4: Configure Gradle for Signing

### Create gradle.properties file

In the `android` folder, create or edit `gradle.properties`:

```properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

**Security Note:** Never commit this file to version control!

### Update android/app/build.gradle

Add the signing configuration to `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

## Step 5: Build the Android App Bundle

### Option A: Using Android Studio (Recommended)

1. **Open the project in Android Studio:**
   - Launch Android Studio
   - Select "Open an Existing Project"
   - Navigate to the `android` folder in your extracted project
   - Click "OK"

2. **Sync Gradle:**
   - Android Studio will automatically sync Gradle
   - Wait for the sync to complete (check bottom status bar)
   - If there are errors, resolve them before proceeding

3. **Build the AAB:**
   - Go to: **Build → Generate Signed Bundle / APK**
   - Select **Android App Bundle**
   - Click **Next**
   - Choose your keystore file (or create a new one)
   - Enter keystore password, key alias, and key password
   - Click **Next**
   - Select **release** build variant
   - Check **V2 (Full APK Signature)** (V1 is optional)
   - Click **Finish**

4. **Locate the AAB:**
   - The AAB will be generated at: `android/app/release/app-release.aab`
   - Android Studio will show a notification with a link to the file location

### Option B: Using Command Line

1. **Navigate to the android folder:**
   ```bash
   cd android
   ```

2. **Clean the project:**
   ```bash
   ./gradlew clean
   ```

3. **Build the AAB:**
   ```bash
   ./gradlew bundleRelease
   ```

4. **Locate the AAB:**
   - The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

## Step 6: Test the AAB Locally (Optional but Recommended)

Before uploading to Google Play, test your AAB:

1. **Install bundletool:**
   ```bash
   # Download from: https://github.com/google/bundletool/releases
   ```

2. **Generate APKs from AAB:**
   ```bash
   java -jar bundletool.jar build-apks --bundle=app-release.aab --output=app.apks --mode=universal
   ```

3. **Install on device:**
   ```bash
   java -jar bundletool.jar install-apks --apks=app.apks
   ```

## Step 7: Prepare for Google Play Console

### Required Assets

Before uploading, prepare these assets:

1. **App Icon:**
   - 512 x 512 px
   - 32-bit PNG with alpha
   - Maximum 1024 KB

2. **Feature Graphic:**
   - 1024 x 500 px
   - JPG or 24-bit PNG (no alpha)

3. **Screenshots:**
   - At least 2 screenshots
   - Phone: 16:9 or 9:16 aspect ratio
   - Minimum dimension: 320 px
   - Maximum dimension: 3840 px

4. **Privacy Policy URL:**
   - Required if your app collects user data
   - Must be publicly accessible

## Step 8: Upload to Google Play Console

### Create Your App Listing

1. **Go to Google Play Console:**
   - Visit: https://play.google.com/console/
   - Sign in with your developer account

2. **Create a new app:**
   - Click **Create app**
   - Enter app name
   - Select default language
   - Choose app or game
   - Select free or paid
   - Accept declarations
   - Click **Create app**

### Set Up Your App

1. **Dashboard:**
   - Complete all required tasks in the dashboard
   - Each section must be completed before you can publish

2. **Store Presence → Main Store Listing:**
   - App name
   - Short description (80 characters)
   - Full description (4000 characters)
   - App icon
   - Feature graphic
   - Screenshots
   - Categorization
   - Contact details
   - Privacy policy

3. **Store Presence → Store Settings:**
   - App category
   - Tags
   - Contact details

4. **Policy → App Content:**
   - Privacy policy
   - Ads declaration
   - Content rating questionnaire
   - Target audience
   - News apps declaration (if applicable)
   - COVID-19 contact tracing and status apps (if applicable)
   - Data safety form

### Upload Your AAB

1. **Go to Release → Production:**
   - Click **Create new release**

2. **Upload the AAB:**
   - In the "App bundles" section, click **Upload**
   - Select your `app-release.aab` file
   - Wait for upload and processing

3. **Release Name:**
   - Enter a release name (e.g., "1.0.0 - Initial Release")

4. **Release Notes:**
   - Add what's new in this release
   - Support multiple languages if needed

5. **Review and Rollout:**
   - Click **Save**
   - Review all information
   - Click **Review release**
   - If everything looks good, click **Start rollout to Production**

## Step 9: Review Process

1. **Google's Review:**
   - Google will review your app (typically 1-7 days)
   - You'll receive email notifications about the status

2. **Possible Outcomes:**
   - **Approved:** Your app will be published
   - **Rejected:** You'll receive reasons and can fix issues and resubmit

3. **After Approval:**
   - Your app will be live on Google Play Store
   - It may take a few hours to appear in search results

## Step 10: Future Updates

When releasing updates:

1. **Increment version numbers in app.json:**
   ```json
   {
     "version": "1.0.1",
     "android": {
       "versionCode": 2
     }
   }
   ```

2. **Rebuild the AAB** (repeat Step 5)

3. **Upload to Google Play Console:**
   - Go to Release → Production
   - Create new release
   - Upload new AAB
   - Add release notes
   - Review and rollout

## Troubleshooting

### Common Issues

**1. Build Fails with "Execution failed for task"**
- Check `android/gradle.properties` for correct configuration
- Ensure all dependencies are compatible
- Run `./gradlew clean` and try again

**2. Signing Configuration Not Found**
- Verify keystore file path in `gradle.properties`
- Ensure passwords are correct
- Check that keystore file exists in the specified location

**3. AAB Upload Rejected**
- Ensure `versionCode` is higher than previous releases
- Check that package name matches your app listing
- Verify signing key matches previous releases (for updates)

**4. App Crashes After Installation**
- Test the AAB locally using bundletool
- Check ProGuard rules if using code obfuscation
- Review crash reports in Google Play Console

**5. "You uploaded a debuggable APK"**
- Ensure you're building with `bundleRelease` (not `bundleDebug`)
- Check that `debuggable` is not set to `true` in build.gradle

### Getting Help

- **Expo Forums:** https://forums.expo.dev/
- **Google Play Console Help:** https://support.google.com/googleplay/android-developer
- **Stack Overflow:** Tag questions with `expo`, `react-native`, `android`

## Security Best Practices

1. **Never commit sensitive files:**
   - Add to `.gitignore`:
     ```
     *.keystore
     gradle.properties
     ```

2. **Backup your keystore:**
   - Store in multiple secure locations
   - Use a password manager for credentials

3. **Use environment variables:**
   - For CI/CD pipelines, use environment variables instead of files

4. **Enable Google Play App Signing:**
   - Let Google manage your signing key
   - Provides additional security and recovery options

## Checklist Before Release

- [ ] App tested thoroughly on multiple devices
- [ ] All features working as expected
- [ ] No debug code or console.logs in production
- [ ] Privacy policy created and linked
- [ ] All required assets prepared (icon, screenshots, etc.)
- [ ] Version numbers incremented correctly
- [ ] Keystore backed up securely
- [ ] AAB built and tested locally
- [ ] Google Play Console listing completed
- [ ] Content rating questionnaire completed
- [ ] Data safety form completed

## Additional Resources

- **Expo Documentation:** https://docs.expo.dev/
- **Android Developer Guide:** https://developer.android.com/studio/publish
- **Google Play Console:** https://play.google.com/console/
- **Bundletool:** https://github.com/google/bundletool

---

**Note:** This guide assumes you're working with the Natively platform and have downloaded a zip file containing your Expo project. The process may vary slightly depending on your specific setup and Expo SDK version.

For the most up-to-date information, always refer to the official Expo and Android documentation.
