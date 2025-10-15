/**
 * Example usage of the Prompt Formatting System
 * 
 * This demonstrates how to use the prompt formatters to generate
 * structured AI context prompts for external IDE integration.
 */

import {
  BasePromptTemplate,
  HeaderFormatter,
  TechStackFormatter,
  ArchitectureFormatter,
  FeatureFormatter,
  PromptGenerator,
  AIGuidelines
} from './PromptFormatter';

import {
  ProjectInfo,
  TechStackInfo,
  ArchitectureInfo,
  Feature,
  MCPConfig,
  ProjectStatus,
  ProjectInfoAggregator
} from './ProjectInfoAggregator';

/**
 * Example function to generate a complete AI context prompt
 */
export async function generateExamplePrompt(): Promise<string> {
  const aggregator = new ProjectInfoAggregator();

  // Get project information
  const projectInfo = await aggregator.getProjectInfo();
  const techStack = await aggregator.getTechStackInfo();
  const architecture = await aggregator.getArchitectureInfo();
  const mcpConfig = await aggregator.getMCPConfig();
  const projectStatus = await aggregator.getProjectStatus();

  // Combine all features
  const allFeatures = [
    ...projectStatus.completedFeatures,
    ...projectStatus.inProgressFeatures,
    ...projectStatus.plannedFeatures
  ];

  // Define AI guidelines
  const guidelines: AIGuidelines = {
    contextObjectives: [
      'Understand the NHS/NHSA mobile application architecture and current state',
      'Provide contextually appropriate code suggestions and recommendations',
      'Maintain consistency with established patterns and conventions',
      'Respect multi-organization data separation and security requirements'
    ],
    behaviorExpectations: [
      'Always consider organization context when suggesting database operations',
      'Use established helper functions (is_member_of, is_officer_of, is_user_onboarded)',
      'Follow role-based access control patterns in all suggestions',
      'Maintain consistency with React Native + Supabase architecture',
      'Consider performance implications of multi-organization design'
    ],
    securityGuidelines: [
      'Ensure all database queries respect RLS policies',
      'Never suggest bypassing organization-level data isolation',
      'Use proper authentication patterns with JWT tokens',
      'Follow secure file upload patterns with Cloudflare R2',
      'Validate user permissions before suggesting privileged operations'
    ],
    finalInstructions: [
      'When working with this codebase, always consider the multi-organization context',
      'Use the established patterns and helper functions rather than creating new ones',
      'Test suggestions against both NHS and NHSA organization scenarios',
      'Maintain the high performance standards achieved in authentication and navigation',
      'Leverage the Supabase MCP integration for schema-aware development'
    ]
  };

  // Generate the complete prompt
  return await PromptGenerator.generateCompletePrompt(
    projectInfo,
    techStack,
    architecture,
    allFeatures,
    mcpConfig,
    projectStatus,
    guidelines
  );
}

/**
 * Example function to demonstrate individual formatter usage
 */
export function demonstrateFormatters(): void {
  console.log('=== Prompt Formatter Examples ===\n');

  // Example 1: Section Header
  const header = BasePromptTemplate.createSectionHeader('🔹', 'Example Section');
  console.log('Section Header:', header);

  // Example 2: Table Creation
  const tableHeaders = ['Component', 'Technology', 'Purpose'];
  const tableRows = [
    ['Frontend', 'React Native', 'Mobile development'],
    ['Backend', 'Supabase', 'Backend services']
  ];
  const table = BasePromptTemplate.createTable(tableHeaders, tableRows);
  console.log('\nTable Example:\n', table);

  // Example 3: List Formatting
  const items = ['Authentication system', 'Multi-org support', 'Role-based navigation'];
  const list = BasePromptTemplate.formatList(items);
  console.log('\nList Example:\n', list);

  // Example 4: Code Block
  const code = `const user = await supabase.auth.getUser();
if (user && is_member_of(organizationId)) {
  // User has access to organization data
}`;
  const codeBlock = BasePromptTemplate.formatCodeBlock(code, 'typescript');
  console.log('\nCode Block Example:\n', codeBlock);
}

/**
 * Example function to show feature status formatting
 */
export function demonstrateFeatureFormatting(): void {
  const exampleFeatures: Feature[] = [
    {
      name: 'Authentication System',
      description: 'Fast login/logout with session persistence',
      status: 'completed',
      technicalDetails: 'JWT-based authentication with sub-second performance',
      dependencies: ['Supabase Auth', 'AuthContext'],
      requirements: ['1.1', '2.1']
    },
    {
      name: 'BLE Attendance System',
      description: 'Bluetooth Low Energy based attendance tracking',
      status: 'planned',
      technicalDetails: 'Proximity-based attendance verification using BLE beacons',
      dependencies: ['React Native BLE', 'Attendance database schema'],
      requirements: ['5.1', '5.2']
    }
  ];

  const formattedFeatures = FeatureFormatter.formatFeatures(exampleFeatures);
  console.log('=== Feature Formatting Example ===\n');
  console.log(formattedFeatures);

  const statusSummary = FeatureFormatter.formatFeatureStatusSummary(exampleFeatures);
  console.log('\n=== Feature Status Summary ===\n');
  console.log(statusSummary);
}

/**
 * Utility function to save generated prompt to file
 */
export async function savePromptToFile(filename: string = 'ai-context-prompt.md'): Promise<void> {
  try {
    const prompt = await generateExamplePrompt();
    
    // In a real implementation, you would use fs.writeFile
    console.log(`Generated prompt would be saved to: ${filename}`);
    console.log(`Prompt length: ${prompt.length} characters`);
    console.log('Prompt preview (first 500 characters):');
    console.log(prompt.substring(0, 500) + '...');
    
  } catch (error) {
    console.error('Error generating prompt:', error);
  }
}

// Export for use in other modules
export {
  BasePromptTemplate,
  HeaderFormatter,
  TechStackFormatter,
  ArchitectureFormatter,
  FeatureFormatter,
  PromptGenerator
};