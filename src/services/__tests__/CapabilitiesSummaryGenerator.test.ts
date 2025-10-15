/**
 * Test suite for CapabilitiesSummaryGenerator
 * 
 * Tests the generation of comprehensive capabilities summaries including
 * authentication, navigation, multi-org features, known issues, and performance metrics.
 */

import { CapabilitiesSummaryGenerator } from '../CapabilitiesSummaryGenerator';
import { ProjectInfoAggregator } from '../ProjectInfoAggregator';

// Mock the ProjectInfoAggregator
jest.mock('../ProjectInfoAggregator');

describe('CapabilitiesSummaryGenerator', () => {
  let generator: CapabilitiesSummaryGenerator;
  let mockProjectInfoAggregator: jest.Mocked<ProjectInfoAggregator>;

  beforeEach(() => {
    generator = new CapabilitiesSummaryGenerator();
    mockProjectInfoAggregator = new ProjectInfoAggregator() as jest.Mocked<ProjectInfoAggregator>;
    
    // Mock the detectFeatureStatus method
    mockProjectInfoAggregator.detectFeatureStatus = jest.fn().mockResolvedValue({
      completedFeatures: [
        {
          name: 'Enhanced Authentication System',
          description: 'JWT-based authentication with optimized performance',
          status: 'completed',
          technicalDetails: 'AuthContext with session management',
          dependencies: ['Supabase Auth', 'React Context'],
          requirements: ['1.1', '2.1']
        },
        {
          name: 'Role-Based Navigation System',
          description: 'Automatic routing based on user role',
          status: 'completed',
          technicalDetails: 'RoleBasedNavigator with member and officer stacks',
          dependencies: ['React Navigation', 'AuthContext'],
          requirements: ['1.1', '3.1']
        },
        {
          name: 'Organization Context System',
          description: 'Centralized organization state management',
          status: 'completed',
          technicalDetails: 'OrganizationContext with automatic detection',
          dependencies: ['React Context', 'User profiles'],
          requirements: ['2.1', '2.2']
        }
      ],
      inProgressFeatures: [
        {
          name: 'Database Schema Implementation',
          description: 'Full implementation of multi-organization database schema',
          status: 'in-progress',
          technicalDetails: 'Migration scripts and RLS policies',
          dependencies: ['Supabase migrations'],
          requirements: ['2.1', '4.1']
        }
      ],
      plannedFeatures: [
        {
          name: 'BLE Attendance System',
          description: 'Bluetooth Low Energy based attendance tracking',
          status: 'planned',
          technicalDetails: 'Proximity-based attendance verification',
          dependencies: ['React Native BLE'],
          requirements: ['5.1', '5.2']
        }
      ]
    });

    // Mock the getProjectStatus method
    mockProjectInfoAggregator.getProjectStatus = jest.fn().mockResolvedValue({
      completedFeatures: [],
      inProgressFeatures: [],
      plannedFeatures: [],
      knownIssues: ['Database tables may not exist in development'],
      nextPriorities: ['Complete database schema implementation'],
      performanceMetrics: {
        loginTime: '<1 second',
        logoutTime: '<1 second',
        navigationErrors: '0 errors',
        codeReduction: '50% reduction'
      }
    });

    // Replace the instance's aggregator with our mock
    (generator as any).projectInfoAggregator = mockProjectInfoAggregator;
  });

  describe('generateComprehensiveCapabilitiesSummary', () => {
    it('should generate a complete capabilities summary', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      expect(summary).toBeDefined();
      expect(summary.completedAuthentication).toBeDefined();
      expect(summary.completedNavigation).toBeDefined();
      expect(summary.completedMultiOrg).toBeDefined();
      expect(summary.knownIssues).toBeDefined();
      expect(summary.performanceMetrics).toBeDefined();
      expect(summary.systemCapabilities).toBeDefined();
      expect(summary.developmentStatus).toBeDefined();
    });

    it('should include authentication capabilities', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      expect(summary.completedAuthentication).toHaveLength(4); // Default auth capabilities
      expect(summary.completedAuthentication[0]).toMatchObject({
        name: 'Enhanced Authentication System',
        status: 'optimized',
        performanceImpact: expect.stringContaining('90%+ improvement')
      });
    });

    it('should include navigation capabilities', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      expect(summary.completedNavigation).toHaveLength(4); // Default nav capabilities
      expect(summary.completedNavigation[0]).toMatchObject({
        name: 'Role-Based Navigation System',
        status: 'completed',
        errorHandling: expect.stringContaining('RoleErrorBoundary')
      });
    });

    it('should include multi-organization capabilities', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      expect(summary.completedMultiOrg).toHaveLength(5); // Default multi-org capabilities
      expect(summary.completedMultiOrg[0]).toMatchObject({
        name: 'Organization Context System',
        status: 'completed',
        dataIsolation: expect.stringContaining('Complete data separation')
      });
    });

    it('should include known issues with solutions', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      expect(summary.knownIssues).toHaveLength(6); // All known issues
      expect(summary.knownIssues[0]).toMatchObject({
        issue: expect.stringContaining('Database tables may not exist'),
        impact: 'medium',
        status: 'mitigated',
        solution: expect.stringContaining('Mock data fallback')
      });
    });

    it('should include comprehensive performance metrics', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      expect(summary.performanceMetrics).toMatchObject({
        authentication: {
          loginTime: expect.stringContaining('<1 second'),
          improvement: expect.stringContaining('90%+ performance improvement'),
          optimizations: expect.arrayContaining(['Immediate session state setting'])
        },
        navigation: {
          errorReduction: expect.stringContaining('100% reduction'),
          optimizations: expect.arrayContaining(['Dynamic navigation keys'])
        },
        codebase: {
          codeReduction: expect.stringContaining('50% reduction'),
          typeScript: expect.stringContaining('100% TypeScript coverage')
        },
        reliability: {
          errorRate: expect.stringContaining('0% navigation crashes'),
          fallbackSystems: expect.arrayContaining(['Mock data for missing database tables'])
        }
      });
    });

    it('should include system capabilities', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      expect(summary.systemCapabilities).toHaveLength(8); // All system capabilities
      expect(summary.systemCapabilities[0]).toMatchObject({
        category: 'Authentication',
        name: 'Fast Authentication System',
        benefits: expect.arrayContaining(['Instant user experience']),
        dependencies: expect.arrayContaining(['Supabase Auth'])
      });
    });

    it('should include development status', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      expect(summary.developmentStatus).toMatchObject({
        currentPhase: 'Production Ready - Core Features Complete',
        completionPercentage: expect.any(Number),
        readyForProduction: true,
        nextMilestones: expect.arrayContaining(['Complete database schema implementation'])
      });
    });

    it('should calculate completion percentage correctly', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      // With 3 completed, 1 in-progress, 1 planned = 5 total
      // 3/5 = 60%
      expect(summary.developmentStatus.completionPercentage).toBe(60);
    });
  });

  describe('error handling', () => {
    it('should return default summary when aggregator fails', async () => {
      mockProjectInfoAggregator.detectFeatureStatus.mockRejectedValue(new Error('Test error'));

      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      expect(summary).toBeDefined();
      expect(summary.completedAuthentication).toEqual([]);
      expect(summary.developmentStatus.completionPercentage).toBe(0);
    });

    it('should handle missing project status gracefully', async () => {
      mockProjectInfoAggregator.getProjectStatus.mockRejectedValue(new Error('Test error'));

      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      expect(summary).toBeDefined();
      expect(summary.knownIssues).toHaveLength(6); // Should still have default known issues
    });
  });

  describe('feature categorization', () => {
    it('should correctly categorize authentication features', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      const authCapabilities = summary.completedAuthentication;
      expect(authCapabilities.some(cap => cap.name.includes('Authentication'))).toBe(true);
      expect(authCapabilities.some(cap => cap.name.includes('Session'))).toBe(true);
    });

    it('should correctly categorize navigation features', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      const navCapabilities = summary.completedNavigation;
      expect(navCapabilities.some(cap => cap.name.includes('Navigation'))).toBe(true);
      expect(navCapabilities.some(cap => cap.name.includes('Role-Based'))).toBe(true);
    });

    it('should correctly categorize multi-org features', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      const orgCapabilities = summary.completedMultiOrg;
      expect(orgCapabilities.some(cap => cap.name.includes('Organization'))).toBe(true);
      expect(orgCapabilities.some(cap => cap.name.includes('Branding'))).toBe(true);
    });
  });

  describe('performance metrics validation', () => {
    it('should include all performance categories', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      expect(summary.performanceMetrics.authentication).toBeDefined();
      expect(summary.performanceMetrics.navigation).toBeDefined();
      expect(summary.performanceMetrics.codebase).toBeDefined();
      expect(summary.performanceMetrics.reliability).toBeDefined();
    });

    it('should include optimization details', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      expect(summary.performanceMetrics.authentication.optimizations.length).toBeGreaterThan(0);
      expect(summary.performanceMetrics.navigation.optimizations.length).toBeGreaterThan(0);
      expect(summary.performanceMetrics.codebase.optimizations.length).toBeGreaterThan(0);
      expect(summary.performanceMetrics.reliability.fallbackSystems.length).toBeGreaterThan(0);
    });
  });

  describe('system capabilities validation', () => {
    it('should include all capability categories', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      const categories = summary.systemCapabilities.map(cap => cap.category);
      expect(categories).toContain('Authentication');
      expect(categories).toContain('Navigation');
      expect(categories).toContain('Multi-Organization');
      expect(categories).toContain('User Interface');
      expect(categories).toContain('Development');
      expect(categories).toContain('Performance');
      expect(categories).toContain('Reliability');
      expect(categories).toContain('Security');
    });

    it('should include technical details and benefits', async () => {
      const summary = await generator.generateComprehensiveCapabilitiesSummary();

      summary.systemCapabilities.forEach(capability => {
        expect(capability.technicalDetails).toBeDefined();
        expect(capability.benefits).toBeDefined();
        expect(capability.dependencies).toBeDefined();
        expect(capability.benefits.length).toBeGreaterThan(0);
        expect(capability.dependencies.length).toBeGreaterThan(0);
      });
    });
  });
});