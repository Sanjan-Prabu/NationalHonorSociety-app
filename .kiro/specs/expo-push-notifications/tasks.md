 # Implementation Plan

- [x] 1. Set up project dependencies and configuration
  - Install expo-notifications, expo-device, and expo-constants packages
  - Configure app.json with notification permissions for iOS and Android
  - Set up environment variables for Expo project configuration
  - _Requirements: 11.1, 11.2_

- [x] 2. Implement core push token management system
  - [x] 2.1 Create PushTokenService for token registration and validation
    - Write token registration utility with cross-platform support
    - Implement token validation and format checking
    - Add automatic token cleanup for invalid tokens
    - _Requirements: 9.1, 9.2_

  - [x] 2.2 Create NotificationPermissionService for permission handling
    - Implement permission request flow for iOS and Android
    - Set up Android notification channels with proper configuration
    - Handle permission denial scenarios gracefully
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 2.3 Integrate token registration with authentication flow
    - Register push tokens automatically on user login
    - Update tokens in Supabase profiles table
    - Handle token refresh and device changes
    - _Requirements: 9.1, 9.5_

- [x] 3. Create notification service infrastructure
  - [x] 3.1 Implement core NotificationService class
    - Create unified notification sending interface
    - Implement batch notification processing (up to 100 tokens)
    - Add error handling and retry logic for failed sends
    - _Requirements: 5.1, 5.2, 9.3_

  - [x] 3.2 Create notification payload formatters
    - Implement AnnouncementFormatter for announcement notifications
    - Implement EventFormatter for event notifications
    - Implement VolunteerHoursFormatter for approval/rejection notifications
    - Implement BLESessionFormatter for BLE session notifications
    - _Requirements: 5.3, 5.4_

  - [x] 3.3 Add notification priority and delivery management
    - Implement high priority delivery for BLE sessions
    - Set normal priority for announcements, events, and volunteer hours
    - Configure platform-specific notification channels and categories
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 4. Implement deep linking and navigation handling
  - [x] 4.1 Create NotificationNavigationHandler service
    - Implement unified notification tap handler
    - Extract notification type, item ID, and organization ID from payloads
    - Route to appropriate screens based on notification type
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 4.2 Set up notification listeners and response handling
    - Add notification received listener for foreground notifications
    - Add notification response listener for tap handling
    - Implement cross-app-state navigation (foreground, background, closed)
    - _Requirements: 7.4, 8.1, 8.2, 8.3, 8.4_

  - [x] 4.3 Add visual feedback and badge management
    - Implement notification count badges on relevant tab icons
    - Clear badges when users view related content
    - Highlight relevant items when navigating from notifications
    - _Requirements: 7.5, 8.5, 10.3, 10.4, 10.5_

- [x] 5. Integrate notifications with existing app features
  - [x] 5.1 Add announcement notification integration
    - Integrate NotificationService with announcement creation flow
    - Send notifications to all organization members when officers create announcements
    - Include announcement title and preview text in notifications
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 5.2 Add event notification integration
    - Integrate NotificationService with event creation flow
    - Send notifications for both regular events and BLE attendance events
    - Include event title, date, and location in notifications
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 5.3 Add volunteer hours notification integration
    - Integrate NotificationService with volunteer hours approval/rejection flow
    - Send individual notifications to members when hours are approved or rejected
    - Include hours count and status in notifications
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.4 Add BLE session notification integration
    - Integrate NotificationService with BLE session management
    - Send high-priority notifications when officers start BLE sessions
    - Include event name, session duration, and urgency indicators
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Implement user preferences and controls
  - [x] 6.1 Create notification preferences interface
    - Add settings screen with notification preference toggles
    - Implement granular controls for different notification types
    - Store preferences in Supabase profiles table
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.2 Add temporary muting functionality
    - Implement temporary notification muting (1 hour, 1 day, 1 week)
    - Store mute status and expiration in database
    - Respect mute settings when sending notifications
    - _Requirements: 12.4_

  - [x] 6.3 Update notification queries to respect preferences
    - Filter notification recipients based on enabled preferences
    - Exclude muted users from notification broadcasts
    - Handle preference changes in real-time
    - _Requirements: 6.3, 6.4_

- [x] 7. Add rate limiting and spam prevention
  - [x] 7.1 Implement announcement rate limiting
    - Limit officers to 10 announcements per day per organization
    - Create database functions for rate limit checking
    - Add rate limit validation before sending notifications
    - _Requirements: 12.1_

  - [x] 7.2 Add duplicate notification prevention
    - Prevent duplicate notifications for same event/announcement within 1 hour
    - Implement content-based duplicate detection
    - Store notification history for duplicate checking
    - _Requirements: 12.2_

  - [x] 7.3 Implement volunteer hours approval batching
    - Batch multiple volunteer hour approvals into single notification if approved within 5 minutes
    - Create batching logic for improved user experience
    - Handle individual vs. batch notification formatting
    - _Requirements: 12.3_

  - [x] 7.4 Add notification summary for high volume
    - Provide notification summary instead of individual notifications if more than 5 pending
    - Implement summary formatting and delivery
    - Handle summary tap navigation to appropriate screens
    - _Requirements: 12.5_

- [x] 8. Implement comprehensive error handling
  - [x] 8.1 Add token management error handling
    - Handle permission denied scenarios gracefully
    - Implement automatic token cleanup for invalid tokens
    - Add retry logic for token registration failures
    - _Requirements: 9.2, 9.4_

  - [x] 8.2 Add notification delivery error handling
    - Handle DeviceNotRegistered errors by removing invalid tokens
    - Implement retry logic for rate limit and network errors
    - Log delivery status for monitoring and debugging
    - _Requirements: 9.3, 9.4_

  - [x] 8.3 Add graceful degradation for notification failures
    - Ensure app continues to function when notifications fail
    - Provide user feedback for permission and configuration issues
    - Implement fallback mechanisms for critical notifications
    - _Requirements: 9.3_

- [x] 9. Set up database schema and functions
  - [x] 9.1 Create database schema extensions
    - Add expo_push_token column to profiles table
    - Add notifications_enabled and notification_preferences columns
    - Add muted_until column for temporary muting
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 9.2 Create rate limiting database functions
    - Implement check_notification_rate_limit database function
    - Create notification_rate_limits table for tracking
    - Add cleanup functions for expired rate limit records
    - _Requirements: 12.1, 12.2_

  - [ ]* 9.3 Create notification history tracking (optional)
    - Create notification_history table for audit trail
    - Implement notification logging functions
    - Add cleanup procedures for old notification records
    - _Requirements: Optional enhancement_

- [x] 10. Add comprehensive testing and validation
  - [x] 10.1 Create notification service unit tests
    - Test token registration and validation logic
    - Test notification formatting for all types
    - Test rate limiting and spam prevention
    - Test error handling scenarios
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 10.2 Set up physical device testing procedures
    - Create testing checklist for iOS physical devices
    - Create testing checklist for Android physical devices
    - Test notification delivery in foreground, background, and closed states
    - Validate deep linking navigation from notifications
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 10.3 Create automated integration tests
    - Test end-to-end notification flow from officer action to member notification
    - Test cross-platform notification delivery
    - Test permission handling and error scenarios
    - _Requirements: 11.3, 11.4_

- [x] 11. Performance optimization and monitoring
  - [x] 11.1 Implement notification caching and batching
    - Cache user tokens by organization for faster lookups
    - Implement efficient batch processing for large user groups
    - Add database query optimization for notification recipients
    - _Requirements: 5.2, Performance optimization_

  - [x] 11.2 Add monitoring and logging
    - Implement comprehensive notification logging
    - Add performance metrics tracking (delivery rate, latency)
    - Create health check endpoints for notification service
    - _Requirements: 9.4, Monitoring requirements_

  - [ ]* 11.3 Set up analytics and reporting
    - Track notification engagement metrics (tap-through rates)
    - Monitor permission grant rates and user preferences
    - Create dashboards for notification system health
    - _Requirements: Optional enhancement_

- [x] 12. Final integration and deployment preparation
  - [x] 12.1 Complete end-to-end testing
    - Test all notification types on physical iOS and Android devices
    - Validate deep linking works correctly for all notification types
    - Test rate limiting and spam prevention in realistic scenarios
    - Verify error handling and recovery mechanisms
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 12.2 Update app configuration for production
    - Configure production Expo project settings
    - Set up proper environment variables for production
    - Validate APNs and FCM integration through Expo
    - _Requirements: 11.1, 11.2_

  - [x] 12.3 Create documentation and deployment guide
    - Document notification system architecture and usage
    - Create troubleshooting guide for common issues
    - Document testing procedures for future updates
    - _Requirements: Implementation documentation_