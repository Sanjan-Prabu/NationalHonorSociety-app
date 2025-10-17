import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OfficerStackParamList } from '../types/navigation';
import OfficerBottomNavigator from './OfficerBottomNavigator';
import AttendanceSessionScreen from '../screens/officer/AttendanceSessionScreen';

const Stack = createNativeStackNavigator<OfficerStackParamList>();

export default function OfficerStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="OfficerTabs" 
        component={OfficerBottomNavigator} 
      />
      <Stack.Screen 
        name="AttendanceSession" 
        component={AttendanceSessionScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}