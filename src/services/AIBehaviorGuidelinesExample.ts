/**
 * AI Behavior Guidelines Usage Example
 * 
 * This example demonstrates how to use the AI behavior guidelines
 * with the prompt formatter to create comprehensive context prompts.
 */

import { AIGuidelinesGenerator } from './AIBehaviorGuidelines';
import { PromptGenerator } from './PromptFormatter';
import { ProjectInfoAggregator } from './ProjectInfoAggregator';

/**
 * Example usage of AI behavior guidelines in prompt generation
 */
export async function generateContextPromptWithGuidelines(): Promise<string> {
  try {
    // Generate comprehensive AI guidelines
    const aiGuidelines = AIGuidelinesGenerator.generateCompleteGuidelines();
    
    // Get project information (this would normally come from the aggregator)
    const aggregator = new ProjectInfoAggregator();
    const projectInfo = await aggregator.getProjectInfo();
    const techStack = await aggregator.getTechStackInfo();
    const architecture = await aggregator.getArchitectureInfo();
    const features = await aggregator.getFeatures();
    const mcpConfig = await aggregator.getMCPConfiguration();
    const projectStatus = await aggregator.getProjectStatus();
    
    // Generate complete prompt with AI guidelines
    const completePrompt = await PromptGenerator.generateCompletePrompt(
      projectInfo,
      techStack,
      architecture,
      features,
      mcpConfig,
      projectStatus,
      aiGuidelines
    );
    
    return completePrompt;
  } catch (error) {
    console.error('Error generating context prompt with guidelines:', error);
    throw error;
  }
}

/**
 * Example usage for specific development scenarios
 */
export async function generateScenarioSpecificPrompt(
  scenario: 'feature-development' | 'bug-fixing' | 'refactoring'
): Promise<string> {
  try {
    // Generate scenario-specific guidelines
    const aiGuidelines = AIGuidelinesGenerator.generateScenarioSpecificGuidelines(scenario);
    
    // Get project information
    const aggregator = new ProjectInfoAggregator();
    const projectInfo = await aggregator.getProjectInfo();
    const techStack = await aggregator.getTechStackInfo();
    const architecture = await aggregator.getArchitectureInfo();
    const features = await aggregator.getFeatures();
    const mcpConfig = await aggregator.getMCPConfiguration();
    const projectStatus = await aggregator.getProjectStatus();
    
    // Generate prompt with scenario-specific guidelines
    const scenarioPrompt = await PromptGenerator.generateCompletePrompt(
      projectInfo,
      techStack,
      architecture,
      features,
      mcpConfig,
      projectStatus,
      aiGuidelines
    );
    
    return scenarioPrompt;
  } catch (error) {
    console.error(`Error generating ${scenario} prompt:`, error);
    throw error;
  }
}

/**
 * Example of how to use individual guideline components
 */
export function demonstrateGuidelineComponents() {
  // Get context objectives
  const contextObjectives = AIGuidelinesGenerator.generateCompleteGuidelines().contextObjectives;
  console.log('Context Objectives:', contextObjectives);
  
  // Get security guidelines
  const securityGuidelines = AIGuidelinesGenerator.generateCompleteGuidelines().securityGuidelines;
  console.log('Security Guidelines:', securityGuidelines);
  
  // Get behavior expectations
  const behaviorExpectations = AIGuidelinesGenerator.generateCompleteGuidelines().behaviorExpectations;
  console.log('Behavior Expectations:', behaviorExpectations);
  
  // Get final instructions
  const finalInstructions = AIGuidelinesGenerator.generateCompleteGuidelines().finalInstructions;
  console.log('Final Instructions:', finalInstructions);
}

/**
 * Example of validating guidelines completeness
 */
export function validateGuidelinesCompleteness(): boolean {
  const guidelines = AIGuidelinesGenerator.generateCompleteGuidelines();
  
  // Check that all required sections are present and non-empty
  const hasContextObjectives = guidelines.contextObjectives.length > 0;
  const hasSecurityGuidelines = guidelines.securityGuidelines.length > 0;
  const hasBehaviorExpectations = guidelines.behaviorExpectations.length > 0;
  const hasFinalInstructions = guidelines.finalInstructions.length > 0;
  
  // Check for key concepts in guidelines
  const allContent = [
    ...guidelines.contextObjectives,
    ...guidelines.securityGuidelines,
    ...guidelines.behaviorExpectations,
    ...guidelines.finalInstructions
  ].join(' ');
  
  const hasKeyTechnologies = allContent.includes('React Native') && 
                            allContent.includes('Supabase') && 
                            allContent.includes('multi-organization');
  
  const hasSecurityConcepts = allContent.includes('RLS') && 
                             allContent.includes('is_member_of') && 
                             allContent.includes('AuthContext');
  
  const hasArchitecturalConcepts = allContent.includes('PermissionWrapper') && 
                                  allContent.includes('OrganizationContext') && 
                                  allContent.includes('NavigationContext');
  
  return hasContextObjectives && 
         hasSecurityGuidelines && 
         hasBehaviorExpectations && 
         hasFinalInstructions && 
         hasKeyTechnologies && 
         hasSecurityConcepts && 
         hasArchitecturalConcepts;
}

// Export for testing and usage
export {
  generateContextPromptWithGuidelines,
  generateScenarioSpecificPrompt,
  demonstrateGuidelineComponents,
  validateGuidelinesCompleteness
};