/**
 * Test suite for ProjectInfoAggregator
 * 
 * Tests the project information extraction, validation, and sanitization utilities
 */

import { 
  ProjectInfoAggregator, 
  InfoValidator, 
  ProjectInfo, 
  TechStackInfo, 
  ArchitectureInfo,
  MCPConfig,
  ProjectStatus,
  ValidationResult
} from '../ProjectInfoAggregator';

describe('ProjectInfoAggregator', () => {
  let aggregator: ProjectInfoAggregator;

  beforeEach(() => {
    aggregator = new ProjectInfoAggregator();
  });

  describe('getProjectInfo', () => {
    it('should extract basic project information', async () => {
      const projectInfo = await aggregator.getProjectInfo();
      
      expect(projectInfo).toBeDefined();
      expect(projectInfo.name).toBeTruthy();
      expect(projectInfo.type).toBe('React Native Mobile Application');
      expect(projectInfo.purpose).toContain('NHS/NHSA');
      expect(projectInfo.targetUsers).toBeInstanceOf(Array);
      expect(projectInfo.targetUsers.length).toBeGreaterThan(0);
      expect(projectInfo.coreFeatures).toBeInstanceOf(Array);
      expect(projectInfo.coreFeatures.length).toBeGreaterThan(0);
    });

    it('should include expected core features', async () => {
      const projectInfo = await aggregator.getProjectInfo();
      
      expect(projectInfo.coreFeatures).toContain('Volunteer hour tracking and verification');
      expect(projectInfo.coreFeatures).toContain('Multi-organization support (NHS/NHSA)');
      expect(projectInfo.coreFeatures).toContain('Role-based access control (Member/Officer)');
    });

    it('should handle missing package.json gracefully', async () => {
      const aggregatorWithBadPath = new ProjectInfoAggregator('/nonexistent/path');
      const projectInfo = await aggregatorWithBadPath.getProjectInfo();
      
      expect(projectInfo).toBeDefined();
      expect(projectInfo.name).toBeTruthy();
      expect(projectInfo.version).toBeTruthy();
    });
  });

  describe('getTechStackInfo', () => {
    it('should extract technology stack information', async () => {
      const techStack = await aggregator.getTechStackInfo();
      
      expect(techStack).toBeDefined();
      expect(techStack.frontend.technology).toContain('React Native');
      expect(techStack.backend.technology).toBe('Supabase');
      expect(techStack.storage.technology).toBe('Cloudflare R2');
      expect(techStack.navigation.technology).toBe('React Navigation');
      expect(techStack.mcpIntegration.technology).toBe('Supabase MCP Server');
    });

    it('should include purpose for each technology', async () => {
      const techStack = await aggregator.getTechStackInfo();
      
      Object.values(techStack).forEach(component => {
        expect(component.purpose).toBeTruthy();
        expect(typeof component.purpose).toBe('string');
      });
    });

    it('should handle missing dependencies gracefully', async () => {
      const aggregatorWithBadPath = new ProjectInfoAggregator('/nonexistent/path');
      const techStack = await aggregatorWithBadPath.getTechStackInfo();
      
      expect(techStack).toBeDefined();
      expect(techStack.frontend.technology).toBeTruthy();
      expect(techStack.backend.technology).toBeTruthy();
    });
  });

  describe('getArchitectureInfo', () => {
    it('should extract architecture information', async () => {
      const architecture = await aggregator.getArchitectureInfo();
      
      expect(architecture).toBeDefined();
      expect(architecture.multiOrgDesign).toContain('NHS and NHSA');
      expect(architecture.securityModel).toContain('RLS');
      expect(architecture.helperFunctions).toBeInstanceOf(Array);
      expect(architecture.helperFunctions.length).toBeGreaterThan(0);
      expect(architecture.keyPatterns).toBeInstanceOf(Array);
      expect(architecture.monitoringSystems).toBeInstanceOf(Array);
    });

    it('should include expected helper functions', async () => {
      const architecture = await aggregator.getArchitectureInfo();
      
      const helperFunctionNames = architecture.helperFunctions.join(' ');
      expect(helperFunctionNames).toContain('is_member_of');
      expect(helperFunctionNames).toContain('is_officer_of');
      expect(helperFunctionNames).toContain('is_user_onboarded');
    });
  });

  describe('getMCPConfig', () => {
    it('should extract MCP configuration when available', async () => {
      const mcpConfig = await aggregator.getMCPConfig();
      
      if (mcpConfig) {
        expect(mcpConfig.serverName).toBe('supabase');
        expect(mcpConfig.command).toBeTruthy();
        expect(mcpConfig.capabilities).toBeInstanceOf(Array);
        expect(mcpConfig.capabilities.length).toBeGreaterThan(0);
        expect(mcpConfig.autoApprove).toBeInstanceOf(Array);
        expect(typeof mcpConfig.disabled).toBe('boolean');
      }
    });

    it('should sanitize sensitive information', async () => {
      const mcpConfig = await aggregator.getMCPConfig();
      
      if (mcpConfig) {
        // Access token should be sanitized
        expect(mcpConfig.accessToken).toMatch(/^\[ACCESS_TOKEN\]$|^.{8}\.\.\.$/);
        // Project ref should be sanitized
        expect(mcpConfig.projectRef).toMatch(/^\[PROJECT_REF\]$|^.{8}\.\.\.$/);
        // Args should be sanitized
        expect(mcpConfig.args).toBeInstanceOf(Array);
        const argsString = mcpConfig.args.join(' ');
        expect(argsString).not.toMatch(/sbp_[a-f0-9]{40}/); // Should not contain full tokens
      }
    });

    it('should return null when MCP config is not available', async () => {
      const aggregatorWithBadPath = new ProjectInfoAggregator('/nonexistent/path');
      const mcpConfig = await aggregatorWithBadPath.getMCPConfig();
      
      expect(mcpConfig).toBeNull();
    });

    it('should include comprehensive capabilities list', async () => {
      const mcpConfig = await aggregator.getMCPConfig();
      
      if (mcpConfig) {
        expect(mcpConfig.capabilities).toContain('Database schema introspection');
        expect(mcpConfig.capabilities).toContain('SQL query execution and validation');
        expect(mcpConfig.capabilities).toContain('RLS policy management');
        expect(mcpConfig.capabilities).toContain('Edge function deployment');
        expect(mcpConfig.capabilities).toContain('Migration management');
      }
    });
  });

  describe('createSecureMCPTemplate', () => {
    it('should create secure MCP template with placeholders', async () => {
      const template = await aggregator.createSecureMCPTemplate();
      
      expect(template).toBeDefined();
      expect(template.mcpServers).toBeDefined();
      expect(template.mcpServers.supabase).toBeDefined();
      
      const supabaseConfig = template.mcpServers.supabase;
      expect(supabaseConfig.args).toContain('[YOUR_SUPABASE_ACCESS_TOKEN]');
      expect(supabaseConfig.args).toContain('[YOUR_PROJECT_REFERENCE]');
      expect(supabaseConfig.setupInstructions).toBeInstanceOf(Array);
      expect(supabaseConfig.capabilities).toBeInstanceOf(Array);
    });

    it('should include security notes and configuration metadata', async () => {
      const template = await aggregator.createSecureMCPTemplate();
      
      expect(template.configuration).toBeDefined();
      expect(template.configuration.version).toBeTruthy();
      expect(template.configuration.lastUpdated).toBeTruthy();
      expect(template.configuration.securityNotes).toBeInstanceOf(Array);
      expect(template.configuration.securityNotes.length).toBeGreaterThan(0);
    });
  });

  describe('generateMCPSetupInstructions', () => {
    it('should generate comprehensive setup instructions', async () => {
      const instructions = await aggregator.generateMCPSetupInstructions();
      
      expect(instructions).toBeDefined();
      expect(typeof instructions).toBe('string');
      expect(instructions.length).toBeGreaterThan(1000);
      
      // Should include key sections
      expect(instructions).toContain('# MCP (Model Context Protocol) Setup Instructions');
      expect(instructions).toContain('## Prerequisites');
      expect(instructions).toContain('## Step 1: Install MCP Server Package');
      expect(instructions).toContain('## Step 2: Obtain Supabase Credentials');
      expect(instructions).toContain('## Troubleshooting');
      expect(instructions).toContain('## Security Best Practices');
    });

    it('should include project-specific information', async () => {
      const instructions = await aggregator.generateMCPSetupInstructions();
      
      expect(instructions).toContain('NHS/NHSA');
      expect(instructions).toContain('organization');
      expect(instructions).toContain('is_member_of');
      expect(instructions).toContain('is_officer_of');
    });

    it('should include security warnings and best practices', async () => {
      const instructions = await aggregator.generateMCPSetupInstructions();
      
      expect(instructions).toContain('Never commit actual tokens to version control');
      expect(instructions).toContain('service_role');
      expect(instructions).toContain('environment variables');
      expect(instructions).toContain('rotate access tokens');
    });
  });

  describe('generateMCPTroubleshootingGuide', () => {
    it('should generate troubleshooting guide', () => {
      const guide = aggregator.generateMCPTroubleshootingGuide();
      
      expect(guide).toBeDefined();
      expect(typeof guide).toBe('string');
      expect(guide.length).toBeGreaterThan(500);
      
      // Should include troubleshooting sections
      expect(guide).toContain('# MCP Troubleshooting and Validation Guide');
      expect(guide).toContain('## Connection Issues');
      expect(guide).toContain('## Validation Steps');
      expect(guide).toContain('## Common Error Messages');
    });

    it('should include validation steps', () => {
      const guide = aggregator.generateMCPTroubleshootingGuide();
      
      expect(guide).toContain('Basic Connection Test');
      expect(guide).toContain('Schema Access Validation');
      expect(guide).toContain('Query Generation Test');
      expect(guide).toContain('Helper Function Awareness');
    });
  });

  describe('generateCompleteMCPDocumentation', () => {
    it('should generate complete MCP documentation package', async () => {
      const documentation = await aggregator.generateCompleteMCPDocumentation();
      
      expect(documentation).toBeDefined();
      expect(documentation.setupInstructions).toBeTruthy();
      expect(documentation.troubleshootingGuide).toBeTruthy();
      expect(documentation.secureTemplate).toBeDefined();
      expect(documentation.validationResult).toBeDefined();
      
      expect(typeof documentation.setupInstructions).toBe('string');
      expect(typeof documentation.troubleshootingGuide).toBe('string');
      expect(typeof documentation.secureTemplate).toBe('object');
      expect(typeof documentation.validationResult.isValid).toBe('boolean');
    });

    it('should include all required documentation components', async () => {
      const documentation = await aggregator.generateCompleteMCPDocumentation();
      
      // Setup instructions should be comprehensive
      expect(documentation.setupInstructions.length).toBeGreaterThan(1000);
      
      // Troubleshooting guide should be detailed
      expect(documentation.troubleshootingGuide.length).toBeGreaterThan(500);
      
      // Secure template should have proper structure
      expect(documentation.secureTemplate.mcpServers).toBeDefined();
      expect(documentation.secureTemplate.configuration).toBeDefined();
      
      // Validation result should have proper structure
      expect(documentation.validationResult.errors).toBeInstanceOf(Array);
      expect(documentation.validationResult.warnings).toBeInstanceOf(Array);
    });
  });

  describe('validateMCPConfigFile', () => {
    it('should validate MCP configuration file structure', async () => {
      const result = await aggregator.validateMCPConfigFile();
      
      // Should either be valid or return specific validation errors
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.warnings).toBeInstanceOf(Array);
    });

    it('should detect missing required fields', async () => {
      const aggregatorWithBadPath = new ProjectInfoAggregator('/nonexistent/path');
      const result = await aggregatorWithBadPath.validateMCPConfigFile();
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('getProjectStatus', () => {
    it('should extract project status information', async () => {
      const status = await aggregator.getProjectStatus();
      
      expect(status).toBeDefined();
      expect(status.completedFeatures).toBeInstanceOf(Array);
      expect(status.inProgressFeatures).toBeInstanceOf(Array);
      expect(status.plannedFeatures).toBeInstanceOf(Array);
      expect(status.knownIssues).toBeInstanceOf(Array);
      expect(status.nextPriorities).toBeInstanceOf(Array);
      expect(status.performanceMetrics).toBeDefined();
    });

    it('should include expected completed features', async () => {
      const status = await aggregator.getProjectStatus();
      
      const featureNames = status.completedFeatures.map(f => f.name);
      expect(featureNames).toContain('Authentication System');
      expect(featureNames).toContain('Multi-Organization Support');
      expect(featureNames).toContain('Role-Based Navigation');
    });

    it('should include performance metrics', async () => {
      const status = await aggregator.getProjectStatus();
      
      expect(status.performanceMetrics.loginTime).toBeTruthy();
      expect(status.performanceMetrics.logoutTime).toBeTruthy();
      expect(status.performanceMetrics.navigationErrors).toBeTruthy();
      expect(status.performanceMetrics.codeReduction).toBeTruthy();
    });
  });

  describe('validateProjectInfo', () => {
    it('should validate valid project info', () => {
      const validProjectInfo: ProjectInfo = {
        name: 'Test Project',
        type: 'Mobile App',
        purpose: 'Testing purposes',
        targetUsers: ['Users'],
        coreFeatures: ['Feature 1'],
        problemStatement: 'Problem',
        solutionOverview: 'Solution',
        version: '1.0.0'
      };

      const result = aggregator.validateProjectInfo(validProjectInfo);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData).toBeDefined();
    });

    it('should detect missing required fields', () => {
      const invalidProjectInfo: ProjectInfo = {
        name: '',
        type: 'Mobile App',
        purpose: '',
        targetUsers: [],
        coreFeatures: [],
        problemStatement: 'Problem',
        solutionOverview: 'Solution',
        version: '1.0.0'
      };

      const result = aggregator.validateProjectInfo(invalidProjectInfo);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('name'))).toBe(true);
      expect(result.errors.some(e => e.includes('purpose'))).toBe(true);
    });

    it('should generate warnings for missing optional fields', () => {
      const projectInfoWithWarnings: ProjectInfo = {
        name: 'Test Project',
        type: 'Mobile App',
        purpose: 'Testing purposes',
        targetUsers: [],
        coreFeatures: [],
        problemStatement: 'Problem',
        solutionOverview: 'Solution',
        version: '1.0.0'
      };

      const result = aggregator.validateProjectInfo(projectInfoWithWarnings);
      
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('target users'))).toBe(true);
      expect(result.warnings.some(w => w.includes('core features'))).toBe(true);
    });
  });

  describe('validateMCPConfig', () => {
    it('should validate valid MCP config', () => {
      const validMCPConfig: MCPConfig = {
        serverName: 'supabase',
        command: 'npx',
        args: ['@supabase/mcp-server-supabase'],
        accessToken: 'valid_token_123',
        projectRef: 'valid_ref_123',
        capabilities: ['query', 'execute'],
        autoApprove: ['connect'],
        disabled: false
      };

      const result = aggregator.validateMCPConfig(validMCPConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData).toBeDefined();
    });

    it('should detect missing required fields', () => {
      const invalidMCPConfig: MCPConfig = {
        serverName: '',
        command: '',
        args: [],
        accessToken: '',
        projectRef: '',
        capabilities: [],
        autoApprove: [],
        disabled: false
      };

      const result = aggregator.validateMCPConfig(invalidMCPConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('server name'))).toBe(true);
      expect(result.errors.some(e => e.includes('command'))).toBe(true);
    });

    it('should sanitize sensitive information', () => {
      const mcpConfig: MCPConfig = {
        serverName: 'supabase',
        command: 'npx',
        args: [],
        accessToken: 'sensitive_token_12345',
        projectRef: 'sensitive_ref_12345',
        capabilities: [],
        autoApprove: [],
        disabled: false
      };

      const result = aggregator.validateMCPConfig(mcpConfig);
      
      expect(result.sanitizedData?.accessToken).toMatch(/^.{8}\.\.\.$/);
      expect(result.sanitizedData?.projectRef).toMatch(/^.{8}\.\.\.$/);
    });
  });
});

describe('InfoValidator', () => {
  describe('validateRequiredFields', () => {
    it('should validate objects with all required fields', () => {
      const obj = { name: 'Test', type: 'App', version: '1.0.0' };
      const required = ['name', 'type', 'version'];
      
      const errors = InfoValidator.validateRequiredFields(obj, required);
      
      expect(errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const obj = { name: 'Test', type: '' };
      const required = ['name', 'type', 'version'];
      
      const errors = InfoValidator.validateRequiredFields(obj, required);
      
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('type'))).toBe(true);
      expect(errors.some(e => e.includes('version'))).toBe(true);
    });
  });

  describe('sanitizeString', () => {
    it('should remove potentially harmful content', () => {
      const input = '<script>alert("xss")</script>Hello World';
      const sanitized = InfoValidator.sanitizeString(input);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
      expect(sanitized).toContain('Hello World');
    });

    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const sanitized = InfoValidator.sanitizeString(input);
      
      expect(sanitized).toBe('Hello World');
    });

    it('should limit string length', () => {
      const input = 'a'.repeat(2000);
      const sanitized = InfoValidator.sanitizeString(input);
      
      expect(sanitized.length).toBeLessThanOrEqual(1000);
    });

    it('should handle empty or null input', () => {
      expect(InfoValidator.sanitizeString('')).toBe('');
      expect(InfoValidator.sanitizeString(null as any)).toBe('');
      expect(InfoValidator.sanitizeString(undefined as any)).toBe('');
    });
  });

  describe('validateArray', () => {
    it('should validate arrays within expected bounds', () => {
      const arr = ['item1', 'item2', 'item3'];
      const result = InfoValidator.validateArray(arr, 1, 10);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect arrays that are too short', () => {
      const arr = ['item1'];
      const result = InfoValidator.validateArray(arr, 3, 10);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('at least 3'))).toBe(true);
    });

    it('should warn about arrays that are too long', () => {
      const arr = new Array(150).fill('item');
      const result = InfoValidator.validateArray(arr, 0, 100);
      
      expect(result.warnings.some(w => w.includes('150 items'))).toBe(true);
      expect(result.sanitizedData?.length).toBe(100);
    });

    it('should handle non-array input', () => {
      const result = InfoValidator.validateArray('not an array' as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Expected array'))).toBe(true);
    });
  });

  describe('validateVersion', () => {
    it('should validate correct version formats', () => {
      expect(InfoValidator.validateVersion('1.0.0')).toBe(true);
      expect(InfoValidator.validateVersion('2.1.3')).toBe(true);
      expect(InfoValidator.validateVersion('1.0.0-beta')).toBe(true);
      expect(InfoValidator.validateVersion('1.0.0-alpha.1')).toBe(true);
    });

    it('should reject incorrect version formats', () => {
      expect(InfoValidator.validateVersion('1.0')).toBe(false);
      expect(InfoValidator.validateVersion('v1.0.0')).toBe(false);
      expect(InfoValidator.validateVersion('1.0.0.0')).toBe(false);
      expect(InfoValidator.validateVersion('invalid')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URL formats', () => {
      expect(InfoValidator.validateUrl('https://example.com')).toBe(true);
      expect(InfoValidator.validateUrl('http://localhost:3000')).toBe(true);
      expect(InfoValidator.validateUrl('ftp://files.example.com')).toBe(true);
    });

    it('should reject incorrect URL formats', () => {
      expect(InfoValidator.validateUrl('not-a-url')).toBe(false);
      expect(InfoValidator.validateUrl('example.com')).toBe(false);
      expect(InfoValidator.validateUrl('')).toBe(false);
    });
  });
});