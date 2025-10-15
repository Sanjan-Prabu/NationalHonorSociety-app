/**
 * Prompt Deployment Manager
 * 
 * Unified interface for prompt deployment and maintenance operations.
 * Combines PromptDeploymentService and PromptMaintenanceService for
 * complete prompt lifecycle management.
 * 
 * Requirements: 6.1, 6.2, 6.4
 */

import { PromptDeploymentService, ShareablePromptConfig, ShareablePromptOutput } from './PromptDeploymentService';
import { PromptMaintenanceService, MaintenanceSchedule, UpdateTrigger } from './PromptMaintenanceService';

export interface DeploymentOptions {
  environment: 'development' | 'production' | 'generic';
  includeCredentials: boolean;
  includeMCPSetup: boolean;
  includeCustomization: boolean;
  outputFormat: 'markdown' | 'text' | 'json';
  enableMaintenance: boolean;
  maintenanceSchedule?: MaintenanceSchedule;
}

export interface DeploymentResult {
  success: boolean;
  promptPath: string;
  version: string;
  metadata: {
    generatedAt: string;
    environment: string;
    maintenanceEnabled: boolean;
  };
  maintenanceReport?: string;
  errors?: string[];
}

/**
 * Main Deployment Manager Class
 */
export class PromptDeploymentManager {
  private deploymentService: PromptDeploymentService;
  private maintenanceService: PromptMaintenanceService;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.deploymentService = new PromptDeploymentService(projectRoot);
    this.maintenanceService = new PromptMaintenanceService(projectRoot);
  }

  /**
   * Deploy prompt with full lifecycle management
   * Requirements: 6.1, 6.2, 6.4
   */
  async deployPrompt(options: DeploymentOptions): Promise<DeploymentResult> {
    try {
      const errors: string[] = [];

      // Create shareable prompt configuration
      const promptConfig: ShareablePromptConfig = {
        includeCredentials: options.includeCredentials,
        includeMCPSetup: options.includeMCPSetup,
        includeCustomization: options.includeCustomization,
        targetEnvironment: options.environment,
        outputFormat: options.outputFormat
      };

      // Generate and deploy prompt
      const promptPath = await this.deploymentService.createStandalonePromptFile(promptConfig);

      // Initialize maintenance system if enabled
      let version = '1.0.0';
      let maintenanceReport = '';

      if (options.enableMaintenance) {
        try {
          await this.maintenanceService.initializeMaintenanceSystem();
          
          if (options.maintenanceSchedule) {
            await this.maintenanceService.setupAutomatedUpdates(
              options.maintenanceSchedule,
              promptConfig
            );
          }

          maintenanceReport = await this.maintenanceService.generateUpdateReport();
          
          const versionHistory = await this.maintenanceService.getVersionHistory();
          if (versionHistory.length > 0) {
            version = versionHistory[versionHistory.length - 1].version;
          }
        } catch (maintenanceError) {
          errors.push(`Maintenance setup failed: ${maintenanceError.message}`);
        }
      }

      return {
        success: errors.length === 0,
        promptPath,
        version,
        metadata: {
          generatedAt: new Date().toISOString(),
          environment: options.environment,
          maintenanceEnabled: options.enableMaintenance
        },
        maintenanceReport: maintenanceReport || undefined,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      return {
        success: false,
        promptPath: '',
        version: '',
        metadata: {
          generatedAt: new Date().toISOString(),
          environment: options.environment,
          maintenanceEnabled: false
        },
        errors: [`Deployment failed: ${error.message}`]
      };
    }
  }

  /**
   * Update existing prompt deployment
   * Requirements: 6.4
   */
  async updatePrompt(
    config: ShareablePromptConfig,
    options: {
      forceUpdate?: boolean;
      createBackup?: boolean;
      updateVersion?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    updated: boolean;
    newVersion?: string;
    changes?: string[];
    outputPath?: string;
    report?: string;
  }> {
    try {
      // Check if update is needed
      const updateCheck = await this.maintenanceService.checkForUpdates();
      
      if (!updateCheck.updateNeeded && !options.forceUpdate) {
        return {
          success: true,
          updated: false,
          report: 'No updates needed - prompt is current'
        };
      }

      // Perform update
      const updateResult = await this.maintenanceService.performUpdate(
        updateCheck.triggers,
        config,
        {
          createBackup: options.createBackup ?? true,
          updateVersion: options.updateVersion ?? true,
          notifyUsers: false
        }
      );

      // Generate update report
      const report = await this.maintenanceService.generateUpdateReport();

      return {
        success: updateResult.success,
        updated: updateResult.success,
        newVersion: updateResult.newVersion,
        changes: updateResult.changes,
        outputPath: updateResult.outputPath,
        report
      };
    } catch (error) {
      return {
        success: false,
        updated: false,
        report: `Update failed: ${error.message}`
      };
    }
  }

  /**
   * Get deployment status and recommendations
   * Requirements: 6.4
   */
  async getDeploymentStatus(): Promise<{
    isDeployed: boolean;
    currentVersion: string;
    lastUpdate: string;
    updateNeeded: boolean;
    recommendations: string[];
    syncStatus: any;
  }> {
    try {
      const updateCheck = await this.maintenanceService.checkForUpdates();
      const syncStatus = await this.maintenanceService.synchronizeWithDocumentation();
      const versionHistory = await this.maintenanceService.getVersionHistory();

      const currentVersion = versionHistory.length > 0 
        ? versionHistory[versionHistory.length - 1].version 
        : 'Not deployed';

      const lastUpdate = versionHistory.length > 0 
        ? versionHistory[versionHistory.length - 1].timestamp 
        : 'Never';

      const recommendations = this.generateDeploymentRecommendations(
        updateCheck,
        syncStatus,
        versionHistory.length > 0
      );

      return {
        isDeployed: versionHistory.length > 0,
        currentVersion,
        lastUpdate,
        updateNeeded: updateCheck.updateNeeded,
        recommendations,
        syncStatus
      };
    } catch (error) {
      return {
        isDeployed: false,
        currentVersion: 'Unknown',
        lastUpdate: 'Unknown',
        updateNeeded: false,
        recommendations: [`Error checking status: ${error.message}`],
        syncStatus: null
      };
    }
  }

  /**
   * Create deployment configuration templates
   * Requirements: 6.2, 6.4
   */
  createDeploymentTemplates(): {
    development: DeploymentOptions;
    production: DeploymentOptions;
    generic: DeploymentOptions;
  } {
    return {
      development: {
        environment: 'development',
        includeCredentials: false, // Never include real credentials
        includeMCPSetup: true,
        includeCustomization: true,
        outputFormat: 'markdown',
        enableMaintenance: true,
        maintenanceSchedule: {
          lastUpdate: new Date().toISOString(),
          nextScheduledUpdate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
          updateFrequency: 'weekly',
          autoUpdate: false
        }
      },
      production: {
        environment: 'production',
        includeCredentials: false, // Never include real credentials
        includeMCPSetup: true,
        includeCustomization: false,
        outputFormat: 'markdown',
        enableMaintenance: true,
        maintenanceSchedule: {
          lastUpdate: new Date().toISOString(),
          nextScheduledUpdate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month
          updateFrequency: 'monthly',
          autoUpdate: false
        }
      },
      generic: {
        environment: 'generic',
        includeCredentials: false,
        includeMCPSetup: true,
        includeCustomization: true,
        outputFormat: 'markdown',
        enableMaintenance: false
      }
    };
  }

  /**
   * Generate comprehensive deployment guide
   * Requirements: 6.1, 6.2, 6.4
   */
  async generateDeploymentGuide(): Promise<string> {
    const templates = this.createDeploymentTemplates();
    const status = await this.getDeploymentStatus();

    return `# NHS/NHSA Prompt Deployment Guide

**Generated**: ${new Date().toISOString()}
**Current Status**: ${status.isDeployed ? 'Deployed' : 'Not Deployed'}
**Current Version**: ${status.currentVersion}

## Quick Deployment

### Option 1: Development Environment
\`\`\`typescript
import { PromptDeploymentManager } from './src/services/PromptDeploymentManager';

const manager = new PromptDeploymentManager();
const result = await manager.deployPrompt({
  environment: 'development',
  includeCredentials: false,
  includeMCPSetup: true,
  includeCustomization: true,
  outputFormat: 'markdown',
  enableMaintenance: true,
  maintenanceSchedule: {
    updateFrequency: 'weekly',
    autoUpdate: false
  }
});

console.log(\`Prompt deployed to: \${result.promptPath}\`);
\`\`\`

### Option 2: Production Environment
\`\`\`typescript
const result = await manager.deployPrompt({
  environment: 'production',
  includeCredentials: false,
  includeMCPSetup: true,
  includeCustomization: false,
  outputFormat: 'markdown',
  enableMaintenance: true,
  maintenanceSchedule: {
    updateFrequency: 'monthly',
    autoUpdate: false
  }
});
\`\`\`

### Option 3: Generic/Shareable
\`\`\`typescript
const result = await manager.deployPrompt({
  environment: 'generic',
  includeCredentials: false,
  includeMCPSetup: true,
  includeCustomization: true,
  outputFormat: 'markdown',
  enableMaintenance: false
});
\`\`\`

## Deployment Templates

### Development Template
\`\`\`json
${JSON.stringify(templates.development, null, 2)}
\`\`\`

### Production Template
\`\`\`json
${JSON.stringify(templates.production, null, 2)}
\`\`\`

### Generic Template
\`\`\`json
${JSON.stringify(templates.generic, null, 2)}
\`\`\`

## Maintenance Operations

### Check for Updates
\`\`\`typescript
const status = await manager.getDeploymentStatus();
if (status.updateNeeded) {
  console.log('Updates available:', status.recommendations);
}
\`\`\`

### Perform Update
\`\`\`typescript
const updateResult = await manager.updatePrompt(promptConfig, {
  forceUpdate: false,
  createBackup: true,
  updateVersion: true
});

if (updateResult.success) {
  console.log(\`Updated to version: \${updateResult.newVersion}\`);
}
\`\`\`

## Current Status

**Deployment Status**: ${status.isDeployed ? '✅ Deployed' : '❌ Not Deployed'}
**Update Needed**: ${status.updateNeeded ? '⚠️ Yes' : '✅ No'}
**Last Update**: ${status.lastUpdate}

### Recommendations
${status.recommendations.map(rec => `- ${rec}`).join('\n')}

## File Locations

- **Prompt Exports**: \`./prompt-exports/\`
- **Version History**: \`./.kiro/prompt-versions/\`
- **Maintenance Config**: \`./.kiro/prompt-maintenance.json\`
- **Update Scripts**: \`./.kiro/scripts/\`

## Security Notes

- **Never commit real credentials** to version control
- **Use environment variables** for sensitive configuration
- **Regularly rotate access tokens** used in MCP setup
- **Review generated prompts** before sharing externally

## Troubleshooting

### Deployment Fails
1. Check project structure and required files
2. Verify permissions for output directories
3. Ensure all dependencies are installed

### Maintenance Issues
1. Check \`.kiro/prompt-maintenance.json\` configuration
2. Verify watched files exist and are accessible
3. Review maintenance service logs

### Update Problems
1. Check for file conflicts in watched directories
2. Verify version history integrity
3. Review backup files if restoration is needed

---

**Deployment Guide Version**: 1.0.0
**Last Updated**: ${new Date().toISOString()}
**Support**: Review project documentation for additional help
`;
  }

  // Private helper methods

  private generateDeploymentRecommendations(
    updateCheck: any,
    syncStatus: any,
    isDeployed: boolean
  ): string[] {
    const recommendations: string[] = [];

    if (!isDeployed) {
      recommendations.push('Deploy initial prompt using development template');
      recommendations.push('Enable maintenance system for automatic updates');
    }

    if (updateCheck.updateNeeded) {
      recommendations.push('Update prompt to reflect recent project changes');
      recommendations.push(`Triggers: ${updateCheck.triggers.map(t => t.type).join(', ')}`);
    }

    if (!syncStatus.isUpToDate) {
      recommendations.push('Synchronize with modified documentation files');
      recommendations.push(`Modified files: ${syncStatus.pendingChanges.join(', ')}`);
    }

    if (syncStatus.conflictingFiles && syncStatus.conflictingFiles.length > 0) {
      recommendations.push('Resolve file conflicts before updating');
    }

    if (recommendations.length === 0) {
      recommendations.push('Deployment is up to date - no action needed');
    }

    return recommendations;
  }
}

// Export singleton instance for easy use
export const promptDeploymentManager = new PromptDeploymentManager();