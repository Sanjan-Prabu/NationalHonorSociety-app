# Design Document

## Overview

This design implements a complete event management system that mirrors the announcements functionality while integrating with the volunteer hours system. The design leverages existing components and patterns to create a consistent user experience. Officers can create, view, and delete events with categorized tags, while members can view events and select them when logging volunteer hours.

## Architecture

### Component Layer
- **EventCard Component**: New component based on AnnouncementCard pattern for displaying events
- **Enhanced CreateEventScreen**: Updated form with category selection and proper validation
- **Enhanced OfficerEventsScreen**: Updated to display events in card format with delete functionality
- **Tag Component Enhancement**: Add orange and teal variants for new event categories

### Service Layer
- **Existing EventService**: Already implemented with CRUD operations and realtime subscriptions
- **Database Integration**: Events table already exists with proper schema and RLS policies
- **Volunteer Hours Integration**: Link events to volunteer hours form for member selection

### Data Flow
- **Event Creation**: Officer → CreateEventScreen → EventService → Database → Realtime Update
- **Event Display**: Database → EventService → EventCard → UI Display
- **Event Deletion**: Officer → Confirmation → EventService → Soft Delete → UI Update
- **Volunteer Hours**: Member → Volunteer Form → Event Selection → Database Association

## Components and Interfaces

### EventCard Component

```typescript
interface EventCardProps {
  event: {
    id: string;
    title: string;
    description?: string;
    location?: string;
    event_date?: string;
    starts_at?: string;
    ends_at?: string;
    category?: string;
    created_at: string;
    creator_name?: string;
  };
  showDeleteButton?: boolean;
  onDelete?: (id: string) => void;
  deleteLoading?: boolean;
}
```

### Enhanced CreateEventScreen

```typescript
interface EventFormData {
  title: string;
  category: 'fundraiser' | 'volunteering' | 'education' | 'custom';
  customCategory?: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  location: string;
  description: string;
}
```

### Category Configuration

```typescript
const eventCategories = [
  { label: 'Fundraiser', variant: 'orange', value: 'fundraiser' },
  { label: 'Volunteering', variant: 'teal', value: 'volunteering' },
  { label: 'Education', variant: 'purple', value: 'education' },
  { label: 'Custom', variant: 'orange', value: 'custom' }
];
```

## Data Models

### Event Display Data

```typescript
interface EventDisplayData {
  id: string;
  title: string;
  description?: string;
  location?: string;
  event_date?: string;
  starts_at?: string;
  ends_at?: string;
  category?: string;
  created_at: string;
  creator_name?: string;
  // Computed fields
  formattedDate?: string;
  formattedTime?: string;
  categoryTag?: string;
  categoryVariant?: TagVariant;
}
```

### Volunteer Hours Integration

```typescript
interface VolunteerHoursEventOption {
  id: string;
  title: string;
  event_date?: string;
  category?: string;
}
```

## UI/UX Design

### EventCard Layout

```
┌─────────────────────────────────────┐
│ [Category Tag]              [Delete]│
│                                     │
│ Event Title                         │
│ Event description text...           │
│                                     │
│ 📅 Date • Time                      │
│ 📍 Location                         │
│                                     │
│ ─────────────────────────────────── │
│ Created Date        by Creator Name │
└─────────────────────────────────────┘
```

### Category Tags Design

- **Fundraiser**: Orange background (#FEF5E7), orange text (#ECC94B)
- **Volunteering**: Teal background (new), teal text (new)
- **Education**: Purple background (#F3E8FF), purple text (#9F7AEA)
- **Custom**: Orange background (#FEF5E7), orange text (#ECC94B)

### Enhanced CreateEventScreen

```
┌─────────────────────────────────────┐
│ ← Create New Event                  │
│                                     │
│ Event Name                          │
│ [Text Input Field]                  │
│                                     │
│ Category                            │
│ [Fundraiser] [Volunteering]         │
│ [Education]  [Custom]               │
│ [Custom Input Field] (if custom)    │
│                                     │
│ Date & Time                         │
│ [Date Picker] [Start] [End]         │
│                                     │
│ Location                            │
│ [Text Input Field]                  │
│                                     │
│ Description                         │
│ [Multi-line Text Input]             │
│                                     │
│ [Create Event Button]               │
└─────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Tag Component Enhancement
1. Add orange and teal variants to Tag component
2. Update color constants and variant mapping
3. Test tag display with new colors

### Phase 2: EventCard Component
1. Create EventCard component based on AnnouncementCard
2. Implement event-specific data display (date, time, location)
3. Add category tag display with proper color mapping
4. Include delete functionality for officers

### Phase 3: CreateEventScreen Enhancement
1. Update category selection with new options
2. Add custom category input field
3. Implement proper form validation
4. Connect to EventService for creation
5. Add navigation back to events screen

### Phase 4: OfficerEventsScreen Integration
1. Replace existing event display with EventCard components
2. Implement delete confirmation and handling
3. Add realtime updates for immediate UI refresh
4. Ensure proper loading and error states

### Phase 5: Navigation Integration
1. Connect create event button to CreateEventScreen
2. Ensure proper navigation flow
3. Test navigation with form submission

### Phase 6: Volunteer Hours Integration
1. Update volunteer hours form to include organization events
2. Populate events in the organization event toggle
3. Store event association with volunteer hours entries
4. Test end-to-end event selection flow

### Phase 7: Testing and Validation
1. Test event creation, display, and deletion
2. Verify realtime updates work correctly
3. Test volunteer hours integration
4. Validate organization-scoped data access

## Error Handling

### Form Validation
- **Required Fields**: Title, category, date, start time, end time, location
- **Date Validation**: Event date cannot be in the past
- **Time Validation**: End time must be after start time
- **Custom Category**: Required when custom is selected

### Database Operations
- **Creation Errors**: Display user-friendly messages for validation failures
- **Delete Errors**: Handle permission errors and network failures
- **Loading States**: Show appropriate loading indicators during operations

### Navigation Handling
- **Form Submission**: Navigate back to events screen on success
- **Error Recovery**: Stay on form with error messages on failure
- **Network Issues**: Provide retry options for failed operations

## Testing Strategy

### Component Testing
- **EventCard**: Test display with various event data configurations
- **Tag Component**: Verify new color variants render correctly
- **CreateEventScreen**: Test form validation and submission

### Integration Testing
- **Event Creation Flow**: Officer creates event → appears in feed
- **Event Deletion Flow**: Officer deletes event → removed from feed
- **Volunteer Hours Flow**: Member selects event → stored in database
- **Realtime Updates**: Multiple users see updates immediately

### User Experience Testing
- **Officer Workflow**: Create, view, and delete events
- **Member Workflow**: View events and select for volunteer hours
- **Cross-Organization**: Verify data isolation between organizations
- **Performance**: Test with multiple events and realtime updates

## Security Considerations

### Data Access
- **Organization Scoping**: Events filtered by user's organization
- **Role-Based Access**: Only officers can create/delete events
- **RLS Policies**: Existing policies already secure event data

### Input Validation
- **Server-Side Validation**: All form data validated on server
- **SQL Injection Prevention**: Use parameterized queries
- **XSS Prevention**: Sanitize all user input before display

## Performance Optimization

### Database Queries
- **Indexed Queries**: Use existing indexes on org_id and event_date
- **Pagination**: Implement if event lists become large
- **Realtime Efficiency**: Organization-scoped subscriptions only

### UI Performance
- **Component Reuse**: Leverage existing AnnouncementCard patterns
- **Lazy Loading**: Load events on demand if needed
- **Memory Management**: Proper cleanup of realtime subscriptions