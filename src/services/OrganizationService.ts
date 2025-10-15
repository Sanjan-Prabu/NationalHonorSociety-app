// Organization service for handling UUID-based organization operations
// Implements slug-to-UUID resolution and organization membership management

import { supabase } from '../lib/supabaseClient';
import { 
  Organization, 
  Membership, 
  UserMembership, 
  OrganizationResolution,
  DatabaseSingleResult,
  DatabaseQueryResult,
  DATABASE_TABLES,
  MembershipValidationResult
} from '../types/database';

/**
 * Organization Service
 * Handles organization-related database operations with UUID support
 */
export class OrganizationService {
  /**
   * Resolve organization slug to UUID with caching
   * @param slug - Human-friendly organization identifier (e.g., 'nhs', 'nhsa')
   * @returns Organization resolution result with UUID
   */
  static async resolveOrganizationSlug(slug: string): Promise<OrganizationResolution | null> {
    try {
      // Normalize slug
      const normalizedSlug = slug.toLowerCase().trim();

      const { data, error } = await supabase
        .from(DATABASE_TABLES.ORGANIZATIONS)
        .select('id, slug, name')
        .eq('slug', normalizedSlug)
        .single();

      if (error) {
        console.error('Error resolving organization slug:', error);
        return null;
      }

      return {
        id: data.id,
        slug: data.slug,
        name: data.name,
        exists: true,
      };
    } catch (error) {
      console.error('Unexpected error resolving organization slug:', error);
      return null;
    }
  }

  /**
   * Batch resolve multiple organization slugs
   * @param slugs - Array of organization slugs
   * @returns Map of slug to organization resolution
   */
  static async batchResolveOrganizationSlugs(
    slugs: string[]
  ): Promise<Map<string, OrganizationResolution>> {
    const resolutionMap = new Map<string, OrganizationResolution>();

    try {
      const normalizedSlugs = slugs.map(s => s.toLowerCase().trim());

      const { data, error } = await supabase
        .from(DATABASE_TABLES.ORGANIZATIONS)
        .select('id, slug, name')
        .in('slug', normalizedSlugs);

      if (error) {
        console.error('Error batch resolving organization slugs:', error);
        return resolutionMap;
      }

      data?.forEach(org => {
        resolutionMap.set(org.slug, {
          id: org.id,
          slug: org.slug,
          name: org.name,
          exists: true,
        });
      });

      return resolutionMap;
    } catch (error) {
      console.error('Unexpected error in batch resolution:', error);
      return resolutionMap;
    }
  }

  /**
   * Get organization by UUID
   * @param orgId - Organization UUID
   * @returns Organization data
   */
  static async getOrganizationById(orgId: string): Promise<DatabaseSingleResult<Organization>> {
    try {
      const { data, error } = await supabase
        .from(DATABASE_TABLES.ORGANIZATIONS)
        .select('*')
        .eq('id', orgId)
        .single();

      return { data, error };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get all organizations
   * @returns List of all organizations
   */
  static async getAllOrganizations(): Promise<DatabaseQueryResult<Organization>> {
    try {
      const { data, error, count } = await supabase
        .from(DATABASE_TABLES.ORGANIZATIONS)
        .select('*', { count: 'exact' })
        .order('name');

      return { data, error, count: count || 0 };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get user memberships with organization details
   * @param userId - User UUID
   * @param includeInactive - Whether to include inactive memberships
   * @returns User's organization memberships
   */
  static async getUserMemberships(
    userId: string,
    includeInactive: boolean = false
  ): Promise<UserMembership[]> {
    try {
      let query = supabase
        .from(DATABASE_TABLES.MEMBERSHIPS)
        .select(`
          org_id,
          role,
          is_active,
          joined_at,
          organizations!inner (
            id,
            slug,
            name
          )
        `)
        .eq('user_id', userId);

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      query = query.order('joined_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching user memberships:', error);
        return [];
      }

      // Transform the joined data into UserMembership format
      return (data || []).map((membership: any) => ({
        org_id: membership.org_id,
        org_slug: membership.organizations.slug,
        org_name: membership.organizations.name,
        role: membership.role,
        is_active: membership.is_active,
        joined_at: membership.joined_at,
      }));
    } catch (error) {
      console.error('Unexpected error fetching user memberships:', error);
      return [];
    }
  }

  /**
   * Switch active organization for a user
   * This method updates the user's default organization in their profile
   * @param userId - User UUID
   * @param orgId - Organization UUID to switch to
   * @returns Success status
   */
  static async switchActiveOrganization(
    userId: string,
    orgId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First verify the user is a member of the target organization
      const isMember = await this.isUserMemberOf(userId, orgId);
      if (!isMember) {
        return {
          success: false,
          error: 'User is not a member of the target organization',
        };
      }

      // Update the user's default organization in their profile
      const { error } = await supabase
        .from(DATABASE_TABLES.PROFILES)
        .update({ org_id: orgId })
        .eq('id', userId);

      if (error) {
        console.error('Error switching active organization:', error);
        return {
          success: false,
          error: 'Failed to update user profile',
        };
      }

      console.log(`✅ Switched active organization for user ${userId} to ${orgId}`);
      return { success: true };
    } catch (error) {
      console.error('Unexpected error switching organization:', error);
      return {
        success: false,
        error: 'Unexpected error during organization switch',
      };
    }
  }

  /**
   * Get user's active organization
   * @param userId - User UUID
   * @returns Active organization details or null
   */
  static async getActiveOrganization(userId: string): Promise<UserMembership | null> {
    try {
      // Get the user's profile to find their default org_id
      const { data: profile, error: profileError } = await supabase
        .from(DATABASE_TABLES.PROFILES)
        .select('org_id')
        .eq('id', userId)
        .single();

      if (profileError || !profile?.org_id) {
        // If no default org_id, get the first active membership
        const memberships = await this.getUserMemberships(userId);
        return memberships[0] || null;
      }

      // Get the membership details for the active organization
      const { data, error } = await supabase
        .from(DATABASE_TABLES.MEMBERSHIPS)
        .select(`
          org_id,
          role,
          is_active,
          joined_at,
          organizations!inner (
            id,
            slug,
            name
          )
        `)
        .eq('user_id', userId)
        .eq('org_id', profile.org_id)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        // Fallback to first active membership
        const memberships = await this.getUserMemberships(userId);
        return memberships[0] || null;
      }

      return {
        org_id: (data as any).org_id,
        org_slug: (data as any).organizations.slug,
        org_name: (data as any).organizations.name,
        role: (data as any).role,
        is_active: (data as any).is_active,
        joined_at: (data as any).joined_at,
      };
    } catch (error) {
      console.error('Unexpected error getting active organization:', error);
      return null;
    }
  }

  /**
   * Check if user is member of organization
   * @param userId - User UUID
   * @param orgId - Organization UUID
   * @returns Whether user is an active member
   */
  static async isUserMemberOf(userId: string, orgId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(DATABASE_TABLES.MEMBERSHIPS)
        .select('id')
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error checking membership:', error);
      return false;
    }
  }

  /**
   * Check if user is officer of organization
   * @param userId - User UUID
   * @param orgId - Organization UUID
   * @returns Whether user is an active officer
   */
  static async isUserOfficerOf(userId: string, orgId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(DATABASE_TABLES.MEMBERSHIPS)
        .select('id')
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .in('role', ['officer', 'president', 'vice_president', 'admin'])
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error checking officer status:', error);
      return false;
    }
  }

  /**
   * Create new membership with validation (atomic onboarding)
   * @param userId - User UUID
   * @param orgSlug - Organization slug
   * @param role - User role in organization
   * @param email - User email for validation
   * @param studentId - Student ID for validation
   * @returns Created membership with validation results
   */
  static async createMembership(
    userId: string, 
    orgSlug: string, 
    role: string = 'member',
    email?: string,
    studentId?: string
  ): Promise<DatabaseSingleResult<Membership> & { validationResult?: MembershipValidationResult }> {
    try {
      // First resolve organization slug to UUID
      const orgResolution = await this.resolveOrganizationSlug(orgSlug);
      if (!orgResolution) {
        return { 
          data: null, 
          error: new Error(`Organization '${orgSlug}' not found`) 
        };
      }

      // If email and studentId are provided, perform validation
      if (email && studentId) {
        const validationResult = await this.validateMembership(email, studentId, orgResolution.id, role);
        if (!validationResult.valid) {
          return {
            data: null,
            error: new Error(validationResult.error || 'Membership validation failed'),
            validationResult,
          };
        }
      }

      // Check if membership already exists for this user in this organization
      const existingMembership = await this.isUserMemberOf(userId, orgResolution.id);
      if (existingMembership) {
        return { 
          data: null, 
          error: new Error(`User is already a member of ${orgSlug}`) 
        };
      }

      // Create new membership
      const { data, error } = await supabase
        .from(DATABASE_TABLES.MEMBERSHIPS)
        .insert({
          user_id: userId,
          org_id: orgResolution.id,
          role: role,
          is_active: true,
          joined_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating membership:', error);
        return { data: null, error };
      }

      console.log(`✅ Created membership for user ${userId} in ${orgSlug} with role ${role}`);
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error creating membership:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update user's role in organization
   * @param userId - User UUID
   * @param orgId - Organization UUID
   * @param newRole - New role to assign
   * @returns Updated membership
   */
  static async updateMembershipRole(
    userId: string, 
    orgId: string, 
    newRole: string
  ): Promise<DatabaseSingleResult<Membership>> {
    try {
      const { data, error } = await supabase
        .from(DATABASE_TABLES.MEMBERSHIPS)
        .update({ role: newRole })
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .eq('is_active', true)
        .select()
        .single();

      if (error) {
        console.error('Error updating membership role:', error);
        return { data: null, error };
      }

      console.log(`✅ Updated role for user ${userId} in org ${orgId} to ${newRole}`);
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error updating membership role:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Deactivate membership (soft delete)
   * @param userId - User UUID
   * @param orgId - Organization UUID
   * @returns Updated membership
   */
  static async deactivateMembership(
    userId: string, 
    orgId: string
  ): Promise<DatabaseSingleResult<Membership>> {
    try {
      const { data, error } = await supabase
        .from(DATABASE_TABLES.MEMBERSHIPS)
        .update({ 
          is_active: false
        })
        .eq('user_id', userId)
        .eq('org_id', orgId)
        .select()
        .single();

      if (error) {
        console.error('Error deactivating membership:', error);
        return { data: null, error };
      }

      console.log(`✅ Deactivated membership for user ${userId} in org ${orgId}`);
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error deactivating membership:', error);
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get organization statistics
   * @param orgId - Organization UUID
   * @returns Organization statistics
   */
  static async getOrganizationStats(orgId: string): Promise<{
    memberCount: number;
    officerCount: number;
    activeEventsCount: number;
    pendingVolunteerHours: number;
    error?: string;
  }> {
    try {
      // Get member counts
      const { data: memberships, error: memberError } = await supabase
        .from(DATABASE_TABLES.MEMBERSHIPS)
        .select('role')
        .eq('org_id', orgId)
        .eq('is_active', true);

      if (memberError) {
        throw memberError;
      }

      const memberCount = memberships?.length || 0;
      const officerCount = memberships?.filter(m => 
        ['officer', 'president', 'vice_president', 'admin'].includes(m.role)
      ).length || 0;

      // Get active events count
      const { count: eventsCount, error: eventsError } = await supabase
        .from(DATABASE_TABLES.EVENTS)
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('ends_at', new Date().toISOString());

      if (eventsError) {
        throw eventsError;
      }

      // Get pending volunteer hours count
      const { count: pendingHours, error: hoursError } = await supabase
        .from(DATABASE_TABLES.VOLUNTEER_HOURS)
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'pending');

      if (hoursError) {
        throw hoursError;
      }

      return {
        memberCount,
        officerCount,
        activeEventsCount: eventsCount || 0,
        pendingVolunteerHours: pendingHours || 0,
      };
    } catch (error) {
      console.error('Error fetching organization stats:', error);
      return {
        memberCount: 0,
        officerCount: 0,
        activeEventsCount: 0,
        pendingVolunteerHours: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch stats',
      };
    }
  }

  /**
   * Legacy support: Convert organization slug to UUID for existing queries
   * This function provides backward compatibility during migration
   * @param orgSlug - Legacy organization slug
   * @returns Organization UUID or null if not found
   */
  static async legacySlugToUuid(orgSlug: string): Promise<string | null> {
    const resolution = await this.resolveOrganizationSlug(orgSlug);
    return resolution?.id || null;
  }

  /**
   * Legacy support: Convert organization UUID to slug for display
   * @param orgId - Organization UUID
   * @returns Organization slug or null if not found
   */
  static async legacyUuidToSlug(orgId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from(DATABASE_TABLES.ORGANIZATIONS)
        .select('slug')
        .eq('id', orgId)
        .single();

      if (error || !data) {
        return null;
      }

      return data.slug;
    } catch (error) {
      console.error('Error converting UUID to slug:', error);
      return null;
    }
  }

  /**
   * Atomic onboarding using Edge Function for secure user creation
   * @param userId - User UUID from auth
   * @param orgSlug - Organization slug
   * @param role - User role in organization
   * @param studentId - Student ID
   * @param email - User email
   * @param firstName - Optional first name
   * @param lastName - Optional last name
   * @returns Onboarding result with profile and membership data
   */
  static async onboardUserAtomic(
    userId: string,
    orgSlug: string,
    role: string,
    studentId: string,
    email: string,
    firstName?: string,
    lastName?: string
  ): Promise<{
    success: boolean;
    profile?: any;
    membership?: any;
    error?: string;
    errorType?: string;
    details?: Record<string, any>;
  }> {
    try {
      console.log(`🚀 Starting atomic onboarding for user ${userId} in ${orgSlug}`);

      const { data, error } = await supabase.functions.invoke('onboard-user-atomic', {
        body: {
          user_id: userId,
          org_slug: orgSlug,
          role: role,
          student_id: studentId,
          email: email,
          first_name: firstName,
          last_name: lastName,
        },
      });

      if (error) {
        console.error('Error calling onboard-user-atomic Edge Function:', error);
        return {
          success: false,
          error: 'Failed to call onboarding service',
          errorType: 'DUPLICATE_MEMBERSHIP',
        };
      }

      if (!data.success) {
        console.error('Onboarding failed:', data);
        return {
          success: false,
          error: data.error || 'Onboarding failed',
          errorType: data.errorType || 'DUPLICATE_MEMBERSHIP',
          details: data.details,
        };
      }

      console.log(`✅ Atomic onboarding completed successfully for user ${userId}`);
      return {
        success: true,
        profile: data.profile,
        membership: data.membership,
        details: data.details,
      };
    } catch (error) {
      console.error('Exception during atomic onboarding:', error);
      return {
        success: false,
        error: 'Unexpected error during onboarding',
        errorType: 'DUPLICATE_MEMBERSHIP',
      };
    }
  }

  /**
   * Check existing memberships for a user by email or student ID
   * @param email - User email
   * @param studentId - Student ID
   * @returns Array of existing memberships
   */
  static async checkExistingMemberships(
    email: string,
    studentId: string
  ): Promise<{ memberships: UserMembership[]; error?: string }> {
    try {
      // Query profiles first to get user IDs that match email or student_id
      const { data: profiles, error: profileError } = await supabase
        .from(DATABASE_TABLES.PROFILES)
        .select('id, email, student_id')
        .or(`email.eq.${email},student_id.eq.${studentId}`);

      if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return { memberships: [], error: 'Failed to check existing profiles' };
      }

      if (!profiles || profiles.length === 0) {
        return { memberships: [] };
      }

      // Get all user IDs that match
      const userIds = profiles.map(p => p.id);

      // Get memberships for all matching user IDs
      const { data: membershipData, error: membershipError } = await supabase
        .from(DATABASE_TABLES.MEMBERSHIPS)
        .select(`
          org_id,
          role,
          is_active,
          joined_at,
          user_id,
          organizations!inner (
            id,
            slug,
            name
          )
        `)
        .in('user_id', userIds)
        .eq('is_active', true);

      if (membershipError) {
        console.error('Error fetching memberships:', membershipError);
        return { memberships: [], error: 'Failed to check existing memberships' };
      }

      const memberships = (membershipData || []).map((membership: any) => ({
        org_id: membership.org_id,
        org_slug: membership.organizations.slug,
        org_name: membership.organizations.name,
        role: membership.role,
        is_active: membership.is_active,
        joined_at: membership.joined_at,
      }));

      return { memberships };
    } catch (error) {
      console.error('Unexpected error checking existing memberships:', error);
      return { memberships: [], error: 'Unexpected error during membership check' };
    }
  }

  /**
   * Validate membership creation for multi-organization rules
   * @param email - User email
   * @param studentId - Student ID
   * @param orgId - Target organization UUID
   * @param role - Requested role
   * @returns Validation result with detailed error messages
   */
  static async validateMembership(
    email: string,
    studentId: string,
    orgId: string,
    role: string
  ): Promise<{
    valid: boolean;
    error?: string;
    errorType?: 'DUPLICATE_MEMBERSHIP' | 'INVALID_ROLE_COMBINATION' | 'ORGANIZATION_MISMATCH';
    existingMemberships?: UserMembership[];
    details?: Record<string, any>;
  }> {
    try {
      // Input validation
      if (!email || !studentId || !orgId || !role) {
        return {
          valid: false,
          error: 'Missing required fields: email, studentId, orgId, and role are required',
          errorType: 'INVALID_ROLE_COMBINATION',
        };
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          valid: false,
          error: 'Invalid email format',
          errorType: 'INVALID_ROLE_COMBINATION',
        };
      }

      // Validate role
      const validRoles = ['member', 'officer', 'president', 'vice_president', 'admin'];
      if (!validRoles.includes(role)) {
        return {
          valid: false,
          error: `Invalid role: ${role}. Must be one of: ${validRoles.join(', ')}`,
          errorType: 'INVALID_ROLE_COMBINATION',
        };
      }

      // Check if target organization exists
      const { data: targetOrg, error: orgError } = await supabase
        .from(DATABASE_TABLES.ORGANIZATIONS)
        .select('id, name, slug')
        .eq('id', orgId)
        .single();

      if (orgError || !targetOrg) {
        return {
          valid: false,
          error: 'Target organization not found',
          errorType: 'ORGANIZATION_MISMATCH',
          details: { orgId },
        };
      }

      // Get existing memberships
      const { memberships: existingMemberships, error: membershipError } = 
        await this.checkExistingMemberships(email, studentId);

      if (membershipError) {
        return {
          valid: false,
          error: membershipError,
          errorType: 'DUPLICATE_MEMBERSHIP',
        };
      }

      // Check if user is already a member of this specific organization
      const existingInOrg = existingMemberships.find(m => m.org_id === orgId);
      if (existingInOrg) {
        return {
          valid: false,
          error: `User is already a ${existingInOrg.role} in ${targetOrg.name}`,
          errorType: 'DUPLICATE_MEMBERSHIP',
          existingMemberships,
          details: {
            existingRole: existingInOrg.role,
            organizationName: targetOrg.name,
          },
        };
      }

      // Enforce multi-organization membership rules
      if (role === 'member') {
        // Members can only belong to one organization at a time
        const existingMemberRole = existingMemberships.find(m => m.role === 'member');
        if (existingMemberRole) {
          return {
            valid: false,
            error: `User is already a member of ${existingMemberRole.org_name}. Members can only belong to one organization at a time.`,
            errorType: 'INVALID_ROLE_COMBINATION',
            existingMemberships,
            details: {
              conflictingOrganization: existingMemberRole.org_name,
              conflictingRole: existingMemberRole.role,
              rule: 'single_member_organization',
            },
          };
        }
      }

      // Officers can hold positions in multiple organizations (no restriction for officers)
      // This is explicitly allowed by the business rules

      // Additional validation: Check for grade-based organization restrictions
      // This would require additional profile data to determine if user is freshman (NHSA) or upperclassman (NHS)
      // For now, we'll allow the validation to pass and let the onboarding function handle grade-based restrictions

      return {
        valid: true,
        existingMemberships,
        details: {
          targetOrganization: targetOrg.name,
          requestedRole: role,
          existingMembershipCount: existingMemberships.length,
        },
      };
    } catch (error) {
      console.error('Unexpected error validating membership:', error);
      return {
        valid: false,
        error: 'Unexpected error during validation. Please try again.',
        errorType: 'DUPLICATE_MEMBERSHIP',
      };
    }
  }
}

/**
 * Utility functions for organization operations
 */
export const organizationUtils = {
  /**
   * Validate organization slug format
   * @param slug - Organization slug to validate
   * @returns Whether slug is valid
   */
  isValidSlug: (slug: string): boolean => {
    return /^[a-z0-9-]+$/.test(slug) && slug.length >= 2 && slug.length <= 50;
  },

  /**
   * Normalize organization slug
   * @param slug - Raw slug input
   * @returns Normalized slug
   */
  normalizeSlug: (slug: string): string => {
    return slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
  },

  /**
   * Get organization display name from slug
   * @param slug - Organization slug
   * @returns Human-readable display name
   */
  getDisplayName: (slug: string): string => {
    const displayNames: Record<string, string> = {
      'nhs': 'National Honor Society',
      'nhsa': 'National Honor Society Associated',
    };
    return displayNames[slug.toLowerCase()] || slug.toUpperCase();
  },

  /**
   * Get organization primary color from slug
   * @param slug - Organization slug
   * @returns Primary color hex code
   */
  getPrimaryColor: (slug: string): string => {
    const colors: Record<string, string> = {
      'nhs': '#2B5CE6',
      'nhsa': '#805AD5',
    };
    return colors[slug.toLowerCase()] || '#6B7280';
  },
};

export default OrganizationService;