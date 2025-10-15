#!/usr/bin/env node
/**
 * NHS/NHSA Prompt Deployment CLI
 * 
 * Command-line utility for deploying and managing AI context prompts.
 * Provides easy access to deployment and maintenance operations.
 */

const { PromptDeploymentManager } = require('../src/services/PromptDeploymentManager');
const { program } = require('commander');
const path = require('path');
const fs = require('fs').promises;

// Configure CLI program
program
  .name('deploy-prompt')
  .description('Deploy and manage NHS/NHSA AI context prompts')
  .version('1.0.0');

// Deploy command
program
  .command('deploy')
  .description('Deploy a new prompt')
  .option('-e, --environment <env>', 'Target environment (development|production|generic)', 'development')
  .option('--no-credentials', 'Exclude credentials from prompt')
  .option('--no-mcp', 'Exclude MCP setup instructions')
  .option('--no-customization', 'Exclude customization options')
  .option('-f, --format <format>', 'Output format (markdown|text|json)', 'markdown')
  .option('--no-maintenance', 'Disable maintenance system')
  .option('--schedule <frequency>', 'Maintenance schedule (daily|weekly|monthly)', 'weekly')
  .option('-o, --output <path>', 'Output directory path')
  .action(async (options) => {
    try {
      console.log('🚀 Deploying NHS/NHSA AI Context Prompt...\n');

      const manager = new PromptDeploymentManager();
      
      const deploymentOptions = {
        environment: options.environment,
        includeCredentials: options.credentials !== false,
        includeMCPSetup: options.mcp !== false,
        includeCustomization: options.customization !== false,
        outputFormat: options.format,
        enableMaintenance: options.maintenance !== false,
        maintenanceSchedule: options.maintenance !== false ? {
          lastUpdate: new Date().toISOString(),
          nextScheduledUpdate: calculateNextUpdate(options.schedule),
          updateFrequency: options.schedule,
          autoUpdate: false
        } : undefined
      };

      const result = await manager.deployPrompt(deploymentOptions);

      if (result.success) {
        console.log('✅ Deployment successful!\n');
        console.log(`📄 Prompt file: ${result.promptPath}`);
        console.log(`🏷️  Version: ${result.version}`);
        console.log(`🌍 Environment: ${result.metadata.environment}`);
        console.log(`🔧 Maintenance: ${result.metadata.maintenanceEnabled ? 'Enabled' : 'Disabled'}\n`);

        if (result.maintenanceReport) {
          console.log('📊 Maintenance Report:');
          console.log(result.maintenanceReport);
        }
      } else {
        console.error('❌ Deployment failed!\n');
        if (result.errors) {
          result.errors.forEach(error => console.error(`   ${error}`));
        }
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Deployment error:', error.message);
      process.exit(1);
    }
  });

// Update command
program
  .command('update')
  .description('Update existing prompt')
  .option('-e, --environment <env>', 'Target environment', 'development')
  .option('--force', 'Force update even if not needed')
  .option('--no-backup', 'Skip backup creation')
  .option('--no-version', 'Skip version increment')
  .action(async (options) => {
    try {
      console.log('🔄 Updating NHS/NHSA AI Context Prompt...\n');

      const manager = new PromptDeploymentManager();
      
      const promptConfig = {
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        targetEnvironment: options.environment,
        outputFormat: 'markdown'
      };

      const result = await manager.updatePrompt(promptConfig, {
        forceUpdate: options.force,
        createBackup: options.backup !== false,
        updateVersion: options.version !== false
      });

      if (result.success) {
        if (result.updated) {
          console.log('✅ Update successful!\n');
          console.log(`🏷️  New version: ${result.newVersion}`);
          console.log(`📄 Output: ${result.outputPath}`);
          
          if (result.changes && result.changes.length > 0) {
            console.log('\n📝 Changes:');
            result.changes.forEach(change => console.log(`   • ${change}`));
          }
        } else {
          console.log('ℹ️  No updates needed - prompt is current');
        }

        if (result.report) {
          console.log('\n📊 Update Report:');
          console.log(result.report);
        }
      } else {
        console.error('❌ Update failed!');
        console.error(result.report || 'Unknown error occurred');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Update error:', error.message);
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Check deployment status')
  .action(async () => {
    try {
      console.log('📊 NHS/NHSA Prompt Deployment Status\n');

      const manager = new PromptDeploymentManager();
      const status = await manager.getDeploymentStatus();

      console.log(`🚀 Deployed: ${status.isDeployed ? '✅ Yes' : '❌ No'}`);
      console.log(`🏷️  Version: ${status.currentVersion}`);
      console.log(`📅 Last Update: ${formatDate(status.lastUpdate)}`);
      console.log(`⚠️  Update Needed: ${status.updateNeeded ? '⚠️ Yes' : '✅ No'}\n`);

      if (status.recommendations.length > 0) {
        console.log('💡 Recommendations:');
        status.recommendations.forEach(rec => console.log(`   • ${rec}`));
        console.log();
      }

      if (status.syncStatus) {
        console.log('🔄 Synchronization Status:');
        console.log(`   Up to Date: ${status.syncStatus.isUpToDate ? '✅' : '❌'}`);
        console.log(`   Pending Changes: ${status.syncStatus.pendingChanges.length}`);
        console.log(`   Conflicting Files: ${status.syncStatus.conflictingFiles.length}`);
        
        if (status.syncStatus.pendingChanges.length > 0) {
          console.log('\n   Modified Files:');
          status.syncStatus.pendingChanges.forEach(file => console.log(`     • ${file}`));
        }
      }
    } catch (error) {
      console.error('❌ Status check error:', error.message);
      process.exit(1);
    }
  });

// Guide command
program
  .command('guide')
  .description('Generate deployment guide')
  .option('-o, --output <path>', 'Output file path', './deployment-guide.md')
  .action(async (options) => {
    try {
      console.log('📖 Generating deployment guide...\n');

      const manager = new PromptDeploymentManager();
      const guide = await manager.generateDeploymentGuide();

      await fs.writeFile(options.output, guide, 'utf-8');

      console.log(`✅ Deployment guide created: ${options.output}`);
    } catch (error) {
      console.error('❌ Guide generation error:', error.message);
      process.exit(1);
    }
  });

// Templates command
program
  .command('templates')
  .description('Show deployment templates')
  .action(() => {
    try {
      console.log('📋 Deployment Templates\n');

      const manager = new PromptDeploymentManager();
      const templates = manager.createDeploymentTemplates();

      console.log('🔧 Development Template:');
      console.log(JSON.stringify(templates.development, null, 2));
      console.log('\n🚀 Production Template:');
      console.log(JSON.stringify(templates.production, null, 2));
      console.log('\n🌍 Generic Template:');
      console.log(JSON.stringify(templates.generic, null, 2));
    } catch (error) {
      console.error('❌ Templates error:', error.message);
      process.exit(1);
    }
  });

// Helper functions
function calculateNextUpdate(frequency) {
  const now = new Date();
  
  switch (frequency) {
    case 'daily':
      now.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      now.setDate(now.getDate() + 7);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    default:
      now.setDate(now.getDate() + 7);
  }

  return now.toISOString();
}

function formatDate(dateString) {
  if (!dateString || dateString === 'Never' || dateString === 'Unknown') {
    return dateString;
  }
  
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}