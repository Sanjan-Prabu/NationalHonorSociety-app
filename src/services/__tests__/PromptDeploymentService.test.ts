/**
 * Tests for PromptDeploymentService
 */

import { PromptDeploymentService, ShareablePromptConfig } from '../PromptDeploymentService';
import { ProjectInfoAggregator } from '../ProjectInfoAggregator';
import { CapabilitiesSummaryGenerator } from '../CapabilitiesSummaryGenerator';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../ProjectInfoAggregator');
jest.mock('../CapabilitiesSummaryGenerator');

const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockProjectInfoAggregator = ProjectInfoAggregator as jest.MockedClass<typeof ProjectInfoAggregator>;
const mockCapabilitiesGenerator = CapabilitiesSummaryGenerator as jest.MockedClass<typeof CapabilitiesSummaryGenerator>;

describe('PromptDeploymentService', () => {
  let service: PromptDeploymentService;
  let mockProjectInfo: any;
  let mockTechStack: any;
  let mockArchitecture: any;
  let mockFeatures: any[];
  let mockCapabilities: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    service = new PromptDeploymentService('/test/project');

    // Mock project data
    mockProjectInfo = {
      name: 'NHS/NHSA Test App',
      type: 'React Native Mobile Application',
      version: '1.0.0',
      purpose: 'Test application',
      targetUsers: ['NHS members', 'NHSA members'],
      coreFeatures: ['Authentication', 'Navigation'],
      problemStatement: 'Test problem',
      solutionOverview: 'Test solution'
    };

    mockTechStack = {
      frontend: { technology: 'React Native', purpose: 'Mobile development' },
      backend: { technology: 'Supabase', purpose: 'Backend services' },
      storage: { technology: 'Cloudflare R2', purpose: 'File storage' },
      bluetooth: { technology: 'React Native BLE', purpose: 'Attendance tracking' },
      navigation: { technology: 'React Navigation', purpose: 'Screen navigation' },
      analytics: { technology: 'Custom Analytics', purpose: 'User tracking' },
      fileHandling: { technology: 'Expo File System', purpose: 'File management' },
      mcpIntegration: { technology: 'Supabase MCP', purpose: 'AI integration' },
      authentication: { technology: 'Supabase Auth', purpose: 'User authentication' },
      stateManagement: { technology: 'React Context', purpose: 'State management' },
      styling: { technology: 'NativeWind', purpose: 'Styling' },
      testing: { technology: 'Jest', purpose: 'Testing' }
    };

    mockArchitecture = {
      multiOrgDesign: 'Multi-organization support',
      securityModel: 'RLS policies',
      schemaDesign: 'Multi-tenant schema',
      helperFunctions: ['is_member_of()', 'is_officer_of()'],
      monitoringSystems: ['Auth monitoring', 'Navigation tracking'],
      keyPatterns: ['Organization-aware hooks', 'Role-based rendering'],
      navigationStructure: 'Role-based navigation',
      dataFlow: 'Context-driven data flow'
    };

    mockFeatures = [
      {
        name: 'Authentication System',
        description: 'User authentication',
        status: 'completed',
        technicalDetails: 'JWT-based auth',
        dependencies: ['Supabase Auth'],
        requirements: ['Fast login']
      }
    ];

    mockCapabilities = {
      completedAuthentication: [],
      completedNavigation: [],
      completedMultiOrg: [],
      knownIssues: [],
      performanceMetrics: {
        authentication: { loginTime: '<1s', logoutTime: '<1s', improvement: '90%', optimizations: [] },
        navigation: { errorReduction: '100%', transitionSpeed: 'Instant', memoryUsage: 'Optimized', optimizations: [] },
        codebase: { codeReduction: '50%', maintainability: '60%', typeScript: '100%', optimizations: [] },
        reliability: { errorRate: '0%', uptime: '100%', fallbackSystems: [], monitoring: [] }
      },
      systemCapabilities: [],
      developmentStatus: {
        currentPhase: 'Production Ready',
        completionPercentage: 85,
        nextMilestones: [],
        readyForProduction: true,
        testingStatus: 'Complete',
        documentationStatus: 'Complete'
      }
    };

    // Setup mocks
    const mockAggregatorInstance = {
      getProjectInfo: jest.fn().mockResolvedValue(mockProjectInfo),
      getTechStackInfo: jest.fn().mockResolvedValue(mockTechStack),
      getArchitectureInfo: jest.fn().mockResolvedValue(mockArchitecture),
      detectFeatureStatus: jest.fn().mockResolvedValue({
        completedFeatures: mockFeatures,
        inProgressFeatures: [],
        plannedFeatures: []
      }),
      getMCPConfig: jest.fn().mockResolvedValue(null),
      getProjectStatus: jest.fn().mockResolvedValue({
        completedFeatures: mockFeatures,
        inProgressFeatures: [],
        plannedFeatures: [],
        knownIssues: [],
        nextPriorities: [],
        performanceMetrics: mockCapabilities.performanceMetrics
      }),
      generateCompleteMCPDocumentation: jest.fn().mockResolvedValue({
        setupInstructions: 'MCP setup instructions',
        troubleshootingGuide: 'MCP troubleshooting',
        secureTemplate: {},
        validationResult: { isValid: true, errors: [], warnings: [] }
      })
    };

    const mockCapabilitiesInstance = {
      generateComprehensiveCapabilitiesSummary: jest.fn().mockResolvedValue(mockCapabilities)
    };

    mockProjectInfoAggregator.mockImplementation(() => mockAggregatorInstance as any);
    mockCapabilitiesGenerator.mockImplementation(() => mockCapabilitiesInstance as any);
  });

  describe('generateShareablePrompt', () => {
    it('should generate a complete shareable prompt', async () => {
      const config: ShareablePromptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'development',
        outputFormat: 'markdown'
      };

      const result = await service.generateShareablePrompt(config);

      expect(result).toBeDefined();
      expect(result.promptContent).toContain('NHS/NHSA');
      expect(result.setupInstructions).toContain('Setup Instructions');
      expect(result.configurationGuide).toContain('Configuration Guide');
      expect(result.customizationOptions).toContain('Customization Options');
      expect(result.metadata.projectName).toBe('NHS/NHSA Test App');
      expect(result.metadata.targetEnvironment).toBe('development');
    });

    it('should exclude customization options when not requested', async () => {
      const config: ShareablePromptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: false,
        targetEnvironment: 'production',
        outputFormat: 'markdown'
      };

      const result = await service.generateShareablePrompt(config);

      expect(result.customizationOptions).toBe('');
    });

    it('should handle different target environments', async () => {
      const environments: Array<'development' | 'production' | 'generic'> = ['development', 'production', 'generic'];

      for (const env of environments) {
        const config: ShareablePromptConfig = {
          includeCredentials: false,
          includeMCPSetup: true,
          includeCustomization: true,
          targetEnvironment: env,
          outputFormat: 'markdown'
        };

        const result = await service.generateShareablePrompt(config);
        expect(result.metadata.targetEnvironment).toBe(env);
        expect(result.setupInstructions).toContain(env.toUpperCase());
      }
    });
  });

  describe('createStandalonePromptFile', () => {
    it('should create a standalone prompt file', async () => {
      const config: ShareablePromptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'development',
        outputFormat: 'markdown'
      };

      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      const filePath = await service.createStandalonePromptFile(config);

      expect(filePath).toContain('nhs-nhsa-context-prompt-development');
      expect(filePath).toContain('.md');
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('prompt-exports'),
        { recursive: true }
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('.md'),
        expect.stringContaining('NHS/NHSA Mobile Application'),
        'utf-8'
      );
    });

    it('should use custom output path when provided', async () => {
      const config: ShareablePromptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'development',
        outputFormat: 'markdown'
      };

      const customPath = '/custom/output/path';
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await service.createStandalonePromptFile(config, customPath);

      expect(mockMkdir).toHaveBeenCalledWith(customPath, { recursive: true });
    });

    it('should handle file creation errors gracefully', async () => {
      const config: ShareablePromptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'development',
        outputFormat: 'markdown'
      };

      mockMkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(service.createStandalonePromptFile(config)).rejects.toThrow(
        'Failed to create standalone prompt file'
      );
    });
  });

  describe('environment-specific instructions', () => {
    it('should generate development-specific instructions', async () => {
      const config: ShareablePromptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'development',
        outputFormat: 'markdown'
      };

      const result = await service.generateShareablePrompt(config);

      expect(result.setupInstructions).toContain('Development Setup');
      expect(result.setupInstructions).toContain('Mock data system');
      expect(result.setupInstructions).toContain('development credentials');
    });

    it('should generate production-specific instructions', async () => {
      const config: ShareablePromptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'production',
        outputFormat: 'markdown'
      };

      const result = await service.generateShareablePrompt(config);

      expect(result.setupInstructions).toContain('Production Setup');
      expect(result.setupInstructions).toContain('Full database schema');
      expect(result.setupInstructions).toContain('production security');
    });

    it('should generate generic instructions', async () => {
      const config: ShareablePromptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'generic',
        outputFormat: 'markdown'
      };

      const result = await service.generateShareablePrompt(config);

      expect(result.setupInstructions).toContain('Generic Setup');
      expect(result.setupInstructions).toContain('Adaptable to any environment');
      expect(result.setupInstructions).toContain('Flexible configuration');
    });
  });

  describe('error handling', () => {
    it('should handle project info aggregation errors', async () => {
      const mockAggregatorInstance = {
        getProjectInfo: jest.fn().mockRejectedValue(new Error('Project info error')),
        getTechStackInfo: jest.fn().mockResolvedValue(mockTechStack),
        getArchitectureInfo: jest.fn().mockResolvedValue(mockArchitecture),
        detectFeatureStatus: jest.fn().mockResolvedValue({ completedFeatures: [], inProgressFeatures: [], plannedFeatures: [] }),
        getMCPConfig: jest.fn().mockResolvedValue(null),
        getProjectStatus: jest.fn().mockResolvedValue({ completedFeatures: [], inProgressFeatures: [], plannedFeatures: [], knownIssues: [], nextPriorities: [], performanceMetrics: {} }),
        generateCompleteMCPDocumentation: jest.fn().mockResolvedValue({ setupInstructions: '', troubleshootingGuide: '', secureTemplate: {}, validationResult: { isValid: true, errors: [], warnings: [] } })
      };

      mockProjectInfoAggregator.mockImplementation(() => mockAggregatorInstance as any);

      const config: ShareablePromptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'development',
        outputFormat: 'markdown'
      };

      await expect(service.generateShareablePrompt(config)).rejects.toThrow(
        'Failed to generate shareable prompt'
      );
    });

    it('should handle capabilities generation errors', async () => {
      const mockCapabilitiesInstance = {
        generateComprehensiveCapabilitiesSummary: jest.fn().mockRejectedValue(new Error('Capabilities error'))
      };

      mockCapabilitiesGenerator.mockImplementation(() => mockCapabilitiesInstance as any);

      const config: ShareablePromptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'development',
        outputFormat: 'markdown'
      };

      await expect(service.generateShareablePrompt(config)).rejects.toThrow(
        'Failed to generate shareable prompt'
      );
    });
  });

  describe('content formatting', () => {
    it('should format prompt content with proper headers and sections', async () => {
      const config: ShareablePromptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'development',
        outputFormat: 'markdown'
      };

      const result = await service.generateShareablePrompt(config);

      expect(result.promptContent).toContain('# NHS/NHSA Mobile Application - AI Context Prompt');
      expect(result.promptContent).toContain('## Instructions for Use');
      expect(result.promptContent).toContain('## Context Prompt');
      expect(result.promptContent).toContain('## Additional Resources');
    });

    it('should include proper metadata in generated content', async () => {
      const config: ShareablePromptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'development',
        outputFormat: 'markdown'
      };

      const result = await service.generateShareablePrompt(config);

      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.projectName).toBe('NHS/NHSA Test App');
      expect(result.metadata.targetEnvironment).toBe('development');
      expect(result.metadata.generatedAt).toBeDefined();
    });
  });
});