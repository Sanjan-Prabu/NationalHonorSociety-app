import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import '@/global.css';
import {SafeAreaView} from 'react-native-safe-area-context';
import DashboardScreen from 'screens/member/nhs/DashboardScreen';
import SignupScreen from 'screens/auth/  SignupScreen';
import LoginScreen from 'screens/auth/ LoginScreen';
import LandingScreen from 'screens/auth/LandingScreen';
import AnnouncementsScreen from 'screens/member/nhs/AnounnouncementsScreen';
export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <DashboardScreen />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
