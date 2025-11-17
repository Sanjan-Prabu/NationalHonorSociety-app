/**
 * BLE Live Integration Testing Framework - Main Exports
 * 
 * Central export point for the BLE testing framework infrastructure.
 */

// Core orchestrator
export { TestOrchestrator, createTestOrchestrator } from './TestOrchestrator';

// Configuration
export { loadTestConfiguration, getConfigurationSummary } from './TestConfiguration';

// Context builder
export { buildTestContext, getContextSummary, validateTestContext } from './TestContextBuilder';

// MCP client
export {
  initializeMCPClient,
  testConnection,
  cleanupMCPClient,
  executeRPC,
  executeQueryWithTimeout,
  retryOperation,
  isAuthenticated,
  getCurrentUser,
} from './MCPClient';

// Logger
export { TestLogger, createTestLogger } from './TestLogger';

// Test Suites
export { default as RLSPolicyTestSuite } from './RLSPolicyTestSuite';
export { default as DatabaseFunctionTestSuite } from './DatabaseFunctionTestSuite';
export { default as SchemaValidationTestSuite } from './SchemaValidationTestSuite';
export { default as IntegrationTestSuite } from './IntegrationTestSuite';

// Types
export * from './types';
