/**
 * Example usage of ProjectInfoAggregator
 * 
 * This file demonstrates how to use the project information aggregation system
 * to extract current project state, validate information, and handle errors.
 */

import { 
  ProjectInfoAggregator, 
  InfoValidator, 
  projectInfoAggregator 
} from './ProjectInfoAggregator';

/**
 * Example 1: Basic project information extraction
 */
async function extractBasicProjectInfo() {
  console.log('🔍 Extracting basic project information...');
  
  try {
    // Use the singleton instance for convenience
    const projectInfo = await projectInfoAggregator.getProjectInfo();
    
    console.log('📋 Project Information:');
    console.log(`  Name: ${projectInfo.name}`);
    console.log(`  Type: ${projectInfo.type}`);
    console.log(`  Purpose: ${projectInfo.purpose}`);
    console.log(`  Version: ${projectInfo.version}`);
    console.log(`  Target Users: ${projectInfo.targetUsers.join(', ')}`);
    console.log(`  Core Features: ${projectInfo.coreFeatures.length} features`);
    
    return projectInfo;
  } catch (error) {
    console.error('❌ Error extracting project info:', error);
    return null;
  }
}

/**
 * Example 2: Technology stack analysis
 */
async function analyzeTechStack() {
  console.log('🛠️ Analyzing technology stack...');
  
  try {
    const techStack = await projectInfoAggregator.getTechStackInfo();
    
    console.log('🧩 Technology Stack:');
    console.log(`  Frontend: ${techStack.frontend.technology} - ${techStack.frontend.purpose}`);
    console.log(`  Backend: ${techStack.backend.technology} - ${techStack.backend.purpose}`);
    console.log(`  Storage: ${techStack.storage.technology} - ${techStack.storage.purpose}`);
    console.log(`  Navigation: ${techStack.navigation.technology} - ${techStack.navigation.purpose}`);
    console.log(`  Authentication: ${techStack.authentication.technology} - ${techStack.authentication.purpose}`);
    console.log(`  MCP Integration: ${techStack.mcpIntegration.technology} - ${techStack.mcpIntegration.purpose}`);
    
    return techStack;
  } catch (error) {
    console.error('❌ Error analyzing tech stack:', error);
    return null;
  }
}

/**
 * Example 3: Architecture information extraction
 */
async function extractArchitectureInfo() {
  console.log('🏗️ Extracting architecture information...');
  
  try {
    const architecture = await projectInfoAggregator.getArchitectureInfo();
    
    console.log('🔐 Architecture Highlights:');
    console.log(`  Multi-Org Design: ${architecture.multiOrgDesign}`);
    console.log(`  Security Model: ${architecture.securityModel}`);
    console.log(`  Helper Functions: ${architecture.helperFunctions.length} functions`);
    console.log(`  Key Patterns: ${architecture.keyPatterns.length} patterns`);
    console.log(`  Monitoring Systems: ${architecture.monitoringSystems.length} systems`);
    
    return architecture;
  } catch (error) {
    console.error('❌ Error extracting architecture info:', error);
    return null;
  }
}

/**
 * Example 4: MCP configuration extraction with validation
 */
async function extractMCPConfig() {
  console.log('⚙️ Extracting MCP configuration...');
  
  try {
    const mcpConfig = await projectInfoAggregator.getMCPConfig();
    
    if (mcpConfig) {
      console.log('🔌 MCP Configuration:');
      console.log(`  Server Name: ${mcpConfig.serverName}`);
      console.log(`  Command: ${mcpConfig.command}`);
      console.log(`  Access Token: ${mcpConfig.accessToken}`);
      console.log(`  Project Ref: ${mcpConfig.projectRef}`);
      console.log(`  Capabilities: ${mcpConfig.capabilities.join(', ')}`);
      console.log(`  Auto Approve: ${mcpConfig.autoApprove.join(', ')}`);
      console.log(`  Disabled: ${mcpConfig.disabled}`);
      
      // Validate the configuration
      const validation = projectInfoAggregator.validateMCPConfig(mcpConfig);
      if (validation.isValid) {
        console.log('✅ MCP configuration is valid');
      } else {
        console.log('⚠️ MCP configuration has issues:');
        validation.errors.forEach(error => console.log(`  - ${error}`));
        validation.warnings.forEach(warning => console.log(`  - ${warning}`));
      }
    } else {
      console.log('❌ No MCP configuration found');
    }
    
    return mcpConfig;
  } catch (error) {
    console.error('❌ Error extracting MCP config:', error);
    return null;
  }
}

/**
 * Example 5: Project status and feature tracking
 */
async function trackProjectStatus() {
  console.log('📊 Tracking project status...');
  
  try {
    const status = await projectInfoAggregator.getProjectStatus();
    
    console.log('🚀 Project Status:');
    console.log(`  Completed Features: ${status.completedFeatures.length}`);
    status.completedFeatures.forEach(feature => {
      console.log(`    ✅ ${feature.name}: ${feature.description}`);
    });
    
    console.log(`  In-Progress Features: ${status.inProgressFeatures.length}`);
    status.inProgressFeatures.forEach(feature => {
      console.log(`    🔄 ${feature.name}: ${feature.description}`);
    });
    
    console.log(`  Planned Features: ${status.plannedFeatures.length}`);
    status.plannedFeatures.forEach(feature => {
      console.log(`    📋 ${feature.name}: ${feature.description}`);
    });
    
    console.log('📈 Performance Metrics:');
    console.log(`  Login Time: ${status.performanceMetrics.loginTime}`);
    console.log(`  Logout Time: ${status.performanceMetrics.logoutTime}`);
    console.log(`  Navigation Errors: ${status.performanceMetrics.navigationErrors}`);
    console.log(`  Code Reduction: ${status.performanceMetrics.codeReduction}`);
    
    if (status.knownIssues.length > 0) {
      console.log('⚠️ Known Issues:');
      status.knownIssues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (status.nextPriorities.length > 0) {
      console.log('🎯 Next Priorities:');
      status.nextPriorities.forEach(priority => console.log(`  - ${priority}`));
    }
    
    return status;
  } catch (error) {
    console.error('❌ Error tracking project status:', error);
    return null;
  }
}

/**
 * Example 6: Information validation and sanitization
 */
async function validateAndSanitizeInfo() {
  console.log('🔍 Validating and sanitizing information...');
  
  try {
    const projectInfo = await projectInfoAggregator.getProjectInfo();
    
    // Validate the extracted information
    const validation = projectInfoAggregator.validateProjectInfo(projectInfo);
    
    console.log('✅ Validation Results:');
    console.log(`  Valid: ${validation.isValid}`);
    
    if (validation.errors.length > 0) {
      console.log('❌ Errors:');
      validation.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (validation.warnings.length > 0) {
      console.log('⚠️ Warnings:');
      validation.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    if (validation.sanitizedData) {
      console.log('🧹 Data has been sanitized and is ready for use');
    }
    
    return validation;
  } catch (error) {
    console.error('❌ Error validating information:', error);
    return null;
  }
}

/**
 * Example 7: Custom validation using InfoValidator utilities
 */
function demonstrateValidationUtilities() {
  console.log('🛠️ Demonstrating validation utilities...');
  
  // Test string sanitization
  const unsafeString = '<script>alert("xss")</script>Hello World  ';
  const sanitized = InfoValidator.sanitizeString(unsafeString);
  console.log(`Original: "${unsafeString}"`);
  console.log(`Sanitized: "${sanitized}"`);
  
  // Test array validation
  const testArray = ['item1', 'item2', 'item3'];
  const arrayValidation = InfoValidator.validateArray(testArray, 2, 5);
  console.log(`Array validation: ${arrayValidation.isValid ? 'Valid' : 'Invalid'}`);
  
  // Test version validation
  const versions = ['1.0.0', '2.1.3-beta', 'invalid-version'];
  versions.forEach(version => {
    const isValid = InfoValidator.validateVersion(version);
    console.log(`Version "${version}": ${isValid ? 'Valid' : 'Invalid'}`);
  });
  
  // Test URL validation
  const urls = ['https://example.com', 'http://localhost:3000', 'not-a-url'];
  urls.forEach(url => {
    const isValid = InfoValidator.validateUrl(url);
    console.log(`URL "${url}": ${isValid ? 'Valid' : 'Invalid'}`);
  });
}

/**
 * Example 8: Complete project analysis
 */
async function completeProjectAnalysis() {
  console.log('🔬 Performing complete project analysis...');
  
  try {
    // Extract all information
    const [projectInfo, techStack, architecture, mcpConfig, status] = await Promise.all([
      projectInfoAggregator.getProjectInfo(),
      projectInfoAggregator.getTechStackInfo(),
      projectInfoAggregator.getArchitectureInfo(),
      projectInfoAggregator.getMCPConfig(),
      projectInfoAggregator.getProjectStatus()
    ]);
    
    // Create comprehensive analysis
    const analysis = {
      project: projectInfo,
      technology: techStack,
      architecture: architecture,
      mcp: mcpConfig,
      status: status,
      timestamp: new Date().toISOString(),
      summary: {
        totalFeatures: status.completedFeatures.length + status.inProgressFeatures.length + status.plannedFeatures.length,
        completionRate: Math.round((status.completedFeatures.length / (status.completedFeatures.length + status.inProgressFeatures.length + status.plannedFeatures.length)) * 100),
        techStackSize: Object.keys(techStack).length,
        hasValidMCP: mcpConfig !== null,
        knownIssuesCount: status.knownIssues.length
      }
    };
    
    console.log('📊 Analysis Summary:');
    console.log(`  Project: ${analysis.project.name} v${analysis.project.version}`);
    console.log(`  Total Features: ${analysis.summary.totalFeatures}`);
    console.log(`  Completion Rate: ${analysis.summary.completionRate}%`);
    console.log(`  Technology Components: ${analysis.summary.techStackSize}`);
    console.log(`  MCP Integration: ${analysis.summary.hasValidMCP ? 'Available' : 'Not configured'}`);
    console.log(`  Known Issues: ${analysis.summary.knownIssuesCount}`);
    
    return analysis;
  } catch (error) {
    console.error('❌ Error performing complete analysis:', error);
    return null;
  }
}

/**
 * Example 9: Error handling and fallback strategies
 */
async function demonstrateErrorHandling() {
  console.log('🛡️ Demonstrating error handling...');
  
  // Create aggregator with invalid path to test error handling
  const invalidAggregator = new ProjectInfoAggregator('/nonexistent/path');
  
  try {
    // These should all handle errors gracefully and return default values
    const projectInfo = await invalidAggregator.getProjectInfo();
    const techStack = await invalidAggregator.getTechStackInfo();
    const architecture = await invalidAggregator.getArchitectureInfo();
    const mcpConfig = await invalidAggregator.getMCPConfig();
    const status = await invalidAggregator.getProjectStatus();
    
    console.log('✅ Error handling successful:');
    console.log(`  Project Info: ${projectInfo ? 'Fallback data provided' : 'Failed'}`);
    console.log(`  Tech Stack: ${techStack ? 'Fallback data provided' : 'Failed'}`);
    console.log(`  Architecture: ${architecture ? 'Fallback data provided' : 'Failed'}`);
    console.log(`  MCP Config: ${mcpConfig ? 'Data found' : 'Gracefully handled missing config'}`);
    console.log(`  Status: ${status ? 'Fallback data provided' : 'Failed'}`);
    
  } catch (error) {
    console.error('❌ Unexpected error in error handling demo:', error);
  }
}

/**
 * Main example runner
 */
export async function runAllExamples() {
  console.log('🚀 Running ProjectInfoAggregator Examples\n');
  
  await extractBasicProjectInfo();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await analyzeTechStack();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await extractArchitectureInfo();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await extractMCPConfig();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await trackProjectStatus();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await validateAndSanitizeInfo();
  console.log('\n' + '='.repeat(50) + '\n');
  
  demonstrateValidationUtilities();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await completeProjectAnalysis();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await demonstrateErrorHandling();
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('✅ All examples completed successfully!');
}

// Export individual examples for selective usage
export {
  extractBasicProjectInfo,
  analyzeTechStack,
  extractArchitectureInfo,
  extractMCPConfig,
  trackProjectStatus,
  validateAndSanitizeInfo,
  demonstrateValidationUtilities,
  completeProjectAnalysis,
  demonstrateErrorHandling
};