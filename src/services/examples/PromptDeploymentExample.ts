/**
 * Prompt Deployment Examples
 * 
 * Comprehensive examples showing how to use the prompt deployment
 * and maintenance system for different scenarios.
 */

import { PromptDeploymentManager } from '../PromptDeploymentManager';
import { PromptDeploymentService } from '../PromptDeploymentService';
import { PromptMaintenanceService } from '../PromptMaintenanceService';

/**
 * Example 1: Basic Development Deployment
 */
export async function basicDevelopmentDeployment() {
  console.log('🔧 Example 1: Basic Development Deployment\n');

  const manager = new PromptDeploymentManager();

  try {
    const result = await manager.deployPrompt({
      environment: 'development',
      includeCredentials: false, // Never include real credentials
      includeMCPSetup: true,
      includeCustomization: true,
      outputFormat: 'markdown',
      enableMaintenance: true,
      maintenanceSchedule: {
        lastUpdate: new Date().toISOString(),
        nextScheduledUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        updateFrequency: 'weekly',
        autoUpdate: false
      }
    });

    if (result.success) {
      console.log('✅ Development deployment successful!');
      console.log(`📄 Prompt file: ${result.promptPath}`);
      console.log(`🏷️  Version: ${result.version}`);
      console.log(`🔧 Maintenance enabled: ${result.metadata.maintenanceEnabled}`);
    } else {
      console.error('❌ Deployment failed:', result.errors);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 2: Production Deployment with Minimal Configuration
 */
export async function productionDeployment() {
  console.log('🚀 Example 2: Production Deployment\n');

  const manager = new PromptDeploymentManager();

  try {
    const result = await manager.deployPrompt({
      environment: 'production',
      includeCredentials: false,
      includeMCPSetup: true,
      includeCustomization: false, // Simplified for production
      outputFormat: 'markdown',
      enableMaintenance: true,
      maintenanceSchedule: {
        lastUpdate: new Date().toISOString(),
        nextScheduledUpdate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        updateFrequency: 'monthly',
        autoUpdate: false
      }
    });

    if (result.success) {
      console.log('✅ Production deployment successful!');
      console.log(`📄 Prompt file: ${result.promptPath}`);
      console.log(`🏷️  Version: ${result.version}`);
      
      // Generate deployment guide for production team
      const guide = await manager.generateDeploymentGuide();
      console.log('📖 Deployment guide generated for production team');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 3: Generic Shareable Prompt
 */
export async function shareablePromptDeployment() {
  console.log('🌍 Example 3: Generic Shareable Prompt\n');

  const deploymentService = new PromptDeploymentService();

  try {
    const shareablePrompt = await deploymentService.generateShareablePrompt({
      includeCredentials: false,
      includeMCPSetup: true,
      includeCustomization: true,
      targetEnvironment: 'generic',
      outputFormat: 'markdown'
    });

    console.log('✅ Shareable prompt generated!');
    console.log(`📄 Prompt length: ${shareablePrompt.promptContent.length} characters`);
    console.log(`📋 Setup instructions: ${shareablePrompt.setupInstructions.length} characters`);
    console.log(`⚙️  Configuration guide: ${shareablePrompt.configurationGuide.length} characters`);
    console.log(`🎨 Customization options: ${shareablePrompt.customizationOptions.length} characters`);

    // Create standalone file
    const filePath = await deploymentService.createStandalonePromptFile({
      includeCredentials: false,
      includeMCPSetup: true,
      includeCustomization: true,
      targetEnvironment: 'generic',
      outputFormat: 'markdown'
    });

    console.log(`📁 Standalone file created: ${filePath}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 4: Maintenance and Update Workflow
 */
export async function maintenanceWorkflow() {
  console.log('🔄 Example 4: Maintenance and Update Workflow\n');

  const maintenanceService = new PromptMaintenanceService();
  const manager = new PromptDeploymentManager();

  try {
    // Initialize maintenance system
    await maintenanceService.initializeMaintenanceSystem();
    console.log('✅ Maintenance system initialized');

    // Check for updates
    const updateCheck = await maintenanceService.checkForUpdates();
    console.log(`🔍 Update check: ${updateCheck.updateNeeded ? 'Updates needed' : 'Up to date'}`);
    
    if (updateCheck.triggers.length > 0) {
      console.log('📝 Detected triggers:');
      updateCheck.triggers.forEach(trigger => {
        console.log(`   • ${trigger.type}: ${trigger.description} (${trigger.impact})`);
      });
    }

    // Check synchronization status
    const syncStatus = await maintenanceService.synchronizeWithDocumentation();
    console.log(`🔄 Sync status: ${syncStatus.isUpToDate ? 'Up to date' : 'Changes pending'}`);
    
    if (syncStatus.pendingChanges.length > 0) {
      console.log('📄 Pending changes:');
      syncStatus.pendingChanges.forEach(file => console.log(`   • ${file}`));
    }

    // Generate maintenance report
    const report = await maintenanceService.generateUpdateReport();
    console.log('📊 Maintenance report generated');

    // Perform update if needed
    if (updateCheck.updateNeeded) {
      const updateResult = await manager.updatePrompt({
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'development',
        outputFormat: 'markdown'
      });

      if (updateResult.success && updateResult.updated) {
        console.log(`✅ Update completed - Version: ${updateResult.newVersion}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 5: Custom Environment Configuration
 */
export async function customEnvironmentDeployment() {
  console.log('🎨 Example 5: Custom Environment Configuration\n');

  const manager = new PromptDeploymentManager();

  try {
    // Get deployment templates
    const templates = manager.createDeploymentTemplates();
    console.log('📋 Available templates:', Object.keys(templates));

    // Create custom configuration based on development template
    const customConfig = {
      ...templates.development,
      environment: 'staging' as const,
      includeCustomization: false,
      maintenanceSchedule: {
        ...templates.development.maintenanceSchedule!,
        updateFrequency: 'daily' as const,
        autoUpdate: true
      }
    };

    const result = await manager.deployPrompt(customConfig);

    if (result.success) {
      console.log('✅ Custom staging deployment successful!');
      console.log(`📄 Prompt file: ${result.promptPath}`);
      console.log(`🔧 Auto-update enabled: ${customConfig.maintenanceSchedule?.autoUpdate}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 6: Deployment Status Monitoring
 */
export async function deploymentStatusMonitoring() {
  console.log('📊 Example 6: Deployment Status Monitoring\n');

  const manager = new PromptDeploymentManager();

  try {
    const status = await manager.getDeploymentStatus();

    console.log('📈 Deployment Status:');
    console.log(`   Deployed: ${status.isDeployed ? '✅' : '❌'}`);
    console.log(`   Version: ${status.currentVersion}`);
    console.log(`   Last Update: ${status.lastUpdate}`);
    console.log(`   Update Needed: ${status.updateNeeded ? '⚠️' : '✅'}`);

    if (status.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      status.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }

    if (status.syncStatus) {
      console.log('\n🔄 Sync Status:');
      console.log(`   Up to Date: ${status.syncStatus.isUpToDate ? '✅' : '❌'}`);
      console.log(`   Pending Changes: ${status.syncStatus.pendingChanges.length}`);
      console.log(`   Recommendation: ${status.syncStatus.syncRecommendation}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Example 7: Automated Update Setup
 */
export async function automatedUpdateSetup() {
  console.log('🤖 Example 7: Automated Update Setup\n');

  const maintenanceService = new PromptMaintenanceService();

  try {
    // Setup automated updates
    await maintenanceService.setupAutomatedUpdates(
      {
        lastUpdate: new Date().toISOString(),
        nextScheduledUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        updateFrequency: 'daily',
        autoUpdate: true
      },
      {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: 'development',
        outputFormat: 'markdown'
      }
    );

    console.log('✅ Automated updates configured');
    console.log('📅 Schedule: Daily updates');
    console.log('🤖 Auto-update: Enabled');
    console.log('📁 Update script created at: .kiro/scripts/update-prompt.js');

    // Get version history
    const versions = await maintenanceService.getVersionHistory();
    console.log(`📚 Version history: ${versions.length} versions tracked`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 NHS/NHSA Prompt Deployment Examples\n');
  console.log('=' .repeat(50));

  const examples = [
    basicDevelopmentDeployment,
    productionDeployment,
    shareablePromptDeployment,
    maintenanceWorkflow,
    customEnvironmentDeployment,
    deploymentStatusMonitoring,
    automatedUpdateSetup
  ];

  for (let i = 0; i < examples.length; i++) {
    try {
      await examples[i]();
      console.log('\n' + '-'.repeat(50) + '\n');
    } catch (error) {
      console.error(`❌ Example ${i + 1} failed:`, error.message);
      console.log('\n' + '-'.repeat(50) + '\n');
    }
  }

  console.log('✅ All examples completed!');
}

// Export individual examples for selective running
export {
  basicDevelopmentDeployment,
  productionDeployment,
  shareablePromptDeployment,
  maintenanceWorkflow,
  customEnvironmentDeployment,
  deploymentStatusMonitoring,
  automatedUpdateSetup
};

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}