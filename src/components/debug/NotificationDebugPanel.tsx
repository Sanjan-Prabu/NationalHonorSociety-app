/**
 * Temporary debug panel to get push token and test notifications
 * Add this to any screen to debug notification issues
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, Clipboard } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabaseClient';

export const NotificationDebugPanel: React.FC = () => {
  const [pushToken, setPushToken] = useState<string>('');
  const [permissions, setPermissions] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkNotificationSetup();
  }, []);

  const checkNotificationSetup = async () => {
    try {
      // Get permissions
      const perms = await Notifications.getPermissionsAsync();
      setPermissions(perms);

      // Get push token
      if (perms.status === 'granted') {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        setPushToken(token.data);
      }
    } catch (error) {
      console.error('Error checking notification setup:', error);
      Alert.alert('Error', 'Failed to check notification setup');
    }
  };

  const requestPermissions = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        await checkNotificationSetup();
        Alert.alert('Success', 'Permissions granted!');
      } else {
        Alert.alert('Permissions Denied', 'Please enable notifications in Settings');
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request permissions');
    }
  };

  const copyToken = async () => {
    if (pushToken) {
      Clipboard.setString(pushToken);
      Alert.alert('Copied!', 'Push token copied to clipboard');
    }
  };

  const sendTestNotification = async () => {
    if (!pushToken) {
      Alert.alert('Error', 'No push token available');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          title: '🧪 App Test Notification',
          body: 'This test was sent from within the app!',
          sound: 'default',
          data: {
            type: 'test',
            itemId: 'app-test-123',
            orgId: 'test-org',
            priority: 'normal'
          }
        }),
      });

      const result = await response.json();
      console.log('Test notification result:', result);

      // Handle both array and single object response formats
      const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
      
      if (ticket && ticket.status === 'ok') {
        Alert.alert('Success!', 'Test notification sent! Check your device.');
      } else if (ticket && ticket.status === 'error') {
        Alert.alert('Failed', `Error: ${ticket.message || 'Unknown error'}`);
      } else {
        Alert.alert('Failed', `Unexpected response: ${JSON.stringify(result)}`);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    } finally {
      setLoading(false);
    }
  };

  const sendAnnouncementNotification = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing announcement notification from app...');
      
      // Get the latest announcement
      const { data: announcement, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.log('❌ Error fetching announcement:', error.message);
        Alert.alert('Error', `Failed to get announcement: ${error.message}`);
        return;
      }
      
      console.log('📢 Latest announcement:', {
        id: announcement.id,
        title: announcement.title,
        created_by: announcement.created_by,
        org_id: announcement.org_id,
        created_at: announcement.created_at
      });
      
      // Get organization members with push tokens (using profiles.org_id directly)
      const { data: members, error: memberError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          expo_push_token,
          notifications_enabled
        `)
        .eq('org_id', announcement.org_id)
        .eq('notifications_enabled', true)
        .not('expo_push_token', 'is', null);
      
      if (memberError) {
        console.log('❌ Error fetching members:', memberError.message);
        Alert.alert('Error', `Failed to get members: ${memberError.message}`);
        return;
      }
      
      console.log('👥 Members with push tokens:', members?.length || 0);
      members?.forEach(member => {
        console.log(`  - ${member.email}: ${member.expo_push_token ? 'Has token' : 'No token'}`);
      });
      
      if (!members || members.length === 0) {
        console.log('❌ No members with push tokens found!');
        Alert.alert('No Recipients', 'No members with push tokens found!');
        return;
      }
      
      // Send notifications manually
      console.log('\n📤 Sending notifications manually...');
      let successful = 0;
      let failed = 0;
      
      for (const member of members) {
        if (!member.expo_push_token) continue;
        
        console.log(`📱 Sending to ${member.email}...`);
        
        try {
          const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: member.expo_push_token,
              title: `New Announcement: ${announcement.title}`,
              body: announcement.message || 'Tap to view details',
              sound: 'default',
              data: {
                type: 'announcement',
                itemId: announcement.id,
                orgId: announcement.org_id,
                priority: 'normal'
              },
              channelId: 'announcements',
              priority: 'normal'
            }),
          });
          
          const result = await response.json();
          console.log(`📋 Result for ${member.email}:`, result);
          
          const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
          if (ticket && ticket.status === 'ok') {
            console.log(`✅ Notification sent successfully to ${member.email}`);
            successful++;
          } else {
            console.log(`❌ Notification failed for ${member.email}:`, ticket);
            failed++;
          }
        } catch (error) {
          console.error(`❌ Error sending to ${member.email}:`, error);
          failed++;
        }
      }
      
      Alert.alert('Notification Results', `Sent to ${successful} members, ${failed} failed. Check console for details.`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('Error', `Failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const forceRegisterToken = async () => {
    setLoading(true);
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert('Error', 'No user logged in');
        return;
      }

      // Get push token directly
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      if (!token?.data) {
        Alert.alert('Error', 'Could not get push token');
        return;
      }

      // Update token directly in database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          expo_push_token: token.data,
          notifications_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        Alert.alert('Failed', `Database error: ${error.message}`);
      } else {
        Alert.alert('Success!', 'Push token registered in database! Try creating an announcement now.');
        await checkNotificationSetup(); // Refresh the panel
      }
    } catch (error) {
      console.error('Error registering token:', error);
      Alert.alert('Error', 'Failed to register push token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔧 Notification Debug Panel</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Permissions Status</Text>
        <Text style={styles.info}>
          Status: {permissions?.status || 'Unknown'}
        </Text>
        <Text style={styles.info}>
          Can Ask Again: {permissions?.canAskAgain ? 'Yes' : 'No'}
        </Text>
        <Text style={styles.info}>
          Granted: {permissions?.granted ? 'Yes' : 'No'}
        </Text>
        
        {permissions?.status !== 'granted' && (
          <TouchableOpacity style={styles.button} onPress={requestPermissions}>
            <Text style={styles.buttonText}>Request Permissions</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Push Token</Text>
        {pushToken ? (
          <>
            <Text style={styles.tokenText} numberOfLines={3}>
              {pushToken}
            </Text>
            <TouchableOpacity style={styles.button} onPress={copyToken}>
              <Text style={styles.buttonText}>Copy Token</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.info}>No push token available</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Test Notification</Text>
        <TouchableOpacity 
          style={[styles.button, styles.testButton]} 
          onPress={sendTestNotification}
          disabled={!pushToken || loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Sending...' : 'Send Test Notification'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.registerButton]} 
          onPress={forceRegisterToken}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Registering...' : 'Force Register Token'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#FF6B6B' }]} 
          onPress={sendAnnouncementNotification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Sending...' : 'Send Latest Announcement Notification'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Project Info</Text>
        <Text style={styles.info}>
          Project ID: {Constants.expoConfig?.extra?.eas?.projectId}
        </Text>
        <Text style={styles.info}>
          App Version: {Constants.expoConfig?.version}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Instructions</Text>
        <Text style={styles.instructions}>
          1. Copy your push token{'\n'}
          2. Run: npx tsx scripts/send-test-notification.ts "your-token"{'\n'}
          3. Or use the "Send Test Notification" button above
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tokenText: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  testButton: {
    backgroundColor: '#34C759',
  },
  registerButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructions: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 4,
  },
});

export default NotificationDebugPanel;