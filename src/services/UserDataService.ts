/**
 * UserDataService - Handles user profile and authentication data operations
 * Implements profile fetching, validation, and role-based access control
 */

import { BaseDataService } from './BaseDataService';
import { supabase } from '../lib/supabaseClient';
import { 
  UserProfile, 
  UpdateProfileRequest, 
  ApiResponse,
  isUserProfile 
} from '../types/dataService';
import { 
  Profile, 
  UserMembership, 
  MembershipRole, 
  UUID,
  DATABASE_TABLES 
} from '../types/database';
import { OrganizationService } from './OrganizationService';

export class UserDataService extends BaseDataService {
  constructor() {
    super('UserDataService');
  }

  /**
   * Gets the current user's profile with organization and role information
   * Requirements: 1.1, 1.2, 1.4
   */
  async getCurrentUserProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const userId = await this.getCurrentUserId();
      
      return await this.executeQuery(
        this.buildUserProfileQuery(userId),
        'getCurrentUserProfile'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get current user profile', { error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Gets a user profile by ID with proper organization context
   * Requirements: 1.1, 1.2
   */
  async getUserProfile(userId: UUID): Promise<ApiResponse<UserProfile>> {
    try {
      return await this.executeQuery(
        this.buildUserProfileQuery(userId),
        'getUserProfile'
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get user profile', { userId, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Updates the current user's profile with optimistic updates support
   * Requirements: 1.1, 1.2
   */
  async updateUserProfile(updates: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Validate and sanitize input
      this.validateProfileUpdate(updates);
      const sanitizedUpdates = this.sanitizeInput(updates);

      // Add updated timestamp
      const profileUpdates = {
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      };

      const result = await this.executeMutation(
        supabase
          .from(DATABASE_TABLES.PROFILES)
          .update(profileUpdates)
          .eq('id', userId)
          .select()
          .single(),
        'updateUserProfile'
      );

      if (result.success && result.data) {
        // Fetch the complete profile with organization data
        return await this.getUserProfile(userId);
      }

      return {
        data: null,
        error: result.error || 'Failed to update profile',
        success: false,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to update user profile', { updates, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Validates user role and permissions for the current organization
   * Requirements: 1.2, 1.4
   */
  async validateUserRole(userId?: UUID): Promise<ApiResponse<{ role: MembershipRole; orgId: UUID; isValid: boolean }>> {
    try {
      const targetUserId = userId || await this.getCurrentUserId();
      
      // Get user's memberships
      const memberships = await OrganizationService.getUserMemberships(targetUserId);
      
      if (memberships.length === 0) {
        return {
          data: null,
          error: 'User has no organization memberships',
          success: false,
        };
      }

      // For now, use the first active membership as the current role
      // TODO: Implement organization context selection
      const currentMembership = memberships.find(m => m.is_active) || memberships[0];
      
      const roleValidation = {
        role: currentMembership.role,
        orgId: currentMembership.org_id,
        isValid: currentMembership.is_active,
      };

      this.log('info', 'User role validated', { 
        userId: targetUserId, 
        role: roleValidation.role,
        orgId: roleValidation.orgId,
        isValid: roleValidation.isValid 
      });

      return {
        data: roleValidation,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to validate user role', { userId, error: errorMessage });
      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Checks if user has specific role in any organization
   * Requirements: 1.4, 5.2
   */
  async hasRole(role: MembershipRole, userId?: UUID): Promise<ApiResponse<boolean>> {
    try {
      const targetUserId = userId || await this.getCurrentUserId();
      const memberships = await OrganizationService.getUserMemberships(targetUserId);
      
      const hasRole = memberships.some(membership => 
        membership.role === role && membership.is_active
      );

      return {
        data: hasRole,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to check user role', { role, userId, error: errorMessage });
      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }

  /**
   * Checks if user has officer permissions in current organization
   * Requirements: 1.4, 5.2
   */
  async isOfficer(userId?: UUID): Promise<ApiResponse<boolean>> {
    return await this.hasRole('officer', userId);
  }

  /**
   * Gets user's memberships across all organizations
   * Requirements: 1.1, 5.1
   */
  async getUserMemberships(userId?: UUID): Promise<ApiResponse<UserMembership[]>> {
    try {
      const targetUserId = userId || await this.getCurrentUserId();
      const memberships = await OrganizationService.getUserMemberships(targetUserId);
      
      return {
        data: memberships,
        error: null,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', 'Failed to get user memberships', { userId, error: errorMessage });
      return {
        data: [],
        error: errorMessage,
        success: false,
      };
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Builds a comprehensive user profile query with organization data
   */
  private async buildUserProfileQuery(userId: UUID) {
    // First get the basic profile
    const profileQuery = supabase
      .from(DATABASE_TABLES.PROFILES)
      .select('*')
      .eq('id', userId)
      .single();

    const { data: profile, error: profileError } = await profileQuery;
    
    if (profileError || !profile) {
      throw profileError || new Error('Profile not found');
    }

    // Get user memberships to determine current organization and role
    const memberships = await OrganizationService.getUserMemberships(userId);
    
    if (memberships.length === 0) {
      throw new Error('User has no organization memberships');
    }

    // Use the first active membership as current context
    const currentMembership = memberships.find(m => m.is_active) || memberships[0];
    
    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from(DATABASE_TABLES.ORGANIZATIONS)
      .select('*')
      .eq('id', currentMembership.org_id)
      .single();

    if (orgError || !organization) {
      throw orgError || new Error('Organization not found');
    }

    // Construct the enhanced user profile
    const userProfile: UserProfile = {
      id: profile.id,
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
      full_name: this.buildFullName(profile.first_name, profile.last_name),
      phone_number: profile.phone_number,
      student_id: profile.student_id,
      grade: profile.grade,
      is_verified: profile.is_verified,
      username: profile.username,
      display_name: profile.display_name || this.buildFullName(profile.first_name, profile.last_name),
      role: currentMembership.role,
      org_id: currentMembership.org_id,
      organization: organization,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

    // Validate the constructed profile
    if (!isUserProfile(userProfile)) {
      throw new Error('Invalid user profile data structure');
    }

    return Promise.resolve({ data: userProfile, error: null });
  }

  /**
   * Validates profile update request
   */
  private validateProfileUpdate(updates: UpdateProfileRequest): void {
    // Check for empty updates
    if (!updates || Object.keys(updates).length === 0) {
      throw this.createError('VALIDATION_ERROR', 'No updates provided');
    }

    // Validate individual fields
    if (updates.first_name !== undefined && typeof updates.first_name !== 'string') {
      throw this.createError('VALIDATION_ERROR', 'First name must be a string');
    }

    if (updates.last_name !== undefined && typeof updates.last_name !== 'string') {
      throw this.createError('VALIDATION_ERROR', 'Last name must be a string');
    }

    if (updates.phone_number !== undefined && updates.phone_number !== null && typeof updates.phone_number !== 'string') {
      throw this.createError('VALIDATION_ERROR', 'Phone number must be a string');
    }

    if (updates.student_id !== undefined && updates.student_id !== null && typeof updates.student_id !== 'string') {
      throw this.createError('VALIDATION_ERROR', 'Student ID must be a string');
    }

    if (updates.grade !== undefined && updates.grade !== null && typeof updates.grade !== 'string') {
      throw this.createError('VALIDATION_ERROR', 'Grade must be a string');
    }

    if (updates.display_name !== undefined && updates.display_name !== null && typeof updates.display_name !== 'string') {
      throw this.createError('VALIDATION_ERROR', 'Display name must be a string');
    }

    // Validate string lengths
    if (updates.first_name && updates.first_name.length > 100) {
      throw this.createError('VALIDATION_ERROR', 'First name too long (max 100 characters)');
    }

    if (updates.last_name && updates.last_name.length > 100) {
      throw this.createError('VALIDATION_ERROR', 'Last name too long (max 100 characters)');
    }

    if (updates.phone_number && updates.phone_number.length > 20) {
      throw this.createError('VALIDATION_ERROR', 'Phone number too long (max 20 characters)');
    }

    if (updates.student_id && updates.student_id.length > 50) {
      throw this.createError('VALIDATION_ERROR', 'Student ID too long (max 50 characters)');
    }

    if (updates.display_name && updates.display_name.length > 100) {
      throw this.createError('VALIDATION_ERROR', 'Display name too long (max 100 characters)');
    }
  }

  /**
   * Builds a full name from first and last name
   */
  private buildFullName(firstName?: string, lastName?: string): string {
    const parts = [firstName, lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : 'Unknown User';
  }

  /**
   * Override getCurrentOrganizationId to get from user context
   */
  protected async getCurrentOrganizationId(): Promise<string> {
    try {
      const userId = await this.getCurrentUserId();
      const memberships = await OrganizationService.getUserMemberships(userId);
      
      if (memberships.length === 0) {
        throw this.createError('PERMISSION_DENIED', 'User has no organization memberships');
      }

      // Return the first active membership's organization ID
      const currentMembership = memberships.find(m => m.is_active) || memberships[0];
      return currentMembership.org_id;
    } catch (error) {
      throw this.createError('PERMISSION_DENIED', 'Failed to get current organization ID');
    }
  }
}

// Export singleton instance
export const userDataService = new UserDataService();