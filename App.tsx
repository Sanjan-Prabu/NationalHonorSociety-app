import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import {SafeAreaView,SafeAreaProvider} from 'react-native-safe-area-context';
import DashboardScreen from 'screens/member/nhs/DashboardScreen';
import SignupScreen from 'screens/auth/  SignupScreen';
import LoginScreen from 'screens/auth/ LoginScreen';
import LandingScreen from 'screens/auth/LandingScreen';
import AnnouncementsScreen from 'screens/member/nhs/AnounnouncementsScreen';
import LogHoursScreen from 'screens/member/nhs/LogHoursScreen'; // Needs fixing
import EventScreen from 'screens/member/nhs/EventScreen';
import { ToastProvider } from 'components/ui/ToastProvider';
import VolunteerHousrsForm from 'screens/member/nhs/VolunteerHoursForm';
import AttendanceScreen from 'screens/member/nhs/AttendanceScreen';
import OfficerDashboard from 'screens/officer/nhs/OfficerDashboard';
import OfficerAttendance from 'screens/officer/nhs/OfficerAttendance';
import OfficerVerifyHours from 'screens/officer/nhs/OfficerVerifyHours';
import OfficerAnnouncements from 'screens/officer/nhs/OfficerAnnouncements';
import OfficerEventScreen from 'screens/officer/nhs/OfficerEventScreen'
import CreateEventScreen from 'screens/officer/nhs/CreateEventScren';

export default function App() {
  return (

<ToastProvider>
   <SafeAreaProvider>
        <CreateEventScreen/>
   </SafeAreaProvider>
</ToastProvider>
      

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
