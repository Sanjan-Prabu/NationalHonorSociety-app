/**
 * BLE Live Integration Testing Framework - Configuration Loader
 * 
 * Loads and validates test configuration from environment variables.
 */

import { TestConfiguration, TestError, TestErrorType } from './types';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Partial<TestConfiguration> = {
  performanceSampleSize: 10,
  concurrencyTestSize: 5,
  tokenCollisionSampleSize: 1000,
  timeoutMs: 30000,
  retryAttempts: 3,
};

/**
 * Load test configuration from environment variables
 */
export function loadTestConfiguration(): TestConfiguration {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw createConfigError('SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL environment variable is required');
  }

  if (!supabaseAnonKey) {
    throw createConfigError('SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable is required');
  }

  const config: TestConfiguration = {
    supabaseUrl,
    supabaseAnonKey,
    testUserId: process.env.TEST_USER_ID,
    testOrgId: process.env.TEST_ORG_ID,
    performanceSampleSize: parseInt(process.env.PERFORMANCE_SAMPLE_SIZE || String(DEFAULT_CONFIG.performanceSampleSize!), 10),
    concurrencyTestSize: parseInt(process.env.CONCURRENCY_TEST_SIZE || String(DEFAULT_CONFIG.concurrencyTestSize!), 10),
    tokenCollisionSampleSize: parseInt(process.env.TOKEN_COLLISION_SAMPLE_SIZE || String(DEFAULT_CONFIG.tokenCollisionSampleSize!), 10),
    timeoutMs: parseInt(process.env.TEST_TIMEOUT_MS || String(DEFAULT_CONFIG.timeoutMs!), 10),
    retryAttempts: parseInt(process.env.TEST_RETRY_ATTEMPTS || String(DEFAULT_CONFIG.retryAttempts!), 10),
  };

  validateConfiguration(config);

  return config;
}

/**
 * Validate configuration values
 */
function validateConfiguration(config: TestConfiguration): void {
  if (config.performanceSampleSize < 1) {
    throw createConfigError('performanceSampleSize must be at least 1');
  }

  if (config.concurrencyTestSize < 1) {
    throw createConfigError('concurrencyTestSize must be at least 1');
  }

  if (config.tokenCollisionSampleSize < 100) {
    throw createConfigError('tokenCollisionSampleSize must be at least 100 for meaningful results');
  }

  if (config.timeoutMs < 1000) {
    throw createConfigError('timeoutMs must be at least 1000ms');
  }

  if (config.retryAttempts < 0) {
    throw createConfigError('retryAttempts must be non-negative');
  }

  // Validate URL format
  try {
    new URL(config.supabaseUrl);
  } catch (error) {
    throw createConfigError(`Invalid Supabase URL: ${config.supabaseUrl}`);
  }
}

/**
 * Create a configuration error
 */
function createConfigError(message: string): TestError {
  return {
    type: TestErrorType.MISSING_CONFIGURATION,
    message,
    details: {},
    recoverable: false,
    retryable: false,
  };
}

/**
 * Get configuration summary for logging
 */
export function getConfigurationSummary(config: TestConfiguration): Record<string, any> {
  return {
    supabaseUrl: config.supabaseUrl,
    hasTestUserId: !!config.testUserId,
    hasTestOrgId: !!config.testOrgId,
    performanceSampleSize: config.performanceSampleSize,
    concurrencyTestSize: config.concurrencyTestSize,
    tokenCollisionSampleSize: config.tokenCollisionSampleSize,
    timeoutMs: config.timeoutMs,
    retryAttempts: config.retryAttempts,
  };
}
