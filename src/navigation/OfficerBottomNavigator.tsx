import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { OfficerTabParamList } from '../types/navigation';
import FallbackTabNavigator from './FallbackTabNavigator';

// Import officer screen components
import OfficerDashboard from '../screens/officer/nhs/OfficerDashboard';
import OfficerAnnouncements from '../screens/officer/nhs/OfficerAnnouncements';
import OfficerAttendance from '../screens/officer/nhs/OfficerAttendance';
import OfficerVerifyHours from '../screens/officer/nhs/OfficerVerifyHours';
import OfficerEvents from '../screens/officer/nhs/OfficerEventScreen';

/**
 * Officer Bottom Tab Navigator
 * 
 * Currently using FallbackTabNavigator due to missing @react-navigation/bottom-tabs dependency
 * TODO: Replace with createBottomTabNavigator when @react-navigation/bottom-tabs is installed
 * Installation: npm install @react-navigation/bottom-tabs
 */

// Tab icon mapping function
const getTabBarIcon = (routeName: keyof OfficerTabParamList): keyof typeof MaterialIcons.glyphMap => {
  switch (routeName) {
    case 'OfficerDashboard':
      return 'dashboard';
    case 'OfficerAnnouncements':
      return 'announcement';
    case 'OfficerAttendance':
      return 'event-available';
    case 'OfficerVerifyHours':
      return 'schedule';
    case 'OfficerEvents':
      return 'event';
    default:
      return 'help';
  }
};

export default function OfficerBottomNavigator() {
  // Define officer tab screens
  const screens = [
    {
      name: 'OfficerDashboard',
      component: OfficerDashboard,
      icon: getTabBarIcon('OfficerDashboard'),
      title: 'Dashboard',
    },
    {
      name: 'OfficerAnnouncements',
      component: OfficerAnnouncements,
      icon: getTabBarIcon('OfficerAnnouncements'),
      title: 'Announcements',
    },
    {
      name: 'OfficerAttendance',
      component: OfficerAttendance,
      icon: getTabBarIcon('OfficerAttendance'),
      title: 'Attendance',
    },
    {
      name: 'OfficerVerifyHours',
      component: OfficerVerifyHours,
      icon: getTabBarIcon('OfficerVerifyHours'),
      title: 'Verify Hours',
    },
    {
      name: 'OfficerEvents',
      component: OfficerEvents,
      icon: getTabBarIcon('OfficerEvents'),
      title: 'Events',
    },
  ];

  return (
    <FallbackTabNavigator
      screens={screens}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2B5CE6', // Colors.solidBlue from existing screens
        tabBarInactiveTintColor: '#718096', // Colors.textLight from existing screens
      }}
    />
  );
}

/* 
Future implementation with @react-navigation/bottom-tabs:

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator<OfficerTabParamList>();

export default function OfficerBottomNavigator() {
  return (
    <Tab.Navigator 
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          const iconName = getTabBarIcon(route.name);
          return <MaterialIcons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: '#2B5CE6',
        tabBarInactiveTintColor: '#718096',
      })}
    >
      <Tab.Screen 
        name="OfficerDashboard" 
        component={OfficerDashboard} 
        options={{ title: 'Dashboard' }} 
      />
      <Tab.Screen 
        name="OfficerAnnouncements" 
        component={OfficerAnnouncements} 
        options={{ title: 'Announcements' }} 
      />
      <Tab.Screen 
        name="OfficerAttendance" 
        component={OfficerAttendance} 
        options={{ title: 'Attendance' }} 
      />
      <Tab.Screen 
        name="OfficerVerifyHours" 
        component={OfficerVerifyHours} 
        options={{ title: 'Verify Hours' }} 
      />
      <Tab.Screen 
        name="OfficerEvents" 
        component={OfficerEvents} 
        options={{ title: 'Events' }} 
      />
    </Tab.Navigator>
  );
}
*/