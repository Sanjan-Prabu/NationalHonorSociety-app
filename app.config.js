import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    name: "NationalHonorSociety",
    slug: "NationalHonorSociety",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
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
      bundleIdentifier: "com.sanjan.prabu.NationalHonorSociety",
      infoPlist: {
        NSBluetoothAlwaysUsageDescription: "This app uses Bluetooth to enable automatic attendance tracking when you're near NHS/NHSA events. This allows for seamless check-in without manual intervention.",
        NSBluetoothPeripheralUsageDescription: "This app uses Bluetooth to broadcast attendance sessions for NHS/NHSA events, allowing members to automatically check in when nearby.",
        NSLocationWhenInUseUsageDescription: "This app uses location services to detect nearby NHS/NHSA attendance sessions via Bluetooth beacons for automatic check-in.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "This app uses location services to detect nearby NHS/NHSA attendance sessions via Bluetooth beacons for automatic check-in, even when the app is in the background.",
        UIBackgroundModes: ["bluetooth-central", "bluetooth-peripheral", "location"]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.sanjan.prabu.NationalHonorSociety",
      permissions: [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_ADVERTISE",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.WAKE_LOCK"
      ]
    },
    extra: {
      eas: {
        projectId: "7f08ade8-6a47-4450-9816-dc38a89bd6a2"
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
      // R2 Configuration
      r2AccountId: process.env.R2_ACCOUNT_ID,
      r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
      r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      r2Endpoint: process.env.R2_ENDPOINT,
      r2PublicBucketName: process.env.R2_PUBLIC_BUCKET_NAME,
      r2PrivateBucketName: process.env.R2_PRIVATE_BUCKET_NAME,
      r2PublicUrl: process.env.R2_PUBLIC_URL,
      r2PrivateUrl: process.env.R2_PRIVATE_URL,
    },
    plugins: [
      "expo-secure-store",
      "expo-font"
    ]
  };
};