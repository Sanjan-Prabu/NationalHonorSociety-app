import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MemberStackParamList } from '../types/navigation';
import MemberBottomNavigator from './MemberBottomNavigator';

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
    </Stack.Navigator>
  );
}