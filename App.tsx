import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import '@/global.css';
import {SafeAreaView,SafeAreaProvider} from 'react-native-safe-area-context';
import DashboardScreen from 'screens/member/nhs/DashboardScreen';
import SignupScreen from 'screens/auth/  SignupScreen';
import LoginScreen from 'screens/auth/ LoginScreen';
import LandingScreen from 'screens/auth/LandingScreen';
import AnnouncementsScreen from 'screens/member/nhs/AnounnouncementsScreen';
import LogHoursScreen from 'screens/member/nhs/LogHoursScreen'; // Needs fixing
import TestConnection from 'screens/auth/TestConnection';
export default function App() {
  return (
  <SafeAreaProvider>
    <TestConnection />
  </SafeAreaProvider>
      

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
