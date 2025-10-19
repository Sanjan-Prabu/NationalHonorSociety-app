import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types/auth';
import { UserMembership, MembershipRole } from '../types/database';

export interface ProfileValidationResult {
  isComplete: boolean;
  missingFields: string[];
  profile: Profile | null;
  needsUpdate: boolean;
}

export interface ProfileCompletionData {
  org_id?: string;
  role?: MembershipRole;
  first_name?: string;
  last_name?: string;
  email?: string;
  is_verified?: boolean;
}

/**
 * Service for validating and ensuring profile completeness
 * Handles auto-upsert of missing profile data required for organization context
 */
export class ProfileValidationService {
  /**
   * Required fields for a complete profile that can access organization features
   */
  private static readonly REQUIRED_FIELDS = [
    'id',
    'email',
    'org_id',
    'role',
    'is_verified'
  ] as const;

  /**
   * Validates if a profile has all required fields for organization access
   */
  static validateProfileCompleteness(profile: Profile | null): ProfileValidationResult {
    if (!profile) {
      return {
        isComplete: false,
        missingFields: [...this.REQUIRED_FIELDS],
        profile: null,
        needsUpdate: true
      };
    }

    const missingFields: string[] = [];

    // Check each required field
    if (!profile.id) missingFields.push('id');
    if (!profile.email) missingFields.push('email');
    if (!profile.org_id) missingFields.push('org_id');
    if (!profile.role) missingFields.push('role');
    if (profile.is_verified === undefined || profile.is_verified === null) {
      missingFields.push('is_verified');
    }

    return {
      isComplete: missingFields.length === 0,
      missingFields,
      profile,
      needsUpdate: missingFields.length > 0
    };
  }

  /**
   * Attempts to complete a profile by filling missing data from user memberships
   */
  static async completeProfileFromMemberships(
    userId: string,
    memberships: UserMembership[]
  ): Promise<ProfileCompletionData | null> {
    if (memberships.length === 0) {
      console.log('⚠️ No memberships found to complete profile');
      return null;
    }

    // Use the first active membership as the default organization context
    const primaryMembership = memberships.find(m => m.is_active) || memberships[0];

    const completionData: ProfileCompletionData = {
      org_id: primaryMembership.org_id,
      role: primaryMembership.role,
      is_verified: false // Default to false, will be updated through verification process
    };

    // Try to get additional user data from auth.users
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (user.email) completionData.email = user.email;
        
        // Extract names from user metadata if available
        if (user.user_metadata?.first_name) {
          completionData.first_name = user.user_metadata.first_name;
        }
        if (user.user_metadata?.last_name) {
          completionData.last_name = user.user_metadata.last_name;
        }
      }
    } catch (error) {
      console.error('Error fetching user data for profile completion:', error);
    }

    console.log('✅ Generated profile completion data from memberships', {
      org_id: completionData.org_id,
      role: completionData.role,
      hasEmail: !!completionData.email
    });

    return completionData;
  }

  /**
   * Performs auto-upsert of profile data to ensure completeness
   */
  static async autoUpsertProfile(
    userId: string,
    completionData: ProfileCompletionData
  ): Promise<Profile | null> {
    try {
      console.log('🔧 Performing auto-upsert of profile data', { userId });

      // Prepare upsert data with timestamp
      const upsertData = {
        id: userId,
        ...completionData,
        updated_at: new Date().toISOString()
      };

      // Perform upsert operation
      const { data: profile, error } = await supabase
        .from('profiles')
        .upsert(upsertData, {
          onConflict: 'id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Profile auto-upsert failed:', error);
        return null;
      }

      console.log('✅ Profile auto-upsert completed successfully');
      return profile;
    } catch (error) {
      console.error('❌ Exception during profile auto-upsert:', error);
      return null;
    }
  }

  /**
   * Main function to refresh and validate profile completeness
   * This is the primary entry point for profile validation
   */
  static async refreshAndValidateProfile(
    userId: string,
    memberships: UserMembership[]
  ): Promise<{
    success: boolean;
    profile: Profile | null;
    wasUpdated: boolean;
    error?: string;
  }> {
    try {
      console.log('🔍 Starting profile completeness validation', { userId });

      // Step 1: Fetch current profile
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('❌ Error fetching profile for validation:', fetchError);
        return {
          success: false,
          profile: null,
          wasUpdated: false,
          error: 'Failed to fetch profile for validation'
        };
      }

      // Step 2: Validate profile completeness
      const validation = this.validateProfileCompleteness(currentProfile);
      
      if (validation.isComplete) {
        console.log('✅ Profile is already complete');
        return {
          success: true,
          profile: validation.profile,
          wasUpdated: false
        };
      }

      console.log('⚠️ Profile incomplete, missing fields:', validation.missingFields);

      // Step 3: Attempt to complete profile from memberships
      const completionData = await this.completeProfileFromMemberships(userId, memberships);
      
      if (!completionData) {
        console.log('❌ Cannot complete profile - no membership data available');
        return {
          success: false,
          profile: validation.profile,
          wasUpdated: false,
          error: 'Cannot complete profile - no organization membership found'
        };
      }

      // Step 4: Auto-upsert profile with completion data
      const updatedProfile = await this.autoUpsertProfile(userId, completionData);
      
      if (!updatedProfile) {
        return {
          success: false,
          profile: validation.profile,
          wasUpdated: false,
          error: 'Failed to update profile with completion data'
        };
      }

      // Step 5: Validate the updated profile
      const finalValidation = this.validateProfileCompleteness(updatedProfile);
      
      if (!finalValidation.isComplete) {
        console.log('⚠️ Profile still incomplete after update, missing:', finalValidation.missingFields);
        return {
          success: false,
          profile: updatedProfile,
          wasUpdated: true,
          error: `Profile still incomplete after update. Missing: ${finalValidation.missingFields.join(', ')}`
        };
      }

      console.log('✅ Profile completeness validation and update successful');
      return {
        success: true,
        profile: updatedProfile,
        wasUpdated: true
      };

    } catch (error) {
      console.error('❌ Exception during profile validation:', error);
      return {
        success: false,
        profile: null,
        wasUpdated: false,
        error: 'Unexpected error during profile validation'
      };
    }
  }

  /**
   * Checks if a profile is ready for organization context loading
   */
  static isProfileReadyForOrganizationContext(profile: Profile | null): boolean {
    const validation = this.validateProfileCompleteness(profile);
    return validation.isComplete;
  }
}

export default ProfileValidationService;