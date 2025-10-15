/**
 * Tests for PromptMaintenanceService
 */

import { PromptMaintenanceService, UpdateTrigger, MaintenanceSchedule } from '../PromptMaintenanceService';
import { ProjectInfoAggregator } from '../ProjectInfoAggregator';
import { PromptDeploymentService } from '../PromptDeploymentService';
import { readFile, writeFile, mkdir, stat } from 'fs/promises';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('../ProjectInfoAggregator');
jest.mock('../PromptDeploymentService');

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockStat = stat as jest.MockedFunction<typeof stat>;
const mockProjectInfoAggregator = ProjectInfoAggregator as jest.MockedClass<typeof ProjectInfoAggregator>;
const mockPromptDeploymentService = PromptDeploymentService as jest.MockedClass<typeof PromptDeploymentService>;

describe('PromptMaintenanceService', () => {
  let service: PromptMaintenanceService;
  let mockConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    service = new PromptMaintenanceService('/test/project');

    mockConfig = {
      maintenance: {
        lastUpdate: '2024-01-01T00:00:00.000Z',
        nextScheduledUpdate: '2024-01-08T00:00:00.000Z',
        updateFrequency: 'weekly',
        autoUpdate: false
      },
      versioning: {
        currentVersion: '1.0.0',
        versionHistory: [
          {
            version: '1.0.0',
            timestamp: '2024-01-01T00:00:00.000Z',
            changes: ['Initial version'],
            projectState: {
              completedFeatures: 5,
              inProgressFeatures: 2,
              plannedFeatures: 3,
              knownIssues: 1
            },
            checksum: 'abc123'
          }
        ],
        trackingEnabled: true
      },
      synchronization: {
        watchedFiles: [
          'COMPREHENSIVE_APP_DEVELOPMENT_REPORT.md',
          'src/services/**/*.ts'
        ],
        lastSync: '2024-01-01T00:00:00.000Z',
        autoSync: true
      },
      triggers: {
        featureCompletion: true,
        architectureChanges: true,
        securityUpdates: true,
        documentationUpdates: true
      }
    };

    // Setup mocks
    const mockAggregatorInstance = {
      detectFeatureStatus: jest.fn().mockResolvedValue({
        completedFeatures: [{ name: 'Auth', status: 'completed' }],
        inProgressFeatures: [{ name: 'Navigation', status: 'in-progress' }],
        plannedFeatures: [{ name: 'BLE', status: 'planned' }]
      }),
      getProjectStatus: jest.fn().mockResolvedValue({
        completedFeatures: [],
        inProgressFeatures: [],
        plannedFeatures: [],
        knownIssues: [],
        nextPriorities: [],
        performanceMetrics: {}
      })
    };

    const mockDeploymentInstance = {
      createStandalonePromptFile: jest.fn().mockResolvedValue('/test/output/prompt.md')
    };

    mockProjectInfoAggregator.mockImplementation(() => mockAggregatorInstance as any);
    mockPromptDeploymentService.mockImplementation(() => mockDeploymentInstance as any);
  });

  describe('initializeMaintenanceSystem', () => {
    it('should initialize maintenance system successfully', async () => {
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);

      await service.initializeMaintenanceSystem();

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('prompt-versions'),
        { recursive: true }
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('prompt-maintenance.json'),
        expect.stringContaining('maintenance'),
        'utf-8'
      );
    });

    it('should handle initialization errors', async () => {
      mockMkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(service.initializeMaintenanceSystem()).rejects.toThrow(
        'Failed to initialize maintenance system'
      );
    });
  });

  describe('checkForUpdates', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));
    });

    it('should detect feature completion changes', async () => {
      const result = await service.checkForUpdates();

      expect(result.updateNeeded).toBe(true);
      expect(result.triggers).toHaveLength(1);
      expect(result.triggers[0].type).toBe('feature-completion');
      expect(result.triggers[0].impact).toBe('major');
    });

    it('should detect scheduled updates', async () => {
      // Set next update to past date
      const pastConfig = {
        ...mockConfig,
        maintenance: {
          ...mockConfig.maintenance,
          nextScheduledUpdate: '2020-01-01T00:00:00.000Z'
        }
      };
      mockReadFile.mockResolvedValue(JSON.stringify(pastConfig));

      const result = await service.checkForUpdates();

      expect(result.updateNeeded).toBe(true);
      expect(result.triggers.some(t => t.type === 'manual')).toBe(true);
    });

    it('should return no updates when current', async () => {
      // Mock current project state to match version history
      const mockAggregatorInstance = {
        detectFeatureStatus: jest.fn().mockResolvedValue({
          completedFeatures: Array(5).fill({ name: 'Feature', status: 'completed' }),
          inProgressFeatures: Array(2).fill({ name: 'Feature', status: 'in-progress' }),
          plannedFeatures: Array(3).fill({ name: 'Feature', status: 'planned' })
        }),
        getProjectStatus: jest.fn().mockResolvedValue({
          completedFeatures: [],
          inProgressFeatures: [],
          plannedFeatures: [],
          knownIssues: [{ issue: 'Test issue' }],
          nextPriorities: [],
          performanceMetrics: {}
        })
      };
      mockProjectInfoAggregator.mockImplementation(() => mockAggregatorInstance as any);

      // Set future scheduled update
      const futureConfig = {
        ...mockConfig,
        maintenance: {
          ...mockConfig.maintenance,
          nextScheduledUpdate: '2030-01-01T00:00:00.000Z'
        }
      };
      mockReadFile.mockResolvedValue(JSON.stringify(futureConfig));
      mockStat.mockResolvedValue({ mtime: new Date('2020-01-01') } as any);

      const result = await service.checkForUpdates();

      expect(result.updateNeeded).toBe(false);
      expect(result.triggers).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      const result = await service.checkForUpdates();

      expect(result.updateNeeded).toBe(false);
      expect(result.triggers).toHaveLength(0);
      expect(result.recommendedAction).toContain('Unable to check for updates');
    });
  });

  describe('performUpdate', () => {
    const mockTriggers: UpdateTrigger[] = [
      {
        type: 'feature-completion',
        description: 'New feature completed',
        impact: 'major',
        requiresRegeneration: true
      }
    ];

    const mockConfig = {
      includeCredentials: false,
      includeMCPSetup: true,
      includeCustomization: true,
      targetEnvironment: 'development' as const,
      outputFormat: 'markdown' as const
    };

    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        versioning: { currentVersion: '1.0.0', versionHistory: [] }
      }));
      mockWriteFile.mockResolvedValue(undefined);
    });

    it('should perform update successfully', async () => {
      const result = await service.performUpdate(mockTriggers, mockConfig);

      expect(result.success).toBe(true);
      expect(result.newVersion).toBe('1.1.0'); // Major change increments minor version
      expect(result.changes).toContain('New feature completed');
      expect(result.outputPath).toBe('/test/output/prompt.md');
    });

    it('should create backup when requested', async () => {
      mockMkdir.mockResolvedValue(undefined);

      await service.performUpdate(mockTriggers, mockConfig, {
        createBackup: true,
        updateVersion: true,
        notifyUsers: false
      });

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('backups'),
        { recursive: true }
      );
    });

    it('should handle update errors', async () => {
      const mockDeploymentInstance = {
        createStandalonePromptFile: jest.fn().mockRejectedValue(new Error('Deployment failed'))
      };
      mockPromptDeploymentService.mockImplementation(() => mockDeploymentInstance as any);

      const result = await service.performUpdate(mockTriggers, mockConfig);

      expect(result.success).toBe(false);
      expect(result.newVersion).toBe('');
      expect(result.outputPath).toBe('');
    });
  });

  describe('synchronizeWithDocumentation', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));
    });

    it('should detect pending changes', async () => {
      // Mock file with recent modification
      mockStat.mockResolvedValue({
        mtime: new Date('2024-01-02T00:00:00.000Z') // After lastSync
      } as any);

      const result = await service.synchronizeWithDocumentation();

      expect(result.isUpToDate).toBe(false);
      expect(result.pendingChanges.length).toBeGreaterThan(0);
      expect(result.syncRecommendation).toContain('files have been modified');
    });

    it('should detect conflicting files', async () => {
      mockStat.mockRejectedValue(new Error('File not found'));

      const result = await service.synchronizeWithDocumentation();

      expect(result.isUpToDate).toBe(false);
      expect(result.conflictingFiles.length).toBeGreaterThan(0);
      expect(result.syncRecommendation).toContain('Conflicting files detected');
    });

    it('should report up-to-date status', async () => {
      // Mock file with old modification
      mockStat.mockResolvedValue({
        mtime: new Date('2023-12-31T00:00:00.000Z') // Before lastSync
      } as any);

      const result = await service.synchronizeWithDocumentation();

      expect(result.isUpToDate).toBe(true);
      expect(result.pendingChanges).toHaveLength(0);
      expect(result.conflictingFiles).toHaveLength(0);
    });
  });

  describe('setupAutomatedUpdates', () => {
    const mockSchedule: MaintenanceSchedule = {
      lastUpdate: '2024-01-01T00:00:00.000Z',
      nextScheduledUpdate: '2024-01-08T00:00:00.000Z',
      updateFrequency: 'weekly',
      autoUpdate: true
    };

    const mockPromptConfig = {
      includeCredentials: false,
      includeMCPSetup: true,
      includeCustomization: true,
      targetEnvironment: 'development' as const,
      outputFormat: 'markdown' as const
    };

    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));
      mockMkdir.mockResolvedValue(undefined);
      mockWriteFile.mockResolvedValue(undefined);
    });

    it('should setup automated updates successfully', async () => {
      await service.setupAutomatedUpdates(mockSchedule, mockPromptConfig);

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('scripts'),
        { recursive: true }
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('update-prompt.js'),
        expect.stringContaining('runAutomatedUpdate'),
        'utf-8'
      );
    });

    it('should update maintenance configuration', async () => {
      await service.setupAutomatedUpdates(mockSchedule, mockPromptConfig);

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('prompt-maintenance.json'),
        expect.stringContaining('"autoUpdate": true'),
        'utf-8'
      );
    });
  });

  describe('generateUpdateReport', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));
      mockStat.mockResolvedValue({
        mtime: new Date('2023-12-31T00:00:00.000Z')
      } as any);
    });

    it('should generate comprehensive update report', async () => {
      const report = await service.generateUpdateReport();

      expect(report).toContain('# Prompt Maintenance Report');
      expect(report).toContain('## Update Status');
      expect(report).toContain('## Synchronization Status');
      expect(report).toContain('## Version History');
      expect(report).toContain('## Maintenance Configuration');
      expect(report).toContain('## Recommendations');
    });

    it('should include current status information', async () => {
      const report = await service.generateUpdateReport();

      expect(report).toContain('Update Needed');
      expect(report).toContain('Last Sync');
      expect(report).toContain('Current Version');
      expect(report).toContain('Update Frequency');
    });

    it('should handle report generation errors', async () => {
      mockReadFile.mockRejectedValue(new Error('Config error'));

      const report = await service.generateUpdateReport();

      expect(report).toContain('# Prompt Maintenance Report - Error');
      expect(report).toContain('Failed to generate maintenance report');
    });
  });

  describe('version management', () => {
    beforeEach(() => {
      mockReadFile.mockResolvedValue(JSON.stringify(mockConfig));
      mockWriteFile.mockResolvedValue(undefined);
    });

    it('should get version history', async () => {
      const versions = await service.getVersionHistory();

      expect(versions).toHaveLength(1);
      expect(versions[0].version).toBe('1.0.0');
      expect(versions[0].changes).toContain('Initial version');
    });

    it('should handle missing version history', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify({
        versioning: { versionHistory: [] }
      }));

      const versions = await service.getVersionHistory();

      expect(versions).toHaveLength(0);
    });

    it('should handle version history errors', async () => {
      mockReadFile.mockRejectedValue(new Error('File error'));

      const versions = await service.getVersionHistory();

      expect(versions).toHaveLength(0);
    });
  });
});