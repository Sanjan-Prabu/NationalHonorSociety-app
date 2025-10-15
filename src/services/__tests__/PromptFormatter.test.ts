/**
 * Tests for Prompt Formatting and Structure Generation System
 */

import {
  BasePromptTemplate,
  HeaderFormatter,
  TechStackFormatter,
  ArchitectureFormatter,
  FeatureFormatter,
  PromptGenerator
} from '../PromptFormatter';
import {
  ProjectInfo,
  TechStackInfo,
  ArchitectureInfo,
  Feature
} from '../ProjectInfoAggregator';

describe('BasePromptTemplate', () => {
  test('should create section header with emoji', () => {
    const header = BasePromptTemplate.createSectionHeader('🔹', 'Test Section');
    expect(header).toBe('# 🔹 Test Section');
  });

  test('should create table with headers and rows', () => {
    const headers = ['Column 1', 'Column 2'];
    const rows = [['Row 1 Col 1', 'Row 1 Col 2'], ['Row 2 Col 1', 'Row 2 Col 2']];
    const table = BasePromptTemplate.createTable(headers, rows);
    
    expect(table).toContain('| Column 1 | Column 2 |');
    expect(table).toContain('| --- | --- |');
    expect(table).toContain('| Row 1 Col 1 | Row 1 Col 2 |');
  });

  test('should format list items', () => {
    const items = ['Item 1', 'Item 2', 'Item 3'];
    const unorderedList = BasePromptTemplate.formatList(items);
    const orderedList = BasePromptTemplate.formatList(items, true);
    
    expect(unorderedList).toBe('- Item 1\n- Item 2\n- Item 3');
    expect(orderedList).toBe('1. Item 1\n2. Item 2\n3. Item 3');
  });
});

describe('HeaderFormatter', () => {
  const mockProjectInfo: ProjectInfo = {
    name: 'Test Project',
    type: 'React Native App',
    version: '1.0.0',
    purpose: 'Test purpose',
    targetUsers: ['User 1', 'User 2'],
    coreFeatures: ['Feature 1', 'Feature 2'],
    problemStatement: 'Test problem',
    solutionOverview: 'Test solution'
  };

  test('should format project header', () => {
    const header = HeaderFormatter.formatHeader(mockProjectInfo);
    
    expect(header).toContain('🔹 NHS/NHSA Mobile Application Context');
    expect(header).toContain('**Project:** Test Project');
    expect(header).toContain('**Type:** React Native App');
    expect(header).toContain('**Version:** 1.0.0');
  });

  test('should format project summary', () => {
    const summary = HeaderFormatter.formatSummary(mockProjectInfo);
    
    expect(summary).toContain('🧩 Project Summary');
    expect(summary).toContain('Problem Statement');
    expect(summary).toContain('Solution Overview');
    expect(summary).toContain('Target Users');
    expect(summary).toContain('Core Features');
  });
});

describe('TechStackFormatter', () => {
  const mockTechStack: TechStackInfo = {
    frontend: { technology: 'React Native', purpose: 'Mobile development' },
    backend: { technology: 'Supabase', purpose: 'Backend services' },
    storage: { technology: 'Cloudflare R2', purpose: 'File storage' },
    bluetooth: { technology: 'React Native BLE', purpose: 'BLE connectivity' },
    navigation: { technology: 'React Navigation', purpose: 'Screen navigation' },
    analytics: { technology: 'Custom Analytics', purpose: 'User tracking' },
    fileHandling: { technology: 'Expo File System', purpose: 'File management' },
    mcpIntegration: { technology: 'Supabase MCP', purpose: 'AI integration' },
    authentication: { technology: 'Supabase Auth', purpose: 'User auth' },
    stateManagement: { technology: 'React Context', purpose: 'State management' },
    styling: { technology: 'NativeWind', purpose: 'Styling' },
    testing: { technology: 'Jest', purpose: 'Testing' }
  };

  test('should format tech stack table', () => {
    const techStackFormatted = TechStackFormatter.formatTechStack(mockTechStack);
    
    expect(techStackFormatted).toContain('🛠️ Technology Stack');
    expect(techStackFormatted).toContain('| Component | Technology | Purpose | Details |');
    expect(techStackFormatted).toContain('React Native');
    expect(techStackFormatted).toContain('Supabase');
    expect(techStackFormatted).toContain('Integration Relationships');
  });
});

describe('ArchitectureFormatter', () => {
  const mockArchitecture: ArchitectureInfo = {
    multiOrgDesign: 'Multi-organization support',
    securityModel: 'RLS policies',
    schemaDesign: 'Multi-tenant schema',
    helperFunctions: ['is_member_of()', 'is_officer_of()'],
    monitoringSystems: ['Auth monitoring', 'Performance tracking'],
    keyPatterns: ['Organization-aware hooks', 'Role-based rendering'],
    navigationStructure: 'Role-based navigation',
    dataFlow: 'Context-driven state management'
  };

  test('should format architecture highlights', () => {
    const architecture = ArchitectureFormatter.formatArchitecture(mockArchitecture);
    
    expect(architecture).toContain('🔐 Architecture Highlights');
    expect(architecture).toContain('Multi-Organization Design');
    expect(architecture).toContain('Security Model (RLS)');
    expect(architecture).toContain('Helper Functions');
    expect(architecture).toContain('is_member_of()');
  });
});

describe('FeatureFormatter', () => {
  const mockFeatures: Feature[] = [
    {
      name: 'Authentication',
      description: 'User authentication system',
      status: 'completed',
      technicalDetails: 'JWT-based auth',
      dependencies: ['Supabase Auth'],
      requirements: ['1.1', '2.1']
    },
    {
      name: 'BLE System',
      description: 'Bluetooth attendance tracking',
      status: 'planned',
      technicalDetails: 'BLE beacon integration',
      dependencies: ['React Native BLE'],
      requirements: ['3.1', '3.2']
    }
  ];

  test('should format features by status', () => {
    const features = FeatureFormatter.formatFeatures(mockFeatures);
    
    expect(features).toContain('📊 Key Features');
    expect(features).toContain('✅ Completed Features');
    expect(features).toContain('📋 Planned Features');
    expect(features).toContain('**Authentication**');
    expect(features).toContain('**BLE System**');
  });

  test('should format feature status summary', () => {
    const summary = FeatureFormatter.formatFeatureStatusSummary(mockFeatures);
    
    expect(summary).toContain('**Total Features:** 2');
    expect(summary).toContain('**Completed:** 1 (50%)');
    expect(summary).toContain('**Planned:** 1 (50%)');
  });
});