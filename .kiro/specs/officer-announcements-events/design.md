# Design Document

## Overview

This design implements a robust, production-ready announcements and events system that replaces static JSON data with persistent, RLS-secure Supabase-backed storage. The system enables officers to create announcements and events that are immediately visible to all current and future members of the same organization through realtime updates. The design emphasizes security through Row-Level Security policies, maintains audit trails through soft deletion, and provides seamless organization-scoped data access.

## Architecture

### Database Layer
- **New Tables**: `announcements` and `events` tables with comprehensive schemas
- **Security**: RLS policies using existing `is_member_of()` and `is_officer_of()` helper functions
- **Audit Trail**: Soft deletion with `status`, `deleted_by`, and `deleted_at` fields
- **Organization Scoping**: All records include `org_id` foreign key for data isolation

### Service Layer
- **Announcement Service**: CRUD operations with organization-scoped queries
- **Event Service**: CRUD operations with date/time validation and organization filtering
- **Realtime Subscriptions**: Organization-scoped Supabase realtime channels
- **Security**: Server-side `org_id` resolution from user session context

### Frontend Layer
- **Existing Screens**: Modify current announcement/event screens to use dynamic data
- **Realtime Updates**: Supabase subscriptions for immediate UI updates
- **Role-Based UI**: Officers see create/delete controls, members see read-only feeds
- **Form Validation**: Client-side validation with server-side security enforcement

## Components and Interfaces

### Database Schema

#### Announcements Table
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  tag TEXT,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  image_url TEXT, -- Reserved for Phase 2
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'archived')),
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_announcements_org_created ON announcements(org_id, created_at DESC);
CREATE INDEX idx_announcements_status ON announcements(status) WHERE status = 'active';
```

#### Events Table
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  event_date DATE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  capacity INTEGER,
  category TEXT,
  actual_attendance INTEGER DEFAULT 0,
  image_url TEXT, -- Reserved for Phase 2
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'archived')),
  deleted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_events_org_date ON events(org_id, event_date);
CREATE INDEX idx_events_status ON events(status) WHERE status = 'active';
```

### Service API Interfaces

#### Announcement Service
```typescript
interface AnnouncementService {
  // Create announcement (officers only)
  createAnnouncement(data: {
    title: string;
    message: string;
    tag?: string;
    link?: string;
  }): Promise<Announcement>;

  // Fetch announcements (members and officers)
  fetchAnnouncements(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Announcement[]>;

  // Soft delete announcement (officers only)
  softDeleteAnnouncement(id: string): Promise<void>;
}
```

#### Event Service
```typescript
interface EventService {
  // Create event (officers only)
  createEvent(data: {
    title: string;
    description?: string;
    location?: string;
    event_date: string;
    starts_at: string;
    ends_at?: string;
    capacity?: number;
    category?: string;
  }): Promise<Event>;

  // Fetch events (members and officers)
  fetchEvents(options?: {
    upcoming?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Event[]>;

  // Soft delete event (officers only)
  softDeleteEvent(id: string): Promise<void>;
}
```

### RLS Policies

#### Announcements Policies
```sql
-- SELECT: Members can view active announcements from their organization
CREATE POLICY "announcements_select_policy" ON announcements
  FOR SELECT USING (
    status = 'active' AND is_member_of(org_id)
  );

-- INSERT: Officers can create announcements for their organization
CREATE POLICY "announcements_insert_policy" ON announcements
  FOR INSERT WITH CHECK (
    is_officer_of(org_id) AND created_by = auth.uid()
  );

-- UPDATE: Officers can update announcements in their organization (for soft delete)
CREATE POLICY "announcements_update_policy" ON announcements
  FOR UPDATE USING (
    is_officer_of(org_id)
  );

-- DELETE: Prevent physical deletes (admin only via service role)
CREATE POLICY "announcements_delete_policy" ON announcements
  FOR DELETE USING (false);
```

#### Events Policies
```sql
-- SELECT: Members can view active events from their organization
CREATE POLICY "events_select_policy" ON events
  FOR SELECT USING (
    status = 'active' AND is_member_of(org_id)
  );

-- INSERT: Officers can create events for their organization
CREATE POLICY "events_insert_policy" ON events
  FOR INSERT WITH CHECK (
    is_officer_of(org_id) AND created_by = auth.uid()
  );

-- UPDATE: Officers can update events in their organization (for soft delete)
CREATE POLICY "events_update_policy" ON events
  FOR UPDATE USING (
    is_officer_of(org_id)
  );

-- DELETE: Prevent physical deletes (admin only via service role)
CREATE POLICY "events_delete_policy" ON events
  FOR DELETE USING (false);
```

## Data Models

### TypeScript Interfaces

```typescript
interface Announcement {
  id: string;
  org_id: string;
  created_by: string;
  tag?: string;
  title: string;
  message?: string;
  link?: string;
  image_url?: string; // Phase 2
  status: 'active' | 'deleted' | 'archived';
  deleted_by?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}

interface Event {
  id: string;
  org_id: string;
  created_by: string;
  title: string;
  description?: string;
  location?: string;
  event_date?: string;
  starts_at?: string;
  ends_at?: string;
  capacity?: number;
  category?: string;
  actual_attendance: number;
  image_url?: string; // Phase 2
  status: 'active' | 'deleted' | 'archived';
  deleted_by?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
}
```

### Service Implementation Patterns

```typescript
// Example service method with org_id resolution
async createAnnouncement(data: CreateAnnouncementData): Promise<Announcement> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Resolve org_id from user's active membership (server-side)
  const orgId = await this.resolveUserOrgId(user.id);
  
  const { data: announcement, error } = await supabase
    .from('announcements')
    .insert({
      ...data,
      org_id: orgId, // Server-side injection
      created_by: user.id
    })
    .select()
    .single();

  if (error) throw error;
  return announcement;
}
```

## Error Handling

### Client-Side Validation
- **Form Validation**: Required fields, character limits, URL validation
- **Real-time Feedback**: Immediate validation feedback on form inputs
- **Network Handling**: Graceful handling of offline/online states

### Server-Side Security
- **RLS Enforcement**: All database operations filtered by RLS policies
- **Input Sanitization**: Server-side validation of all input data
- **Authentication Checks**: Verify user authentication before any operations

### Error Recovery
- **Optimistic Updates**: UI updates immediately with rollback on failure
- **Retry Logic**: Automatic retry for transient network failures
- **User Feedback**: Clear error messages with actionable guidance

## Testing Strategy

### Unit Testing
- **Service Layer**: Test CRUD operations with mocked Supabase client
- **Validation Logic**: Test form validation and data transformation
- **Utility Functions**: Test date formatting and data processing functions

### Integration Testing
- **Database Operations**: Test RLS policies with different user roles
- **Realtime Subscriptions**: Test subscription setup and cleanup
- **Organization Context**: Test org_id resolution and switching

### Manual Testing
- **Cross-Organization Isolation**: Verify users cannot access other org data
- **Role-Based Access**: Test officer vs member permissions
- **Realtime Updates**: Verify immediate updates across multiple clients
- **Soft Deletion**: Confirm deleted items are hidden but preserved

### Performance Testing
- **Query Optimization**: Verify indexes are used for org-scoped queries
- **Subscription Efficiency**: Test realtime subscription resource usage
- **Large Dataset Handling**: Test with realistic data volumes

## Implementation Phases

### Phase 1: Database Setup
1. Create announcements and events tables with indexes
2. Implement RLS policies using existing helper functions
3. Test policies with different user roles and organizations

### Phase 2: Service Layer
1. Implement announcement and event service classes
2. Add org_id resolution from user session
3. Implement soft deletion logic

### Phase 3: Frontend Integration
1. Modify existing screens to use dynamic data services
2. Implement realtime subscriptions with proper cleanup
3. Add role-based UI controls (create/delete buttons)

### Phase 4: Testing & Validation
1. Comprehensive manual testing of all user flows
2. Performance testing with realistic data volumes
3. Security validation of RLS policies and data isolation