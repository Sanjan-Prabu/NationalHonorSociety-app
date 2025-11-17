/**
 * BLE Live Integration Testing Framework - Type Definitions
 * 
 * Core types for the comprehensive BLE testing system with real-time
 * database verification using Supabase MCP.
 */

import { UUID, MembershipRole, Organization, Membership, Profile } from '../../../types/database';

// ============================================================================
// Test Configuration Types
// ============================================================================

export interface TestConfiguration {
  supabaseUrl: string;
  supabaseAnonKey: string;
  testUserId?: string;
  testOrgId?: string;
  performanceSampleSize: number;
  concurrencyTestSize: number;
  tokenCollisionSampleSize: number;
  timeoutMs: number;
  retryAttempts: number;
}

export interface TestContext {
  user: User;
  organization: Organization;
  role: MembershipRole;
  memberships: Membership[];
  startTime: Date;
  endTime?: Date;
}

export interface User {
  id: string;
  email: string;
  authenticated: boolean;
}

// ============================================================================
// Test Result Types
// ============================================================================

export type TestStatus = 'PASS' | 'FAIL' | 'WARNING' | 'INFO';

export interface TestResult {
  category: string;
  test: string;
  status: TestStatus;
  message: string;
  details?: any;
  duration?: number;
  error?: Error;
}

export interface TestSuiteResult {
  suiteName: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
  status: TestStatus;
}

export interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  warnings: number;
  info: number;
  duration: number;
  suiteResults: TestSuiteResult[];
  overallStatus: 'PASS' | 'FAIL' | 'WARNING';
  criticalIssues: CriticalIssue[];
}

// ============================================================================
// Critical Issue Types
// ============================================================================

export type IssueSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface CriticalIssue {
  id: string;
  category: string;
  severity: IssueSeverity;
  title: string;
  description: string;
  impact: string;
  evidence: Evidence[];
  recommendation: string;
  deploymentBlocker: boolean;
}

export type EvidenceType = 'ERROR' | 'QUERY_RESULT' | 'PERFORMANCE_METRIC' | 'SECURITY_FINDING';

export interface Evidence {
  type: EvidenceType;
  description: string;
  data: any;
  timestamp: Date;
}

// ============================================================================
// RLS Policy Types
// ============================================================================

export type PolicyOperation = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';

export interface PolicyInfo {
  tableName: string;
  policyName: string;
  operation: PolicyOperation;
  roles: string[];
  definition: string;
  tested: boolean;
  testResult: 'PASS' | 'FAIL' | 'NOT_TESTED';
}

export interface PermissionIssue {
  tableName: string;
  operation: string;
  expectedBehavior: string;
  actualBehavior: string;
  severity: IssueSeverity;
  recommendation: string;
}

export interface IsolationViolation {
  tableName: string;
  description: string;
  severity: IssueSeverity;
  evidence: any;
}

export interface RLSAuditReport {
  tablesAudited: string[];
  policiesFound: PolicyInfo[];
  policiesMissing: string[];
  permissionIssues: PermissionIssue[];
  isolationViolations: IsolationViolation[];
  overallRating: 'SECURE' | 'MODERATE' | 'VULNERABLE';
}

// ============================================================================
// Database Function Types
// ============================================================================

export interface FunctionAccessInfo {
  functionName: string;
  accessible: boolean;
  testedWithRole: string;
  errorMessage?: string;
  executionTime?: number;
  testInputs: any;
  testOutputs: any;
}

export interface FunctionPermissionReport {
  functionsFound: string[];
  functionsMissing: string[];
  accessibleFunctions: FunctionAccessInfo[];
  deniedFunctions: FunctionAccessInfo[];
  overallStatus: 'ACCESSIBLE' | 'PARTIAL' | 'BLOCKED';
}

// ============================================================================
// Attendance Flow Types
// ============================================================================

export interface FlowStep {
  stepName: string;
  operation: string;
  input: any;
  output: any;
  success: boolean;
  duration: number;
  timestamp: Date;
}

export interface FlowError {
  step: string;
  errorType: string;
  message: string;
  stack?: string;
  recoverable: boolean;
}

export interface EndToEndFlowResult {
  steps: FlowStep[];
  overallSuccess: boolean;
  duration: number;
  attendanceRecordCreated: boolean;
  attendanceRecordId?: string;
  errors: FlowError[];
}

// ============================================================================
// Schema Validation Types
// ============================================================================

export interface ColumnValidation {
  tableName: string;
  columnName: string;
  dataType: string;
  nullable: boolean;
  present: boolean;
}

export interface ForeignKeyValidation {
  constraintName: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  valid: boolean;
}

export interface IndexValidation {
  indexName: string;
  tableName: string;
  columns: string[];
  unique: boolean;
  present: boolean;
}

export interface SchemaReport {
  tablesValidated: string[];
  requiredColumnsPresent: ColumnValidation[];
  requiredColumnsMissing: ColumnValidation[];
  foreignKeysValid: ForeignKeyValidation[];
  indexesPresent: IndexValidation[];
  overallStatus: 'VALID' | 'ISSUES_FOUND' | 'CRITICAL_MISSING';
}

// ============================================================================
// Performance Types
// ============================================================================

export interface PerformanceError {
  operation: string;
  errorType: string;
  message: string;
  timestamp: Date;
}

export interface PerformanceResult {
  operationName: string;
  concurrentOperations: number;
  successCount: number;
  failureCount: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
  p99Time: number;
  throughput: number;
  errors: PerformanceError[];
}

export interface QueryPerformance {
  queryName: string;
  query: string;
  executionTime: number;
  rowsAffected: number;
  slow: boolean;
}

export interface QueryPerformanceReport {
  queries: QueryPerformance[];
  slowQueries: QueryPerformance[];
  averageQueryTime: number;
  recommendations: string[];
}

export interface Bottleneck {
  component: string;
  operation: string;
  averageTime: number;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

export interface ResourceConstraint {
  resource: string;
  currentUsage: number;
  maxCapacity: number;
  utilizationPercent: number;
  recommendation: string;
}

export interface BottleneckReport {
  bottlenecks: Bottleneck[];
  resourceConstraints: ResourceConstraint[];
  optimizationRecommendations: string[];
}

// ============================================================================
// Security Types
// ============================================================================

export interface CollisionTestResult {
  tokensGenerated: number;
  uniqueTokens: number;
  duplicates: number;
  collisionRate: number;
  entropyEstimate: number;
  passed: boolean;
}

export interface SecurityVulnerability {
  type: string;
  severity: IssueSeverity;
  description: string;
  impact: string;
  remediation: string;
}

export interface SecurityReport {
  tokenSecurityRating: 'SECURE' | 'MODERATE' | 'WEAK';
  entropyBits: number;
  collisionProbability: number;
  vulnerabilities: SecurityVulnerability[];
  recommendations: string[];
}

// ============================================================================
// Integration Types
// ============================================================================

export interface IntegrationPoint {
  fromService: string;
  toService: string;
  operation: string;
  tested: boolean;
  success: boolean;
  latency: number;
}

export interface IntegrationFailure {
  services: string[];
  operation: string;
  errorMessage: string;
  impact: IssueSeverity;
  recommendation: string;
}

export interface IntegrationReport {
  servicesTested: string[];
  integrationPoints: IntegrationPoint[];
  failures: IntegrationFailure[];
  overallHealth: 'HEALTHY' | 'DEGRADED' | 'FAILING';
}

// ============================================================================
// Report Types
// ============================================================================

export interface Recommendation {
  priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  actionSteps: string[];
  estimatedEffort: string;
}

export interface ProductionReadinessAssessment {
  overallRating: 'READY' | 'CONDITIONAL' | 'NOT_READY';
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  criticalBlockers: string[];
  goNoGoRecommendation: 'GO' | 'NO_GO' | 'CONDITIONAL_GO';
  conditions: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface TestReport {
  executionTimestamp: Date;
  duration: number;
  testContext: TestContext;
  summary: TestSummary;
  suiteResults: TestSuiteResult[];
  criticalIssues: CriticalIssue[];
  recommendations: Recommendation[];
  productionReadiness: ProductionReadinessAssessment;
}

// ============================================================================
// Error Types
// ============================================================================

export enum TestErrorType {
  // Database Errors
  CONNECTION_FAILED = 'connection_failed',
  AUTHENTICATION_FAILED = 'authentication_failed',
  QUERY_FAILED = 'query_failed',
  RPC_FUNCTION_NOT_FOUND = 'rpc_function_not_found',
  PERMISSION_DENIED = 'permission_denied',
  RLS_VIOLATION = 'rls_violation',
  
  // BLE Service Errors
  SESSION_CREATION_FAILED = 'session_creation_failed',
  TOKEN_GENERATION_FAILED = 'token_generation_failed',
  SESSION_RESOLUTION_FAILED = 'session_resolution_failed',
  ATTENDANCE_SUBMISSION_FAILED = 'attendance_submission_failed',
  
  // Validation Errors
  SCHEMA_VALIDATION_FAILED = 'schema_validation_failed',
  DATA_INTEGRITY_FAILED = 'data_integrity_failed',
  SECURITY_VALIDATION_FAILED = 'security_validation_failed',
  
  // Performance Errors
  TIMEOUT = 'timeout',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  CONCURRENCY_FAILURE = 'concurrency_failure',
  
  // Configuration Errors
  MISSING_CONFIGURATION = 'missing_configuration',
  INVALID_TEST_CONTEXT = 'invalid_test_context'
}

export interface TestError {
  type: TestErrorType;
  message: string;
  details: any;
  stack?: string;
  recoverable: boolean;
  retryable: boolean;
}
