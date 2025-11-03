import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    name: "NationalHonorSociety",
    slug: "NationalHonorSociety",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/NHSTorch.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    scheme: "nationalhonorsociety",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.sanjanprabu.nationalhonorsociety",
      buildNumber: process.env.IOS_BUILD_NUMBER || "13",
      infoPlist: {
        NSBluetoothAlwaysUsageDescription: "This app uses Bluetooth to enable automatic attendance tracking when you're near NHS/NHSA events. This allows for seamless check-in without manual intervention.",
        NSBluetoothPeripheralUsageDescription: "This app uses Bluetooth to broadcast attendance sessions for NHS/NHSA events, allowing members to automatically check in when nearby.",
        NSLocationWhenInUseUsageDescription: "This app uses location services to detect nearby NHS/NHSA attendance sessions via Bluetooth beacons for automatic check-in.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses location services to detect nearby NHS/NHSA attendance sessions via Bluetooth beacons for automatic check-in, even when the app is in the background.",
        NSUserNotificationsUsageDescription: "This app sends push notifications to keep you informed about NHS announcements, events, volunteer hour approvals, and BLE attendance sessions.",
        UIBackgroundModes: ["bluetooth-central", "bluetooth-peripheral", "location", "remote-notification"],
        ITSAppUsesNonExemptEncryption: false
      },
      // Production APNs configuration
      entitlements: {
        "aps-environment": process.env.EXPO_PUBLIC_ENVIRONMENT === "production" ? "production" : "development"
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/NHSTorch.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.sanjanprabu.nationalhonorsociety",
      versionCode: parseInt(process.env.ANDROID_VERSION_CODE || "1"),
      permissions: [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_ADVERTISE",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.WAKE_LOCK",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE",
        "android.permission.POST_NOTIFICATIONS"
      ],
      notificationIcon: "./assets/notification-icon.png"
    },
    extra: {
      eas: {
        projectId: "7f08ade8-6a47-4450-9816-dc38a89bd6a2"
      },
      // BLE Configuration
      APP_UUID: "A495BB60-C5B6-466E-B5D2-DF4D449B0F03",
      // CRITICAL: Hardcode values for production builds
      SUPABASE_URL: "https://lncrggkgvstvlmrlykpi.supabase.co",
      SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuY3JnZ2tndnN0dmxtcmx5a3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTc1OTksImV4cCI6MjA3MzgzMzU5OX0.m605pLqr_Ie9a8jPT18MlPFH8CWRJArZTddABiSq5Yc",
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "https://lncrggkgvstvlmrlykpi.supabase.co",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuY3JnZ2tndnN0dmxtcmx5a3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTc1OTksImV4cCI6MjA3MzgzMzU5OX0.m605pLqr_Ie9a8jPT18MlPFH8CWRJArZTddABiSq5Yc",
      // R2 Configuration
      r2AccountId: process.env.R2_ACCOUNT_ID || "147322994f8cbee5b63de04ff2919a74",
      r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || "460f3a09c7b80d16199a5f0828671670",
      r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "8227bedfc2ac9582f5e85bac61ec17e5f9bd3bbf0e92d5f899ca1f33cb2aff5f",
      r2Endpoint: process.env.R2_ENDPOINT || "https://147322994f8cbee5b63de04ff2919a74.r2.cloudflarestorage.com",
      r2PublicBucketName: process.env.R2_PUBLIC_BUCKET_NAME || "nhs-app-public-dev",
      r2PrivateBucketName: process.env.R2_PRIVATE_BUCKET_NAME || "nhs-app-private-prod",
      r2PublicUrl: process.env.R2_PUBLIC_URL || "https://pub-8eafccb788484d2db8560b92e1252627.r2.dev",
      r2PrivateUrl: process.env.R2_PRIVATE_URL || "https://pub-8067a41f98d3460c9a91fe8230a7b5c3.r2.dev",
      // Push Notifications Configuration
      pushNotificationsEnabled: process.env.EXPO_PUBLIC_PUSH_NOTIFICATIONS_ENABLED,
      notificationSoundEnabled: process.env.EXPO_PUBLIC_NOTIFICATION_SOUND_ENABLED,
      notificationVibrationEnabled: process.env.EXPO_PUBLIC_NOTIFICATION_VIBRATION_ENABLED,
    },
    plugins: [
      "expo-secure-store",
      "expo-font",
      [
        "expo-notifications",
        {
          icon: "./assets/notification-icon.png",
          color: "#ffffff",
          defaultChannel: "default",
          sounds: ["./assets/notification-sound.wav"],
          mode: process.env.EXPO_PUBLIC_ENVIRONMENT === "production" ? "production" : "development"
        }
      ],
      [
        "expo-build-properties",
        {
          ios: {
            newArchEnabled: true
          },
          android: {
            newArchEnabled: true,
            minSdkVersion: 21,
            compileSdkVersion: 34,
            targetSdkVersion: 34
          }
        }
      ]
    ]
  };
};