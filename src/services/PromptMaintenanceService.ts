/**
 * Prompt Update and Maintenance System
 * 
 * Implements version tracking for prompt updates, creates update procedures
 * when project state changes, and provides synchronization with project documentation.
 * 
 * Requirements: 6.4
 */

import { readFile, writeFile, mkdir, stat } from 'fs/promises';
import { join } from 'path';
import { ProjectInfoAggregator } from './ProjectInfoAggregator';
import { PromptDeploymentService, ShareablePromptConfig } from './PromptDeploymentService';

export interface PromptVersion {
  version: string;
  timestamp: string;
  changes: string[];
  projectState: {
    completedFeatures: number;
    inProgressFeatures: number;
    plannedFeatures: number;
    knownIssues: number;
  };
  checksum: string;
}

export interface UpdateTrigger {
  type: 'feature-completion' | 'new-feature' | 'architecture-change' | 'security-update' | 'manual';
  description: string;
  impact: 'minor' | 'major' | 'patch';
  requiresRegeneration: boolean;
}

export interface MaintenanceSchedule {
  lastUpdate: string;
  nextScheduledUpdate: string;
  updateFrequency: 'daily' | 'weekly' | 'monthly' | 'on-change';
  autoUpdate: boolean;
}

export interface SyncStatus {
  isUpToDate: boolean;
  lastSync: string;
  pendingChanges: string[];
  conflictingFiles: string[];
  syncRecommendation: string;
}

/**
 * Main Prompt Maintenance Service
 */
export class PromptMaintenanceService {
  private projectRoot: string;
  private versionsDir: string;
  private configFile: string;
  private projectInfoAggregator: ProjectInfoAggregator;
  private deploymentService: PromptDeploymentService;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.versionsDir = join(projectRoot, '.kiro', 'prompt-versions');
    this.configFile = join(projectRoot, '.kiro', 'prompt-maintenance.json');
    this.projectInfoAggregator = new ProjectInfoAggregator(projectRoot);
    this.deploymentService = new PromptDeploymentService(projectRoot);
  }

  /**
   * Initialize prompt maintenance system
   * Requirements: 6.4
   */
  async initializeMaintenanceSystem(): Promise<void> {
    try {
      // Create versions directory
      await mkdir(this.versionsDir, { recursive: true });

      // Create initial maintenance configuration
      const initialConfig = {
        maintenance: {
          lastUpdate: new Date().toISOString(),
          nextScheduledUpdate: this.calculateNextUpdate('weekly'),
          updateFrequency: 'weekly' as const,
          autoUpdate: false
        },
        versioning: {
          currentVersion: '1.0.0',
          versionHistory: [],
          trackingEnabled: true
        },
        synchronization: {
          watchedFiles: [
            'COMPREHENSIVE_APP_DEVELOPMENT_REPORT.md',
            'PROJECT_STATE_COMPREHENSIVE_SUMMARY.md',
            'src/services/**/*.ts',
            'src/contexts/**/*.tsx',
            'supabase/migrations/**/*.sql',
            'package.json',
            'app.json'
          ],
          lastSync: new Date().toISOString(),
          autoSync: true
        },
        triggers: {
          featureCompletion: true,
          architectureChanges: true,
          securityUpdates: true,
          documentationUpdates: true
        }
      };

      await writeFile(this.configFile, JSON.stringify(initialConfig, null, 2), 'utf-8');

      // Create initial version
      await this.createInitialVersion();

      console.log('Prompt maintenance system initialized successfully');
    } catch (error) {
      console.error('Error initializing maintenance system:', error);
      throw new Error(`Failed to initialize maintenance system: ${error.message}`);
    }
  }

  /**
   * Check for project changes and determine if update is needed
   * Requirements: 6.4
   */
  async checkForUpdates(): Promise<{
    updateNeeded: boolean;
    triggers: UpdateTrigger[];
    recommendedAction: string;
  }> {
    try {
      const config = await this.loadMaintenanceConfig();
      const currentProjectState = await this.getCurrentProjectState();
      const lastVersion = await this.getLatestVersion();

      const triggers: UpdateTrigger[] = [];

      // Check for feature completion changes
      if (lastVersion && currentProjectState.completedFeatures !== lastVersion.projectState.completedFeatures) {
        triggers.push({
          type: 'feature-completion',
          description: `Completed features changed from ${lastVersion.projectState.completedFeatures} to ${currentProjectState.completedFeatures}`,
          impact: 'major',
          requiresRegeneration: true
        });
      }

      // Check for new features
      if (lastVersion && currentProjectState.inProgressFeatures !== lastVersion.projectState.inProgressFeatures) {
        triggers.push({
          type: 'new-feature',
          description: `In-progress features changed from ${lastVersion.projectState.inProgressFeatures} to ${currentProjectState.inProgressFeatures}`,
          impact: 'minor',
          requiresRegeneration: true
        });
      }

      // Check for file modifications
      const fileChanges = await this.checkWatchedFiles(config.synchronization.lastSync);
      if (fileChanges.length > 0) {
        triggers.push({
          type: 'architecture-change',
          description: `Modified files: ${fileChanges.join(', ')}`,
          impact: 'major',
          requiresRegeneration: true
        });
      }

      // Check scheduled updates
      const now = new Date();
      const nextUpdate = new Date(config.maintenance.nextScheduledUpdate);
      if (now >= nextUpdate) {
        triggers.push({
          type: 'manual',
          description: 'Scheduled maintenance update due',
          impact: 'patch',
          requiresRegeneration: false
        });
      }

      const updateNeeded = triggers.length > 0;
      const recommendedAction = this.getRecommendedAction(triggers);

      return {
        updateNeeded,
        triggers,
        recommendedAction
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return {
        updateNeeded: false,
        triggers: [],
        recommendedAction: 'Unable to check for updates - manual review recommended'
      };
    }
  }

  /**
   * Perform prompt update based on detected changes
   * Requirements: 6.4
   */
  async performUpdate(
    triggers: UpdateTrigger[],
    config: ShareablePromptConfig,
    options: {
      createBackup: boolean;
      updateVersion: boolean;
      notifyUsers: boolean;
    } = {
      createBackup: true,
      updateVersion: true,
      notifyUsers: false
    }
  ): Promise<{
    success: boolean;
    newVersion: string;
    changes: string[];
    outputPath: string;
  }> {
    try {
      // Create backup if requested
      if (options.createBackup) {
        await this.createBackup();
      }

      // Generate new prompt
      const newPromptPath = await this.deploymentService.createStandalonePromptFile(config);

      // Update version if requested
      let newVersion = '1.0.0';
      if (options.updateVersion) {
        newVersion = await this.createNewVersion(triggers);
      }

      // Update maintenance configuration
      await this.updateMaintenanceConfig(triggers);

      // Generate change summary
      const changes = triggers.map(t => t.description);

      return {
        success: true,
        newVersion,
        changes,
        outputPath: newPromptPath
      };
    } catch (error) {
      console.error('Error performing update:', error);
      return {
        success: false,
        newVersion: '',
        changes: [],
        outputPath: ''
      };
    }
  }

  /**
   * Synchronize with project documentation
   * Requirements: 6.4
   */
  async synchronizeWithDocumentation(): Promise<SyncStatus> {
    try {
      const config = await this.loadMaintenanceConfig();
      const watchedFiles = config.synchronization.watchedFiles;
      const lastSync = config.synchronization.lastSync;

      const pendingChanges: string[] = [];
      const conflictingFiles: string[] = [];

      // Check each watched file for modifications
      for (const filePattern of watchedFiles) {
        const files = await this.expandFilePattern(filePattern);
        
        for (const file of files) {
          try {
            const filePath = join(this.projectRoot, file);
            const stats = await stat(filePath);
            
            if (stats.mtime > new Date(lastSync)) {
              pendingChanges.push(file);
            }
          } catch (error) {
            // File doesn't exist or can't be accessed
            conflictingFiles.push(file);
          }
        }
      }

      const isUpToDate = pendingChanges.length === 0 && conflictingFiles.length === 0;
      const syncRecommendation = this.generateSyncRecommendation(pendingChanges, conflictingFiles);

      // Update last sync time
      if (isUpToDate) {
        config.synchronization.lastSync = new Date().toISOString();
        await writeFile(this.configFile, JSON.stringify(config, null, 2), 'utf-8');
      }

      return {
        isUpToDate,
        lastSync,
        pendingChanges,
        conflictingFiles,
        syncRecommendation
      };
    } catch (error) {
      console.error('Error synchronizing with documentation:', error);
      return {
        isUpToDate: false,
        lastSync: '',
        pendingChanges: [],
        conflictingFiles: [],
        syncRecommendation: 'Error occurred during synchronization - manual review required'
      };
    }
  }

  /**
   * Get version history and tracking information
   * Requirements: 6.4
   */
  async getVersionHistory(): Promise<PromptVersion[]> {
    try {
      const config = await this.loadMaintenanceConfig();
      return config.versioning.versionHistory || [];
    } catch (error) {
      console.error('Error getting version history:', error);
      return [];
    }
  }

  /**
   * Create automated update procedure
   * Requirements: 6.4
   */
  async setupAutomatedUpdates(
    schedule: MaintenanceSchedule,
    config: ShareablePromptConfig
  ): Promise<void> {
    try {
      const maintenanceConfig = await this.loadMaintenanceConfig();
      
      maintenanceConfig.maintenance = {
        ...maintenanceConfig.maintenance,
        ...schedule
      };

      // Create update script
      const updateScript = this.generateUpdateScript(schedule, config);
      const scriptPath = join(this.projectRoot, '.kiro', 'scripts', 'update-prompt.js');
      
      await mkdir(join(this.projectRoot, '.kiro', 'scripts'), { recursive: true });
      await writeFile(scriptPath, updateScript, 'utf-8');

      // Update configuration
      await writeFile(this.configFile, JSON.stringify(maintenanceConfig, null, 2), 'utf-8');

      console.log(`Automated updates configured with ${schedule.updateFrequency} frequency`);
    } catch (error) {
      console.error('Error setting up automated updates:', error);
      throw new Error(`Failed to setup automated updates: ${error.message}`);
    }
  }

  /**
   * Generate update report
   * Requirements: 6.4
   */
  async generateUpdateReport(): Promise<string> {
    try {
      const updateCheck = await this.checkForUpdates();
      const syncStatus = await this.synchronizeWithDocumentation();
      const versionHistory = await this.getVersionHistory();
      const config = await this.loadMaintenanceConfig();

      return `# Prompt Maintenance Report

**Generated**: ${new Date().toISOString()}
**Project**: NHS/NHSA Mobile Application

## Update Status

**Update Needed**: ${updateCheck.updateNeeded ? 'Yes' : 'No'}
**Triggers Found**: ${updateCheck.triggers.length}
**Recommended Action**: ${updateCheck.recommendedAction}

### Detected Triggers
${updateCheck.triggers.map(trigger => 
  `- **${trigger.type}** (${trigger.impact}): ${trigger.description}`
).join('\n')}

## Synchronization Status

**Up to Date**: ${syncStatus.isUpToDate ? 'Yes' : 'No'}
**Last Sync**: ${syncStatus.lastSync}
**Pending Changes**: ${syncStatus.pendingChanges.length}
**Conflicting Files**: ${syncStatus.conflictingFiles.length}

### Pending Changes
${syncStatus.pendingChanges.map(file => `- ${file}`).join('\n') || 'None'}

### Sync Recommendation
${syncStatus.syncRecommendation}

## Version History

**Current Version**: ${config.versioning.currentVersion}
**Total Versions**: ${versionHistory.length}

### Recent Versions
${versionHistory.slice(-5).map(version => 
  `- **${version.version}** (${version.timestamp}): ${version.changes.length} changes`
).join('\n')}

## Maintenance Configuration

**Update Frequency**: ${config.maintenance.updateFrequency}
**Auto Update**: ${config.maintenance.autoUpdate ? 'Enabled' : 'Disabled'}
**Next Scheduled Update**: ${config.maintenance.nextScheduledUpdate}

### Watched Files
${config.synchronization.watchedFiles.map(file => `- ${file}`).join('\n')}

## Recommendations

${this.generateMaintenanceRecommendations(updateCheck, syncStatus, config)}

---

**Report Generated**: ${new Date().toISOString()}
**Maintenance System Version**: 1.0.0
`;
    } catch (error) {
      console.error('Error generating update report:', error);
      return `# Prompt Maintenance Report - Error

**Generated**: ${new Date().toISOString()}

## Error

Failed to generate maintenance report: ${error.message}

Please check the maintenance system configuration and try again.
`;
    }
  }

  // Private helper methods

  private async loadMaintenanceConfig(): Promise<any> {
    try {
      const configContent = await readFile(this.configFile, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      // Return default configuration if file doesn't exist
      return {
        maintenance: {
          lastUpdate: new Date().toISOString(),
          nextScheduledUpdate: this.calculateNextUpdate('weekly'),
          updateFrequency: 'weekly',
          autoUpdate: false
        },
        versioning: {
          currentVersion: '1.0.0',
          versionHistory: [],
          trackingEnabled: true
        },
        synchronization: {
          watchedFiles: [],
          lastSync: new Date().toISOString(),
          autoSync: true
        },
        triggers: {
          featureCompletion: true,
          architectureChanges: true,
          securityUpdates: true,
          documentationUpdates: true
        }
      };
    }
  }

  private async getCurrentProjectState(): Promise<any> {
    const featureStatus = await this.projectInfoAggregator.detectFeatureStatus();
    const projectStatus = await this.projectInfoAggregator.getProjectStatus();
    
    return {
      completedFeatures: featureStatus.completedFeatures.length,
      inProgressFeatures: featureStatus.inProgressFeatures.length,
      plannedFeatures: featureStatus.plannedFeatures.length,
      knownIssues: projectStatus.knownIssues.length
    };
  }

  private async getLatestVersion(): Promise<PromptVersion | null> {
    try {
      const config = await this.loadMaintenanceConfig();
      const versions = config.versioning.versionHistory;
      return versions.length > 0 ? versions[versions.length - 1] : null;
    } catch (error) {
      return null;
    }
  }

  private async checkWatchedFiles(lastSync: string): Promise<string[]> {
    const config = await this.loadMaintenanceConfig();
    const watchedFiles = config.synchronization.watchedFiles;
    const modifiedFiles: string[] = [];

    for (const filePattern of watchedFiles) {
      const files = await this.expandFilePattern(filePattern);
      
      for (const file of files) {
        try {
          const filePath = join(this.projectRoot, file);
          const stats = await stat(filePath);
          
          if (stats.mtime > new Date(lastSync)) {
            modifiedFiles.push(file);
          }
        } catch (error) {
          // File doesn't exist or can't be accessed - skip
        }
      }
    }

    return modifiedFiles;
  }

  private async expandFilePattern(pattern: string): Promise<string[]> {
    // Simple pattern expansion - in a real implementation, you'd use a glob library
    if (pattern.includes('**')) {
      // For now, return the pattern as-is
      // In production, implement proper glob expansion
      return [pattern];
    }
    return [pattern];
  }

  private getRecommendedAction(triggers: UpdateTrigger[]): string {
    if (triggers.length === 0) {
      return 'No updates needed - prompt is current';
    }

    const majorTriggers = triggers.filter(t => t.impact === 'major');
    const requiresRegeneration = triggers.some(t => t.requiresRegeneration);

    if (majorTriggers.length > 0) {
      return 'Major changes detected - full prompt regeneration recommended';
    }

    if (requiresRegeneration) {
      return 'Regenerate prompt to reflect project changes';
    }

    return 'Minor updates available - consider updating prompt';
  }

  private calculateNextUpdate(frequency: string): string {
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
        now.setDate(now.getDate() + 7); // Default to weekly
    }

    return now.toISOString();
  }

  private async createInitialVersion(): Promise<void> {
    const projectState = await this.getCurrentProjectState();
    const checksum = this.generateChecksum(JSON.stringify(projectState));

    const initialVersion: PromptVersion = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      changes: ['Initial prompt version created'],
      projectState,
      checksum
    };

    const config = await this.loadMaintenanceConfig();
    config.versioning.versionHistory = [initialVersion];
    config.versioning.currentVersion = '1.0.0';

    await writeFile(this.configFile, JSON.stringify(config, null, 2), 'utf-8');
  }

  private async createNewVersion(triggers: UpdateTrigger[]): Promise<string> {
    const config = await this.loadMaintenanceConfig();
    const currentVersion = config.versioning.currentVersion;
    const projectState = await this.getCurrentProjectState();
    
    // Simple version increment logic
    const versionParts = currentVersion.split('.').map(Number);
    const hasMajorChanges = triggers.some(t => t.impact === 'major');
    const hasMinorChanges = triggers.some(t => t.impact === 'minor');

    if (hasMajorChanges) {
      versionParts[1]++; // Increment minor version for major changes
      versionParts[2] = 0; // Reset patch version
    } else if (hasMinorChanges) {
      versionParts[2]++; // Increment patch version
    } else {
      versionParts[2]++; // Default to patch increment
    }

    const newVersion = versionParts.join('.');
    const checksum = this.generateChecksum(JSON.stringify(projectState));

    const version: PromptVersion = {
      version: newVersion,
      timestamp: new Date().toISOString(),
      changes: triggers.map(t => t.description),
      projectState,
      checksum
    };

    config.versioning.versionHistory.push(version);
    config.versioning.currentVersion = newVersion;

    await writeFile(this.configFile, JSON.stringify(config, null, 2), 'utf-8');

    return newVersion;
  }

  private async createBackup(): Promise<void> {
    const backupDir = join(this.versionsDir, 'backups');
    await mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(backupDir, `backup-${timestamp}.json`);

    const config = await this.loadMaintenanceConfig();
    await writeFile(backupPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  private async updateMaintenanceConfig(triggers: UpdateTrigger[]): Promise<void> {
    const config = await this.loadMaintenanceConfig();
    
    config.maintenance.lastUpdate = new Date().toISOString();
    config.maintenance.nextScheduledUpdate = this.calculateNextUpdate(config.maintenance.updateFrequency);
    config.synchronization.lastSync = new Date().toISOString();

    await writeFile(this.configFile, JSON.stringify(config, null, 2), 'utf-8');
  }

  private generateSyncRecommendation(pendingChanges: string[], conflictingFiles: string[]): string {
    if (pendingChanges.length === 0 && conflictingFiles.length === 0) {
      return 'All files are synchronized - no action needed';
    }

    if (conflictingFiles.length > 0) {
      return `Conflicting files detected: ${conflictingFiles.join(', ')} - manual resolution required`;
    }

    if (pendingChanges.length > 0) {
      return `${pendingChanges.length} files have been modified - prompt update recommended`;
    }

    return 'Review synchronization status and update as needed';
  }

  private generateMaintenanceRecommendations(updateCheck: any, syncStatus: any, config: any): string {
    const recommendations: string[] = [];

    if (updateCheck.updateNeeded) {
      recommendations.push('• Update prompt to reflect recent project changes');
    }

    if (!syncStatus.isUpToDate) {
      recommendations.push('• Synchronize with modified documentation files');
    }

    if (!config.maintenance.autoUpdate) {
      recommendations.push('• Consider enabling automatic updates for better maintenance');
    }

    if (config.maintenance.updateFrequency === 'monthly') {
      recommendations.push('• Consider more frequent updates during active development');
    }

    if (recommendations.length === 0) {
      recommendations.push('• Maintenance system is operating optimally');
    }

    return recommendations.join('\n');
  }

  private generateUpdateScript(schedule: MaintenanceSchedule, config: ShareablePromptConfig): string {
    return `#!/usr/bin/env node
/**
 * Automated Prompt Update Script
 * Generated: ${new Date().toISOString()}
 */

const { PromptMaintenanceService } = require('../services/PromptMaintenanceService');

async function runAutomatedUpdate() {
  try {
    const maintenanceService = new PromptMaintenanceService();
    
    console.log('Checking for updates...');
    const updateCheck = await maintenanceService.checkForUpdates();
    
    if (updateCheck.updateNeeded) {
      console.log('Updates detected, performing update...');
      
      const config = ${JSON.stringify(config, null, 2)};
      
      const result = await maintenanceService.performUpdate(
        updateCheck.triggers,
        config,
        {
          createBackup: true,
          updateVersion: true,
          notifyUsers: false
        }
      );
      
      if (result.success) {
        console.log(\`Update completed successfully - Version: \${result.newVersion}\`);
        console.log(\`Output: \${result.outputPath}\`);
      } else {
        console.error('Update failed');
      }
    } else {
      console.log('No updates needed');
    }
  } catch (error) {
    console.error('Automated update failed:', error);
  }
}

if (require.main === module) {
  runAutomatedUpdate();
}

module.exports = { runAutomatedUpdate };
`;
  }

  private generateChecksum(content: string): string {
    // Simple checksum implementation - in production, use a proper hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}