import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNotificationPreferences } from '../../hooks/useNotificationPreferences';
import { MUTE_DURATIONS, MuteDuration } from '../../types/notifications';

interface NotificationSettingsScreenProps {
  navigation?: any;
}

export default function NotificationSettingsScreen({ navigation }: NotificationSettingsScreenProps) {
  const {
    preferences,
    isLoading,
    isMuted,
    muteExpiration,
    updatePreferences,
    setNotificationsEnabled,
    muteNotifications,
    unmuteNotifications,
  } = useNotificationPreferences();

  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleNotifications = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      const success = await setNotificationsEnabled(enabled);
      if (!success) {
        Alert.alert('Error', 'Failed to update notification settings. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTogglePreference = async (key: keyof typeof preferences, value: boolean) => {
    if (key === 'quiet_hours') return; // Handle quiet hours separately
    
    setIsUpdating(true);
    try {
      const success = await updatePreferences({ [key]: value });
      if (!success) {
        Alert.alert('Error', 'Failed to update notification preference. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuietHoursToggle = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      const success = await updatePreferences({
        quiet_hours: {
          ...preferences.quiet_hours,
          enabled,
        },
      });
      if (!success) {
        Alert.alert('Error', 'Failed to update quiet hours setting. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMuteNotifications = () => {
    Alert.alert(
      'Mute Notifications',
      'How long would you like to mute notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        ...MUTE_DURATIONS.map((duration) => ({
          text: duration.label,
          onPress: () => muteForDuration(duration),
        })),
      ]
    );
  };

  const muteForDuration = async (duration: MuteDuration) => {
    setIsUpdating(true);
    try {
      const success = await muteNotifications(duration);
      if (success) {
        Alert.alert('Notifications Muted', `Notifications have been muted for ${duration.label.toLowerCase()}.`);
      } else {
        Alert.alert('Error', 'Failed to mute notifications. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUnmute = async () => {
    setIsUpdating(true);
    try {
      const success = await unmuteNotifications();
      if (success) {
        Alert.alert('Notifications Unmuted', 'You will now receive notifications again.');
      } else {
        Alert.alert('Error', 'Failed to unmute notifications. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatMuteExpiration = (date: Date): string => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.ceil(diff / (1000 * 60 * 60));
    
    if (hours <= 1) {
      const minutes = Math.ceil(diff / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    
    const days = Math.ceil(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  // Check if any notification type is enabled
  const hasAnyNotificationEnabled = preferences.announcements || 
                                   preferences.events || 
                                   preferences.volunteer_hours || 
                                   preferences.ble_sessions || 
                                   preferences.custom_notifications;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2B5CE6" />
        <Text style={styles.loadingText}>Loading notification settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#2B5CE6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Global Notifications Toggle */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="notifications" size={24} color="#2B5CE6" />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive push notifications for NHS activities
              </Text>
            </View>
            <Switch
              value={hasAnyNotificationEnabled}
              onValueChange={handleToggleNotifications}
              disabled={isUpdating}
              trackColor={{ false: '#E2E8F0', true: '#2B5CE6' }}
              thumbColor={hasAnyNotificationEnabled ? '#FFFFFF' : '#CBD5E0'}
            />
          </View>
        </View>

        {/* Mute Status */}
        {isMuted && muteExpiration && (
          <View style={styles.section}>
            <View style={styles.muteStatus}>
              <MaterialIcons name="volume-off" size={20} color="#F56565" />
              <Text style={styles.muteText}>
                Notifications muted for {formatMuteExpiration(muteExpiration)}
              </Text>
              <TouchableOpacity
                style={styles.unmuteButton}
                onPress={handleUnmute}
                disabled={isUpdating}
              >
                <Text style={styles.unmuteButtonText}>Unmute</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Notification Types */}
        {hasAnyNotificationEnabled && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="tune" size={24} color="#2B5CE6" />
              <Text style={styles.sectionTitle}>Notification Types</Text>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Announcements</Text>
                <Text style={styles.settingDescription}>
                  New announcements from officers
                </Text>
              </View>
              <Switch
                value={preferences.announcements}
                onValueChange={(value) => handleTogglePreference('announcements', value)}
                disabled={isUpdating}
                trackColor={{ false: '#E2E8F0', true: '#2B5CE6' }}
                thumbColor={preferences.announcements ? '#FFFFFF' : '#CBD5E0'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Events</Text>
                <Text style={styles.settingDescription}>
                  New events and event updates
                </Text>
              </View>
              <Switch
                value={preferences.events}
                onValueChange={(value) => handleTogglePreference('events', value)}
                disabled={isUpdating}
                trackColor={{ false: '#E2E8F0', true: '#2B5CE6' }}
                thumbColor={preferences.events ? '#FFFFFF' : '#CBD5E0'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Volunteer Hours</Text>
                <Text style={styles.settingDescription}>
                  Approval and rejection notifications
                </Text>
              </View>
              <Switch
                value={preferences.volunteer_hours}
                onValueChange={(value) => handleTogglePreference('volunteer_hours', value)}
                disabled={isUpdating}
                trackColor={{ false: '#E2E8F0', true: '#2B5CE6' }}
                thumbColor={preferences.volunteer_hours ? '#FFFFFF' : '#CBD5E0'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>BLE Sessions</Text>
                <Text style={styles.settingDescription}>
                  Attendance session notifications
                </Text>
              </View>
              <Switch
                value={preferences.ble_sessions}
                onValueChange={(value) => handleTogglePreference('ble_sessions', value)}
                disabled={isUpdating}
                trackColor={{ false: '#E2E8F0', true: '#2B5CE6' }}
                thumbColor={preferences.ble_sessions ? '#FFFFFF' : '#CBD5E0'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Other Notifications</Text>
                <Text style={styles.settingDescription}>
                  System and custom notifications
                </Text>
              </View>
              <Switch
                value={preferences.custom_notifications}
                onValueChange={(value) => handleTogglePreference('custom_notifications', value)}
                disabled={isUpdating}
                trackColor={{ false: '#E2E8F0', true: '#2B5CE6' }}
                thumbColor={preferences.custom_notifications ? '#FFFFFF' : '#CBD5E0'}
              />
            </View>
          </View>
        )}

        {/* Quiet Hours */}
        {hasAnyNotificationEnabled && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="bedtime" size={24} color="#2B5CE6" />
              <Text style={styles.sectionTitle}>Quiet Hours</Text>
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Enable Quiet Hours</Text>
                <Text style={styles.settingDescription}>
                  Reduce notifications during {preferences.quiet_hours.start_time} - {preferences.quiet_hours.end_time}
                </Text>
              </View>
              <Switch
                value={preferences.quiet_hours.enabled}
                onValueChange={handleQuietHoursToggle}
                disabled={isUpdating}
                trackColor={{ false: '#E2E8F0', true: '#2B5CE6' }}
                thumbColor={preferences.quiet_hours.enabled ? '#FFFFFF' : '#CBD5E0'}
              />
            </View>
          </View>
        )}

        {/* Temporary Mute */}
        {hasAnyNotificationEnabled && !isMuted && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="snooze" size={24} color="#2B5CE6" />
              <Text style={styles.sectionTitle}>Temporary Mute</Text>
            </View>

            <TouchableOpacity
              style={styles.muteButton}
              onPress={handleMuteNotifications}
              disabled={isUpdating}
            >
              <MaterialIcons name="volume-off" size={20} color="#2B5CE6" />
              <Text style={styles.muteButtonText}>Mute Notifications</Text>
              <MaterialIcons name="chevron-right" size={20} color="#CBD5E0" />
            </TouchableOpacity>
          </View>
        )}

        {/* Information */}
        <View style={styles.section}>
          <View style={styles.infoBox}>
            <MaterialIcons name="info" size={20} color="#4299E1" />
            <Text style={styles.infoText}>
              Notification settings are synced across all your devices. Changes may take a few minutes to take effect.
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4A5568',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A202C',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A202C',
    marginLeft: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F7FAFC',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A202C',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#718096',
  },
  muteStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FED7D7',
  },
  muteText: {
    flex: 1,
    fontSize: 14,
    color: '#C53030',
    marginLeft: 8,
  },
  unmuteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F56565',
    borderRadius: 6,
  },
  unmuteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  muteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  muteButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#2B5CE6',
    marginLeft: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#EBF8FF',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#2B6CB0',
    marginLeft: 8,
    lineHeight: 20,
  },
});