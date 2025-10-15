/**
 * Prompt Formatting and Structure Generation System
 * 
 * This service creates structured, hierarchical prompts with emoji headers
 * and clear visual separators for external AI IDE integration.
 * 
 * Requirements: 1.1, 6.1, 1.2, 2.1, 2.2, 4.1, 3.1, 3.2
 */

import { 
  ProjectInfo, 
  TechStackInfo, 
  ArchitectureInfo, 
  Feature, 
  MCPConfig, 
  ProjectStatus 
} from './ProjectInfoAggregator';

export interface AIGuidelines {
  contextObjectives: string[];
  behaviorExpectations: string[];
  securityGuidelines: string[];
  finalInstructions: string[];
}

export interface PromptSections {
  header: string;
  summary: string;
  techStack: string;
  architecture: string;
  features: string;
  configuration: string;
  status: string;
  guidelines: string;
}

/**
 * Base Prompt Template with Emoji Headers and Structured Sections
 */
export class BasePromptTemplate {
  public static readonly SECTION_SEPARATOR = '\n\n';
  public static readonly SUBSECTION_SEPARATOR = '\n';

  /**
   * Generate the complete structured prompt template
   */
  static generateTemplate(sections: PromptSections): string {
    return [
      sections.header,
      sections.summary,
      sections.techStack,
      sections.architecture,
      sections.features,
      sections.configuration,
      sections.status,
      sections.guidelines
    ].join(this.SECTION_SEPARATOR);
  }

  /**
   * Create section header with emoji and title
   */
  static createSectionHeader(emoji: string, title: string, level: number = 1): string {
    const prefix = '#'.repeat(level);
    return `${prefix} ${emoji} ${title}`;
  }

  /**
   * Create subsection with consistent formatting
   */
  static createSubsection(title: string, content: string, level: number = 2): string {
    const prefix = '#'.repeat(level);
    return `${prefix} ${title}\n\n${content}`;
  }

  /**
   * Format list items with consistent bullet points
   */
  static formatList(items: string[], ordered: boolean = false): string {
    if (ordered) {
      return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
    }
    return items.map(item => `- ${item}`).join('\n');
  }

  /**
   * Create table with headers and rows
   */
  static createTable(headers: string[], rows: string[][]): string {
    const headerRow = `| ${headers.join(' | ')} |`;
    const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
    const dataRows = rows.map(row => `| ${row.join(' | ')} |`).join('\n');
    
    return [headerRow, separatorRow, dataRows].join('\n');
  }

  /**
   * Format code block with language specification
   */
  static formatCodeBlock(code: string, language: string = ''): string {
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }

  /**
   * Create collapsible section for detailed information
   */
  static createCollapsibleSection(title: string, content: string): string {
    return `<details>\n<summary>${title}</summary>\n\n${content}\n\n</details>`;
  }
}

/**
 * Project Header and Summary Formatter
 */
export class HeaderFormatter {
  /**
   * Format project header with identity and purpose
   */
  static formatHeader(projectInfo: ProjectInfo): string {
    const header = BasePromptTemplate.createSectionHeader('🔹', 'NHS/NHSA Mobile Application Context');
    
    const identity = [
      `**Project:** ${projectInfo.name}`,
      `**Type:** ${projectInfo.type}`,
      `**Version:** ${projectInfo.version}`,
      `**Purpose:** ${projectInfo.purpose}`
    ].join('\n');

    return `${header}\n\n${identity}`;
  }

  /**
   * Format project summary with problem-solution overview
   */
  static formatSummary(projectInfo: ProjectInfo): string {
    const header = BasePromptTemplate.createSectionHeader('🧩', 'Project Summary');
    
    const problemSection = BasePromptTemplate.createSubsection(
      'Problem Statement',
      projectInfo.problemStatement
    );

    const solutionSection = BasePromptTemplate.createSubsection(
      'Solution Overview', 
      projectInfo.solutionOverview
    );

    const targetUsersSection = BasePromptTemplate.createSubsection(
      'Target Users',
      BasePromptTemplate.formatList(projectInfo.targetUsers)
    );

    const coreFeaturesSection = BasePromptTemplate.createSubsection(
      'Core Features',
      BasePromptTemplate.formatList(projectInfo.coreFeatures)
    );

    return [
      header,
      problemSection,
      solutionSection,
      targetUsersSection,
      coreFeaturesSection
    ].join(BasePromptTemplate.SECTION_SEPARATOR);
  }
}

/**
 * Tech Stack Table Formatter
 */
export class TechStackFormatter {
  /**
   * Format technology stack as structured table
   */
  static formatTechStack(techStack: TechStackInfo): string {
    const header = BasePromptTemplate.createSectionHeader('🛠️', 'Technology Stack');
    
    const tableHeaders = ['Component', 'Technology', 'Purpose', 'Details'];
    const tableRows = this.createTechStackRows(techStack);
    
    const table = BasePromptTemplate.createTable(tableHeaders, tableRows);
    
    const integrationSection = BasePromptTemplate.createSubsection(
      'Integration Relationships',
      this.formatIntegrationRelationships(techStack)
    );

    return [header, table, integrationSection].join(BasePromptTemplate.SECTION_SEPARATOR);
  }

  /**
   * Create table rows for tech stack components
   */
  private static createTechStackRows(techStack: TechStackInfo): string[][] {
    const components = [
      ['Frontend', techStack.frontend.technology, techStack.frontend.purpose, techStack.frontend.details || ''],
      ['Backend', techStack.backend.technology, techStack.backend.purpose, techStack.backend.details || ''],
      ['Database', 'PostgreSQL (via Supabase)', 'Primary data storage', 'Multi-tenant with RLS policies'],
      ['Storage', techStack.storage.technology, techStack.storage.purpose, techStack.storage.details || ''],
      ['Authentication', techStack.authentication.technology, techStack.authentication.purpose, techStack.authentication.details || ''],
      ['Navigation', techStack.navigation.technology, techStack.navigation.purpose, techStack.navigation.details || ''],
      ['State Management', techStack.stateManagement.technology, techStack.stateManagement.purpose, techStack.stateManagement.details || ''],
      ['Styling', techStack.styling.technology, techStack.styling.purpose, techStack.styling.details || ''],
      ['BLE Integration', techStack.bluetooth.technology, techStack.bluetooth.purpose, techStack.bluetooth.details || ''],
      ['File Handling', techStack.fileHandling.technology, techStack.fileHandling.purpose, techStack.fileHandling.details || ''],
      ['MCP Integration', techStack.mcpIntegration.technology, techStack.mcpIntegration.purpose, techStack.mcpIntegration.details || ''],
      ['Testing', techStack.testing.technology, techStack.testing.purpose, techStack.testing.details || '']
    ];

    return components;
  }

  /**
   * Format integration relationships between technologies
   */
  private static formatIntegrationRelationships(techStack: TechStackInfo): string {
    const relationships = [
      '**React Native + Expo** provides the mobile app foundation with cross-platform compatibility',
      '**Supabase** handles backend services including PostgreSQL database, authentication, and real-time features',
      '**Cloudflare R2** integrates with Supabase for secure file uploads using presigned URLs',
      '**React Navigation** works with AuthContext to provide role-based routing and navigation',
      '**NativeWind** enables Tailwind CSS styling with organization-specific theming',
      '**React Context** (Auth, Organization, Navigation) manages application state across components',
      '**Supabase MCP** provides AI IDE integration with schema awareness and query validation',
      '**Jest + React Native Testing Library** ensures code quality with comprehensive testing coverage'
    ];

    return BasePromptTemplate.formatList(relationships);
  }
}

/**
 * Architecture Highlights Formatter
 */
export class ArchitectureFormatter {
  /**
   * Format architecture highlights with multi-org design and security model
   */
  static formatArchitecture(architecture: ArchitectureInfo): string {
    const header = BasePromptTemplate.createSectionHeader('🔐', 'Architecture Highlights');
    
    const multiOrgSection = BasePromptTemplate.createSubsection(
      'Multi-Organization Design',
      architecture.multiOrgDesign
    );

    const securitySection = BasePromptTemplate.createSubsection(
      'Security Model (RLS)',
      architecture.securityModel
    );

    const schemaSection = BasePromptTemplate.createSubsection(
      'Database Schema Design',
      architecture.schemaDesign
    );

    const helperFunctionsSection = BasePromptTemplate.createSubsection(
      'Helper Functions',
      BasePromptTemplate.formatList(architecture.helperFunctions)
    );

    const navigationSection = BasePromptTemplate.createSubsection(
      'Navigation Structure',
      architecture.navigationStructure
    );

    const dataFlowSection = BasePromptTemplate.createSubsection(
      'Data Flow Architecture',
      architecture.dataFlow
    );

    const patternsSection = BasePromptTemplate.createSubsection(
      'Key Development Patterns',
      BasePromptTemplate.formatList(architecture.keyPatterns)
    );

    const monitoringSection = BasePromptTemplate.createSubsection(
      'Monitoring Systems',
      BasePromptTemplate.formatList(architecture.monitoringSystems)
    );

    return [
      header,
      multiOrgSection,
      securitySection,
      schemaSection,
      helperFunctionsSection,
      navigationSection,
      dataFlowSection,
      patternsSection,
      monitoringSection
    ].join(BasePromptTemplate.SECTION_SEPARATOR);
  }
}

/**
 * Feature Breakdown Formatter
 */
export class FeatureFormatter {
  /**
   * Format detailed feature breakdown with current status
   */
  static formatFeatures(features: Feature[]): string {
    const header = BasePromptTemplate.createSectionHeader('📊', 'Key Features');
    
    const completedFeatures = features.filter(f => f.status === 'completed');
    const inProgressFeatures = features.filter(f => f.status === 'in-progress');
    const plannedFeatures = features.filter(f => f.status === 'planned');

    const sections = [];

    if (completedFeatures.length > 0) {
      sections.push(BasePromptTemplate.createSubsection(
        '✅ Completed Features',
        this.formatFeatureList(completedFeatures)
      ));
    }

    if (inProgressFeatures.length > 0) {
      sections.push(BasePromptTemplate.createSubsection(
        '🚧 In Progress Features',
        this.formatFeatureList(inProgressFeatures)
      ));
    }

    if (plannedFeatures.length > 0) {
      sections.push(BasePromptTemplate.createSubsection(
        '📋 Planned Features',
        this.formatFeatureList(plannedFeatures)
      ));
    }

    return [header, ...sections].join(BasePromptTemplate.SECTION_SEPARATOR);
  }

  /**
   * Format individual feature with technical details
   */
  private static formatFeatureList(features: Feature[]): string {
    return features.map(feature => {
      const title = `**${feature.name}**`;
      const description = feature.description;
      const technicalDetails = feature.technicalDetails ? 
        `\n*Technical Details:* ${feature.technicalDetails}` : '';
      const dependencies = feature.dependencies.length > 0 ? 
        `\n*Dependencies:* ${feature.dependencies.join(', ')}` : '';
      const requirements = feature.requirements.length > 0 ? 
        `\n*Requirements:* ${feature.requirements.join(', ')}` : '';

      return `${title}\n${description}${technicalDetails}${dependencies}${requirements}`;
    }).join('\n\n');
  }

  /**
   * Format feature status summary
   */
  static formatFeatureStatusSummary(features: Feature[]): string {
    const completed = features.filter(f => f.status === 'completed').length;
    const inProgress = features.filter(f => f.status === 'in-progress').length;
    const planned = features.filter(f => f.status === 'planned').length;
    const total = features.length;

    return [
      `**Total Features:** ${total}`,
      `**Completed:** ${completed} (${Math.round(completed/total*100)}%)`,
      `**In Progress:** ${inProgress} (${Math.round(inProgress/total*100)}%)`,
      `**Planned:** ${planned} (${Math.round(planned/total*100)}%)`
    ].join('\n');
  }
}

/**
 * Complete Prompt Generator
 */
export class PromptGenerator {
  /**
   * Generate complete structured prompt with all sections
   */
  static async generateCompletePrompt(
    projectInfo: ProjectInfo,
    techStack: TechStackInfo,
    architecture: ArchitectureInfo,
    features: Feature[],
    mcpConfig: MCPConfig | null,
    projectStatus: ProjectStatus,
    guidelines: AIGuidelines
  ): Promise<string> {
    const sections: PromptSections = {
      header: HeaderFormatter.formatHeader(projectInfo),
      summary: HeaderFormatter.formatSummary(projectInfo),
      techStack: TechStackFormatter.formatTechStack(techStack),
      architecture: ArchitectureFormatter.formatArchitecture(architecture),
      features: FeatureFormatter.formatFeatures(features),
      configuration: this.formatConfiguration(mcpConfig),
      status: this.formatProjectStatus(projectStatus),
      guidelines: this.formatAIGuidelines(guidelines)
    };

    return BasePromptTemplate.generateTemplate(sections);
  }

  /**
   * Format MCP configuration section
   */
  private static formatConfiguration(mcpConfig: MCPConfig | null): string {
    const header = BasePromptTemplate.createSectionHeader('⚙️', 'Configuration & Setup');
    
    if (!mcpConfig) {
      return `${header}\n\n*MCP configuration not available. Manual setup required for AI IDE integration.*`;
    }

    const mcpSection = BasePromptTemplate.createSubsection(
      'Supabase MCP Integration',
      this.formatMCPConfig(mcpConfig)
    );

    return [header, mcpSection].join(BasePromptTemplate.SECTION_SEPARATOR);
  }

  /**
   * Format MCP configuration details
   */
  private static formatMCPConfig(mcpConfig: MCPConfig): string {
    const configDetails = [
      `**Server:** ${mcpConfig.serverName}`,
      `**Command:** ${mcpConfig.command}`,
      `**Status:** ${mcpConfig.disabled ? 'Disabled' : 'Enabled'}`,
      `**Capabilities:** ${mcpConfig.capabilities.join(', ')}`,
      `**Auto-approve:** ${mcpConfig.autoApprove.join(', ') || 'None'}`
    ].join('\n');

    const setupInstructions = [
      '1. Install Supabase MCP server: `uvx supabase-mcp-server`',
      '2. Configure with your project credentials',
      '3. Add to your AI IDE MCP configuration',
      '4. Test connection with schema introspection'
    ];

    return `${configDetails}\n\n**Setup Instructions:**\n${BasePromptTemplate.formatList(setupInstructions, true)}`;
  }

  /**
   * Format project status section
   */
  private static formatProjectStatus(projectStatus: ProjectStatus): string {
    const header = BasePromptTemplate.createSectionHeader('🧱', 'Development Status');
    
    const performanceSection = BasePromptTemplate.createSubsection(
      'Performance Metrics',
      this.formatPerformanceMetrics(projectStatus.performanceMetrics)
    );

    const issuesSection = projectStatus.knownIssues.length > 0 ? 
      BasePromptTemplate.createSubsection(
        'Known Issues',
        BasePromptTemplate.formatList(projectStatus.knownIssues)
      ) : '';

    const prioritiesSection = projectStatus.nextPriorities.length > 0 ?
      BasePromptTemplate.createSubsection(
        'Next Priorities',
        BasePromptTemplate.formatList(projectStatus.nextPriorities, true)
      ) : '';

    const sections = [header, performanceSection];
    if (issuesSection) sections.push(issuesSection);
    if (prioritiesSection) sections.push(prioritiesSection);

    return sections.join(BasePromptTemplate.SECTION_SEPARATOR);
  }

  /**
   * Format performance metrics
   */
  private static formatPerformanceMetrics(metrics: any): string {
    return [
      `**Login Performance:** ${metrics.loginTime}`,
      `**Logout Performance:** ${metrics.logoutTime}`,
      `**Navigation Errors:** ${metrics.navigationErrors}`,
      `**Code Reduction:** ${metrics.codeReduction}`
    ].join('\n');
  }

  /**
   * Format AI guidelines section
   */
  private static formatAIGuidelines(guidelines: AIGuidelines): string {
    const header = BasePromptTemplate.createSectionHeader('💡', 'AI Assistant Guidelines');
    
    const objectivesSection = BasePromptTemplate.createSubsection(
      'Context Objectives',
      BasePromptTemplate.formatList(guidelines.contextObjectives)
    );

    const behaviorSection = BasePromptTemplate.createSubsection(
      'Behavior Expectations',
      BasePromptTemplate.formatList(guidelines.behaviorExpectations)
    );

    const securitySection = BasePromptTemplate.createSubsection(
      'Security Guidelines',
      BasePromptTemplate.formatList(guidelines.securityGuidelines)
    );

    const instructionsSection = BasePromptTemplate.createSubsection(
      'Final Instructions',
      BasePromptTemplate.formatList(guidelines.finalInstructions)
    );

    return [
      header,
      objectivesSection,
      behaviorSection,
      securitySection,
      instructionsSection
    ].join(BasePromptTemplate.SECTION_SEPARATOR);
  }
}