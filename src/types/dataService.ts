/**
 * Enhanced TypeScript interfaces for dynamic data integration
 * These interfaces extend the base database types with additional properties
 * needed for the data service layer and React Query integration
 */

import { UUID, Organization, Profile, Event, VolunteerHours, Attendance, MembershipRole } from './database';

// =============================================================================
// ENHANCED CORE INTERFACES
// =============================================================================

/**
 * Enhanced UserProfile interface for data services
 * Combines Profile with membership information for easier access
 */
export interface UserProfile {
  id: UUID;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string; // Computed field
  phone_number?: string;
  student_id?: string;
  grade?: string;
  is_verified: boolean;
  username?: string;
  display_name?: string;
  role: MembershipRole; // Current role in active organization
  org_id: UUID; // Current organization ID
  organization: Organization; // Populated organization data
  created_at: string;
  updated_at: string;
}

/**
 * Enhanced Event interface with additional computed fields
 */
export interface EventData {
  id: UUID;
  org_id: UUID;
  title: string;
  description?: string;
  location?: string;
  starts_at?: string;
  ends_at?: string;
  flyer_file_id?: UUID;
  is_public?: boolean;
  created_by?: UUID;
  created_at?: string;
  updated_at?: string;
  // Computed fields
  creator_name?: string;
  attendee_count?: number;
  user_attendance_status?: 'attending' | 'not_attending' | 'unknown';
  volunteer_hours?: number;
}

/**
 * Enhanced VolunteerHour interface with approval workflow data
 */
export interface VolunteerHourData {
  id: UUID;
  member_id: UUID;
  org_id: UUID;
  hours: number;
  description?: string;
  activity_date?: string;
  submitted_at: string;
  approved: boolean;
  approved_by?: UUID;
  approved_at?: string;
  attachment_file_id?: UUID;
  // Computed fields
  member_name?: string;
  approver_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  can_edit?: boolean;
}

/**
 * Enhanced AttendanceRecord interface with event details
 */
export interface AttendanceRecord {
  id: UUID;
  event_id: UUID;
  member_id: UUID;
  org_id?: UUID;
  checkin_time?: string;
  method: string;
  recorded_by?: UUID;
  status?: string;
  note?: string;
  // Computed fields
  event_title?: string;
  event_date?: string;
  member_name?: string;
  recorded_by_name?: string;
}

// =============================================================================
// REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Request types for creating new records
 */
export interface CreateEventRequest {
  title: string;
  description?: string;
  location?: string;
  starts_at?: string;
  ends_at?: string;
  is_public?: boolean;
  volunteer_hours?: number;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  location?: string;
  starts_at?: string;
  ends_at?: string;
  is_public?: boolean;
  volunteer_hours?: number;
}

export interface CreateVolunteerHourRequest {
  hours: number;
  description?: string;
  activity_date?: string;
  event_id?: UUID;
}

export interface UpdateVolunteerHourRequest {
  hours?: number;
  description?: string;
  activity_date?: string;
}

export interface CreateAttendanceRequest {
  event_id: UUID;
  member_id?: UUID; // Optional if marking for self
  method?: string;
  note?: string;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  student_id?: string;
  grade?: string;
  display_name?: string;
}

/**
 * Response types for API operations
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  nextCursor?: string;
}

// =============================================================================
// QUERY FILTER TYPES
// =============================================================================

export interface EventFilters {
  startDate?: string;
  endDate?: string;
  isPublic?: boolean;
  createdBy?: UUID;
  hasVolunteerHours?: boolean;
}

export interface VolunteerHourFilters {
  startDate?: string;
  endDate?: string;
  approved?: boolean;
  memberId?: UUID;
  minHours?: number;
  maxHours?: number;
}

export interface AttendanceFilters {
  startDate?: string;
  endDate?: string;
  eventId?: UUID;
  memberId?: UUID;
  status?: string;
}

export interface ProfileFilters {
  role?: MembershipRole;
  isVerified?: boolean;
  grade?: string;
  searchTerm?: string;
}

// =============================================================================
// DASHBOARD AND STATISTICS TYPES
// =============================================================================

export interface DashboardStats {
  totalMembers: number;
  totalOfficers: number;
  upcomingEvents: number;
  pendingVolunteerHours: number;
  totalVolunteerHours: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: UUID;
  type: 'event_created' | 'volunteer_hours_submitted' | 'attendance_marked' | 'member_joined';
  title: string;
  description: string;
  timestamp: string;
  user_name?: string;
  metadata?: Record<string, any>;
}

export interface MemberStats {
  totalVolunteerHours: number;
  approvedVolunteerHours: number;
  pendingVolunteerHours: number;
  eventsAttended: number;
  upcomingEvents: number;
  memberSince: string;
}

// =============================================================================
// TYPE GUARDS FOR RUNTIME VALIDATION
// =============================================================================

export function isUserProfile(obj: any): obj is UserProfile {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.role === 'string' &&
    typeof obj.org_id === 'string' &&
    typeof obj.is_verified === 'boolean' &&
    ['member', 'officer'].includes(obj.role)
  );
}

export function isEventData(obj: any): obj is EventData {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.org_id === 'string' &&
    typeof obj.title === 'string'
  );
}

export function isVolunteerHourData(obj: any): obj is VolunteerHourData {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.member_id === 'string' &&
    typeof obj.org_id === 'string' &&
    typeof obj.hours === 'number' &&
    typeof obj.approved === 'boolean'
  );
}

export function isAttendanceRecord(obj: any): obj is AttendanceRecord {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.event_id === 'string' &&
    typeof obj.member_id === 'string' &&
    typeof obj.method === 'string'
  );
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface DataServiceError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
}

export type DataServiceErrorType = 
  | 'NETWORK_ERROR'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE_ENTRY'
  | 'DATABASE_ERROR'
  | 'UNKNOWN_ERROR';

// =============================================================================
// LOADING STATE TYPES
// =============================================================================

export interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  error?: DataServiceError;
  isRefetching?: boolean;
  isFetching?: boolean;
}

export interface MutationState<T = any> {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error?: DataServiceError;
  data?: T;
}

// =============================================================================
// SUBSCRIPTION TYPES
// =============================================================================

export interface SubscriptionConfig {
  table: string;
  filter?: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
}

export interface SubscriptionCallback<T> {
  (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: T | null;
    old: T | null;
  }): void;
}