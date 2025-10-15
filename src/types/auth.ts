import { Session, User } from '@supabase/supabase-js';
import { Profile as DatabaseProfile, UserMembership, MembershipRole } from './database';

// Legacy Profile interface for backward compatibility
export interface LegacyProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'member' | 'officer';
  pending_officer?: boolean;
  organization: string;
  grade?: string;
  phone_number?: string;
  student_id?: string;
}

// Enhanced Profile interface using new database schema
export interface Profile extends DatabaseProfile {
  // Additional computed fields for UI
  full_name?: string;
  display_name?: string;
  // Legacy fields for backward compatibility
  organization?: string; // Will be derived from default org_id
  role?: MembershipRole; // Will be derived from default membership
}

// Enhanced user context with organization membership
export interface AuthenticatedUser {
  user: User;
  profile: Profile;
  memberships: UserMembership[];
  currentMembership?: UserMembership;
}

export interface EnhancedSession extends Session {
  stored_at: number; // Timestamp when stored
  last_refreshed?: number; // Last refresh timestamp
}

export enum AuthErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  REFRESH_FAILED = 'REFRESH_FAILED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  PROFILE_FETCH_ERROR = 'PROFILE_FETCH_ERROR'
}

export class AuthError extends Error {
  public type: AuthErrorType;
  public originalError?: any;

  constructor(options: { type: AuthErrorType; message: string; originalError?: any }) {
    super(options.message);
    this.name = 'AuthError';
    this.type = options.type;
    this.originalError = options.originalError;
  }
}

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  SESSION_DATA: 'auth_session_data',
  USER_PROFILE: 'user_profile',
  LAST_REFRESH: 'last_token_refresh'
} as const;