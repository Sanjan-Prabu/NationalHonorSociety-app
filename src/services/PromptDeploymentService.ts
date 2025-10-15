/**
 * Prompt Deployment and Sharing Service
 * 
 * Creates standalone prompt files that can be easily shared,
 * includes setup instructions and configuration guidance,
 * and provides customization options for different environments.
 * 
 * Requirements: 6.1, 6.2, 6.4
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { ProjectInfoAggregator } from './ProjectInfoAggregator';
import { PromptGenerator } from './PromptFormatter';
import { CapabilitiesSummaryGenerator } from './CapabilitiesSummaryGenerator';
import { AIGuidelinesGenerator } from './AIBehaviorGuidelines';

export interface ShareablePromptConfig {
  includeCredentials: boolean;
  includeMCPSetup: boolean;
  includeCustomization: boolean;
  targetEnvironment: 'development' | 'production' | 'generic';
  outputFormat: 'markdown' | 'text' | 'json';
}

export interface ShareablePromptOutput {
  promptContent: string;
  setupInstructions: string;
  configurationGuide: string;
  customizationOptions: string;
  metadata: {
    version: string;
    generatedAt: string;
    projectName: string;
    targetEnvironment: string;
  };
}

/**
 * Main Prompt Deployment Service
 */
export class PromptDeploymentService {
  private projectRoot: string;
  private projectInfoAggregator: ProjectInfoAggregator;
  private capabilitiesGenerator: CapabilitiesSummaryGenerator;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.projectInfoAggregator = new ProjectInfoAggregator(projectRoot);
    this.capabilitiesGenerator = new CapabilitiesSummaryGenerator(projectRoot);
  }

  /**
   * Generate shareable prompt file with all components
   * Requirements: 6.1, 6.2
   */
  async generateShareablePrompt(config: ShareablePromptConfig): Promise<ShareablePromptOutput> {
    try {
      // Gather all project information
      const projectInfo = await this.projectInfoAggregator.getProjectInfo();
      const techStack = await this.projectInfoAggregator.getTechStackInfo();
      const architecture = await this.projectInfoAggregator.getArchitectureInfo();
      const featureStatus = await this.projectInfoAggregator.detectFeatureStatus();
      const mcpConfig = await this.projectInfoAggregator.getMCPConfig();
      const projectStatus = await this.projectInfoAggregator.getProjectStatus();
      const capabilities = await this.capabilitiesGenerator.generateComprehensiveCapabilitiesSummary();
      const guidelines = AIGuidelinesGenerator.generateCompleteGuidelines();

      // Combine all features
      const allFeatures = [
        ...featureStatus.completedFeatures,
        ...featureStatus.inProgressFeatures,
        ...featureStatus.plannedFeatures
      ];

      // Generate the main prompt content
      const promptContent = await PromptGenerator.generateCompletePrompt(
        projectInfo,
        techStack,
        architecture,
        allFeatures,
        config.includeCredentials ? mcpConfig : null,
        projectStatus,
        guidelines
      );

      // Generate supporting documentation
      const setupInstructions = await this.generateSetupInstructions(config);
      const configurationGuide = await this.generateConfigurationGuide(config);
      const customizationOptions = config.includeCustomization 
        ? await this.generateCustomizationOptions(config)
        : '';

      // Create metadata
      const metadata = {
        version: projectInfo.version,
        generatedAt: new Date().toISOString(),
        projectName: projectInfo.name,
        targetEnvironment: config.targetEnvironment
      };

      return {
        promptContent: this.formatPromptForSharing(promptContent, config),
        setupInstructions,
        configurationGuide,
        customizationOptions,
        metadata
      };
    } catch (error) {
      console.error('Error generating shareable prompt:', error);
      throw new Error(`Failed to generate shareable prompt: ${error.message}`);
    }
  }

  /**
   * Create standalone prompt file that can be easily shared
   * Requirements: 6.1, 6.2
   */
  async createStandalonePromptFile(
    config: ShareablePromptConfig,
    outputPath?: string
  ): Promise<string> {
    try {
      const shareablePrompt = await this.generateShareablePrompt(config);
      
      // Determine output path
      const outputDir = outputPath || join(this.projectRoot, 'prompt-exports');
      await mkdir(outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `nhs-nhsa-context-prompt-${config.targetEnvironment}-${timestamp}.md`;
      const filePath = join(outputDir, filename);

      // Create comprehensive standalone file
      const standaloneContent = this.createStandaloneContent(shareablePrompt, config);
      
      await writeFile(filePath, standaloneContent, 'utf-8');
      
      return filePath;
    } catch (error) {
      console.error('Error creating standalone prompt file:', error);
      throw new Error(`Failed to create standalone prompt file: ${error.message}`);
    }
  }

  /**
   * Generate setup instructions for different environments
   * Requirements: 6.2, 6.4
   */
  private async generateSetupInstructions(config: ShareablePromptConfig): Promise<string> {
    const mcpDocumentation = await this.projectInfoAggregator.generateCompleteMCPDocumentation();
    
    return `# NHS/NHSA Context Prompt Setup Instructions

## Quick Start

1. **Copy the Context Prompt**
   - Copy the entire context prompt from this document
   - Paste it into your AI IDE's system prompt or context area
   - Ensure the prompt is active before starting development

2. **Verify Context Understanding**
   - Ask your AI: "What type of application am I working on?"
   - Expected response should mention NHS/NHSA mobile app with multi-organization support
   - If the AI doesn't understand the context, check that the prompt was properly loaded

## Environment-Specific Setup

### ${config.targetEnvironment.toUpperCase()} Environment

${this.getEnvironmentSpecificInstructions(config.targetEnvironment)}

## MCP Integration (Optional but Recommended)

${config.includeMCPSetup ? mcpDocumentation.setupInstructions : 'MCP setup instructions not included in this configuration.'}

## Validation Steps

### Step 1: Basic Context Test
Ask your AI IDE:
- "What is the purpose of this NHS/NHSA application?"
- "What technology stack does this project use?"
- "How does the multi-organization system work?"

### Step 2: Architecture Understanding Test
Ask your AI IDE:
- "How should I query data for a specific organization?"
- "What helper functions are available for role checking?"
- "How does the navigation system work for different user roles?"

### Step 3: Code Generation Test
Request:
- "Help me create a new component that respects organization boundaries"
- "Write a database query using the established helper functions"
- "Show me how to add a new screen to the officer navigation"

## Troubleshooting

### Context Not Loading
- **Issue**: AI doesn't understand project context
- **Solution**: Ensure the entire prompt is copied and active in your AI IDE

### Incorrect Suggestions
- **Issue**: AI suggests patterns that don't match the project
- **Solution**: Remind the AI about the multi-organization and role-based architecture

### MCP Connection Issues
- **Issue**: Schema awareness not working
- **Solution**: Follow the MCP troubleshooting guide included in the documentation

## Support

For additional help:
- Review the comprehensive development report in the project root
- Check the project documentation in the src/docs directory
- Refer to the MCP troubleshooting guide for schema-related issues

---

**Last Updated**: ${new Date().toISOString()}
**Target Environment**: ${config.targetEnvironment}
**Version**: Generated from project state
`;
  }

  /**
   * Generate configuration guide for different AI IDEs
   * Requirements: 6.2, 6.4
   */
  private async generateConfigurationGuide(config: ShareablePromptConfig): Promise<string> {
    return `# AI IDE Configuration Guide

## Supported AI IDEs

This context prompt has been tested and optimized for:

### Cursor IDE
1. **System Prompt Setup**:
   - Open Cursor Settings (Cmd/Ctrl + ,)
   - Navigate to "AI" → "System Prompt"
   - Paste the context prompt in the system prompt field
   - Enable "Apply to all conversations"

2. **MCP Configuration** (if applicable):
   - Create or edit \`.cursor/mcp.json\`
   - Add Supabase MCP server configuration
   - Restart Cursor to load MCP connections

### Claude Desktop
1. **Context Loading**:
   - Start a new conversation
   - Paste the context prompt as the first message
   - Pin the conversation for future reference

2. **MCP Integration**:
   - Edit Claude Desktop configuration file
   - Add MCP server configuration
   - Restart Claude Desktop

### VS Code with AI Extensions
1. **GitHub Copilot**:
   - Create \`.github/copilot-instructions.md\` with the context prompt
   - Copilot will automatically use this context

2. **Other AI Extensions**:
   - Check extension documentation for system prompt configuration
   - Most extensions support workspace-level configuration files

## Configuration Templates

### Basic Configuration
\`\`\`json
{
  "systemPrompt": "NHS/NHSA Context Prompt",
  "contextFile": "./nhs-nhsa-context-prompt.md",
  "autoLoad": true
}
\`\`\`

### Advanced Configuration with MCP
\`\`\`json
{
  "systemPrompt": "NHS/NHSA Context Prompt",
  "contextFile": "./nhs-nhsa-context-prompt.md",
  "mcpServers": {
    "supabase": {
      "command": "uvx",
      "args": ["@supabase/mcp-server-supabase", "--project-ref", "YOUR_PROJECT_REF"]
    }
  },
  "autoLoad": true,
  "validation": {
    "testQueries": [
      "What type of application am I working on?",
      "How does the multi-organization system work?"
    ]
  }
}
\`\`\`

## Environment Variables

For secure configuration, use environment variables:

\`\`\`bash
# .env.local or similar
SUPABASE_PROJECT_REF=your_project_reference
SUPABASE_ACCESS_TOKEN=your_access_token
AI_CONTEXT_PROMPT_PATH=./nhs-nhsa-context-prompt.md
\`\`\`

## Validation and Testing

### Automated Validation
Create a simple test script to validate AI understanding:

\`\`\`javascript
// validate-ai-context.js
const testQueries = [
  "What is the purpose of this application?",
  "What technology stack is used?",
  "How does role-based navigation work?"
];

// Run these queries and verify responses match expected patterns
\`\`\`

### Manual Validation Checklist
- [ ] AI understands NHS/NHSA multi-organization context
- [ ] AI recognizes React Native + Supabase architecture
- [ ] AI suggests appropriate helper functions for database queries
- [ ] AI respects role-based access patterns in suggestions
- [ ] AI maintains organization data isolation in recommendations

## Performance Optimization

### Token Usage Optimization
- Use the compressed version of the prompt for token-limited scenarios
- Enable context caching if your AI IDE supports it
- Consider using context summarization for long conversations

### Response Quality
- Include specific examples in your queries to get better responses
- Reference the context prompt explicitly when needed
- Use follow-up questions to clarify AI understanding

---

**Configuration Version**: 1.0.0
**Last Updated**: ${new Date().toISOString()}
**Compatibility**: Tested with Cursor, Claude Desktop, VS Code extensions
`;
  }

  /**
   * Generate customization options for different environments
   * Requirements: 6.4
   */
  private async generateCustomizationOptions(config: ShareablePromptConfig): Promise<string> {
    return `# Customization Options

## Environment-Specific Customizations

### Development Environment
- **Mock Data Emphasis**: Highlight mock data fallback systems
- **Debug Information**: Include debugging tips and common issues
- **Local Setup**: Focus on local development setup and testing

### Production Environment
- **Security Focus**: Emphasize production security considerations
- **Performance**: Highlight performance optimization patterns
- **Monitoring**: Include production monitoring and error handling

### Generic Environment
- **Flexibility**: Provide general guidance applicable to any environment
- **Best Practices**: Focus on universal best practices and patterns
- **Adaptability**: Include guidance for adapting to different setups

## Organization-Specific Customizations

### NHS-Only Deployment
\`\`\`typescript
// Customize for NHS-only deployment
const organizationFilter = 'NHS';
const brandingColors = { primary: '#1e40af' }; // NHS Blue
\`\`\`

### NHSA-Only Deployment
\`\`\`typescript
// Customize for NHSA-only deployment
const organizationFilter = 'NHSA';
const brandingColors = { primary: '#7c3aed' }; // NHSA Purple
\`\`\`

### Multi-Organization (Default)
\`\`\`typescript
// Full multi-organization support
const supportedOrganizations = ['NHS', 'NHSA'];
const dynamicBranding = true;
\`\`\`

## Feature-Specific Customizations

### Core Features Only
Focus on essential functionality:
- Authentication system
- Basic navigation
- Organization context
- Role-based access

### Extended Features
Include advanced functionality:
- BLE attendance tracking
- Advanced analytics
- File upload systems
- Push notifications

### Custom Feature Set
Define specific features for your deployment:
\`\`\`typescript
const enabledFeatures = {
  authentication: true,
  navigation: true,
  multiOrg: true,
  bleAttendance: false, // Disable if not needed
  fileUploads: true,
  pushNotifications: false
};
\`\`\`

## AI Behavior Customizations

### Conservative Mode
- Emphasize security and data protection
- Prefer established patterns over new approaches
- Focus on stability and reliability

### Innovation Mode
- Encourage new feature development
- Suggest performance optimizations
- Explore advanced React Native patterns

### Maintenance Mode
- Focus on bug fixes and improvements
- Emphasize code quality and testing
- Prioritize technical debt reduction

## Prompt Modifications

### Shortened Version
For token-limited scenarios, use key sections only:
- Project overview
- Technology stack
- Security guidelines
- Core patterns

### Extended Version
For comprehensive assistance, include:
- Detailed feature descriptions
- Complete setup instructions
- Troubleshooting guides
- Performance metrics

### Domain-Specific Version
Customize for specific development areas:
- **Frontend Focus**: Emphasize UI/UX patterns
- **Backend Focus**: Highlight database and API patterns
- **DevOps Focus**: Include deployment and monitoring guidance

## Template Variables

Use these variables to customize the prompt:

\`\`\`typescript
interface PromptCustomization {
  projectName: string;
  organizationTypes: string[];
  primaryFeatures: string[];
  targetEnvironment: 'dev' | 'staging' | 'prod';
  securityLevel: 'standard' | 'enhanced' | 'maximum';
  aiAssistanceLevel: 'basic' | 'advanced' | 'expert';
}
\`\`\`

## Implementation Examples

### Custom Prompt Generation
\`\`\`typescript
const customConfig = {
  projectName: 'My NHS Chapter App',
  organizationTypes: ['NHS'],
  primaryFeatures: ['authentication', 'events', 'hours'],
  targetEnvironment: 'prod',
  securityLevel: 'enhanced',
  aiAssistanceLevel: 'advanced'
};

const customPrompt = generateCustomPrompt(customConfig);
\`\`\`

### Environment-Specific Setup
\`\`\`bash
# Development
export AI_CONTEXT_MODE=development
export INCLUDE_DEBUG_INFO=true

# Production
export AI_CONTEXT_MODE=production
export SECURITY_FOCUS=enhanced
\`\`\`

---

**Customization Guide Version**: 1.0.0
**Last Updated**: ${new Date().toISOString()}
**Flexibility**: Supports multiple deployment scenarios and AI IDE configurations
`;
  }

  /**
   * Format prompt content for sharing
   */
  private formatPromptForSharing(promptContent: string, config: ShareablePromptConfig): string {
    const header = `# NHS/NHSA Mobile Application - AI Context Prompt

**Generated**: ${new Date().toISOString()}
**Environment**: ${config.targetEnvironment}
**Format**: ${config.outputFormat}

---

## Instructions for Use

1. Copy the entire context prompt below
2. Paste it into your AI IDE's system prompt or context area
3. Verify the AI understands the project context by asking test questions
4. Refer to the setup instructions for environment-specific configuration

---

## Context Prompt

`;

    const footer = `

---

## Additional Resources

- **Setup Instructions**: See the accompanying setup guide
- **Configuration Guide**: Refer to the AI IDE configuration documentation
- **Customization Options**: Check the customization guide for environment-specific modifications
- **Troubleshooting**: Review the troubleshooting section for common issues

**End of Context Prompt**
`;

    return header + promptContent + footer;
  }

  /**
   * Create comprehensive standalone content
   */
  private createStandaloneContent(shareablePrompt: ShareablePromptOutput, config: ShareablePromptConfig): string {
    const sections = [
      `# NHS/NHSA Mobile Application - Complete AI Context Package`,
      ``,
      `**Generated**: ${shareablePrompt.metadata.generatedAt}`,
      `**Project**: ${shareablePrompt.metadata.projectName}`,
      `**Version**: ${shareablePrompt.metadata.version}`,
      `**Environment**: ${shareablePrompt.metadata.targetEnvironment}`,
      ``,
      `## Table of Contents`,
      ``,
      `1. [Context Prompt](#context-prompt)`,
      `2. [Setup Instructions](#setup-instructions)`,
      `3. [Configuration Guide](#configuration-guide)`,
      config.includeCustomization ? `4. [Customization Options](#customization-options)` : '',
      ``,
      `---`,
      ``,
      `## Context Prompt`,
      ``,
      shareablePrompt.promptContent,
      ``,
      `---`,
      ``,
      `## Setup Instructions`,
      ``,
      shareablePrompt.setupInstructions,
      ``,
      `---`,
      ``,
      `## Configuration Guide`,
      ``,
      shareablePrompt.configurationGuide
    ];

    if (config.includeCustomization && shareablePrompt.customizationOptions) {
      sections.push(
        ``,
        `---`,
        ``,
        `## Customization Options`,
        ``,
        shareablePrompt.customizationOptions
      );
    }

    sections.push(
      ``,
      `---`,
      ``,
      `**Package Generated**: ${shareablePrompt.metadata.generatedAt}`,
      `**Ready for deployment in ${config.targetEnvironment} environment**`
    );

    return sections.filter(Boolean).join('\n');
  }

  /**
   * Get environment-specific setup instructions
   */
  private getEnvironmentSpecificInstructions(environment: string): string {
    switch (environment) {
      case 'development':
        return `**Development Setup**:
- Mock data system is active - expect fallback data when database tables don't exist
- Debug information and error details are available
- MCP integration recommended for schema awareness during development
- Use development Supabase project for testing

**Key Considerations**:
- Database tables may not exist - mock data will be used automatically
- Authentication uses development credentials
- File uploads use development Cloudflare R2 bucket
- Error boundaries provide detailed debugging information`;

      case 'production':
        return `**Production Setup**:
- Full database schema must be deployed and operational
- All RLS policies and helper functions must be active
- Production Supabase project with proper security configuration
- Cloudflare R2 production bucket with appropriate CORS settings

**Key Considerations**:
- No mock data fallbacks - all features require real database
- Enhanced security measures and monitoring active
- Performance optimizations enabled
- Error handling focuses on user experience over debugging`;

      case 'generic':
      default:
        return `**Generic Setup**:
- Adaptable to any environment with proper configuration
- Supports both development and production scenarios
- Includes fallback systems for various deployment states
- Flexible configuration options for different setups

**Key Considerations**:
- Environment detection determines available features
- Graceful degradation when services are unavailable
- Configurable security and performance settings
- Universal patterns applicable to any deployment`;
    }
  }
}