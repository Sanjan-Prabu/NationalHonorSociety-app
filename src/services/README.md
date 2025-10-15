# Project Information Aggregation System

This directory contains the implementation of the project information aggregation system for the external AI context prompt feature.

## Overview

The Project Information Aggregation System extracts current project state from documentation files, creates data models for project information, tech stack, and architecture details, and provides information validation and sanitization utilities.

## Files

### Core Implementation
- **`ProjectInfoAggregator.ts`** - Main aggregation service with data models and extraction functions
- **`ProjectInfoAggregator.example.ts`** - Usage examples and demonstrations
- **`__tests__/ProjectInfoAggregator.test.ts`** - Comprehensive test suite

## Features

### 1. Project Information Extraction
- Extracts basic project details from `package.json` and `app.json`
- Identifies project type, purpose, target users, and core features
- Provides fallback data when files are missing or corrupted

### 2. Technology Stack Analysis
- Analyzes dependencies to identify technology components
- Maps technologies to their purposes and versions
- Covers frontend, backend, storage, navigation, authentication, and more

### 3. Architecture Information
- Extracts multi-organization design patterns
- Documents security model and RLS policies
- Lists helper functions and monitoring systems
- Describes navigation structure and data flow

### 4. MCP Configuration Management
- Extracts Supabase MCP server configuration
- Sanitizes sensitive information (tokens, project refs)
- Validates configuration completeness

### 5. Project Status Tracking
- Identifies completed, in-progress, and planned features
- Extracts performance metrics and known issues
- Provides next priorities and development roadmap

### 6. Data Validation and Sanitization
- Validates required fields and data integrity
- Sanitizes strings to remove harmful content
- Provides comprehensive error reporting

## Usage

### Basic Usage

```typescript
import { projectInfoAggregator } from './ProjectInfoAggregator';

// Extract project information
const projectInfo = await projectInfoAggregator.getProjectInfo();
const techStack = await projectInfoAggregator.getTechStackInfo();
const architecture = await projectInfoAggregator.getArchitectureInfo();
const mcpConfig = await projectInfoAggregator.getMCPConfig();
const status = await projectInfoAggregator.getProjectStatus();

// Validate information
const validation = projectInfoAggregator.validateProjectInfo(projectInfo);
if (validation.isValid) {
  console.log('Project information is valid');
} else {
  console.log('Validation errors:', validation.errors);
}
```

### Advanced Usage

```typescript
import { ProjectInfoAggregator, InfoValidator } from './ProjectInfoAggregator';

// Create custom aggregator with specific project root
const aggregator = new ProjectInfoAggregator('/path/to/project');

// Use validation utilities
const sanitized = InfoValidator.sanitizeString(userInput);
const isValidVersion = InfoValidator.validateVersion('1.0.0');
const arrayValidation = InfoValidator.validateArray(items, 1, 10);
```

## Data Models

### ProjectInfo
Contains basic project information including name, type, purpose, target users, and core features.

### TechStackInfo
Comprehensive technology stack mapping with components for frontend, backend, storage, navigation, authentication, styling, testing, and more.

### ArchitectureInfo
Architecture details including multi-organization design, security model, helper functions, monitoring systems, and key patterns.

### MCPConfig
MCP server configuration with sanitized credentials and capability listings.

### ProjectStatus
Current project status with completed, in-progress, and planned features, plus performance metrics.

## Error Handling

The system implements comprehensive error handling:

- **Graceful Degradation**: Returns default values when files are missing
- **Validation Errors**: Detailed error reporting for invalid data
- **Sanitization**: Automatic cleaning of potentially harmful content
- **Fallback Data**: Default project information when extraction fails

## Testing

Run the test suite to verify functionality:

```bash
npm test -- --testPathPattern=ProjectInfoAggregator.test.ts
```

Or see the example file for usage demonstrations:

```typescript
import { runAllExamples } from './ProjectInfoAggregator.example';
await runAllExamples();
```

## Requirements Fulfilled

This implementation fulfills the following requirements:

- **Requirement 1.1**: Extracts current project state from documentation files
- **Requirement 2.1**: Creates data models for project information and tech stack
- **Requirement 3.1**: Provides information validation and sanitization utilities

## Integration

This service is designed to be used by the prompt formatting system to generate comprehensive context prompts for external AI IDEs. The extracted information provides the foundation for creating detailed, accurate project context that enables AI systems to understand and work effectively with the NHS/NHSA application.

## Future Enhancements

- Real-time project state monitoring
- Integration with version control systems
- Automated documentation updates
- Performance metrics tracking
- Custom validation rules