import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { MemberTabParamList } from '../types/navigation';
import FallbackTabNavigator from './FallbackTabNavigator';

// Import member screen components
import DashboardScreen from '../screens/member/nhs/DashboardScreen';
import AnnouncementsScreen from '../screens/member/nhs/AnnouncementsScreen';
import AttendanceScreen from '../screens/member/nhs/AttendanceScreen';
import LogHoursScreen from '../screens/member/nhs/LogHoursScreen';
import EventScreen from '../screens/member/nhs/EventScreen';

/**
 * Member Bottom Tab Navigator
 * 
 * Currently using FallbackTabNavigator due to missing @react-navigation/bottom-tabs dependency
 * TODO: Replace with createBottomTabNavigator when @react-navigation/bottom-tabs is installed
 * Installation: npm install @react-navigation/bottom-tabs
 */

// Tab icon mapping function
const getTabBarIcon = (routeName: keyof MemberTabParamList): keyof typeof MaterialIcons.glyphMap => {
  switch (routeName) {
    case 'Dashboard':
      return 'dashboard';
    case 'Announcements':
      return 'announcement';
    case 'Attendance':
      return 'event-available';
    case 'LogHours':
      return 'schedule';
    case 'Events':
      return 'event';
    default:
      return 'help';
  }
};

export default function MemberBottomNavigator() {
  // Define member tab screens
  const screens = [
    {
      name: 'Dashboard',
      component: DashboardScreen,
      icon: getTabBarIcon('Dashboard'),
      title: 'Dashboard',
    },
    {
      name: 'Announcements',
      component: AnnouncementsScreen,
      icon: getTabBarIcon('Announcements'),
      title: 'Announcements',
    },
    {
      name: 'Attendance',
      component: AttendanceScreen,
      icon: getTabBarIcon('Attendance'),
      title: 'Attendance',
    },
    {
      name: 'LogHours',
      component: LogHoursScreen,
      icon: getTabBarIcon('LogHours'),
      title: 'Log Hours',
    },
    {
      name: 'Events',
      component: EventScreen,
      icon: getTabBarIcon('Events'),
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

const Tab = createBottomTabNavigator<MemberTabParamList>();

export default function MemberBottomNavigator() {
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
        name="Dashboard" 
        component={DashboardScreen} 
        options={{ title: 'Dashboard' }} 
      />
      <Tab.Screen 
        name="Announcements" 
        component={AnnouncementsScreen} 
        options={{ title: 'Announcements' }} 
      />
      <Tab.Screen 
        name="Attendance" 
        component={AttendanceScreen} 
        options={{ title: 'Attendance' }} 
      />
      <Tab.Screen 
        name="LogHours" 
        component={LogHoursScreen} 
        options={{ title: 'Log Hours' }} 
      />
      <Tab.Screen 
        name="Events" 
        component={EventScreen} 
        options={{ title: 'Events' }} 
      />
    </Tab.Navigator>
  );
}
*/