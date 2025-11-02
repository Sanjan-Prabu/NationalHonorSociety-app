import { supabase } from '../lib/supabaseClient';
import { NotificationPreferences, MuteDuration, DEFAULT_NOTIFICATION_PREFERENCES } from '../types/notifications';

export class NotificationPreferencesService {
  /**
   * Get user's notification preferences
   */
  static async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences, notifications_enabled')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching notification preferences:', error);
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }

      // If notifications are disabled globally, return all preferences as false
      if (!data.notifications_enabled) {
        return {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          announcements: false,
          events: false,
          volunteer_hours: false,
          ble_sessions: false,
          custom_notifications: false,
        };
      }

      // Merge with defaults to ensure all properties exist
      const preferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(data.notification_preferences || {}),
      };

      return preferences;
    } catch (error) {
      console.error('Error in getPreferences:', error);
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }

  /**
   * Update user's notification preferences
   */
  static async updatePreferences(
    userId: string, 
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    try {
      // Use database function for atomic update with validation
      const { data, error } = await supabase.rpc('update_notification_preferences', {
        p_user_id: userId,
        p_preferences: preferences,
      });

      if (error) {
        console.error('Error updating notification preferences:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in updatePreferences:', error);
      return false;
    }
  }

  /**
   * Enable or disable all notifications
   */
  static async setNotificationsEnabled(userId: string, enabled: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notifications_enabled: enabled,
          // If disabling, also clear mute status
          ...(enabled ? {} : { muted_until: null }),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating notifications enabled status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in setNotificationsEnabled:', error);
      return false;
    }
  }

  /**
   * Temporarily mute notifications
   */
  static async muteNotifications(userId: string, duration: MuteDuration): Promise<boolean> {
    try {
      const muteUntil = new Date();
      muteUntil.setHours(muteUntil.getHours() + duration.hours);

      const { error } = await supabase
        .from('profiles')
        .update({
          muted_until: muteUntil.toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error muting notifications:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in muteNotifications:', error);
      return false;
    }
  }

  /**
   * Unmute notifications
   */
  static async unmuteNotifications(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          muted_until: null,
        })
        .eq('id', userId);

      if (error) {
        console.error('Error unmuting notifications:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in unmuteNotifications:', error);
      return false;
    }
  }

  /**
   * Check if user is currently muted
   */
  static async isMuted(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('muted_until')
        .eq('id', userId)
        .single();

      if (error || !data.muted_until) {
        return false;
      }

      const muteUntil = new Date(data.muted_until);
      const now = new Date();

      // If mute period has expired, clear it
      if (now >= muteUntil) {
        await this.unmuteNotifications(userId);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking mute status:', error);
      return false;
    }
  }

  /**
   * Get mute expiration time
   */
  static async getMuteExpiration(userId: string): Promise<Date | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('muted_until')
        .eq('id', userId)
        .single();

      if (error || !data.muted_until) {
        return null;
      }

      const muteUntil = new Date(data.muted_until);
      const now = new Date();

      // If mute period has expired, clear it and return null
      if (now >= muteUntil) {
        await this.unmuteNotifications(userId);
        return null;
      }

      return muteUntil;
    } catch (error) {
      console.error('Error getting mute expiration:', error);
      return null;
    }
  }

  /**
   * Check if user should receive a specific type of notification
   */
  static async shouldReceiveNotification(
    userId: string, 
    notificationType: keyof NotificationPreferences
  ): Promise<boolean> {
    try {
      // Use database function for efficient checking
      const { data, error } = await supabase.rpc('should_user_receive_notification', {
        p_user_id: userId,
        p_notification_type: notificationType,
      });

      if (error) {
        console.error('Error checking notification permission:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in shouldReceiveNotification:', error);
      return false;
    }
  }

  /**
   * Get filtered recipients for notifications based on preferences
   * This method integrates with the existing NotificationService filtering
   */
  static async getFilteredRecipients(
    orgId: string,
    notificationType: keyof NotificationPreferences,
    excludeQuietHours: boolean = false
  ): Promise<{ userId: string; pushToken: string }[]> {
    try {
      // Use database function for efficient filtering
      const { data: recipients, error } = await supabase.rpc('get_notification_recipients', {
        p_org_id: orgId,
        p_notification_type: notificationType,
        p_exclude_quiet_hours: excludeQuietHours,
      });

      if (error) {
        console.error('Error fetching filtered recipients:', error);
        return [];
      }

      return (recipients || []).map((recipient: any) => ({
        userId: recipient.user_id,
        pushToken: recipient.expo_push_token,
      }));
    } catch (error) {
      console.error('Error getting filtered recipients:', error);
      return [];
    }
  }

  /**
   * Check if current time is within quiet hours
   */
  static isWithinQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quiet_hours.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes

    const [startHour, startMin] = preferences.quiet_hours.start_time.split(':').map(Number);
    const [endHour, endMin] = preferences.quiet_hours.end_time.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    }
    
    // Handle same-day quiet hours (e.g., 12:00 to 14:00)
    return currentTime >= startTime && currentTime <= endTime;
  }
}