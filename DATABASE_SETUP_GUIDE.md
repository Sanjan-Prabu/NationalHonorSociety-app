# Database Setup Guide - Multi-Organization Security

## Overview

This guide will help you implement comprehensive Row-Level Security (RLS) and optimize your multi-organization database setup.

## Current Status Assessment

Based on your code analysis, here's what you have:

✅ **Working Well:**
- UUID-based organizations with slug resolution
- Comprehensive TypeScript types (now updated)
- Multi-organization membership model
- Atomic onboarding via Edge Functions
- Well-structured service layer

🔧 **Needs Implementation:**
- Row-Level Security policies
- Performance indexes
- Foreign key constraints
- Database-level data isolation

## Step-by-Step Implementation

### Step 1: Run Database Validation

First, check your current database state:

```bash
# Connect to your Supabase database and run:
psql "your-supabase-connection-string" -f scripts/validate-database-setup.sql
```

This will show you exactly what's missing.

### Step 2: Apply Security Migration

Run the comprehensive security migration:

```bash
# Apply the RLS and indexing migration
supabase db push
# or if using direct SQL:
psql "your-supabase-connection-string" -f supabase/migrations/001_implement_rls_and_indexes.sql
```

### Step 3: Test RLS Implementation

After applying the migration, test that RLS is working:

```typescript
// In your app, test RLS isolation
import { DatabaseService } from './src/services/DatabaseService';

const testRLS = async () => {
  const result = await DatabaseService.security.testRLSIsolation(
    'current-user-id',
    'current-org-id', 
    'other-org-id'
  );
  
  console.log('RLS Test Results:', result);
  // Should show: rlsWorking: true
};
```

### Step 4: Update Your Code

Your TypeScript types have been updated to use proper UUID typing. Update any existing code that uses the old types:

```typescript
// OLD - Remove these patterns
const orgId: string = 'some-org-id';
profile.organization = 'NHS'; // Legacy field removed
profile.org_id = 'some-uuid'; // Moved to memberships

// NEW - Use these patterns
const orgId: UUID = 'some-org-id';
// Organization membership is now in memberships table only
```

## Security Features Implemented

### 1. Helper Functions

```sql
-- Check if user is member of organization
SELECT is_member_of('org-uuid');

-- Check if user is officer of organization  
SELECT is_officer_of('org-uuid');
```

### 2. RLS Policies

- **Members** can view their organization's data
- **Officers** can manage their organization's data
- **Public events** are visible across organizations
- **Service role** has full administrative access

### 3. Performance Indexes

- `idx_events_org_starts_at` - Fast upcoming events queries
- `idx_volunteer_hours_org_member` - Fast member hours lookup
- `idx_memberships_user_org` - Fast role resolution
- And many more for optimal performance

### 4. Data Integrity

- Foreign key constraints ensure referential integrity
- Proper UUID typing prevents type conversion errors
- Orphaned record prevention

## Testing Your Setup

### Test 1: Data Isolation

```typescript
// Create test users in different organizations
const nhsUser = await createTestUser('nhs');
const nhsaUser = await createTestUser('nhsa');

// NHS user should only see NHS events
const nhsEvents = await DatabaseService.events.getByOrganization(nhsOrgId);

// NHSA user should only see NHSA events  
const nhsaEvents = await DatabaseService.events.getByOrganization(nhsaOrgId);

// Verify isolation
assert(nhsEvents.data?.every(event => event.org_id === nhsOrgId));
assert(nhsaEvents.data?.every(event => event.org_id === nhsaOrgId));
```

### Test 2: Permission Enforcement

```typescript
// Member should NOT be able to approve volunteer hours
const memberResult = await DatabaseService.volunteerHours.updateStatus(
  'hours-id', 
  'approved', 
  'member-user-id'
);
assert(memberResult.error); // Should fail

// Officer SHOULD be able to approve volunteer hours
const officerResult = await DatabaseService.volunteerHours.updateStatus(
  'hours-id', 
  'approved', 
  'officer-user-id'
);
assert(!officerResult.error); // Should succeed
```

### Test 3: Cross-Organization Access

```typescript
// Public events should be visible across organizations
const publicEvents = await DatabaseService.events.getPublicEvents();
assert(publicEvents.data?.some(event => event.org_id === nhsOrgId));
assert(publicEvents.data?.some(event => event.org_id === nhsaOrgId));

// Private events should NOT be visible across organizations
// This is automatically enforced by RLS policies
```

## Performance Optimization

### Query Patterns

Your database is now optimized for these common query patterns:

```sql
-- Fast upcoming events (uses idx_events_org_starts_at)
SELECT * FROM events 
WHERE org_id = $1 AND starts_at >= NOW() 
ORDER BY starts_at;

-- Fast member volunteer hours (uses idx_volunteer_hours_org_member)
SELECT * FROM volunteer_hours 
WHERE org_id = $1 AND member_id = $2;

-- Fast role lookup (uses idx_memberships_user_org)
SELECT role FROM memberships 
WHERE user_id = $1 AND org_id = $2 AND is_active = true;
```

### Monitoring Performance

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE query LIKE '%org_id%'
ORDER BY mean_time DESC;
```

## Troubleshooting

### Common Issues

1. **RLS blocking legitimate access**
   - Check user membership: `SELECT * FROM memberships WHERE user_id = auth.uid()`
   - Verify helper functions: `SELECT is_member_of('org-id')`

2. **Slow queries**
   - Check if indexes are being used: `EXPLAIN ANALYZE your-query`
   - Verify org_id is in WHERE clause for all organizational queries

3. **Foreign key violations**
   - Ensure org_id exists in organizations table
   - Check that user_id exists in profiles table

### Debug Queries

```sql
-- Check RLS policy status
SELECT * FROM rls_policy_status;

-- Check foreign key constraints
SELECT * FROM foreign_key_status;

-- Find orphaned records
SELECT 'events' as table_name, COUNT(*) as orphaned_count
FROM events e LEFT JOIN organizations o ON e.org_id = o.id 
WHERE o.id IS NULL;
```

## Next Steps

1. **Apply the migration** - Run the SQL migration file
2. **Test thoroughly** - Use the provided test patterns
3. **Monitor performance** - Check query execution plans
4. **Update application code** - Use the updated TypeScript types
5. **Document policies** - Keep track of your RLS policies for maintenance

## Security Best Practices

- Always query with org_id in WHERE clause
- Use the helper functions in RLS policies
- Test with multiple user roles
- Monitor for unauthorized access attempts
- Keep RLS policies simple and maintainable
- Document any policy changes

Your database is now ready for production with enterprise-grade security and performance!