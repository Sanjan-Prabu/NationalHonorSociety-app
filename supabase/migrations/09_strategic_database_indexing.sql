-- Strategic Database Indexing Migration
-- This migration creates performance-optimized indexes for multi-organization queries
-- Addresses Requirements: 6.1, 6.2, 6.3, 6.4, 6.5

-- =============================================================================
-- ORGANIZATION-SCOPED PERFORMANCE INDEXES (Task 6.1)
-- =============================================================================

-- Index for events table: (org_id, starts_at)
-- Optimizes queries for upcoming events within an organization
-- Common query pattern: SELECT * FROM events WHERE org_id = ? AND starts_at > NOW() ORDER BY starts_at
CREATE INDEX IF NOT EXISTS idx_events_org_starts_at 
ON events (org_id, starts_at);

-- Index for volunteer_hours table: (org_id, member_id)  
-- Optimizes queries for member volunteer hours within an organization
-- Common query pattern: SELECT * FROM volunteer_hours WHERE org_id = ? AND member_id = ?
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_org_member 
ON volunteer_hours (org_id, member_id);

-- Index for files table: (org_id, is_public)
-- Optimizes access control queries for file visibility within organizations
-- Common query pattern: SELECT * FROM files WHERE org_id = ? AND is_public = true
CREATE INDEX IF NOT EXISTS idx_files_org_public 
ON files (org_id, is_public);

-- =============================================================================
-- USER-CENTRIC LOOKUP INDEXES (Task 6.2)
-- =============================================================================

-- Index for memberships table: (user_id, org_id)
-- Optimizes role lookup queries and membership validation
-- Common query pattern: SELECT * FROM memberships WHERE user_id = ? AND org_id = ?
CREATE INDEX IF NOT EXISTS idx_memberships_user_org 
ON memberships (user_id, org_id);

-- Index for attendance table: (member_id, event_id)
-- Optimizes attendance lookup and event participation queries
-- Common query pattern: SELECT * FROM attendance WHERE member_id = ? AND event_id = ?
CREATE INDEX IF NOT EXISTS idx_attendance_member_event 
ON attendance (member_id, event_id);

-- =============================================================================
-- SINGLE-COLUMN INDEXES ON FREQUENTLY QUERIED FOREIGN KEYS
-- =============================================================================

-- Organization ID indexes for tables that don't already have composite indexes
CREATE INDEX IF NOT EXISTS idx_ble_badges_org_id ON ble_badges (org_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org_id ON contacts (org_id);

-- User/Member ID indexes for efficient user-scoped queries
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON profiles (org_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_hours_member_id ON volunteer_hours (member_id);
CREATE INDEX IF NOT EXISTS idx_attendance_event_id ON attendance (event_id);

-- =============================================================================
-- ADDITIONAL PERFORMANCE INDEXES
-- =============================================================================

-- Index for verification codes: org_id for organization-scoped queries
-- Optimizes verification code lookup within organizations
-- Common query pattern: SELECT * FROM verification_codes WHERE org_id = ?
CREATE INDEX IF NOT EXISTS idx_verification_codes_org_id 
ON verification_codes (org_id);

-- Index for events: (org_id, is_public) for public event queries
-- Optimizes cross-organization public event visibility
-- Common query pattern: SELECT * FROM events WHERE is_public = true OR (org_id = ? AND is_member_of(?))
CREATE INDEX IF NOT EXISTS idx_events_org_public 
ON events (org_id, is_public);

-- Index for memberships: (org_id, role, is_active) for role-based queries
-- Optimizes officer and role-based permission checks
-- Common query pattern: SELECT * FROM memberships WHERE org_id = ? AND role IN ('officer', 'admin') AND is_active = true
CREATE INDEX IF NOT EXISTS idx_memberships_org_role_active 
ON memberships (org_id, role, is_active);

-- =============================================================================
-- INDEX VERIFICATION AND DOCUMENTATION
-- =============================================================================

-- Create a view to document all indexes for operational monitoring
CREATE OR REPLACE VIEW public.organization_indexes AS
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Grant access to the indexes view
GRANT SELECT ON public.organization_indexes TO authenticated, service_role;

-- Add comments to document index purposes
COMMENT ON INDEX idx_events_org_starts_at IS 'Optimizes upcoming events queries within organizations';
COMMENT ON INDEX idx_volunteer_hours_org_member IS 'Optimizes member volunteer hours lookup within organizations';
COMMENT ON INDEX idx_files_org_public IS 'Optimizes file access control queries';
COMMENT ON INDEX idx_memberships_user_org IS 'Optimizes user membership and role validation';
COMMENT ON INDEX idx_attendance_member_event IS 'Optimizes attendance tracking and event participation';
COMMENT ON INDEX idx_verification_codes_org_id IS 'Optimizes verification code lookup within organizations';
COMMENT ON INDEX idx_events_org_public IS 'Optimizes public event visibility across organizations';
COMMENT ON INDEX idx_memberships_org_role_active IS 'Optimizes role-based permission checks';

-- Log successful index creation
DO $$ 
BEGIN 
    RAISE NOTICE 'Strategic database indexing migration completed successfully';
    RAISE NOTICE 'Created % organization-scoped indexes', 3;
    RAISE NOTICE 'Created % user-centric indexes', 2;
    RAISE NOTICE 'Created % additional performance indexes', 6;
END $$;