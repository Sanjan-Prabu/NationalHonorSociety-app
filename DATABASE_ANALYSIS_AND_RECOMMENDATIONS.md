# Database Analysis and Recommendations

## Current State Analysis

### Database Schema Strengths
✅ **UUID-based Organizations**: Proper primary keys with slug resolution  
✅ **Multi-organization Support**: Clean membership model  
✅ **Comprehensive Type System**: Well-defined TypeScript interfaces  
✅ **Service Layer Architecture**: Organized database operations  
✅ **Atomic Onboarding**: Edge function with validation  

### Critical Issues Identified

#### 1. **Missing RLS Policies** 🚨
- No evidence of Row-Level Security implementation
- Data isolation not enforced at database level
- Security relies entirely on application code

#### 2. **Index Optimization Gaps** ⚡
- Missing composite indexes for common queries
- No org_id indexes on organizational tables
- Performance issues likely at scale

#### 3. **Foreign Key Constraints** 🔗
- Unclear if proper FK constraints exist
- Referential integrity may not be enforced
- Orphaned records possible

#### 4. **Profile Table Design** 📊
- Legacy `organization` text field conflicts with new `org_id` UUID
- Dual organization references create confusion
- Migration path unclear

## Recommended Database Schema Fixes

### 1. Implement Comprehensive RLS Policies

```sql
-- Helper functions for RLS
CREATE OR REPLACE FUNCTION is_member_of(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = auth.uid() 
    AND org_id = org_uuid 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_officer_of(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = auth.uid() 
    AND org_id = org_uuid 
    AND is_active = true
    AND role IN ('officer', 'president', 'vice_president', 'admin')
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enable RLS on all organizational tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteer_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Example RLS policies
CREATE POLICY "Users can view events in their organizations"
ON events FOR SELECT
USING (is_member_of(org_id) OR is_public = true);

CREATE POLICY "Officers can manage events in their organizations"
ON events FOR ALL
USING (is_officer_of(org_id));
```

### 2. Add Strategic Indexes

```sql
-- Organization-scoped query indexes
CREATE INDEX idx_events_org_starts_at ON events(org_id, starts_at);
CREATE INDEX idx_volunteer_hours_org_member ON volunteer_hours(org_id, member_id);
CREATE INDEX idx_attendance_org_event ON attendance(org_id, event_id);
CREATE INDEX idx_memberships_user_org ON memberships(user_id, org_id);
CREATE INDEX idx_files_org_user ON files(org_id, user_id);

-- Performance indexes for common queries
CREATE INDEX idx_events_public_upcoming ON events(is_public, starts_at) WHERE is_public = true;
CREATE INDEX idx_volunteer_hours_status ON volunteer_hours(org_id, status);
CREATE INDEX idx_memberships_active_role ON memberships(org_id, is_active, role);
```

### 3. Enforce Foreign Key Constraints

```sql
-- Ensure all org_id columns have proper FK constraints
ALTER TABLE events ADD CONSTRAINT fk_events_org_id 
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE volunteer_hours ADD CONSTRAINT fk_volunteer_hours_org_id 
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE attendance ADD CONSTRAINT fk_attendance_org_id 
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Add member_id FK constraints
ALTER TABLE volunteer_hours ADD CONSTRAINT fk_volunteer_hours_member_id 
  FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE attendance ADD CONSTRAINT fk_attendance_member_id 
  FOREIGN KEY (member_id) REFERENCES profiles(id) ON DELETE CASCADE;
```

## Code Alignment Issues

### 1. **Profile Table Cleanup**
Your `Profile` interface has both `organization?: string` (legacy) and `org_id?: string` (new). This creates confusion:

```typescript
// Current - PROBLEMATIC
export interface Profile {
  organization?: string; // Legacy text field
  org_id?: string;      // New UUID field - conflicts
}

// Recommended - CLEAN
export interface Profile {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  // Remove legacy organization field
  // org_id should only be in memberships table
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}
```

### 2. **Type Safety Improvements**

```typescript
// Add strict UUID types
export type UUID = string;

export interface Organization {
  id: UUID;           // Make UUID explicit
  slug: string;
  name: string;
  // ... rest of fields
}

// Ensure all org_id fields are properly typed
export interface Event {
  id: UUID;
  org_id: UUID;       // Required, not optional
  // ... rest of fields
}
```

### 3. **Service Layer Enhancements**

Your DatabaseService is well-structured but missing some key patterns:

```typescript
// Add RLS-aware query helpers
static async queryWithOrgAccess<T>(
  tableName: string,
  orgId: string,
  userId: string
): Promise<DatabaseQueryResult<T>> {
  // Verify user has access to org before querying
  const hasAccess = await OrganizationService.isUserMemberOf(userId, orgId);
  if (!hasAccess) {
    return { data: null, error: new Error('Access denied') };
  }
  
  // Proceed with org-scoped query
  return this.createOrgQuery<T>(tableName, orgId).getAll();
}
```

## Migration Strategy

### Phase 1: Database Schema Updates
1. Add missing indexes
2. Implement RLS policies
3. Add foreign key constraints
4. Clean up profile table

### Phase 2: Code Alignment
1. Update TypeScript types
2. Remove legacy organization references
3. Add RLS-aware query methods
4. Update service layer

### Phase 3: Testing & Validation
1. Test data isolation
2. Verify performance improvements
3. Validate security policies
4. Load test with realistic data

## Immediate Action Items

1. **Create RLS policies** - Critical security gap
2. **Add performance indexes** - Will improve query speed
3. **Clean up Profile interface** - Remove conflicting fields
4. **Add FK constraints** - Ensure data integrity
5. **Test multi-org isolation** - Verify security works

Would you like me to implement any of these fixes immediately?