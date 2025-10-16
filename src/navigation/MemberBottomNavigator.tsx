import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { MemberTabParamList } from '../types/navigation';
import FallbackTabNavigator from './FallbackTabNavigator';

// Import new role-based member screen components
import MemberDashboardScreen from '../screens/member/MemberDashboardScreen';
import MemberAnnouncementsScreen from '../screens/member/MemberAnnouncementsScreen';
import MemberAttendanceScreen from '../screens/member/MemberAttendanceScreen';
import MemberLogHoursStack from './MemberLogHoursStack';
import MemberEventsScreen from '../screens/member/MemberEventsScreen';

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
  // Define member tab screens with role-based components
  const screens = [
    {
      name: 'Dashboard',
      component: MemberDashboardScreen,
      icon: getTabBarIcon('Dashboard'),
      title: 'Dashboard',
    },
    {
      name: 'Announcements',
      component: MemberAnnouncementsScreen,
      icon: getTabBarIcon('Announcements'),
      title: 'Announcements',
    },
    {
      name: 'Attendance',
      component: MemberAttendanceScreen,
      icon: getTabBarIcon('Attendance'),
      title: 'Attendance',
    },
    {
      name: 'LogHours',
      component: MemberLogHoursStack,
      icon: getTabBarIcon('LogHours'),
      title: 'Log Hours',
    },
    {
      name: 'Events',
      component: MemberEventsScreen,
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