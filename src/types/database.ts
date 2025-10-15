// Database types for multi-organization schema
// Based on the multi-org-database-security design document

/**
 * UUID type for better type safety
 */
export type UUID = string;

/**
 * Core Organization Model
 * Primary entity for managing multiple organizations (NHS, NHSA, etc.)
 */
export interface Organization {
  id: UUID;             // UUID primary key
  slug: string;         // Human-friendly identifier (nhs, nhsa)
  name: string;         // Display name
  description?: string; // Optional description
  settings: {           // Organization-specific configuration
    features: string[];
    branding: {
      primaryColor: string;
      logoUrl?: string;
    };
  };
  created_at: string;
  updated_at: string;
}

/**
 * Membership Model
 * Central authority for user roles and organization membership
 */
export interface Membership {
  id: UUID;
  user_id: UUID;        // References profiles.id
  org_id: UUID;         // References organizations.id
  role: MembershipRole;
  is_active: boolean;
  joined_at: string;
  left_at?: string;
}

/**
 * Enhanced Profile Model
 * Updated to support multi-organization membership
 * Organization membership is now handled through the memberships table
 */
export interface Profile {
  id: UUID;             // References auth.users.id
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  student_id?: string;
  grade?: string;
  verification_code?: string;
  is_verified: boolean;
  username?: string;
  display_name?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Event Model
 * Organization-scoped events with public visibility controls
 */
export interface Event {
  id: UUID;
  org_id: UUID;         // Required organization scope
  title: string;
  description?: string;
  location?: string;
  starts_at?: string;   // Nullable in DB
  ends_at?: string;     // Nullable in DB
  flyer_file_id?: UUID; // File attachment for flyer
  is_public?: boolean;  // Controls cross-org visibility (default true)
  created_by?: UUID;    // User ID who created the event (nullable)
  created_at?: string;
  updated_at?: string;
}

/**
 * Attendance Model
 * Tracks event attendance with organization scoping
 */
export interface Attendance {
  id: UUID;
  event_id: UUID;       // References events.id
  member_id: UUID;      // References profiles.id
  org_id?: UUID;        // Organization scope (nullable in DB)
  checkin_time?: string; // Actual field name in DB
  method: string;       // Check-in method
  recorded_by?: UUID;   // Who recorded the attendance
  status?: string;      // Status field (text, not enum)
  note?: string;        // Optional note
}

/**
 * Volunteer Hours Model
 * Organization-scoped volunteer hour tracking
 */
export interface VolunteerHours {
  id: UUID;
  member_id: UUID;      // References profiles.id
  org_id: UUID;         // Organization scope
  hours: number;        // Decimal hours (numeric in DB)
  description?: string; // Optional in actual DB
  activity_date?: string; // Date field in DB
  submitted_at: string;
  approved: boolean;    // Boolean field in actual DB, not enum
  approved_by?: UUID;   // References profiles.id
  approved_at?: string;
  attachment_file_id?: UUID; // File attachment reference
}

/**
 * File Model
 * Secure file management with organization-level access controls
 */
export interface File {
  id: UUID;
  user_id: UUID;        // File owner (References profiles.id)
  org_id: UUID;         // Organization scope
  r2_key: string;       // R2 storage identifier
  file_name: string;
  content_type: string;
  file_size: number;
  is_public: boolean;   // Public access flag
  metadata?: {
    description?: string;
    tags?: string[];
  };
  created_at: string;
  updated_at: string;
}

/**
 * Verification Code Model
 * Organization-scoped verification codes for secure onboarding
 */
export interface VerificationCode {
  id: UUID;
  org_id: UUID;         // Organization scope
  code: string;         // The verification code
  code_type: VerificationCodeType;
  is_used: boolean;
  used_by?: UUID;       // References profiles.id
  used_at?: string;
  expires_at: string;
  created_by: UUID;     // Officer who created the code
  created_at: string;
}

/**
 * Contact Model
 * Organization-scoped contact information
 */
export interface Contact {
  id: UUID;
  org_id: UUID;         // Organization scope
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * BLE Badge Model
 * Organization-scoped BLE badge management
 */
export interface BLEBadge {
  id: UUID;
  org_id: UUID;         // Organization scope
  badge_id: string;     // Physical badge identifier
  assigned_to?: UUID;   // References profiles.id
  is_active: boolean;
  last_seen?: string;
  metadata?: {
    battery_level?: number;
    firmware_version?: string;
  };
  created_at: string;
  updated_at: string;
}

// Enum types for better type safety
export type MembershipRole = 'member' | 'officer'

export type UserRole = MembershipRole;

// Permission set for role-based access control
export interface PermissionSet {
  canViewEvents: boolean;
  canManageEvents: boolean;
  canViewVolunteerHours: boolean;
  canApproveVolunteerHours: boolean;
  canViewAttendance: boolean;
  canManageAttendance: boolean;
  canViewAnnouncements: boolean;
  canManageAnnouncements: boolean;
  canViewFiles: boolean;
  canManageFiles: boolean;
  canViewMembers: boolean;
  canManageMembers: boolean;
  canCreateVerificationCodes: boolean;
  canViewDashboard: boolean;
  canAccessOfficerFeatures: boolean;
}

export type EventCategory = 'volunteer' | 'meeting' | 'social' | 'fundraising' | 'academic';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

// Note: VolunteerHours uses boolean 'approved' field, not status enum
export type VolunteerHoursStatus = 'pending' | 'approved' | 'rejected' | 'needs_revision';

export type VerificationCodeType = 'signup' | 'officer_promotion' | 'event_access' | 'admin_access';

// Legacy organization type for backward compatibility
export type OrganizationType = 'NHS' | 'NHSA';

/**
 * Database query result types for Supabase integration
 */
export interface DatabaseQueryResult<T> {
  data: T[] | null;
  error: Error | null;
  count?: number | null;
}

export interface DatabaseSingleResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Organization resolution types for slug-to-UUID conversion
 */
export interface OrganizationResolution {
  id: UUID;             // Organization UUID
  slug: string;         // Human-friendly identifier
  name: string;
  exists: boolean;
}

/**
 * User membership information for authentication context
 */
export interface UserMembership {
  org_id: UUID;
  org_slug: string;
  org_name: string;
  role: MembershipRole;
  is_active: boolean;
  joined_at: string;
}

/**
 * Enhanced user context with multi-organization support
 */
export interface UserContext {
  profile: Profile;
  memberships: UserMembership[];
  defaultOrganization?: UserMembership;
  currentOrganization?: UserMembership;
}

/**
 * Membership validation result types
 */
export interface MembershipValidationResult {
  valid: boolean;
  error?: string;
  errorType?: 'DUPLICATE_MEMBERSHIP' | 'INVALID_ROLE_COMBINATION' | 'ORGANIZATION_MISMATCH';
  existingMemberships?: UserMembership[];
  details?: Record<string, any>;
}

/**
 * Onboarding request interface for Edge Functions
 */
export interface OnboardingRequest {
  user_id: UUID;
  org_slug: string;
  role: MembershipRole;
  student_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Onboarding response interface
 */
export interface OnboardingResponse {
  success: boolean;
  profile?: Profile;
  membership?: Membership;
  error?: string;
  errorType?: string;
  details?: Record<string, any>;
}

/**
 * Database table names for type-safe queries
 */
export const DATABASE_TABLES = {
  ORGANIZATIONS: 'organizations',
  PROFILES: 'profiles',
  MEMBERSHIPS: 'memberships',
  EVENTS: 'events',
  ATTENDANCE: 'attendance',
  VOLUNTEER_HOURS: 'volunteer_hours',
  FILES: 'files',
  VERIFICATION_CODES: 'verification_codes',
  CONTACTS: 'contacts',
  BLE_BADGES: 'ble_badges',
} as const;

export type DatabaseTable = typeof DATABASE_TABLES[keyof typeof DATABASE_TABLES];