# Design Document

## Overview

The external AI context prompt will be a comprehensive, structured system prompt that provides complete project understanding to external AI IDEs. The design follows a hierarchical information architecture that progresses from high-level project context to specific technical implementation details, ensuring AI systems can quickly grasp the project scope and provide contextually appropriate assistance.

## Architecture

### Information Hierarchy

The prompt follows a structured approach with clear sections:

1. **Project Identity & Purpose** - Core mission and target users
2. **Technical Stack Overview** - Technology choices and their purposes  
3. **Architecture Highlights** - Key design decisions and patterns
4. **Feature Breakdown** - Detailed functionality descriptions
5. **Development Status** - Current state and progress indicators
6. **Configuration Details** - Specific setup and connection information
7. **AI Behavior Guidelines** - Instructions for consistent assistance

### Prompt Structure Design

```
🔹 Project Header
├── Project Name & Type
├── Core Purpose Statement
└── Problem-Solution Summary

🧩 Project Summary
├── Problem Statement
├── Solution Overview
└── Key Benefits

🛠️ Tech Stack Table
├── Component-Technology-Purpose mapping
└── Integration relationships

🔐 Architecture Highlights
├── Multi-organization design
├── Security model (RLS)
├── Helper functions
└── Monitoring systems

📊 Key Features
├── BLE Attendance System
├── Volunteer Hours Management
├── Announcements & Events
└── Officer Dashboards

⚙️ Configuration
├── Supabase MCP setup
├── Database schema overview
└── Connection details

🧱 Development Status
├── Completed features
├── In-progress items
└── Next priorities

💡 AI Guidelines
├── Context objectives
├── Behavior expectations
└── Final instructions
```

## Components and Interfaces

### Context Prompt Generator

**Purpose:** Creates the formatted system prompt with current project information

**Interface:**
```typescript
interface ContextPromptGenerator {
  generatePrompt(): string;
  updateProjectStatus(status: ProjectStatus): void;
  includeTechStack(stack: TechStackInfo): void;
  addArchitectureDetails(architecture: ArchitectureInfo): void;
}
```

### Project Information Aggregator

**Purpose:** Collects current project state from various sources

**Interface:**
```typescript
interface ProjectInfoAggregator {
  getCompletedFeatures(): Feature[];
  getInProgressFeatures(): Feature[];
  getTechStackInfo(): TechStackInfo;
  getArchitectureHighlights(): ArchitectureInfo;
  getMCPConfiguration(): MCPConfig;
}
```

### Prompt Formatter

**Purpose:** Formats information into readable, structured prompt format

**Interface:**
```typescript
interface PromptFormatter {
  formatHeader(projectInfo: ProjectInfo): string;
  formatTechStack(stack: TechStackInfo): string;
  formatFeatures(features: Feature[]): string;
  formatConfiguration(config: Configuration): string;
  formatGuidelines(guidelines: AIGuidelines): string;
}
```

## Data Models

### Project Information Model

```typescript
interface ProjectInfo {
  name: string;
  type: string;
  purpose: string;
  targetUsers: string[];
  coreFeatures: string[];
  problemStatement: string;
  solutionOverview: string;
}
```

### Technology Stack Model

```typescript
interface TechStackInfo {
  frontend: TechComponent;
  backend: TechComponent;
  storage: TechComponent;
  bluetooth: TechComponent;
  navigation: TechComponent;
  analytics: TechComponent;
  fileHandling: TechComponent;
  mcpIntegration: TechComponent;
}

interface TechComponent {
  technology: string;
  purpose: string;
  details?: string;
}
```

### Architecture Information Model

```typescript
interface ArchitectureInfo {
  multiOrgDesign: string;
  securityModel: string;
  schemaDesign: string;
  helperFunctions: string[];
  monitoringSystems: string[];
  keyPatterns: string[];
}
```

### Feature Model

```typescript
interface Feature {
  name: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned';
  technicalDetails: string;
  dependencies: string[];
}
```

### MCP Configuration Model

```typescript
interface MCPConfig {
  serverName: string;
  command: string;
  args: string[];
  accessToken: string;
  projectRef: string;
  capabilities: string[];
  autoApprove: string[];
}
```

## Error Handling

### Information Gathering Errors

**Strategy:** Graceful degradation with fallback information

- If current project status cannot be determined, use last known state
- If MCP configuration is unavailable, provide template configuration
- If specific technical details are missing, use general architectural patterns

### Prompt Generation Errors

**Strategy:** Modular generation with error isolation

- Each section generates independently
- Failed sections are replaced with placeholder content
- Critical sections (project overview, tech stack) have multiple fallback sources

### Format Validation

**Strategy:** Template-based validation with correction

- Validate prompt structure against expected format
- Automatically correct common formatting issues
- Ensure all required sections are present and properly formatted

## Testing Strategy

### Unit Testing

**Prompt Generation Components:**
- Test each formatter function with various input scenarios
- Validate output format consistency
- Test error handling and fallback mechanisms

**Information Aggregation:**
- Test data collection from project files
- Validate information accuracy and completeness
- Test handling of missing or corrupted project data

### Integration Testing

**End-to-End Prompt Generation:**
- Test complete prompt generation process
- Validate prompt effectiveness with sample AI interactions
- Test prompt updates when project state changes

**External AI Compatibility:**
- Test prompt with different AI IDE systems
- Validate context understanding and appropriate responses
- Test MCP integration functionality

### Validation Testing

**Content Accuracy:**
- Verify all technical details are current and correct
- Validate feature status matches actual project state
- Ensure configuration details are accurate and functional

**Prompt Effectiveness:**
- Test AI understanding of project context
- Validate appropriate code suggestions and recommendations
- Ensure security and architectural compliance in AI responses

## Implementation Considerations

### Dynamic Content Updates

The prompt should reflect current project state, requiring:
- Automated detection of project changes
- Version tracking for prompt updates
- Synchronization with project documentation

### Customization Support

Different deployment scenarios may require:
- Organization-specific branding and terminology
- Environment-specific configuration details
- Role-based information filtering

### Performance Optimization

For large projects, consider:
- Selective information inclusion based on context
- Compressed format options for token efficiency
- Caching mechanisms for frequently accessed information

### Security Considerations

Sensitive information handling:
- Sanitize access tokens and credentials
- Use placeholder values for sensitive configuration
- Provide secure configuration templates rather than actual values