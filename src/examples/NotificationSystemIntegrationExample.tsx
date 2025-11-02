/**
 * NotificationSystemIntegrationExample - Example of integrating notification system
 * Shows how to use notification navigation, badges, and visual feedback together
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5, 10.3, 10.4, 10.5
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import notification system components
import useNotificationSystem from '../hooks/useNotificationSystem';
import useNotificationBadges from '../hooks/useNotificationBadges';
import { TabBadge } from '../components/ui/NotificationBadge';
import { NotificationHighlight, useNotificationHighlight } from '../components/ui/NotificationHighlight';

// =============================================================================
// EXAMPLE SCREENS WITH NOTIFICATION INTEGRATION
// =============================================================================

interface ExampleScreenProps {
  route: {
    params?: {
      highlightId?: string;
      fromNotification?: boolean;
    };
  };
}

/**
 * Example Announcements Screen with notification highlighting
 */
const AnnouncementsScreen: React.FC<ExampleScreenProps> = ({ route }) => {
  const { badges, clearBadgesForType, markItemAsRead } = useNotificationBadges();
  const { highlightId, fromNotification } = route.params || {};

  // Example announcements data
  const announcements = [
    { id: '1', title: 'Welcome to NHS!', content: 'Welcome message...' },
    { id: '2', title: 'Meeting Tomorrow', content: 'Don\'t forget...' },
    { id: '3', title: 'Volunteer Opportunity', content: 'Help needed...' },
  ];

  // Clear badges when screen is focused
  React.useEffect(() => {
    clearBadgesForType('announcements');
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Announcements ({badges.announcements})</Text>
      
      {announcements.map((announcement) => (
        <AnnouncementItem
          key={announcement.id}
          announcement={announcement}
          highlightId={highlightId}
          fromNotification={fromNotification}
          onRead={() => markItemAsRead('announcements', announcement.id)}
        />
      ))}
    </View>
  );
};

/**
 * Individual announcement item with highlight support
 */
interface AnnouncementItemProps {
  announcement: { id: string; title: string; content: string };
  highlightId?: string;
  fromNotification?: boolean;
  onRead: () => void;
}

const AnnouncementItem: React.FC<AnnouncementItemProps> = ({
  announcement,
  highlightId,
  fromNotification,
  onRead
}) => {
  const { isHighlighted, highlightProps } = useNotificationHighlight(
    announcement.id,
    { highlightId, fromNotification, animationType: 'pulse' }
  );

  return (
    <NotificationHighlight {...highlightProps}>
      <TouchableOpacity
        style={[
          styles.item,
          isHighlighted && styles.highlightedItem
        ]}
        onPress={onRead}
      >
        <Text style={styles.itemTitle}>{announcement.title}</Text>
        <Text style={styles.itemContent}>{announcement.content}</Text>
      </TouchableOpacity>
    </NotificationHighlight>
  );
};

/**
 * Example Events Screen
 */
const EventsScreen: React.FC<ExampleScreenProps> = ({ route }) => {
  const { badges, clearBadgesForType } = useNotificationBadges();

  React.useEffect(() => {
    clearBadgesForType('events');
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Events ({badges.events})</Text>
      <Text style={styles.content}>Events will be displayed here...</Text>
    </View>
  );
};

/**
 * Example Volunteer Hours Screen
 */
const VolunteerHoursScreen: React.FC<ExampleScreenProps> = ({ route }) => {
  const { badges, clearBadgesForType } = useNotificationBadges();

  React.useEffect(() => {
    clearBadgesForType('volunteer_hours');
  }, []);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Volunteer Hours ({badges.volunteer_hours})</Text>
      <Text style={styles.content}>Volunteer hours will be displayed here...</Text>
    </View>
  );
};

/**
 * Example Attendance Screen
 */
const AttendanceScreen: React.FC<ExampleScreenProps> = ({ route }) => {
  const { badges, clearBadgesForType } = useNotificationBadges();
  const { autoScan, sessionToken, fromNotification } = route.params || {};

  React.useEffect(() => {
    clearBadgesForType('ble_sessions');
    
    // If opened from BLE notification, start auto-scan
    if (autoScan && sessionToken) {
      console.log('Starting auto-scan for session:', sessionToken);
      // Implement BLE auto-scan logic here
    }
  }, [autoScan, sessionToken]);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Attendance ({badges.ble_sessions})</Text>
      {fromNotification && (
        <Text style={styles.notificationInfo}>
          Opened from notification {sessionToken ? `(Session: ${sessionToken})` : ''}
        </Text>
      )}
      <Text style={styles.content}>
        {autoScan ? 'Auto-scanning for BLE session...' : 'Attendance tracking...'}
      </Text>
    </View>
  );
};

// =============================================================================
// TAB NAVIGATOR WITH BADGES
// =============================================================================

const Tab = createBottomTabNavigator();

const TabNavigator: React.FC = () => {
  const { badges } = useNotificationBadges();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          let badgeCount = 0;

          switch (route.name) {
            case 'Announcements':
              iconName = focused ? 'megaphone' : 'megaphone-outline';
              badgeCount = badges.announcements;
              break;
            case 'Events':
              iconName = focused ? 'calendar' : 'calendar-outline';
              badgeCount = badges.events;
              break;
            case 'VolunteerHours':
              iconName = focused ? 'time' : 'time-outline';
              badgeCount = badges.volunteer_hours;
              break;
            case 'Attendance':
              iconName = focused ? 'checkmark-circle' : 'checkmark-circle-outline';
              badgeCount = badges.ble_sessions;
              break;
          }

          return (
            <TabBadge count={badgeCount} size="small">
              <Ionicons name={iconName} size={size} color={color} />
            </TabBadge>
          );
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Announcements" component={AnnouncementsScreen} />
      <Tab.Screen name="Events" component={EventsScreen} />
      <Tab.Screen name="VolunteerHours" component={VolunteerHoursScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
    </Tab.Navigator>
  );
};

// =============================================================================
// MAIN EXAMPLE COMPONENT
// =============================================================================

export const NotificationSystemIntegrationExample: React.FC = () => {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const { badges, incrementBadge, clearAllBadges } = useNotificationBadges();
  
  // Initialize notification system with navigation reference
  const { initialize, isInitialized, handleNotification } = useNotificationSystem({
    navigationRef,
    autoInitialize: true
  });

  // Test functions for demonstration
  const testNotifications = {
    announcement: () => {
      incrementBadge('announcements', 'test-announcement-1');
      handleNotification({
        type: 'announcement',
        itemId: 'test-announcement-1',
        orgId: 'test-org',
        priority: 'normal'
      });
    },
    event: () => {
      incrementBadge('events', 'test-event-1');
      handleNotification({
        type: 'event',
        itemId: 'test-event-1',
        orgId: 'test-org',
        priority: 'normal'
      });
    },
    volunteerHours: () => {
      incrementBadge('volunteer_hours', 'test-hours-1');
      handleNotification({
        type: 'volunteer_hours',
        itemId: 'test-hours-1',
        orgId: 'test-org',
        priority: 'normal'
      });
    },
    bleSession: () => {
      incrementBadge('ble_sessions', 'test-session-1');
      handleNotification({
        type: 'ble_session',
        itemId: 'test-session-1',
        orgId: 'test-org',
        priority: 'high'
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          Notification System: {isInitialized ? 'Ready' : 'Initializing...'}
        </Text>
        <Text style={styles.statusText}>
          Total Badges: {badges.total}
        </Text>
      </View>

      {/* Test Buttons */}
      <View style={styles.testButtons}>
        <TouchableOpacity style={styles.testButton} onPress={testNotifications.announcement}>
          <Text style={styles.testButtonText}>Test Announcement</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.testButton} onPress={testNotifications.event}>
          <Text style={styles.testButtonText}>Test Event</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.testButton} onPress={testNotifications.volunteerHours}>
          <Text style={styles.testButtonText}>Test Volunteer Hours</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.testButton} onPress={testNotifications.bleSession}>
          <Text style={styles.testButtonText}>Test BLE Session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.testButton, styles.clearButton]} onPress={clearAllBadges}>
          <Text style={styles.testButtonText}>Clear All Badges</Text>
        </TouchableOpacity>
      </View>

      {/* Navigation */}
      <NavigationContainer ref={navigationRef}>
        <TabNavigator />
      </NavigationContainer>
    </View>
  );
};

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBar: {
    backgroundColor: '#007AFF',
    padding: 10,
    paddingTop: 50,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  testButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    backgroundColor: 'white',
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    margin: 4,
    borderRadius: 6,
    minWidth: 80,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  screen: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  content: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  notificationInfo: {
    fontSize: 14,
    color: '#007AFF',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  item: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  highlightedItem: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  itemContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default NotificationSystemIntegrationExample;