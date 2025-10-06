// Test script for profile data retrieval functionality
// This script tests the profile fetching logic implemented in task 6

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Mock environment variables for testing
const MOCK_ENV = {
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'your-service-role-key'
};

// Mock logger for testing
class MockLogger {
  logDebug(message: string, data?: any) {
    console.log(`[DEBUG] ${message}`, data);
  }
  
  logError(message: string, context?: any) {
    console.error(`[ERROR] ${message}`, context);
  }
  
  logInfo(message: string, metadata?: any) {
    console.log(`[INFO] ${message}`, metadata);
  }
  
  logPerformanceMetric(metric: any) {
    console.log(`[PERFORMANCE]`, metric);
  }
  
  logSecurityEvent(event: any) {
    console.log(`[SECURITY]`, event);
  }
  
  logAuditEvent(event: any) {
    console.log(`[AUDIT]`, event);
  }
}

// Profile data interface (copied from main function)
interface UserProfile {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  organization?: string | null;
  role?: string | null;
  is_verified?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// Profile fetching function (copied from main function)
async function fetchUserProfile(
  userId: string, 
  logger: MockLogger,
  supabaseServiceRole: any
): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    logger.logDebug('Fetching user profile data', { userId });
    
    const profileStartTime = Date.now();
    
    // Use service role client to fetch profile data
    // RLS policies ensure only legitimate access even with service role
    const { data: profile, error: profileError } = await supabaseServiceRole
      .from('profiles')
      .select('id, email, first_name, last_name, organization, role, is_verified, created_at, updated_at')
      .eq('id', userId)
      .single();
    
    const profileDuration = Date.now() - profileStartTime;
    
    // Log profile fetch performance
    logger.logPerformanceMetric({
      type: 'REQUEST_DURATION',
      value: profileDuration,
      metadata: { 
        operation: 'profile_fetch',
        userId,
        success: !profileError
      }
    });
    
    if (profileError) {
      logger.logError('Profile fetch failed', {
        userId,
        error: profileError.message,
        code: profileError.code,
        details: profileError.details,
        duration: profileDuration
      });
      
      // Log security event for profile access failure
      logger.logSecurityEvent({
        type: 'BLOCKED_REQUEST',
        ip: 'service_role',
        userId,
        severity: 'MEDIUM',
        details: {
          operation: 'PROFILE_FETCH_FAILED',
          error: profileError.message,
          code: profileError.code
        }
      });
      
      return { profile: null, error: 'Failed to retrieve user profile' };
    }
    
    if (!profile) {
      logger.logSecurityEvent({
        type: 'BLOCKED_REQUEST',
        ip: 'service_role',
        userId,
        severity: 'HIGH',
        details: {
          operation: 'PROFILE_NOT_FOUND',
          reason: 'User authenticated but profile missing'
        }
      });
      
      return { profile: null, error: 'User profile not found' };
    }
    
    // Log successful profile retrieval
    logger.logInfo('Profile data retrieved successfully', {
      userId,
      hasOrganization: !!profile.organization,
      hasRole: !!profile.role,
      isVerified: profile.is_verified,
      duration: profileDuration
    });
    
    // Log audit event for profile access
    logger.logAuditEvent({
      type: 'USER_LOGIN',
      userId,
      email: profile.email,
      ip: 'service_role',
      action: 'PROFILE_DATA_ACCESS',
      result: 'SUCCESS',
      details: {
        operation: 'profile_fetch',
        duration: profileDuration,
        dataFields: ['id', 'email', 'organization', 'role', 'is_verified']
      }
    });
    
    return { profile, error: null };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.logError('Profile fetch exception', {
      userId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    logger.logSecurityEvent({
      type: 'BLOCKED_REQUEST',
      ip: 'service_role',
      userId,
      severity: 'HIGH',
      details: {
        operation: 'PROFILE_FETCH_EXCEPTION',
        error: errorMessage
      }
    });
    
    return { profile: null, error: 'Internal error retrieving profile' };
  }
}

// Test function
async function testProfileRetrieval() {
  console.log('=== Profile Data Retrieval Test ===\n');
  
  // Initialize mock service role client
  const supabaseServiceRole = createClient(
    MOCK_ENV.SUPABASE_URL, 
    MOCK_ENV.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  const logger = new MockLogger();
  const testUserId = 'test-user-id-123';
  
  console.log('Testing profile data retrieval...');
  console.log(`User ID: ${testUserId}`);
  console.log(`Service Role Client configured: ${!!supabaseServiceRole}`);
  
  try {
    // Test the profile fetching function
    const result = await fetchUserProfile(testUserId, logger, supabaseServiceRole);
    
    console.log('\n=== Test Results ===');
    console.log('Profile fetch result:', result);
    
    if (result.profile) {
      console.log('\n✅ Profile data retrieved successfully');
      console.log('Profile data structure:');
      console.log('- ID:', result.profile.id);
      console.log('- Email:', result.profile.email);
      console.log('- Role:', result.profile.role || 'Not set');
      console.log('- Organization:', result.profile.organization || 'Not set');
      console.log('- Verified:', result.profile.is_verified);
    } else {
      console.log('\n❌ Profile fetch failed');
      console.log('Error:', result.error);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with exception:', error);
  }
  
  console.log('\n=== Test Complete ===');
}

// Run test if this file is executed directly
if (import.meta.main) {
  testProfileRetrieval();
}

export { fetchUserProfile, MockLogger };