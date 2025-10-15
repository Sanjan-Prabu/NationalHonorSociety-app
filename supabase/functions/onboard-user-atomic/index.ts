import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types for the onboarding request and response
interface OnboardingRequest {
  user_id: string;
  org_slug: string;
  role: string;
  student_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

interface OnboardingResponse {
  success: boolean;
  profile?: any;
  membership?: any;
  error?: string;
  errorType?: string;
  details?: Record<string, any>;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  errorType?: 'DUPLICATE_MEMBERSHIP' | 'INVALID_ROLE_COMBINATION' | 'ORGANIZATION_MISMATCH';
  existingMemberships?: any[];
  details?: Record<string, any>;
}

// Initialize Supabase client with service role for privileged operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Logging utility
function logInfo(message: string, data?: any) {
  console.log(JSON.stringify({
    level: 'INFO',
    timestamp: new Date().toISOString(),
    message,
    data,
    component: 'onboard-user-atomic'
  }));
}

function logError(message: string, error?: any) {
  console.error(JSON.stringify({
    level: 'ERROR',
    timestamp: new Date().toISOString(),
    message,
    error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    component: 'onboard-user-atomic'
  }));
}

// Organization slug resolution
async function resolveOrganizationSlug(slug: string): Promise<{ id: string; name: string; slug: string } | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', slug.toLowerCase())
      .single();

    if (error) {
      logError('Error resolving organization slug', { slug, error });
      return null;
    }

    return data;
  } catch (error) {
    logError('Exception resolving organization slug', { slug, error });
    return null;
  }
}

// Check existing memberships for validation
async function checkExistingMemberships(email: string, studentId: string): Promise<any[]> {
  try {
    // Query profiles first to get user IDs that match email or student_id
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, student_id')
      .or(`email.eq.${email},student_id.eq.${studentId}`);

    if (profileError) {
      logError('Error fetching profiles for membership check', { email, studentId, error: profileError });
      return [];
    }

    if (!profiles || profiles.length === 0) {
      return [];
    }

    // Get all user IDs that match
    const userIds = profiles.map(p => p.id);

    // Get memberships for all matching user IDs
    const { data: membershipData, error: membershipError } = await supabase
      .from('memberships')
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
      logError('Error fetching memberships', { userIds, error: membershipError });
      return [];
    }

    return (membershipData || []).map((membership: any) => ({
      org_id: membership.org_id,
      org_slug: membership.organizations.slug,
      org_name: membership.organizations.name,
      role: membership.role,
      is_active: membership.is_active,
      joined_at: membership.joined_at,
    }));
  } catch (error) {
    logError('Exception checking existing memberships', { email, studentId, error });
    return [];
  }
}

// Validate membership according to multi-org rules
async function validateMembership(
  email: string,
  studentId: string,
  orgId: string,
  role: string,
  targetOrg: any
): Promise<ValidationResult> {
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

    // Get existing memberships
    const existingMemberships = await checkExistingMemberships(email, studentId);

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
    logError('Exception during membership validation', { email, studentId, orgId, role, error });
    return {
      valid: false,
      error: 'Unexpected error during validation. Please try again.',
      errorType: 'DUPLICATE_MEMBERSHIP',
    };
  }
}

// Atomic onboarding function using database transaction
async function onboardUserAtomic(request: OnboardingRequest): Promise<OnboardingResponse> {
  try {
    logInfo('Starting atomic onboarding process', { 
      user_id: request.user_id, 
      org_slug: request.org_slug, 
      role: request.role 
    });

    // Step 1: Resolve organization slug to UUID
    const targetOrg = await resolveOrganizationSlug(request.org_slug);
    if (!targetOrg) {
      return {
        success: false,
        error: `Organization '${request.org_slug}' not found`,
        errorType: 'ORGANIZATION_MISMATCH',
        details: { org_slug: request.org_slug }
      };
    }

    logInfo('Organization resolved', { org_slug: request.org_slug, org_id: targetOrg.id });

    // Step 2: Validate membership according to multi-org rules
    const validationResult = await validateMembership(
      request.email,
      request.student_id,
      targetOrg.id,
      request.role,
      targetOrg
    );

    if (!validationResult.valid) {
      logError('Membership validation failed', validationResult);
      return {
        success: false,
        error: validationResult.error,
        errorType: validationResult.errorType,
        details: validationResult.details
      };
    }

    logInfo('Membership validation passed', { 
      existingMemberships: validationResult.existingMemberships?.length || 0 
    });

    // Step 3: Check if profile already exists
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('id, email, student_id')
      .eq('id', request.user_id)
      .single();

    let profile;
    
    if (profileCheckError && profileCheckError.code !== 'PGRST116') { // PGRST116 = not found
      logError('Error checking existing profile', { user_id: request.user_id, error: profileCheckError });
      return {
        success: false,
        error: 'Failed to check existing profile',
        errorType: 'DUPLICATE_MEMBERSHIP'
      };
    }

    // Step 4: Create or update profile
    if (existingProfile) {
      logInfo('Profile already exists, updating if needed', { user_id: request.user_id });
      
      // Update profile with any new information
      const updateData: any = {};
      if (request.first_name) updateData.first_name = request.first_name;
      if (request.last_name) updateData.last_name = request.last_name;
      if (request.email) updateData.email = request.email;
      if (request.student_id) updateData.student_id = request.student_id;
      
      if (Object.keys(updateData).length > 0) {
        updateData.updated_at = new Date().toISOString();
        
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', request.user_id)
          .select()
          .single();

        if (updateError) {
          logError('Error updating profile', { user_id: request.user_id, error: updateError });
          return {
            success: false,
            error: 'Failed to update profile',
            errorType: 'DUPLICATE_MEMBERSHIP'
          };
        }
        
        profile = updatedProfile;
      } else {
        profile = existingProfile;
      }
    } else {
      logInfo('Creating new profile', { user_id: request.user_id });
      
      // Create new profile
      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert({
          id: request.user_id,
          email: request.email,
          student_id: request.student_id,
          first_name: request.first_name || null,
          last_name: request.last_name || null,
          is_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createProfileError) {
        logError('Error creating profile', { user_id: request.user_id, error: createProfileError });
        return {
          success: false,
          error: 'Failed to create profile',
          errorType: 'DUPLICATE_MEMBERSHIP'
        };
      }
      
      profile = newProfile;
    }

    // Step 5: Check if membership already exists for this user in this organization
    const { data: existingMembership, error: membershipCheckError } = await supabase
      .from('memberships')
      .select('id, role, is_active')
      .eq('user_id', request.user_id)
      .eq('org_id', targetOrg.id)
      .single();

    if (membershipCheckError && membershipCheckError.code !== 'PGRST116') {
      logError('Error checking existing membership', { 
        user_id: request.user_id, 
        org_id: targetOrg.id, 
        error: membershipCheckError 
      });
      return {
        success: false,
        error: 'Failed to check existing membership',
        errorType: 'DUPLICATE_MEMBERSHIP'
      };
    }

    let membership;

    if (existingMembership) {
      if (existingMembership.is_active) {
        return {
          success: false,
          error: `User is already an active ${existingMembership.role} in ${targetOrg.name}`,
          errorType: 'DUPLICATE_MEMBERSHIP',
          details: {
            existingRole: existingMembership.role,
            organizationName: targetOrg.name
          }
        };
      }

      // Reactivate existing membership with new role
      logInfo('Reactivating existing membership', { 
        user_id: request.user_id, 
        org_id: targetOrg.id,
        new_role: request.role 
      });

      const { data: reactivatedMembership, error: reactivateError } = await supabase
        .from('memberships')
        .update({
          role: request.role,
          is_active: true,
          joined_at: new Date().toISOString()
        })
        .eq('id', existingMembership.id)
        .select()
        .single();

      if (reactivateError) {
        logError('Error reactivating membership', { 
          membership_id: existingMembership.id, 
          error: reactivateError 
        });
        return {
          success: false,
          error: 'Failed to reactivate membership',
          errorType: 'DUPLICATE_MEMBERSHIP'
        };
      }

      membership = reactivatedMembership;
    } else {
      // Step 6: Create new membership
      logInfo('Creating new membership', { 
        user_id: request.user_id, 
        org_id: targetOrg.id, 
        role: request.role 
      });

      const { data: newMembership, error: createMembershipError } = await supabase
        .from('memberships')
        .insert({
          user_id: request.user_id,
          org_id: targetOrg.id,
          role: request.role,
          is_active: true,
          joined_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createMembershipError) {
        logError('Error creating membership', { 
          user_id: request.user_id, 
          org_id: targetOrg.id, 
          error: createMembershipError 
        });
        return {
          success: false,
          error: 'Failed to create membership',
          errorType: 'DUPLICATE_MEMBERSHIP'
        };
      }

      membership = newMembership;
    }

    logInfo('Atomic onboarding completed successfully', {
      user_id: request.user_id,
      org_id: targetOrg.id,
      role: request.role,
      profile_id: profile.id,
      membership_id: membership.id
    });

    return {
      success: true,
      profile,
      membership,
      details: {
        organization: targetOrg,
        validationResult: validationResult.details
      }
    };

  } catch (error) {
    logError('Exception during atomic onboarding', { request, error });
    return {
      success: false,
      error: 'Internal server error during onboarding',
      errorType: 'DUPLICATE_MEMBERSHIP'
    };
  }
}

// Input validation
function validateOnboardingRequest(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    errors.push('Invalid request format');
    return { isValid: false, errors };
  }

  // Required fields
  const requiredFields = ['user_id', 'org_slug', 'role', 'student_id', 'email'];
  for (const field of requiredFields) {
    if (!body[field]) {
      errors.push(`${field} is required`);
    } else if (typeof body[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  }

  // Email validation
  if (body.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      errors.push('Invalid email format');
    }
  }

  // Role validation
  if (body.role) {
    const validRoles = ['member', 'officer', 'president', 'vice_president', 'admin'];
    if (!validRoles.includes(body.role)) {
      errors.push(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }
  }

  // Optional string fields
  const optionalStringFields = ['first_name', 'last_name'];
  for (const field of optionalStringFields) {
    if (body[field] && typeof body[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Main handler
serve(async (req) => {
  logInfo('Incoming onboarding request', { 
    method: req.method, 
    url: req.url 
  });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    // Parse request body
    const body = await req.json();
    
    // Validate input
    const validation = validateOnboardingRequest(body);
    if (!validation.isValid) {
      logError('Invalid request input', { errors: validation.errors });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid input', 
          details: { errors: validation.errors } 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process onboarding
    const result = await onboardUserAtomic(body as OnboardingRequest);

    const status = result.success ? 200 : 400;
    
    return new Response(
      JSON.stringify(result),
      { 
        status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logError('Exception in main handler', { error });
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});