# NHS/NHSA Prompt Deployment and Sharing Utilities

This directory contains comprehensive utilities for deploying and maintaining AI context prompts for the NHS/NHSA mobile application project. These services enable easy sharing of project context with external AI IDEs while maintaining version control and automated updates.

## Overview

The deployment system consists of three main services:

1. **PromptDeploymentService** - Creates shareable prompt files with setup instructions
2. **PromptMaintenanceService** - Handles version tracking and automated updates
3. **PromptDeploymentManager** - Unified interface for complete lifecycle management

## Quick Start

### Basic Deployment

```typescript
import { PromptDeploymentManager } from './services/PromptDeploymentManager';

const manager = new PromptDeploymentManager();

// Deploy for development environment
const result = await manager.deployPrompt({
  environment: 'development',
  includeCredentials: false,
  includeMCPSetup: true,
  includeCustomization: true,
  outputFormat: 'markdown',
  enableMaintenance: true
});

console.log(`Prompt deployed to: ${result.promptPath}`);
```

### CLI Usage

```bash
# Deploy a new prompt
node scripts/deploy-prompt.js deploy --environment development

# Update existing prompt
node scripts/deploy-prompt.js update --force

# Check deployment status
node scripts/deploy-prompt.js status

# Generate deployment guide
node scripts/deploy-prompt.js guide
```

## Services Documentation

### PromptDeploymentService

Creates standalone prompt files that can be easily shared with external AI IDEs.

**Key Features:**
- Generates comprehensive context prompts with project information
- Includes setup instructions for different environments
- Provides configuration guidance for various AI IDEs
- Supports customization options for different deployment scenarios

**Usage:**
```typescript
import { PromptDeploymentService } from './PromptDeploymentService';

const service = new PromptDeploymentService();

const promptOutput = await service.generateShareablePrompt({
  includeCredentials: false,
  includeMCPSetup: true,
  includeCustomization: true,
  targetEnvironment: 'development',
  outputFormat: 'markdown'
});

// Create standalone file
const filePath = await service.createStandalonePromptFile(config);
```

### PromptMaintenanceService

Handles version tracking, update detection, and automated maintenance of prompt files.

**Key Features:**
- Automatic detection of project changes that require prompt updates
- Version tracking with comprehensive change logs
- Synchronization with project documentation
- Automated update scheduling and execution
- Backup and recovery mechanisms

**Usage:**
```typescript
import { PromptMaintenanceService } from './PromptMaintenanceService';

const maintenance = new PromptMaintenanceService();

// Initialize maintenance system
await maintenance.initializeMaintenanceSystem();

// Check for updates
const updateCheck = await maintenance.checkForUpdates();
if (updateCheck.updateNeeded) {
  console.log('Updates available:', updateCheck.triggers);
}

// Setup automated updates
await maintenance.setupAutomatedUpdates({
  updateFrequency: 'weekly',
  autoUpdate: false
}, promptConfig);
```

### PromptDeploymentManager

Unified interface that combines deployment and maintenance operations for complete lifecycle management.

**Key Features:**
- Single interface for all deployment operations
- Integrated maintenance system setup
- Deployment status monitoring
- Template-based configuration
- Comprehensive deployment guides

**Usage:**
```typescript
import { PromptDeploymentManager } from './PromptDeploymentManager';

const manager = new PromptDeploymentManager();

// Deploy with maintenance
const result = await manager.deployPrompt({
  environment: 'production',
  enableMaintenance: true,
  maintenanceSchedule: {
    updateFrequency: 'monthly',
    autoUpdate: false
  }
});

// Check status
const status = await manager.getDeploymentStatus();
console.log('Deployment status:', status);

// Update if needed
if (status.updateNeeded) {
  await manager.updatePrompt(promptConfig);
}
```

## Configuration Options

### Environment Types

- **Development**: Includes debug information, mock data awareness, frequent updates
- **Production**: Optimized for stability, security-focused, less frequent updates
- **Generic**: Flexible configuration suitable for sharing across different setups

### Deployment Options

```typescript
interface DeploymentOptions {
  environment: 'development' | 'production' | 'generic';
  includeCredentials: boolean;        // Never set to true for security
  includeMCPSetup: boolean;          // Include MCP integration instructions
  includeCustomization: boolean;     // Include customization options
  outputFormat: 'markdown' | 'text' | 'json';
  enableMaintenance: boolean;        // Enable version tracking and updates
  maintenanceSchedule?: {
    updateFrequency: 'daily' | 'weekly' | 'monthly';
    autoUpdate: boolean;
  };
}
```

### Maintenance Configuration

```typescript
interface MaintenanceSchedule {
  lastUpdate: string;
  nextScheduledUpdate: string;
  updateFrequency: 'daily' | 'weekly' | 'monthly' | 'on-change';
  autoUpdate: boolean;
}
```

## File Structure

```
src/services/
├── PromptDeploymentService.ts      # Core deployment functionality
├── PromptMaintenanceService.ts     # Version tracking and updates
├── PromptDeploymentManager.ts      # Unified management interface
├── examples/
│   └── PromptDeploymentExample.ts  # Comprehensive usage examples
└── __tests__/
    ├── PromptDeploymentService.test.ts
    └── PromptMaintenanceService.test.ts

scripts/
└── deploy-prompt.js                # CLI utility for deployment

.kiro/
├── prompt-versions/                # Version history and backups
├── prompt-maintenance.json         # Maintenance configuration
└── scripts/
    └── update-prompt.js            # Automated update script
```

## Generated Files

### Prompt Exports
- **Location**: `./prompt-exports/`
- **Format**: `nhs-nhsa-context-prompt-{environment}-{timestamp}.md`
- **Content**: Complete standalone prompt with setup instructions

### Version History
- **Location**: `./.kiro/prompt-versions/`
- **Content**: Version tracking, change logs, project state snapshots

### Maintenance Configuration
- **Location**: `./.kiro/prompt-maintenance.json`
- **Content**: Update schedules, watched files, trigger configuration

## Security Considerations

### Credential Handling
- **Never include real credentials** in generated prompts
- Use placeholder values for sensitive configuration
- Provide secure configuration templates
- Include security warnings in documentation

### Access Control
- Generated prompts respect organization data isolation
- Include RLS policy awareness in AI guidelines
- Emphasize security-first development patterns

### File Permissions
- Ensure proper permissions for output directories
- Protect maintenance configuration files
- Secure backup and version history files

## Troubleshooting

### Common Issues

**Deployment Fails**
- Check project structure and required files exist
- Verify permissions for output directories
- Ensure all dependencies are installed

**Maintenance System Issues**
- Check `.kiro/prompt-maintenance.json` configuration
- Verify watched files exist and are accessible
- Review maintenance service logs for errors

**Update Detection Problems**
- Check for file conflicts in watched directories
- Verify version history integrity
- Review backup files if restoration is needed

### Error Recovery

**Corrupted Version History**
```typescript
// Reinitialize maintenance system
await maintenance.initializeMaintenanceSystem();
```

**Failed Updates**
```typescript
// Force update with backup
await manager.updatePrompt(config, {
  forceUpdate: true,
  createBackup: true
});
```

**Missing Configuration**
```typescript
// Recreate with templates
const templates = manager.createDeploymentTemplates();
await manager.deployPrompt(templates.development);
```

## Examples

See `src/services/examples/PromptDeploymentExample.ts` for comprehensive examples including:

1. Basic development deployment
2. Production deployment with minimal configuration
3. Generic shareable prompt creation
4. Maintenance and update workflows
5. Custom environment configuration
6. Deployment status monitoring
7. Automated update setup

## Testing

Run the test suite to verify functionality:

```bash
npm test -- --testPathPattern="PromptDeployment|PromptMaintenance"
```

Tests cover:
- Prompt generation and formatting
- File creation and management
- Version tracking and updates
- Error handling and recovery
- Configuration validation

## Integration

### With Existing Services
- Uses `ProjectInfoAggregator` for current project state
- Integrates with `CapabilitiesSummaryGenerator` for feature status
- Leverages `AIBehaviorGuidelines` for AI instruction generation
- Connects with `PromptFormatter` for structured output

### With External Tools
- Compatible with Cursor IDE, Claude Desktop, VS Code extensions
- Supports MCP integration for schema awareness
- Provides configuration templates for various AI IDEs

## Maintenance

### Regular Tasks
- **Weekly**: Review deployment status and update if needed
- **Monthly**: Check version history and clean up old backups
- **Quarterly**: Review and update maintenance configuration
- **As needed**: Update watched files list when project structure changes

### Monitoring
- Track deployment success rates
- Monitor update trigger frequency
- Review maintenance system performance
- Validate generated prompt quality

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Compatibility**: NHS/NHSA Mobile Application v1.0.0+