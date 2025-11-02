import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { NotificationPreferencesService } from '../services/NotificationPreferencesService';
import { NotificationPreferences, MuteDuration, DEFAULT_NOTIFICATION_PREFERENCES } from '../types/notifications';

export interface UseNotificationPreferencesReturn {
  preferences: NotificationPreferences;
  isLoading: boolean;
  isMuted: boolean;
  muteExpiration: Date | null;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<boolean>;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  muteNotifications: (duration: MuteDuration) => Promise<boolean>;
  unmuteNotifications: () => Promise<boolean>;
  refreshPreferences: () => Promise<void>;
}

export function useNotificationPreferences(): UseNotificationPreferencesReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [muteExpiration, setMuteExpiration] = useState<Date | null>(null);

  const refreshPreferences = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch preferences and mute status in parallel
      const [userPreferences, mutedStatus, muteExp] = await Promise.all([
        NotificationPreferencesService.getPreferences(user.id),
        NotificationPreferencesService.isMuted(user.id),
        NotificationPreferencesService.getMuteExpiration(user.id),
      ]);

      setPreferences(userPreferences);
      setIsMuted(mutedStatus);
      setMuteExpiration(muteExp);
    } catch (error) {
      console.error('Error refreshing notification preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await NotificationPreferencesService.updatePreferences(user.id, newPreferences);
      
      if (success) {
        // Update local state
        setPreferences(prev => ({ ...prev, ...newPreferences }));
      }
      
      return success;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }, [user?.id]);

  const setNotificationsEnabled = useCallback(async (enabled: boolean): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await NotificationPreferencesService.setNotificationsEnabled(user.id, enabled);
      
      if (success) {
        // Refresh preferences to get updated state
        await refreshPreferences();
      }
      
      return success;
    } catch (error) {
      console.error('Error setting notifications enabled:', error);
      return false;
    }
  }, [user?.id, refreshPreferences]);

  const muteNotifications = useCallback(async (duration: MuteDuration): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await NotificationPreferencesService.muteNotifications(user.id, duration);
      
      if (success) {
        setIsMuted(true);
        const muteUntil = new Date();
        muteUntil.setHours(muteUntil.getHours() + duration.hours);
        setMuteExpiration(muteUntil);
      }
      
      return success;
    } catch (error) {
      console.error('Error muting notifications:', error);
      return false;
    }
  }, [user?.id]);

  const unmuteNotifications = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const success = await NotificationPreferencesService.unmuteNotifications(user.id);
      
      if (success) {
        setIsMuted(false);
        setMuteExpiration(null);
      }
      
      return success;
    } catch (error) {
      console.error('Error unmuting notifications:', error);
      return false;
    }
  }, [user?.id]);

  // Load preferences on mount and when user changes
  useEffect(() => {
    refreshPreferences();
  }, [refreshPreferences]);

  // Set up interval to check mute expiration
  useEffect(() => {
    if (!isMuted || !muteExpiration) return;

    const checkExpiration = () => {
      const now = new Date();
      if (now >= muteExpiration) {
        setIsMuted(false);
        setMuteExpiration(null);
      }
    };

    // Check every minute
    const interval = setInterval(checkExpiration, 60000);
    
    return () => clearInterval(interval);
  }, [isMuted, muteExpiration]);

  return {
    preferences,
    isLoading,
    isMuted,
    muteExpiration,
    updatePreferences,
    setNotificationsEnabled,
    muteNotifications,
    unmuteNotifications,
    refreshPreferences,
  };
}