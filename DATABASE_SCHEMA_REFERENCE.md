# Database Schema Reference

## Overview
This document contains the complete database schema information for the multi-organization system.

## Tables

### Core Tables
- **organizations**: Main organization entities with slug, name, type (nhs/nhsa), and region
- **profiles**: User profiles with personal information and organization association
- **memberships**: Links users to organizations with roles (member/officer)
- **verification_codes**: Organization-specific codes for user verification

### Activity Tables
- **events**: Organization events with scheduling and visibility settings
- **attendance**: Event attendance tracking with multiple check-in methods
- **volunteer_hours**: Volunteer hour logging and approval system

### Supporting Tables
- **contacts**: Extended contact information for users
- **files**: File storage with organization association and public/private settings
- **ble_badges**: Bluetooth badge management for attendance tracking

### System Tables
- **monitoring_log**: System monitoring and health checks
- **operational_dashboard**: System metrics and status information
- **rls_policy_documentation**: Row Level Security policy documentation
- **organization_indexes**: Database index information

## Key Relationships

### Organization Structure
```
organizations (1) -> (many) memberships -> (many) profiles
organizations (1) -> (many) events
organizations (1) -> (many) verification_codes
```

### User Access Pattern
```
profiles -> memberships -> organizations
profiles -> attendance (via member_id)
profiles -> volunteer_hours (via member_id)
```

## Current Organizations
1. **Default Organization** (eaf8ff2b-9d99-461b-9191-cecc140e9219)
   - Slug: "default"
   - Type: null

2. **Test NHS** (550e8400-e29b-41d4-a716-446655440001)
   - Slug: "test-nhs"
   - Type: "nhs"
   - Region: "test-region"

3. **Test NHSA** (550e8400-e29b-41d4-a716-446655440002)
   - Slug: "test-nhsa"
   - Type: "nhsa"
   - Region: "test-region"

## Security Model

### Row Level Security (RLS)
All tables implement comprehensive RLS policies with:
- **User-level access**: Users can manage their own data
- **Organization-level access**: Members can view org data, officers can manage
- **Service role access**: Full administrative access for system operations

### Key Security Functions
- `is_member_of(org_id)`: Check if user is member of organization
- `is_officer_of(org_id)`: Check if user is officer of organization
- `auth.uid()`: Get current authenticated user ID

## Data Statistics
- **Profiles**: 15 users (mix of legacy and test users)
- **Memberships**: 4 active memberships across test organizations
- **Organizations**: 3 organizations (1 default, 2 test)
- **Verification Codes**: 1 active code

## Migration Status
The system is currently in transition from legacy single-org to multi-org:
- Legacy users have `org_id: null` in profiles
- New test users are properly associated with organizations
- Memberships table properly links users to organizations with roles

## Key Constraints
- Unique user-organization membership pairs
- Unique verification codes per organization and type
- Proper foreign key relationships maintaining data integrity
- Check constraints ensuring valid enum values for roles and statuses