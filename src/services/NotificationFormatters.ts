/**
 * NotificationFormatters - Notification payload formatting utilities
 * Implements standardized formatters for different notification types
 * Requirements: 5.3, 5.4
 */

import { NotificationPayload } from './NotificationService';
import { Announcement } from './AnnouncementService';
import { Event } from './EventService';
import { VolunteerHourData } from '../types/dataService';
import { AttendanceSession } from '../types/ble';
import { UUID } from '../types/database';

// =============================================================================
// FORMATTER INTERFACES
// =============================================================================

export interface NotificationFormatter<T> {
  formatTitle(data: T): string;
  formatBody(data: T): string;
  formatData(data: T, orgId: UUID): NotificationPayload['data'];
  createPayload(data: T, orgId: UUID, recipients: string[]): NotificationPayload;
}

// =============================================================================
// ANNOUNCEMENT FORMATTER
// =============================================================================

export class AnnouncementFormatter implements NotificationFormatter<Announcement> {
  /**
   * Formats announcement notification title
   */
  formatTitle(announcement: Announcement): string {
    return `New Announcement: ${announcement.title}`;
  }

  /**
   * Formats announcement notification body with preview text
   */
  formatBody(announcement: Announcement): string {
    if (announcement.message) {
      // Show first 100 characters of the message
      const preview = announcement.message.length > 100 
        ? announcement.message.substring(0, 97) + '...'
        : announcement.message;
      return preview;
    }
    return 'Tap to view announcement details';
  }

  /**
   * Formats announcement notification data payload
   */
  formatData(announcement: Announcement, orgId: UUID): NotificationPayload['data'] {
    return {
      type: 'announcement',
      itemId: announcement.id,
      orgId: orgId,
      priority: 'normal',
      // Additional announcement-specific data
      announcementTitle: announcement.title,
      createdBy: announcement.created_by,
      tag: announcement.tag || undefined,
      link: announcement.link || undefined
    };
  }

  /**
   * Creates complete notification payload for announcements
   */
  createPayload(announcement: Announcement, orgId: UUID, recipients: string[]): NotificationPayload {
    return {
      to: recipients,
      title: this.formatTitle(announcement),
      body: this.formatBody(announcement),
      data: this.formatData(announcement, orgId),
      sound: 'default',
      priority: 'normal',
      channelId: 'announcements',
      categoryId: 'announcement'
    };
  }
}

// =============================================================================
// EVENT FORMATTER
// =============================================================================

export class EventFormatter implements NotificationFormatter<Event> {
  /**
   * Formats event notification title
   */
  formatTitle(event: Event): string {
    return `New Event: ${event.title}`;
  }

  /**
   * Formats event notification body with date and location
   */
  formatBody(event: Event): string {
    const details: string[] = [];

    // Add date information
    if (event.event_date) {
      const eventDate = new Date(event.event_date);
      details.push(eventDate.toLocaleDateString());
    } else if (event.starts_at) {
      const startDate = new Date(event.starts_at);
      details.push(startDate.toLocaleDateString());
    }

    // Add time information
    if (event.starts_at) {
      const startTime = new Date(event.starts_at);
      details.push(startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }

    // Add location
    if (event.location) {
      details.push(event.location);
    }

    // If we have details, join them with bullets, otherwise show default message
    return details.length > 0 
      ? details.join(' • ')
      : 'Tap to view event details';
  }

  /**
   * Formats event notification data payload
   */
  formatData(event: Event, orgId: UUID): NotificationPayload['data'] {
    return {
      type: 'event',
      itemId: event.id,
      orgId: orgId,
      priority: 'normal',
      // Additional event-specific data
      eventTitle: event.title,
      eventDate: event.event_date || undefined,
      startsAt: event.starts_at || undefined,
      endsAt: event.ends_at || undefined,
      location: event.location || undefined,
      category: event.category || undefined,
      createdBy: event.created_by
    };
  }

  /**
   * Creates complete notification payload for events
   */
  createPayload(event: Event, orgId: UUID, recipients: string[]): NotificationPayload {
    return {
      to: recipients,
      title: this.formatTitle(event),
      body: this.formatBody(event),
      data: this.formatData(event, orgId),
      sound: 'default',
      priority: 'normal',
      channelId: 'events',
      categoryId: 'event'
    };
  }
}

// =============================================================================
// VOLUNTEER HOURS FORMATTER
// =============================================================================

export interface VolunteerHoursNotificationData {
  volunteerHours: VolunteerHourData;
  status: 'approved' | 'rejected';
}

export class VolunteerHoursFormatter implements NotificationFormatter<VolunteerHoursNotificationData> {
  /**
   * Formats volunteer hours notification title based on status
   */
  formatTitle(data: VolunteerHoursNotificationData): string {
    const { status } = data;
    return status === 'approved' 
      ? 'Volunteer Hours Approved ✅'
      : 'Volunteer Hours Rejected ❌';
  }

  /**
   * Formats volunteer hours notification body with hours and reason
   */
  formatBody(data: VolunteerHoursNotificationData): string {
    const { volunteerHours, status } = data;
    
    if (status === 'approved') {
      return `${volunteerHours.hours} hours have been approved`;
    } else {
      const reason = volunteerHours.rejection_reason 
        ? `: ${volunteerHours.rejection_reason}`
        : '';
      return `${volunteerHours.hours} hours were rejected${reason}`;
    }
  }

  /**
   * Formats volunteer hours notification data payload
   */
  formatData(data: VolunteerHoursNotificationData, orgId: UUID): NotificationPayload['data'] {
    const { volunteerHours, status } = data;
    
    return {
      type: 'volunteer_hours',
      itemId: volunteerHours.id,
      orgId: orgId,
      priority: 'normal',
      // Additional volunteer hours-specific data
      status: status,
      hours: volunteerHours.hours,
      memberId: volunteerHours.member_id,
      activityDate: volunteerHours.activity_date || undefined,
      eventId: volunteerHours.event_id || undefined,
      eventName: volunteerHours.event_name || undefined,
      rejectionReason: volunteerHours.rejection_reason || undefined,
      verifiedBy: volunteerHours.verified_by || undefined
    };
  }

  /**
   * Creates complete notification payload for volunteer hours updates
   */
  createPayload(data: VolunteerHoursNotificationData, orgId: UUID, recipients: string[]): NotificationPayload {
    return {
      to: recipients,
      title: this.formatTitle(data),
      body: this.formatBody(data),
      data: this.formatData(data, orgId),
      sound: 'default',
      priority: 'normal',
      channelId: 'volunteer_hours',
      categoryId: 'volunteer_hours'
    };
  }
}

// =============================================================================
// BLE SESSION FORMATTER
// =============================================================================

export interface BLESessionNotificationData {
  session: AttendanceSession;
  eventName?: string;
  organizationName?: string;
}

export class BLESessionFormatter implements NotificationFormatter<BLESessionNotificationData> {
  /**
   * Formats BLE session notification title with urgency indicator
   */
  formatTitle(data: BLESessionNotificationData): string {
    return '🔵 Attendance Session Started';
  }

  /**
   * Formats BLE session notification body with session details and urgency
   */
  formatBody(data: BLESessionNotificationData): string {
    const { session, eventName } = data;
    
    // Calculate remaining time
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingMinutes = Math.max(0, Math.round(remainingMs / (1000 * 60)));
    
    const sessionName = eventName || session.title;
    
    if (remainingMinutes > 0) {
      return `${sessionName} - ${remainingMinutes} min remaining. Open now to check in!`;
    } else {
      return `${sessionName} - Session ending soon. Open now to check in!`;
    }
  }

  /**
   * Formats BLE session notification data payload
   */
  formatData(data: BLESessionNotificationData, orgId: UUID): NotificationPayload['data'] {
    const { session, eventName, organizationName } = data;
    
    return {
      type: 'ble_session',
      itemId: session.sessionToken,
      orgId: orgId,
      priority: 'high', // High priority for BLE sessions
      // Additional BLE session-specific data
      sessionToken: session.sessionToken,
      sessionTitle: session.title,
      eventName: eventName || undefined,
      organizationName: organizationName || undefined,
      expiresAt: session.expiresAt.toISOString(),
      orgCode: session.orgCode,
      isActive: session.isActive,
      // Navigation hint for deep linking
      targetScreen: 'BLEAttendance',
      autoScan: true
    };
  }

  /**
   * Creates complete notification payload for BLE sessions
   */
  createPayload(data: BLESessionNotificationData, orgId: UUID, recipients: string[]): NotificationPayload {
    return {
      to: recipients,
      title: this.formatTitle(data),
      body: this.formatBody(data),
      data: this.formatData(data, orgId),
      sound: 'default',
      priority: 'high', // High priority for immediate delivery
      channelId: 'ble_sessions',
      categoryId: 'ble_session'
    };
  }
}

// =============================================================================
// FORMATTER FACTORY
// =============================================================================

export class NotificationFormatterFactory {
  private static announcementFormatter = new AnnouncementFormatter();
  private static eventFormatter = new EventFormatter();
  private static volunteerHoursFormatter = new VolunteerHoursFormatter();
  private static bleSessionFormatter = new BLESessionFormatter();

  /**
   * Gets the appropriate formatter for announcement notifications
   */
  static getAnnouncementFormatter(): AnnouncementFormatter {
    return this.announcementFormatter;
  }

  /**
   * Gets the appropriate formatter for event notifications
   */
  static getEventFormatter(): EventFormatter {
    return this.eventFormatter;
  }

  /**
   * Gets the appropriate formatter for volunteer hours notifications
   */
  static getVolunteerHoursFormatter(): VolunteerHoursFormatter {
    return this.volunteerHoursFormatter;
  }

  /**
   * Gets the appropriate formatter for BLE session notifications
   */
  static getBLESessionFormatter(): BLESessionFormatter {
    return this.bleSessionFormatter;
  }

  /**
   * Gets formatter by notification type
   */
  static getFormatter(type: 'announcement' | 'event' | 'volunteer_hours' | 'ble_session'): NotificationFormatter<any> {
    switch (type) {
      case 'announcement':
        return this.getAnnouncementFormatter();
      case 'event':
        return this.getEventFormatter();
      case 'volunteer_hours':
        return this.getVolunteerHoursFormatter();
      case 'ble_session':
        return this.getBLESessionFormatter();
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Truncates text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Formats date for notification display
 */
export function formatNotificationDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString([], { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Formats time for notification display
 */
export function formatNotificationTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

/**
 * Calculates time remaining until a date
 */
export function getTimeRemaining(targetDate: string | Date): { minutes: number; text: string } {
  const now = new Date();
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const remainingMs = target.getTime() - now.getTime();
  const minutes = Math.max(0, Math.round(remainingMs / (1000 * 60)));
  
  if (minutes === 0) {
    return { minutes: 0, text: 'ending soon' };
  } else if (minutes === 1) {
    return { minutes: 1, text: '1 min remaining' };
  } else if (minutes < 60) {
    return { minutes, text: `${minutes} min remaining` };
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    if (remainingMins === 0) {
      return { minutes, text: `${hours}h remaining` };
    } else {
      return { minutes, text: `${hours}h ${remainingMins}m remaining` };
    }
  }
}

// Export formatters for direct use (removed duplicate exports)