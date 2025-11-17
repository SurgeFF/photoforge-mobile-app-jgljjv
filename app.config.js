
module.exports = {
  expo: {
    name: "photoforge-mobile-app-jgljjv",
    slug: "photoforge-mobile-app-jgljjv",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/natively-dark.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/natively-dark.png",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.DroneElite.PhotoForge",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/natively-dark.png",
        backgroundColor: "#000000"
      },
      package: "com.droneelite.photoforgemobile",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      favicon: "./assets/images/final_quest_240x240.png",
      bundler: "metro"
    },
    plugins: [
      "expo-font",
      "expo-router",
      "expo-web-browser",
      [
        "@react-native-firebase/app",
        {
          // Firebase configuration will be handled by google-services.json
        }
      ],
      [
        "@react-native-firebase/crashlytics",
        {
          // Crashlytics configuration
        }
      ]
    ],
    scheme: "photoforge",
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY
    }
  }
};
