# Requirements Document

## Introduction

This specification defines a robust, production-ready announcements and events system for the National Honor Society application. The system replaces static JSON cards with persistent, RLS-secure Supabase-backed data where officers can create announcements and events that become immediately visible to all current and future members of the same organization. The system implements soft deletion, auditing, and organization-scoped visibility without image handling in Phase 1.

## Glossary

- **Officer_User**: A user with role='officer' who can create, edit, and soft-delete announcements and events
- **Member_User**: A user with role='member' who can only view active announcements and events
- **Announcement_System**: The subsystem handling officer-created announcements with tag, title, message, and optional link
- **Event_System**: The subsystem handling officer-created events with title, date/time, description, and location
- **RLS_Engine**: Row-Level Security system that enforces organization-scoped data access
- **Soft_Delete**: Status change from 'active' to 'deleted' without physical row removal
- **Organization_Context**: The active organization (NHS or NHSA) determining data visibility scope

## Requirements

### Requirement 1

**User Story:** As an officer, I want to create announcements for my organization, so that all current and future members can see important information.

#### Acceptance Criteria

1. WHEN an Officer_User accesses the announcements screen, THE Announcement_System SHALL display a creation form with tag, title, message, and optional link fields
2. WHEN an Officer_User submits a valid announcement, THE Announcement_System SHALL persist the data to Supabase with org_id resolved server-side
3. WHEN an announcement is created, THE Announcement_System SHALL make it immediately visible to all members of the same organization
4. WHERE the user role is not officer, THE Announcement_System SHALL display only a read-only feed without creation controls
5. THE Announcement_System SHALL resolve org_id server-side from user session and SHALL NOT accept org_id from client input

### Requirement 2

**User Story:** As an officer, I want to create events for my organization, so that members know about upcoming activities with specific dates and locations.

#### Acceptance Criteria

1. WHEN an Officer_User accesses the events screen, THE Event_System SHALL display a creation form with title, date/time, description, and location fields
2. WHEN an Officer_User submits a valid event, THE Event_System SHALL persist the data with proper date/time validation
3. THE Event_System SHALL order events by event_date in the display feed
4. WHEN an event is created, THE Event_System SHALL make it immediately visible to organization members through realtime updates
5. THE Event_System SHALL validate that event_date is not in the past before allowing creation

### Requirement 3

**User Story:** As a member, I want to view announcements and events for my organization only, so that I see relevant information without clutter from other organizations.

#### Acceptance Criteria

1. WHEN a Member_User or Officer_User accesses announcement or event screens, THE RLS_Engine SHALL filter results to show only their organization's active items
2. THE RLS_Engine SHALL prevent users from viewing announcements or events from organizations they are not members of
3. WHEN a user switches organizations, THE Organization_Context SHALL update and refresh the displayed content accordingly
4. THE Announcement_System SHALL display announcements ordered by created_at descending
5. THE Event_System SHALL display events ordered by event_date ascending

### Requirement 4

**User Story:** As an officer, I want to soft-delete announcements and events, so that I can remove outdated content while maintaining audit trails.

#### Acceptance Criteria

1. WHEN an Officer_User clicks delete on an announcement or event, THE system SHALL display a confirmation modal
2. WHEN deletion is confirmed, THE system SHALL update the row status to 'deleted' and set deleted_by and deleted_at fields
3. THE RLS_Engine SHALL exclude deleted items from member and officer feeds
4. THE system SHALL NOT allow physical deletion of announcements or events through normal application flows
5. WHEN a soft-delete occurs, THE system SHALL immediately remove the item from the UI feed

### Requirement 5

**User Story:** As a system administrator, I want comprehensive RLS policies on announcements and events tables, so that data access is secure and organization-scoped.

#### Acceptance Criteria

1. THE RLS_Engine SHALL allow SELECT on announcements only if status='active' AND user is_member_of(org_id)
2. THE RLS_Engine SHALL allow INSERT on announcements only if user is_officer_of(org_id)
3. THE RLS_Engine SHALL allow UPDATE on announcements only if user is_officer_of(org_id) for soft-delete operations
4. THE RLS_Engine SHALL prevent physical DELETE operations on announcements and events tables
5. THE RLS_Engine SHALL apply identical policies to the events table with appropriate field mappings

### Requirement 6

**User Story:** As a developer, I want realtime updates for announcements and events, so that users see new content immediately without manual refresh.

#### Acceptance Criteria

1. WHEN a new announcement or event is created, THE system SHALL broadcast the change via Supabase realtime
2. WHEN users have the announcement or event screen open, THE system SHALL automatically update the feed with new items
3. THE system SHALL establish realtime subscriptions only after Organization_Context is properly initialized
4. WHEN a soft-delete occurs, THE system SHALL remove the item from all connected clients' feeds in realtime
5. THE system SHALL handle subscription cleanup when users navigate away from announcement/event screens

### Requirement 7

**User Story:** As a new user, I want complete profile data during onboarding, so that I can immediately access organization-appropriate announcements and events.

#### Acceptance Criteria

1. WHEN a user completes signup, THE onboarding system SHALL create a complete profiles row with id, first_name, last_name, email, role, org_id, and is_verified
2. WHEN a user logs in, THE system SHALL verify profile completeness and attempt auto-upsert if fields are missing
3. THE system SHALL load Organization_Context only after profile verification is complete
4. WHEN profile data is incomplete, THE system SHALL prevent access to announcements and events until resolved
5. THE onboarding system SHALL robustly handle edge cases where profile creation partially fails