export interface NotificationPreferences {
  announcements: boolean;
  events: boolean;
  volunteer_hours: boolean;
  ble_sessions: boolean;
  custom_notifications: boolean;
  quiet_hours: {
    enabled: boolean;
    start_time: string; // "22:00"
    end_time: string;   // "08:00"
  };
}

export interface MuteDuration {
  type: '1hour' | '1day' | '1week';
  label: string;
  hours: number;
}

export const MUTE_DURATIONS: MuteDuration[] = [
  { type: '1hour', label: '1 Hour', hours: 1 },
  { type: '1day', label: '1 Day', hours: 24 },
  { type: '1week', label: '1 Week', hours: 168 },
];

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  announcements: true,
  events: true,
  volunteer_hours: true,
  ble_sessions: true,
  custom_notifications: true,
  quiet_hours: {
    enabled: false,
    start_time: '22:00',
    end_time: '08:00',
  },
};