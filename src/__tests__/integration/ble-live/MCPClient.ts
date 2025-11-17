/**
 * BLE Live Integration Testing Framework - MCP Client
 * 
 * Initializes and manages Supabase MCP (Model Context Protocol) client
 * for real-time database operations during testing.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TestConfiguration, TestError, TestErrorType } from './types';

/**
 * Initialize Supabase MCP client with authentication
 */
export async function initializeMCPClient(config: TestConfiguration): Promise<SupabaseClient> {
  try {
    // Create Supabase client
    const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

    // Verify connection by checking auth status
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      throw createConnectionError('Failed to get auth session', { error: error.message });
    }

    if (!session) {
      throw createAuthError('No active session found. Please authenticate before running tests.', {});
    }

    return supabase;
  } catch (error) {
    if (isTestError(error)) {
      throw error;
    }
    throw createConnectionError('Failed to initialize MCP client', { error });
  }
}

/**
 * Test database connection
 */
export async function testConnection(supabase: SupabaseClient): Promise<boolean> {
  try {
    // Simple query to test connection
    const { error } = await supabase.from('organizations').select('id').limit(1);

    if (error) {
      throw createConnectionError('Database connection test failed', { error: error.message });
    }

    return true;
  } catch (error) {
    if (isTestError(error)) {
      throw error;
    }
    throw createConnectionError('Connection test failed', { error });
  }
}

/**
 * Execute RPC function with error handling
 */
export async function executeRPC<T = any>(
  supabase: SupabaseClient,
  functionName: string,
  params?: Record<string, any>
): Promise<{ data: T | null; error: any }> {
  try {
    const { data, error } = await supabase.rpc(functionName, params);
    return { data: data as T, error };
  } catch (error) {
    return { data: null, error };
  }
}

/**
 * Execute query with timeout
 */
export async function executeQueryWithTimeout<T = any>(
  queryPromise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    queryPromise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(createTimeoutError(timeoutMs)), timeoutMs)
    ),
  ]);
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry non-retryable errors
      if (isTestError(error) && !error.retryable) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(supabase: SupabaseClient): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

/**
 * Get current user
 */
export async function getCurrentUser(supabase: SupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    throw createAuthError('Failed to get current user', { error: error.message });
  }

  if (!user) {
    throw createAuthError('No authenticated user', {});
  }

  return user;
}

/**
 * Cleanup MCP client resources
 */
export async function cleanupMCPClient(supabase: SupabaseClient): Promise<void> {
  try {
    // Remove all subscriptions
    supabase.removeAllChannels();
  } catch (error) {
    // Ignore cleanup errors
    console.warn('Error during MCP client cleanup:', error);
  }
}

/**
 * Create connection error
 */
function createConnectionError(message: string, details: any): TestError {
  return {
    type: TestErrorType.CONNECTION_FAILED,
    message,
    details,
    recoverable: false,
    retryable: true,
  };
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
 * Create timeout error
 */
function createTimeoutError(timeoutMs: number): TestError {
  return {
    type: TestErrorType.TIMEOUT,
    message: `Operation timed out after ${timeoutMs}ms`,
    details: { timeoutMs },
    recoverable: false,
    retryable: true,
  };
}

/**
 * Type guard for TestError
 */
function isTestError(error: any): error is TestError {
  return error && typeof error === 'object' && 'type' in error && 'message' in error;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
