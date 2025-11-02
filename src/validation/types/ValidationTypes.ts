/**
 * Core validation types and interfaces for BLE System Validation Framework
 */

export type ValidationStatus = 'PASS' | 'FAIL' | 'CONDITIONAL' | 'PENDING' | 'SKIPPED';
export type ValidationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type ValidationCategory = 'NATIVE' | 'BRIDGE' | 'DATABASE' | 'SECURITY' | 'PERFORMANCE' | 'CONFIG';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ProductionReadiness = 'PRODUCTION_READY' | 'NEEDS_FIXES' | 'MAJOR_ISSUES' | 'NOT_READY';

export interface ValidationResult {
  id: string;
  name: string;
  status: ValidationStatus;
  severity: ValidationSeverity;
  category: ValidationCategory;
  message: string;
  details?: string | Record<string, any>;
  evidence?: Evidence[];
  recommendations?: string[];
  executionTime?: number;
  timestamp: Date;
}

export interface Evidence {
  type: 'CODE_REFERENCE' | 'TEST_RESULT' | 'PERFORMANCE_METRIC' | 'SECURITY_FINDING' | 'CONFIG_ISSUE';
  location: string;
  details: string;
  severity: ValidationSeverity;
  lineNumber?: number;
  codeSnippet?: string;
}

export interface ValidationPhaseResult {
  phaseName: string;
  status: ValidationStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  results: ValidationResult[];
  summary: string;
  criticalIssues: ValidationResult[];
  recommendations: string[];
}

export interface BLESystemValidationResult {
  executionId: string;
  executionTimestamp: Date;
  validationVersion: string;
  
  // Phase Results
  staticAnalysisPhase?: ValidationPhaseResult;
  databaseSimulationPhase?: ValidationPhaseResult;
  securityAuditPhase?: ValidationPhaseResult;
  performanceAnalysisPhase?: ValidationPhaseResult;
  configurationAuditPhase?: ValidationPhaseResult;
  
  // Overall Assessment
  overallStatus: ValidationStatus;
  productionReadiness: ProductionReadiness;
  confidenceLevel: ConfidenceLevel;
  criticalIssues: ValidationResult[];
  allRecommendations: string[];
  
  // Metrics
  totalExecutionTime: number;
  totalIssuesFound: number;
  issuesByCategory: Record<ValidationCategory, number>;
  issuesBySeverity: Record<ValidationSeverity, number>;
}

export interface ValidationProgress {
  currentPhase: string;
  currentStep: string;
  completedSteps: number;
  totalSteps: number;
  percentComplete: number;
  estimatedTimeRemaining?: number;
  errors: string[];
  warnings: string[];
}

export interface ValidationConfig {
  enabledPhases: string[];
  skipOptionalChecks: boolean;
  maxConcurrentUsers: number;
  timeoutMs: number;
  outputFormat: 'JSON' | 'MARKDOWN' | 'HTML';
  logLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
}

// Bridge Layer Analysis Types
export interface BridgeValidationResult {
  passed: boolean;
  issues: string[];
  recommendations: string[];
  score: number;
}

export interface SecurityAnalysis extends BridgeValidationResult {
  vulnerabilities?: string[];
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface RaceConditionAssessment {
  type: string;
  location: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

export interface MemoryLeakAssessment {
  type: string;
  location: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

export interface CollisionAnalysis {
  hashSpaceSize: number;
  expectedCollisionRate: number;
  collisionProbability: number;
  maxRecommendedSessions: number;
  issues: string[];
  recommendations: string[];
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface BLEContextAnalysis {
  nativeModuleImports: BridgeValidationResult;
  permissionRequestFlow: BridgeValidationResult;
  broadcastingStateManagement: BridgeValidationResult;
  scanningStateManagement: BridgeValidationResult;
  eventListenersCleanup: BridgeValidationResult;
  errorHandling: BridgeValidationResult;
  raceConditionRisks: RaceConditionAssessment[];
  memoryLeakRisks: MemoryLeakAssessment[];
  overallQuality: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
}

export interface BLEHelperAnalysis {
  sessionTokenGeneration: SecurityAnalysis;
  tokenHashingAlgorithm: SecurityAnalysis;
  organizationCodeMapping: BridgeValidationResult;
  uuidValidation: BridgeValidationResult;
  distanceCalculation: BridgeValidationResult;
  collisionResistance: CollisionAnalysis;
  overallSecurity: 'SECURE' | 'MODERATE' | 'VULNERABLE';
}

export interface PermissionFlowAnalysis {
  platformDetection: BridgeValidationResult;
  permissionStatusTracking: BridgeValidationResult;
  recoveryGuidance: BridgeValidationResult;
  gracefulDegradation: BridgeValidationResult;
  overallRating: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
}

export interface BridgeLayerAnalysisResult {
  bleContextAnalysis: BLEContextAnalysis;
  bleHelperAnalysis: BLEHelperAnalysis;
  permissionFlowAnalysis: PermissionFlowAnalysis;
  overallBridgeQuality: 'EXCELLENT' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR';
  criticalIssues: string[];
  recommendations: string[];
}

// iOS Limitation Analysis Types
export interface IOSBackgroundLimitation {
  limitationType: 'COREBLUETOOTH' | 'IBEACON' | 'NOTIFICATION' | 'SYSTEM';
  description: string;
  affectedVersions: string[];
  workaroundAvailable: boolean;
  workaroundDescription?: string;
  userImpact: 'HIGH' | 'MEDIUM' | 'LOW';
  documentationSource: string;
}

export interface IOSVersionCompatibility {
  version: string;
  backgroundBLESupport: 'FULL' | 'LIMITED' | 'NONE';
  iBeaconSupport: 'FULL' | 'LIMITED' | 'NONE';
  notificationSupport: 'FULL' | 'LIMITED' | 'NONE';
  knownIssues: string[];
  recommendations: string[];
}

export interface UserWorkflowImpact {
  scenario: string;
  impactDescription: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  mitigationStrategy?: string;
  userExperienceRating: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR';
}

export interface IOSLimitationAnalysisResult {
  backgroundLimitations: IOSBackgroundLimitation[];
  versionCompatibility: IOSVersionCompatibility[];
  userWorkflowImpacts: UserWorkflowImpact[];
  sessionDurationViability: BridgeValidationResult;
  foregroundRequirements: BridgeValidationResult;
  mitigationStrategies: string[];
  overallIOSViability: 'VIABLE' | 'LIMITED' | 'NOT_RECOMMENDED';
  criticalLimitations: string[];
  recommendations: string[];
}

// User Workflow Recommendation Types
export interface SessionDurationImpact {
  duration: string;
  userBurden: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  batteryImpact: 'MINIMAL' | 'MODERATE' | 'HIGH' | 'SEVERE';
  usabilityRating: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR';
  recommendedForProduction: boolean;
  mitigationRequired: string[];
}

export interface UserExperienceWorkflow {
  workflowName: string;
  steps: WorkflowStep[];
  userFriction: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  successProbability: number; // 0-100%
  fallbackRequired: boolean;
  userEducationRequired: string[];
}

export interface WorkflowStep {
  stepNumber: number;
  action: string;
  userRequirement: string;
  potentialFailurePoints: string[];
  mitigationActions: string[];
}

export interface MitigationStrategy {
  strategyName: string;
  targetLimitation: string;
  implementation: string;
  effectiveness: 'HIGH' | 'MEDIUM' | 'LOW';
  userImpact: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  developmentEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendedPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface LimitationCommunication {
  limitationType: 'PLATFORM_RESTRICTION' | 'IMPLEMENTATION_BUG' | 'DESIGN_CHOICE';
  userMessage: string;
  technicalExplanation: string;
  documentationRequired: string[];
  supportResponseTemplate: string;
}

export interface UserWorkflowRecommendationResult {
  sessionDurationAnalysis: SessionDurationImpact[];
  userExperienceWorkflows: UserExperienceWorkflow[];
  mitigationStrategies: MitigationStrategy[];
  limitationCommunications: LimitationCommunication[];
  overallUserExperience: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR' | 'UNACCEPTABLE';
  productionRecommendation: 'PROCEED' | 'PROCEED_WITH_CHANGES' | 'MAJOR_REDESIGN' | 'NOT_VIABLE';
  criticalUserIssues: string[];
  prioritizedRecommendations: string[];
}

// Executive Summary Types
export interface SystemHealthRating {
  rating: 'PASS' | 'FAIL' | 'CONDITIONAL';
  score: number; // 0-1
  componentScores: {
    nativeModules: number;
    bridgeLayer: number;
    database: number;
    security: number;
    performance: number;
    configuration: number;
  };
  summary: string;
}

export interface CriticalIssue {
  id: string;
  category: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  component: 'NATIVE' | 'BRIDGE' | 'DATABASE' | 'SECURITY' | 'PERFORMANCE' | 'CONFIG';
  title: string;
  description: string;
  impact: string;
  evidence: Evidence[];
  recommendation: string;
  estimatedEffort: 'LOW' | 'MEDIUM' | 'HIGH';
  deploymentBlocker: boolean;
  impactSummary?: string;
  remediationSummary?: string;
}

export interface GoNoGoRecommendation {
  recommendation: 'GO' | 'NO_GO' | 'CONDITIONAL_GO';
  justification: string;
  conditions: string[];
  timeline: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RiskAssessment {
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  securityRisks: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    issues: string[];
    mitigation: string;
  };
  performanceRisks: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    issues: string[];
    mitigation: string;
  };
  functionalRisks: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    issues: string[];
    mitigation: string;
  };
  businessImpact: string;
  mitigationStrategies: string[];
}

export interface ExecutiveSummary {
  executionTimestamp: Date;
  validationVersion: string;
  systemHealthRating: SystemHealthRating;
  criticalIssues: CriticalIssue[];
  goNoGoRecommendation: GoNoGoRecommendation;
  confidenceLevel: {
    level: 'HIGH' | 'MEDIUM' | 'LOW';
    score: number;
    factors: string[];
  };
  riskAssessment: RiskAssessment;
  keyFindings: string[];
  nextSteps: string[];
}

// Additional types needed for comprehensive validation result
export interface IOSAnalysisResult {
  coreBluetoothIntegration: ValidationResult;
  moduleRegistration: ValidationResult;
  iBeaconConfiguration: ValidationResult;
  permissionHandling: ValidationResult;
  backgroundModeSupport: ValidationResult;
  memoryLeakRisks: MemoryLeakAssessment[];
  threadingIssues: ThreadingIssue[];
  overallRating: 'PASS' | 'FAIL' | 'CONDITIONAL';
}

export interface AndroidAnalysisResult {
  bluetoothLeIntegration: ValidationResult;
  altBeaconLibraryUsage: ValidationResult;
  permissionHandling: ValidationResult;
  dualScanningMode: ValidationResult;
  beaconTransmitterSetup: ValidationResult;
  memoryLeakRisks: MemoryLeakAssessment[];
  threadingIssues: ThreadingIssue[];
  overallRating: 'PASS' | 'FAIL' | 'CONDITIONAL';
}

export interface ThreadingIssue {
  type: string;
  location: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

export interface FunctionValidationResult {
  syntaxValidation: ValidationResult;
  securityDefinerUsage: ValidationResult;
  rlsCompliance: ValidationResult;
  inputValidation: ValidationResult;
  errorHandling: ValidationResult;
  performanceOptimization: ValidationResult;
  securityVulnerabilities: SecurityVulnerability[];
  overallRating: 'SECURE' | 'MODERATE' | 'VULNERABLE';
}

export interface SecurityVulnerability {
  type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  location: string;
  recommendation: string;
  cveReference?: string;
}

export interface DatabaseSecurityAudit {
  sqlInjectionRisks: SQLInjectionAssessment[];
  rlsBypassRisks: RLSBypassAssessment[];
  informationDisclosureRisks: InformationDisclosureRisk[];
  accessControlValidation: AccessControlResult;
  overallSecurityRating: 'SECURE' | 'MODERATE' | 'VULNERABLE';
}

export interface SQLInjectionAssessment {
  location: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  recommendation: string;
}

export interface RLSBypassAssessment {
  policyName: string;
  bypassMethod: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  recommendation: string;
}

export interface InformationDisclosureRisk {
  type: string;
  location: string;
  sensitiveData: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

export interface AccessControlResult {
  authenticationValidation: ValidationResult;
  authorizationValidation: ValidationResult;
  roleBasedAccess: ValidationResult;
  organizationIsolation: ValidationResult;
  overallRating: 'SECURE' | 'MODERATE' | 'VULNERABLE';
}

export interface SimulationStep {
  stepName: string;
  operation: string;
  input: any;
  expectedOutput: any;
  actualOutput: any;
  success: boolean;
  executionTime: number;
  notes: string[];
}

export interface FlowSimulationResult {
  flowName: string;
  steps: SimulationStep[];
  overallSuccess: boolean;
  executionTime: number;
  errors: SimulationError[];
  dataIntegrity: DataIntegrityResult;
}

export interface SimulationError {
  step: string;
  errorType: string;
  message: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DataIntegrityResult {
  dataConsistency: boolean;
  foreignKeyIntegrity: boolean;
  constraintViolations: string[];
  overallRating: 'PASS' | 'FAIL';
}

export interface ErrorScenarioResult {
  scenarioName: string;
  errorType: string;
  triggerCondition: string;
  expectedBehavior: string;
  actualBehavior: string;
  handledGracefully: boolean;
  userImpact: 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE';
}

export interface ScalabilityAssessment {
  maxConcurrentUsers: number;
  averageResponseTime: number;
  errorRate: number;
  bottlenecks: PerformanceBottleneck[];
  overallPerformance: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR';
}

export interface PerformanceBottleneck {
  component: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
}

export interface ResourceUsageEstimate {
  batteryDrainEstimate: BatteryUsageProfile;
  memoryConsumption: MemoryUsageProfile;
  cpuUtilization: CPUUsageProfile;
  networkBandwidth: NetworkUsageProfile;
  sustainabilityRating: 'SUSTAINABLE' | 'MODERATE' | 'CONCERNING';
}

export interface BatteryUsageProfile {
  estimatedDrainPerHour: number;
  unit: string;
  comparisonToBaseline: string;
  sustainabilityAssessment: string;
}

export interface MemoryUsageProfile {
  baselineUsage: number;
  peakUsage: number;
  averageUsage: number;
  unit: string;
  leakRisk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface CPUUsageProfile {
  averageUsage: number;
  peakUsage: number;
  unit: string;
  thermalImpact: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface NetworkUsageProfile {
  averageBandwidth: number;
  peakBandwidth: number;
  unit: string;
  dataEfficiency: 'EXCELLENT' | 'GOOD' | 'POOR';
}

export interface AppConfigAudit {
  appUUIDPresence: ValidationResult;
  iosPermissions: PermissionValidationResult[];
  iosBackgroundModes: BackgroundModeValidation;
  androidPermissions: PermissionValidationResult[];
  expoPluginConfiguration: PluginConfigurationResult;
  overallReadiness: 'READY' | 'NEEDS_CONFIGURATION' | 'MISSING_CRITICAL';
}

export interface PermissionValidationResult {
  permission: string;
  declared: boolean;
  required: boolean;
  usageDescription?: string;
  status: 'VALID' | 'MISSING' | 'INVALID';
}

export interface BackgroundModeValidation {
  bluetoothCentral: boolean;
  bluetoothPeripheral: boolean;
  backgroundProcessing: boolean;
  status: 'COMPLETE' | 'PARTIAL' | 'MISSING';
}

export interface PluginConfigurationResult {
  nativeModulesConfigured: boolean;
  buildSettingsValid: boolean;
  dependenciesResolved: boolean;
  status: 'VALID' | 'NEEDS_CONFIGURATION' | 'INVALID';
}

export interface EASConfigAudit {
  developmentProfile: ValidationResult;
  productionProfile: ValidationResult;
  nativeModuleSupport: ValidationResult;
  environmentVariables: ValidationResult;
  overallReadiness: 'READY' | 'NEEDS_CONFIGURATION' | 'MISSING_CRITICAL';
}

export interface DeploymentReadinessAssessment {
  configurationCompleteness: number; // 0-100%
  criticalMissingItems: string[];
  recommendedOptimizations: string[];
  deploymentRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  overallReadiness: 'READY' | 'NEEDS_CONFIGURATION' | 'MISSING_CRITICAL';
}

// Update the main validation result interface to include all analysis results
export interface ComprehensiveBLESystemValidationResult extends BLESystemValidationResult {
  // Component Analysis Results
  nativeModuleAnalysis?: {
    ios: IOSAnalysisResult;
    android: AndroidAnalysisResult;
  };
  
  bridgeLayerAnalysis?: {
    bleContext: BLEContextAnalysis;
    bleHelper: BLEHelperAnalysis;
    permissionFlow: PermissionFlowAnalysis;
  };
  
  databaseAnalysis?: {
    functionValidation: FunctionValidationResult[];
    securityAudit: DatabaseSecurityAudit;
    performanceTest: any; // ConcurrencyTestResult - to be defined
  };
  
  endToEndSimulation?: {
    officerFlow: FlowSimulationResult;
    memberFlow: FlowSimulationResult;
    errorScenarios: ErrorScenarioResult[];
  };
  
  performanceAnalysis?: {
    scalabilityAssessment: ScalabilityAssessment;
    resourceUsage: ResourceUsageEstimate;
    bottleneckAnalysis: any; // BottleneckAnalysis - to be defined
  };
  
  configurationAudit?: {
    appConfig: AppConfigAudit;
    easConfig: EASConfigAudit;
    deploymentReadiness: DeploymentReadinessAssessment;
  };
}

// Technical Analysis Report Types
export interface TechnicalAnalysisReport {
  executionTimestamp: Date;
  validationVersion: string;
  executionId: string;
  
  codeReviewSection: CodeReviewSection;
  securityAuditSection: SecurityAuditSection;
  performanceAnalysisSection: PerformanceAnalysisSection;
  endToEndValidationSection: EndToEndValidationSection;
  
  technicalSummary: string;
  implementationRecommendations: string[];
  architecturalFindings: string[];
}

export interface CodeReviewSection {
  nativeModuleAnalysis: {
    iosFindings: any;
    androidFindings: any;
    crossPlatformIssues: string[];
  };
  bridgeLayerAnalysis: {
    contextImplementation: any;
    helperUtilities: any;
    permissionHandling: any;
    integrationIssues: any;
  };
  databaseImplementation: {
    functionImplementations: any[];
    schemaDesign: any;
    rlsPolicies: any;
    queryOptimization: any;
  };
  overallCodeQuality: string;
  criticalCodeIssues: any[];
  refactoringRecommendations: string[];
}

export interface SecurityAuditSection {
  vulnerabilityAssessment: {
    criticalVulnerabilities: CriticalIssue[];
    highRiskIssues: CriticalIssue[];
    mediumRiskIssues: CriticalIssue[];
    lowRiskIssues: CriticalIssue[];
  };
  tokenSecurityAnalysis: any;
  databaseSecurityAnalysis: any;
  bleProtocolSecurity: any;
  organizationIsolation: any;
  
  securityRating: string;
  complianceAssessment: any;
  remediationPlan: any[];
  securityTestingRecommendations: string[];
}

export interface PerformanceAnalysisSection {
  scalabilityMetrics: {
    concurrentUserCapacity: number;
    responseTimeAnalysis: any;
    throughputMeasurements: any;
    errorRateAnalysis: any;
  };
  resourceUtilizationAnalysis: {
    memoryUsageProfile?: MemoryUsageProfile;
    cpuUtilizationProfile?: CPUUsageProfile;
    batteryImpactAssessment?: BatteryUsageProfile;
    networkBandwidthUsage?: NetworkUsageProfile;
  };
  bottleneckIdentification: {
    databaseBottlenecks: PerformanceBottleneck[];
    nativeModuleBottlenecks: PerformanceBottleneck[];
    bridgeLayerBottlenecks: PerformanceBottleneck[];
    systemLevelBottlenecks: PerformanceBottleneck[];
  };
  optimizationRecommendations: {
    immediateOptimizations: string[];
    mediumTermImprovements: string[];
    architecturalChanges: string[];
    monitoringRecommendations: string[];
  };
  performanceRating: string;
  scalabilityAssessment: any;
}

export interface EndToEndValidationSection {
  officerWorkflowValidation: {
    flowResults?: FlowSimulationResult;
    dataIntegrityValidation: any;
    errorHandlingValidation: any;
    performanceMetrics: any;
  };
  memberWorkflowValidation: {
    flowResults?: FlowSimulationResult;
    dataIntegrityValidation: any;
    errorHandlingValidation: any;
    performanceMetrics: any;
  };
  errorScenarioValidation: {
    scenarioResults: ErrorScenarioResult[];
    gracefulDegradation: any;
    recoveryMechanisms: any;
    userExperienceImpact: any;
  };
  integrationValidation: {
    componentIntegration: any;
    dataFlowValidation: any;
    stateManagementValidation: any;
    eventHandlingValidation: any;
  };
  overallIntegrationRating: string;
  dataIntegrityConfirmation: string;
  functionalCompletenessAssessment: string;
}

// Structured Issue Tracker Types
export type IssueCategory = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'CANCELLED';
export type PhaseStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';

export interface IssueDatabase {
  executionId: string;
  generationTimestamp: Date;
  totalIssueCount: number;
  
  issuesByCategory: Record<IssueCategory, CriticalIssue[]>;
  issuesBySeverity: Record<string, number>;
  issuesByComponent: Record<string, number>;
  
  allIssues: CriticalIssue[];
  deploymentBlockers: CriticalIssue[];
  criticalPath: string[];
  
  metadata: {
    validationVersion: string;
    analysisCompleteness: number;
    confidenceLevel: ConfidenceLevel;
  };
}

export interface PrioritizedIssueList {
  generationTimestamp: Date;
  prioritizationCriteria: string[];
  
  criticalIssues: {
    deploymentBlockers: CriticalIssue[];
    securityVulnerabilities: CriticalIssue[];
    functionalFailures: CriticalIssue[];
  };
  
  highPriorityIssues: {
    performanceBottlenecks: CriticalIssue[];
    securityConcerns: CriticalIssue[];
    reliabilityIssues: CriticalIssue[];
    configurationGaps: CriticalIssue[];
  };
  
  mediumPriorityIssues: {
    codeQualityIssues: CriticalIssue[];
    performanceOptimizations: CriticalIssue[];
    securityHardening: CriticalIssue[];
    configurationImprovements: CriticalIssue[];
  };
  
  lowPriorityIssues: {
    codeStyleIssues: CriticalIssue[];
    documentationGaps: CriticalIssue[];
    futureEnhancements: CriticalIssue[];
  };
  
  totalIssueCount: number;
  priorityDistribution: Record<string, number>;
}

export interface RemediationTask {
  taskId: string;
  issueId: string;
  title: string;
  description: string;
  category: IssueCategory;
  component: ValidationCategory;
  estimatedEffort: number; // in hours
  skillsRequired: string[];
  dependencies: string[];
  deliverables: string[];
  acceptanceCriteria: string[];
  testingRequirements: string[];
}

export interface IssueDependency {
  dependentTaskId: string;
  prerequisiteTaskId: string;
  dependencyType: 'SECURITY_FIRST' | 'PRIORITY_ORDER' | 'TECHNICAL_DEPENDENCY' | 'RESOURCE_DEPENDENCY';
  description: string;
}

export interface RemediationPhase {
  phaseId: string;
  phaseName: string;
  description: string;
  tasks: RemediationTask[];
  estimatedDuration: number; // in hours
  dependencies: string[];
  deliverables: string[];
  successCriteria: string[];
}

export interface RemediationRoadmap {
  generationTimestamp: Date;
  roadmapVersion: string;
  
  executionPhases: RemediationPhase[];
  totalEstimatedEffort: number;
  criticalPathDuration: number;
  
  resourceRequirements: {
    developmentHours: number;
    testingHours: number;
    reviewHours: number;
    specializedSkills: string[];
  };
  
  riskAssessment: {
    implementationRisks: string[];
    dependencyRisks: string[];
    timelineRisks: string[];
    mitigationStrategies: string[];
  };
  
  milestones: RemediationMilestone[];
  deliverables: RemediationDeliverable[];
  successCriteria: string[];
}

export interface RemediationMilestone {
  milestoneId: string;
  name: string;
  description: string;
  targetDate: Date | null;
  deliverables: string[];
  successCriteria: string[];
}

export interface RemediationDeliverable {
  deliverableId: string;
  name: string;
  phase: string;
  description: string;
  acceptanceCriteria: string[];
}

export interface PhaseTracking {
  phaseId: string;
  phaseName: string;
  status: PhaseStatus;
  startDate: Date | null;
  endDate: Date | null;
  completionPercentage: number;
  tasksCompleted: number;
  totalTasks: number;
  currentTask: string | null;
  blockers: string[];
  notes: string[];
}

export interface TaskTracking {
  taskId: string;
  phaseId: string;
  status: TaskStatus;
  assignee: string | null;
  startDate: Date | null;
  endDate: Date | null;
  completionPercentage: number;
  actualEffort: number;
  remainingEffort: number;
  blockers: string[];
  notes: string[];
  lastUpdated: Date;
}

export interface IssueResolutionTracking {
  issueId: string;
  taskId: string;
  status: IssueStatus;
  resolution: string | null;
  resolutionDate: Date | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  verificationDate: Date | null;
  reopenCount: number;
  lastUpdated: Date;
}

export interface ProgressTracker {
  initializationTimestamp: Date;
  roadmapVersion: string;
  
  phaseTracking: PhaseTracking[];
  taskTracking: TaskTracking[];
  issueResolutionTracking: IssueResolutionTracking[];
  
  overallProgress: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    overallCompletionPercentage: number;
    estimatedCompletionDate: Date;
    actualStartDate: Date | null;
    projectedEndDate: Date | null;
  };
  
  metrics: {
    velocityTracking: VelocityMetric[];
    burndownData: BurndownDataPoint[];
    qualityMetrics: {
      defectRate: number;
      reworkRate: number;
      testPassRate: number;
    };
    resourceUtilization: {
      plannedHours: number;
      actualHours: number;
      efficiency: number;
    };
  };
  
  reportingSchedule: {
    dailyStandups: boolean;
    weeklyReports: boolean;
    milestoneReviews: boolean;
    stakeholderUpdates: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  };
}

export interface VelocityMetric {
  date: Date;
  tasksCompleted: number;
  hoursCompleted: number;
  sprintVelocity: number;
}

export interface BurndownDataPoint {
  date: Date;
  remainingTasks: number;
  remainingHours: number;
  idealRemaining: number;
  actualRemaining: number;
}

// Deployment Readiness Checklist Types
export type ChecklistStatus = 'PASS' | 'FAIL' | 'PARTIAL' | 'NOT_APPLICABLE';
export type ChecklistPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ChecklistCategory = 'CONFIGURATION' | 'PERMISSIONS' | 'BUILD_CONFIG' | 'MONITORING';

export interface DeploymentReadinessItem {
  id: string;
  category: ChecklistCategory;
  title: string;
  description: string;
  status: ChecklistStatus;
  priority: ChecklistPriority;
  evidence: string[];
  remediation: string;
  validationSteps: string[];
  relatedIssues?: string[];
  testingRequirements?: string[];
  validationCriteria?: string[];
}

export interface ConfigurationCompletenessCheck {
  category: ChecklistCategory;
  totalItems: number;
  completedItems: number;
  criticalItems: DeploymentReadinessItem[];
  missingItems: DeploymentReadinessItem[];
  items: DeploymentReadinessItem[];
  completenessPercentage: number;
  overallStatus: ChecklistStatus;
}

export interface PermissionValidationChecklist {
  category: ChecklistCategory;
  totalItems: number;
  completedItems: number;
  criticalItems: DeploymentReadinessItem[];
  missingItems: DeploymentReadinessItem[];
  items: DeploymentReadinessItem[];
  completenessPercentage: number;
  overallStatus: ChecklistStatus;
}

export interface BuildConfigurationValidator {
  category: ChecklistCategory;
  totalItems: number;
  completedItems: number;
  criticalItems: DeploymentReadinessItem[];
  missingItems: DeploymentReadinessItem[];
  items: DeploymentReadinessItem[];
  completenessPercentage: number;
  overallStatus: ChecklistStatus;
}

export interface MonitoringSetupChecker {
  category: ChecklistCategory;
  totalItems: number;
  completedItems: number;
  criticalItems: DeploymentReadinessItem[];
  missingItems: DeploymentReadinessItem[];
  items: DeploymentReadinessItem[];
  completenessPercentage: number;
  overallStatus: ChecklistStatus;
}

export interface DeploymentReadinessChecklist {
  generationTimestamp: Date;
  validationVersion: string;
  executionId: string;
  
  configurationCompleteness: ConfigurationCompletenessCheck;
  permissionValidation: PermissionValidationChecklist;
  buildConfiguration: BuildConfigurationValidator;
  monitoringSetup: MonitoringSetupChecker;
  
  overallReadiness: ChecklistStatus;
  criticalMissingItems: string[];
  recommendedActions: string[];
  deploymentRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  
  preDeploymentTasks: string[];
  postDeploymentTasks: string[];
  rollbackProcedures: string[];
  
  signOffRequirements: string[];
  deploymentTimeline: string[];
}

// Comprehensive Report Types
export interface ComprehensiveValidationReport {
  reportMetadata: {
    generationTimestamp: Date;
    validationVersion: string;
    executionId: string;
    reportVersion: string;
    generatedBy: string;
  };

  executiveSummary: ExecutiveSummary;
  technicalAnalysis: TechnicalAnalysisReport;
  issueTracking: {
    issueDatabase: IssueDatabase;
    prioritizedIssues: PrioritizedIssueList;
    remediationRoadmap: RemediationRoadmap;
    progressTracker: ProgressTracker;
  };
  deploymentReadiness: DeploymentReadinessChecklist;

  // Cross-cutting analysis
  riskAnalysis: {
    overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    securityRisks: RiskCategory;
    operationalRisks: RiskCategory;
    technicalRisks: RiskCategory;
    businessRisks: RiskCategory;
    riskMitigationPlan: string[];
    contingencyPlans: string[];
  };

  recommendationSummary: {
    immediateActions: string[];
    shortTermRecommendations: string[];
    mediumTermRecommendations: string[];
    longTermRecommendations: string[];
    strategicRecommendations: string[];
  };

  nextSteps: string[];

  reportStatistics: {
    validationCoverage: {
      totalComponents: number;
      analyzedComponents: number;
      coveragePercentage: number;
    };
    issueStatistics: {
      totalIssues: number;
      criticalIssues: number;
      highPriorityIssues: number;
      deploymentBlockers: number;
      securityIssues: number;
      performanceIssues: number;
    };
    deploymentReadiness: {
      overallReadiness: ChecklistStatus;
      configurationCompleteness: number;
      permissionReadiness: number;
      buildConfigReadiness: number;
      monitoringReadiness: number;
      criticalMissingItems: number;
    };
    validationMetrics: {
      executionTime: number;
      confidenceLevel: ConfidenceLevel;
      analysisCompleteness: number;
      validationVersion: string;
    };
  };
}

export interface RiskCategory {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  issues: string[];
  impact: string;
  mitigation: string;
  timeline: string;
}