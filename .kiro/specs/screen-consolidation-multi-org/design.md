# Design Document

## Overview

This design consolidates duplicate screen files across NHS/NHSA folders into a single shared location while maintaining organization-specific data filtering. The solution leverages the existing OrganizationContext to dynamically filter data based on the user's active organization, eliminating code duplication while preserving multi-organization functionality.

## Architecture

### Current State Analysis
- **NHS Screens**: `src/screens/member/nhs/` contains the primary implementations
- **NHSA Screens**: `src/screens/member/nhsa/` contains duplicate implementations  
- **Root Level Screens**: `src/screens/member/` contains additional duplicates
- **Officer Screens**: Similar duplication pattern in `src/screens/officer/`

### Target Architecture
```
src/screens/
├── member/
│   ├── DashboardScreen.tsx (from nhs folder)
│   ├── EventScreen.tsx (from nhs folder)
│   ├── AnnouncementsScreen.tsx (from nhs folder)
│   ├── AttendanceScreen.tsx (from nhs folder)
│   ├── LogHoursScreen.tsx (from nhs folder)
│   └── VolunteerHoursForm.tsx (from nhs folder)
└── officer/
    ├── OfficerDashboardScreen.tsx (consolidated)
    ├── OfficerEventsScreen.tsx (consolidated)
    ├── OfficerAnnouncementsScreen.tsx (consolidated)
    ├── OfficerAttendanceScreen.tsx (consolidated)
    └── OfficerVolunteerApprovalScreen.tsx (consolidated)
```

## Components and Interfaces

### Organization Context Integration
Each screen will use the existing `useOrganization()` hook to access:
- `organizationId`: UUID for database filtering
- `organizationType`: 'nhs' or 'nhsa' for display logic
- `activeOrganization`: Full organization object
- `activeMembership`: User's role and permissions

### Data Filtering Pattern
All database queries will follow this pattern:
```typescript
const { organizationId } = useOrganization();

// Events query example
const { data: events } = await supabase
  .from('events')
  .select('*')
  .eq('org_id', organizationId)
  .order('starts_at', { ascending: true });
```

### Screen Structure
Each consolidated screen will:
1. Import and use `useOrganization()` hook
2. Filter all data queries by `organizationId`
3. Display organization-specific branding/colors
4. Maintain existing UI/UX patterns
5. Preserve TODO comments for unimplemented features

## Data Models

### Database Schema Alignment
Based on the provided schema, the following tables support org_id filtering:
- `events` (org_id: uuid, FOREIGN KEY)
- `volunteer_hours` (org_id: uuid, FOREIGN KEY) 
- `attendance` (org_id: uuid, FOREIGN KEY)
- `profiles` (org_id: uuid, FOREIGN KEY)
- `memberships` (org_id: uuid, FOREIGN KEY)
- `files` (org_id: uuid, FOREIGN KEY)

### Query Patterns
```typescript
// Events for current organization
SELECT * FROM events WHERE org_id = $1 ORDER BY starts_at ASC;

// Volunteer hours for current user in current org
SELECT * FROM volunteer_hours 
WHERE member_id = $1 AND org_id = $2 
ORDER BY activity_date DESC;

// Announcements (stored in events table with specific type)
SELECT * FROM events 
WHERE org_id = $1 AND event_type = 'announcement' 
ORDER BY created_at DESC;
```

## Error Handling

### Organization Context Validation
- Verify `organizationId` exists before making queries
- Handle cases where user has no organization membership
- Provide fallback UI for loading/error states

### Data Loading States
- Show loading spinners during data fetches
- Display empty states when no data exists for organization
- Handle network errors gracefully with retry options

### Migration Safety
- Preserve all existing functionality during consolidation
- Maintain navigation structure and routing
- Keep TODO comments for future feature implementation

## Testing Strategy

### Functional Testing
1. **Organization Switching**: Verify data updates when switching between NHS/NHSA
2. **Data Isolation**: Confirm NHS users only see NHS data and vice versa
3. **Navigation**: Ensure all screen transitions work after consolidation
4. **CRUD Operations**: Test create/update operations set correct org_id

### Integration Testing
1. **Context Integration**: Verify OrganizationContext provides correct data
2. **Database Queries**: Confirm all queries include org_id filtering
3. **Multi-Organization**: Test users with multiple organization memberships

### Regression Testing
1. **Existing Features**: Verify all current functionality remains intact
2. **UI/UX**: Confirm visual consistency across organizations
3. **Performance**: Ensure consolidation doesn't impact load times

## Implementation Phases

### Phase 1: File Consolidation
- Move NHS screens to parent directories
- Delete duplicate NHSA and root-level screens
- Update import paths in navigation files

### Phase 2: Organization Context Integration
- Add `useOrganization()` hook to each screen
- Update all data queries to include org_id filtering
- Test organization switching functionality

### Phase 3: Validation and Cleanup
- Remove unused files and imports
- Update navigation references
- Verify all TODO items are preserved

### Phase 4: Testing and Documentation
- Run comprehensive testing suite
- Update documentation and comments
- Validate multi-organization functionality