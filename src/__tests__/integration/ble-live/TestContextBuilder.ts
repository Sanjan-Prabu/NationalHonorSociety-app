/**
 * BLE Live Integration Testing Framework - Test Context Builder
 * 
 * Builds test context by capturing user, organization, and role information
 * from the authenticated Supabase session.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TestContext, User, TestError, TestErrorType } from './types';
import { Organization, Membership, MembershipRole } from '../../../types/database';

/**
 * Build test context from authenticated Supabase session
 */
export async function buildTestContext(supabase: SupabaseClient): Promise<TestContext> {
  const startTime = new Date();

  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(supabase);

    // Get user's memberships
    const memberships = await getUserMemberships(supabase, user.id);

    if (memberships.length === 0) {
      throw createContextError('User has no active memberships', {
        userId: user.id,
        email: user.email,
      });
    }

    // Get primary organization (first active membership)
    const primaryMembership = memberships[0];
    const organization = await getOrganization(supabase, primaryMembership.org_id);

    const context: TestContext = {
      user,
      organization,
      role: primaryMembership.role,
      memberships,
      startTime,
    };

    return context;
  } catch (error) {
    if (isTestError(error)) {
      throw error;
    }
    throw createContextError('Failed to build test context', { error });
  }
}

/**
 * Get authenticated user from Supabase
 */
async function getAuthenticatedUser(supabase: SupabaseClient): Promise<User> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    throw createAuthError('Failed to get authenticated user', { error: error.message });
  }

  if (!user) {
    throw createAuthError('No authenticated user found', {});
  }

  return {
    id: user.id,
    email: user.email || 'unknown',
    authenticated: true,
  };
}

/**
 * Get user's active memberships
 */
async function getUserMemberships(supabase: SupabaseClient, userId: string): Promise<Membership[]> {
  const { data, error } = await supabase
    .from('memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('joined_at', { ascending: false });

  if (error) {
    throw createContextError('Failed to query user memberships', {
      userId,
      error: error.message,
    });
  }

  return (data || []) as Membership[];
}

/**
 * Get organization by ID
 */
async function getOrganization(supabase: SupabaseClient, orgId: string): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (error) {
    throw createContextError('Failed to query organization', {
      orgId,
      error: error.message,
    });
  }

  if (!data) {
    throw createContextError('Organization not found', { orgId });
  }

  return data as Organization;
}

/**
 * Get context summary for logging
 */
export function getContextSummary(context: TestContext): Record<string, any> {
  return {
    userId: context.user.id,
    userEmail: context.user.email,
    organizationId: context.organization.id,
    organizationName: context.organization.name,
    organizationSlug: context.organization.slug,
    role: context.role,
    membershipCount: context.memberships.length,
    startTime: context.startTime.toISOString(),
  };
}

/**
 * Validate test context
 */
export function validateTestContext(context: TestContext): void {
  if (!context.user.id) {
    throw createContextError('Invalid context: missing user ID', {});
  }

  if (!context.user.authenticated) {
    throw createContextError('Invalid context: user not authenticated', {});
  }

  if (!context.organization.id) {
    throw createContextError('Invalid context: missing organization ID', {});
  }

  if (!context.role) {
    throw createContextError('Invalid context: missing user role', {});
  }

  if (context.memberships.length === 0) {
    throw createContextError('Invalid context: no memberships', {});
  }
}

/**
 * Create authentication error
 */
function createAuthError(message: string, details: any): TestError {
  return {
    type: TestErrorType.AUTHENTICATION_FAILED,
    message,
    details,
    recoverable: false,
    retryable: false,
  };
}

/**
 * Create context error
 */
function createContextError(message: string, details: any): TestError {
  return {
    type: TestErrorType.INVALID_TEST_CONTEXT,
    message,
    details,
    recoverable: false,
    retryable: false,
  };
}

/**
 * Type guard for TestError
 */
function isTestError(error: any): error is TestError {
  return error && typeof error === 'object' && 'type' in error && 'message' in error;
}
