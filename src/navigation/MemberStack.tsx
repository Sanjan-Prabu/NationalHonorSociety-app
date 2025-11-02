import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MemberStackParamList } from '../types/navigation';
import MemberBottomNavigator from './MemberBottomNavigator';
import NotificationSettingsScreen from '../screens/shared/NotificationSettingsScreen';

const Stack = createNativeStackNavigator<MemberStackParamList>();

export default function MemberStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen 
        name="MemberTabs" 
        component={MemberBottomNavigator} 
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
}