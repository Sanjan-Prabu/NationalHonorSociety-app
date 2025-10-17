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
      SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY,
    },
    plugins: [
      "expo-secure-store",
      "expo-font"
    ]
  };
};