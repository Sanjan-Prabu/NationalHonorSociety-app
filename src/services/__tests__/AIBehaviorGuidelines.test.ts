/**
 * AI Behavior Guidelines Tests
 * 
 * Tests for the AI behavior guidelines and instructions system.
 */

import {
  ContextObjectives,
  SecurityGuidelines,
  SchemaAwareGuidelines,
  FinalInstructions,
  AIGuidelinesGenerator
} from '../AIBehaviorGuidelines';

describe('ContextObjectives', () => {
  describe('getContextObjectives', () => {
    it('should return comprehensive context objectives', () => {
      const objectives = ContextObjectives.getContextObjectives();
      
      expect(objectives).toHaveLength(7);
      expect(objectives[0]).toContain('Project Understanding');
      expect(objectives[1]).toContain('Technology Stack Awareness');
      expect(objectives[2]).toContain('Multi-Organization Context');
      expect(objectives[3]).toContain('Role-Based Architecture');
      expect(objectives[4]).toContain('Database Schema Awareness');
      expect(objectives[5]).toContain('Current Development Phase');
      expect(objectives[6]).toContain('Code Generation Principles');
    });

    it('should include key technology mentions', () => {
      const objectives = ContextObjectives.getContextObjectives();
      const allObjectives = objectives.join(' ');
      
      expect(allObjectives).toContain('React Native');
      expect(allObjectives).toContain('Supabase');
      expect(allObjectives).toContain('Cloudflare R2');
      expect(allObjectives).toContain('RLS policies');
      expect(allObjectives).toContain('helper functions');
    });
  });

  describe('getSuggestionPatterns', () => {
    it('should return appropriate suggestion patterns', () => {
      const patterns = ContextObjectives.getSuggestionPatterns();
      
      expect(patterns).toHaveLength(7);
      expect(patterns[0]).toContain('Build on Existing Infrastructure');
      expect(patterns[1]).toContain('Use Helper Functions');
      expect(patterns[2]).toContain('Follow Component Patterns');
    });

    it('should emphasize existing patterns', () => {
      const patterns = ContextObjectives.getSuggestionPatterns();
      const allPatterns = patterns.join(' ');
      
      expect(allPatterns).toContain('AuthContext');
      expect(allPatterns).toContain('OrganizationContext');
      expect(allPatterns).toContain('NavigationContext');
      expect(allPatterns).toContain('PermissionWrapper');
      expect(allPatterns).toContain('RoleBasedRender');
    });
  });
});

describe('SecurityGuidelines', () => {
  describe('getDataIsolationGuidelines', () => {
    it('should return data isolation requirements', () => {
      const guidelines = SecurityGuidelines.getDataIsolationGuidelines();
      
      expect(guidelines).toHaveLength(7);
      expect(guidelines[0]).toContain('RLS Policy Compliance');
      expect(guidelines[1]).toContain('Helper Function Usage');
      expect(guidelines[2]).toContain('Organization Context Validation');
    });

    it('should emphasize security functions', () => {
      const guidelines = SecurityGuidelines.getDataIsolationGuidelines();
      const allGuidelines = guidelines.join(' ');
      
      expect(allGuidelines).toContain('is_member_of');
      expect(allGuidelines).toContain('is_officer_of');
      expect(allGuidelines).toContain('organizationContextValidator');
    });
  });

  describe('getRoleAccessPatterns', () => {
    it('should return role-based access patterns', () => {
      const patterns = SecurityGuidelines.getRoleAccessPatterns();
      
      expect(patterns).toHaveLength(7);
      expect(patterns[0]).toContain('Permission Wrapper Usage');
      expect(patterns[1]).toContain('Role-Based Navigation');
      expect(patterns[2]).toContain('Component-Level Security');
    });

    it('should reference role management hooks', () => {
      const patterns = SecurityGuidelines.getRoleAccessPatterns();
      const allPatterns = patterns.join(' ');
      
      expect(allPatterns).toContain('useRequireRole');
      expect(allPatterns).toContain('useRoleAccess');
      expect(allPatterns).toContain('PermissionWrapper');
    });
  });

  describe('getAuthenticationGuidelines', () => {
    it('should return authentication security guidelines', () => {
      const guidelines = SecurityGuidelines.getAuthenticationGuidelines();
      
      expect(guidelines).toHaveLength(8);
      expect(guidelines[0]).toContain('AuthContext Integration');
      expect(guidelines[1]).toContain('Token Management');
      expect(guidelines[2]).toContain('Session Persistence');
    });

    it('should reference security services', () => {
      const guidelines = SecurityGuidelines.getAuthenticationGuidelines();
      const allGuidelines = guidelines.join(' ');
      
      expect(allGuidelines).toContain('TokenManager');
      expect(allGuidelines).toContain('SessionPersistence');
      expect(allGuidelines).toContain('NetworkAwareAuth');
      expect(allGuidelines).toContain('AuthErrorHandler');
    });
  });
});

describe('SchemaAwareGuidelines', () => {
  describe('getSchemaGuidelines', () => {
    it('should return schema awareness guidelines', () => {
      const guidelines = SchemaAwareGuidelines.getSchemaGuidelines();
      
      expect(guidelines).toHaveLength(7);
      expect(guidelines[0]).toContain('MCP Schema Awareness');
      expect(guidelines[1]).toContain('Helper Function Preference');
      expect(guidelines[2]).toContain('RLS Policy Respect');
    });

    it('should emphasize MCP integration', () => {
      const guidelines = SchemaAwareGuidelines.getSchemaGuidelines();
      const allGuidelines = guidelines.join(' ');
      
      expect(allGuidelines).toContain('Supabase MCP');
      expect(allGuidelines).toContain('schema validation');
      expect(allGuidelines).toContain('TypeScript types');
    });
  });

  describe('getConsistencyGuidelines', () => {
    it('should return consistency maintenance guidelines', () => {
      const guidelines = SchemaAwareGuidelines.getConsistencyGuidelines();
      
      expect(guidelines).toHaveLength(7);
      expect(guidelines[0]).toContain('Architectural Patterns');
      expect(guidelines[1]).toContain('Component Structure');
      expect(guidelines[2]).toContain('Error Handling Consistency');
    });

    it('should reference established services', () => {
      const guidelines = SchemaAwareGuidelines.getConsistencyGuidelines();
      const allGuidelines = guidelines.join(' ');
      
      expect(allGuidelines).toContain('DatabaseService');
      expect(allGuidelines).toContain('OrganizationService');
      expect(allGuidelines).toContain('Jest');
      expect(allGuidelines).toContain('React Native Testing Library');
    });
  });
});

describe('FinalInstructions', () => {
  describe('getBehaviorExpectations', () => {
    it('should return comprehensive behavior expectations', () => {
      const expectations = FinalInstructions.getBehaviorExpectations();
      
      expect(expectations).toHaveLength(7);
      expect(expectations[0]).toContain('Context-Aware Responses');
      expect(expectations[1]).toContain('Security-First Approach');
      expect(expectations[2]).toContain('Build Upon Existing');
    });

    it('should emphasize key principles', () => {
      const expectations = FinalInstructions.getBehaviorExpectations();
      const allExpectations = expectations.join(' ');
      
      expect(allExpectations).toContain('multi-organization');
      expect(allExpectations).toContain('role-based');
      expect(allExpectations).toContain('security');
      expect(allExpectations).toContain('performance');
    });
  });

  describe('getFinalInstructions', () => {
    it('should return final comprehensive instructions', () => {
      const instructions = FinalInstructions.getFinalInstructions();
      
      expect(instructions).toHaveLength(8);
      expect(instructions[0]).toContain('Primary Objective');
      expect(instructions[1]).toContain('Code Generation');
      expect(instructions[2]).toContain('Problem Solving');
    });

    it('should cover all major areas', () => {
      const instructions = FinalInstructions.getFinalInstructions();
      const allInstructions = instructions.join(' ');
      
      expect(allInstructions).toContain('NHS/NHSA mobile app');
      expect(allInstructions).toContain('database operations');
      expect(allInstructions).toContain('feature development');
      expect(allInstructions).toContain('testing strategies');
    });
  });
});

describe('AIGuidelinesGenerator', () => {
  describe('generateCompleteGuidelines', () => {
    it('should generate complete AI guidelines object', () => {
      const guidelines = AIGuidelinesGenerator.generateCompleteGuidelines();
      
      expect(guidelines).toHaveProperty('contextObjectives');
      expect(guidelines).toHaveProperty('behaviorExpectations');
      expect(guidelines).toHaveProperty('securityGuidelines');
      expect(guidelines).toHaveProperty('finalInstructions');
      
      expect(Array.isArray(guidelines.contextObjectives)).toBe(true);
      expect(Array.isArray(guidelines.behaviorExpectations)).toBe(true);
      expect(Array.isArray(guidelines.securityGuidelines)).toBe(true);
      expect(Array.isArray(guidelines.finalInstructions)).toBe(true);
    });

    it('should combine all guideline components', () => {
      const guidelines = AIGuidelinesGenerator.generateCompleteGuidelines();
      
      // Context objectives should include both objectives and suggestion patterns
      expect(guidelines.contextObjectives.length).toBeGreaterThan(10);
      
      // Security guidelines should include all security aspects
      expect(guidelines.securityGuidelines.length).toBeGreaterThan(15);
      
      // Behavior expectations should include multiple components
      expect(guidelines.behaviorExpectations.length).toBeGreaterThan(15);
      
      // Final instructions should be comprehensive
      expect(guidelines.finalInstructions.length).toBe(8);
    });

    it('should include key concepts across all sections', () => {
      const guidelines = AIGuidelinesGenerator.generateCompleteGuidelines();
      const allContent = [
        ...guidelines.contextObjectives,
        ...guidelines.behaviorExpectations,
        ...guidelines.securityGuidelines,
        ...guidelines.finalInstructions
      ].join(' ');
      
      // Key technology concepts
      expect(allContent).toContain('React Native');
      expect(allContent).toContain('Supabase');
      expect(allContent).toContain('multi-organization');
      expect(allContent).toContain('RLS');
      
      // Key security concepts
      expect(allContent).toContain('is_member_of');
      expect(allContent).toContain('is_officer_of');
      expect(allContent).toContain('AuthContext');
      
      // Key architectural concepts
      expect(allContent).toContain('PermissionWrapper');
      expect(allContent).toContain('OrganizationContext');
      expect(allContent).toContain('NavigationContext');
    });
  });

  describe('generateScenarioSpecificGuidelines', () => {
    it('should generate feature development specific guidelines', () => {
      const guidelines = AIGuidelinesGenerator.generateScenarioSpecificGuidelines('feature-development');
      
      expect(guidelines.contextObjectives).toContain(
        expect.stringContaining('Feature Development Focus')
      );
    });

    it('should generate bug fixing specific guidelines', () => {
      const guidelines = AIGuidelinesGenerator.generateScenarioSpecificGuidelines('bug-fixing');
      
      expect(guidelines.behaviorExpectations).toContain(
        expect.stringContaining('Bug Fixing Approach')
      );
    });

    it('should generate refactoring specific guidelines', () => {
      const guidelines = AIGuidelinesGenerator.generateScenarioSpecificGuidelines('refactoring');
      
      expect(guidelines.finalInstructions).toContain(
        expect.stringContaining('Refactoring Guidelines')
      );
    });

    it('should return base guidelines for unknown scenarios', () => {
      const baseGuidelines = AIGuidelinesGenerator.generateCompleteGuidelines();
      const unknownGuidelines = AIGuidelinesGenerator.generateScenarioSpecificGuidelines('unknown' as any);
      
      expect(unknownGuidelines).toEqual(baseGuidelines);
    });
  });
});