/**
 * AI Behavior Guidelines and Instructions System
 * 
 * This service defines comprehensive guidelines for external AI IDEs to understand
 * and work effectively with the NHS/NHSA mobile application project.
 * 
 * Requirements: 1.1, 1.2, 2.1, 4.1, 4.2, 4.3, 4.4, 1.3, 2.3, 5.1, 5.2
 */

import { AIGuidelines } from './PromptFormatter';

/**
 * Context Objectives and Expectations
 * 
 * Defines how AI should understand and use project context,
 * appropriate suggestion patterns, and code generation guidelines.
 */
export class ContextObjectives {
  /**
   * Define context objectives for AI understanding
   * Requirements: 1.1, 1.2, 2.1
   */
  static getContextObjectives(): string[] {
    return [
      "**Project Understanding**: Comprehend the NHS/NHSA mobile app as a multi-organization platform for National Honor Society chapters with BLE attendance tracking, volunteer hours management, and officer dashboards",
      
      "**Technology Stack Awareness**: Recognize React Native + Expo + Supabase + Cloudflare R2 architecture with NativeWind styling and React Navigation for role-based routing",
      
      "**Multi-Organization Context**: Understand that all features must support multiple NHS chapters with complete data isolation and organization-specific branding/functionality",
      
      "**Role-Based Architecture**: Recognize three distinct user roles (Member, Officer, Admin) with different permissions, navigation structures, and feature access levels",
      
      "**Database Schema Awareness**: Understand the PostgreSQL schema with RLS policies, helper functions (is_member_of, is_officer_of, is_user_onboarded), and organization-level data isolation",
      
      "**Current Development Phase**: Recognize that core infrastructure is complete (auth, navigation, multi-org support) and focus on building upon existing patterns rather than recreating foundational systems",
      
      "**Code Generation Principles**: Generate code that follows established patterns, uses existing helper functions, respects RLS policies, and maintains consistency with the current codebase architecture"
    ];
  }

  /**
   * Define appropriate suggestion patterns for AI assistance
   * Requirements: 1.1, 1.2, 2.1
   */
  static getSuggestionPatterns(): string[] {
    return [
      "**Build on Existing Infrastructure**: Always leverage completed AuthContext, OrganizationContext, NavigationContext, and established service patterns",
      
      "**Use Helper Functions**: Prefer database helper functions (is_member_of(), is_officer_of(), is_user_onboarded()) over direct SQL queries for role checking",
      
      "**Follow Component Patterns**: Use established component structures like PermissionWrapper, RoleBasedRender, and organization-aware components",
      
      "**Respect Navigation Structure**: Work within the role-based navigation system (MemberRoot, OfficerRoot) and use proper navigation context",
      
      "**Maintain Data Isolation**: Ensure all database operations respect organization boundaries and use proper RLS policy patterns",
      
      "**Code Consistency**: Follow existing naming conventions, file organization, and architectural patterns established in the codebase",
      
      "**Error Handling**: Use established error handling patterns with proper user feedback and graceful degradation"
    ];
  }
}

/**
 * Security and Compliance Guidelines
 * 
 * Defines organization-level data isolation requirements, role-based access control patterns,
 * and secure authentication and file handling guidelines.
 */
export class SecurityGuidelines {
  /**
   * Organization-level data isolation requirements
   * Requirements: 4.1, 4.2
   */
  static getDataIsolationGuidelines(): string[] {
    return [
      "**RLS Policy Compliance**: All database queries must respect Row Level Security policies that enforce organization-level data isolation",
      
      "**Helper Function Usage**: Use is_member_of(organization_id) and is_officer_of(organization_id) functions for access control rather than manual role checking",
      
      "**Organization Context Validation**: Always validate organization context before performing operations using organizationContextValidator utility",
      
      "**Cross-Organization Prevention**: Never allow users to access data from organizations they don't belong to, even through API endpoints or direct queries",
      
      "**Multi-Tenant Awareness**: Ensure all new features and database operations are designed with multi-tenancy in mind from the start",
      
      "**Data Scoping**: Scope all queries, updates, and deletions to the user's current organization context automatically",
      
      "**Organization Switching**: Handle organization switching securely with proper context updates and data refresh"
    ];
  }

  /**
   * Role-based access control patterns
   * Requirements: 4.2, 4.3
   */
  static getRoleAccessPatterns(): string[] {
    return [
      "**Permission Wrapper Usage**: Use PermissionWrapper component to conditionally render UI elements based on user roles and permissions",
      
      "**Role-Based Navigation**: Respect the established navigation structure where Members and Officers have different navigation stacks and available screens",
      
      "**Component-Level Security**: Implement role checking at the component level using useRequireRole and useRoleAccess hooks",
      
      "**API Endpoint Protection**: Ensure all API endpoints validate user roles and organization membership before processing requests",
      
      "**Feature Gating**: Use role-based feature gating to show/hide functionality appropriately (e.g., officer-only features, admin controls)",
      
      "**Graceful Degradation**: Provide appropriate fallbacks and error messages when users lack required permissions",
      
      "**Dynamic Role Updates**: Handle role changes gracefully with proper context updates and navigation adjustments"
    ];
  }

  /**
   * Secure authentication and file handling guidelines
   * Requirements: 4.3, 4.4
   */
  static getAuthenticationGuidelines(): string[] {
    return [
      "**AuthContext Integration**: Use the established AuthContext for all authentication operations rather than direct Supabase auth calls",
      
      "**Token Management**: Leverage TokenManager service for secure token handling, refresh, and validation",
      
      "**Session Persistence**: Use SessionPersistence service for secure session management across app restarts",
      
      "**Network-Aware Auth**: Implement NetworkAwareAuth patterns for handling authentication in offline/poor connectivity scenarios",
      
      "**Secure File Uploads**: Use Cloudflare R2 with presigned URLs for file uploads, never expose direct storage credentials",
      
      "**File Access Control**: Ensure uploaded files respect organization boundaries and user permissions",
      
      "**Authentication Error Handling**: Use AuthErrorHandler service for consistent error handling and user feedback",
      
      "**Logout Security**: Implement proper logout procedures that clear all sensitive data and invalidate tokens"
    ];
  }
}

/**
 * Schema-Aware Development Guidelines
 * 
 * Provides guidelines for working with the database schema, MCP integration,
 * and maintaining consistency with established patterns.
 */
export class SchemaAwareGuidelines {
  /**
   * Database schema and MCP integration guidelines
   * Requirements: 5.1, 5.2
   */
  static getSchemaGuidelines(): string[] {
    return [
      "**MCP Schema Awareness**: Leverage Supabase MCP integration for real-time schema validation and query assistance",
      
      "**Helper Function Preference**: Use established helper functions (is_member_of, is_officer_of, is_user_onboarded) rather than writing custom SQL",
      
      "**RLS Policy Respect**: Understand that RLS policies automatically filter data based on user context - don't try to bypass or duplicate this logic",
      
      "**Migration Patterns**: Follow established migration patterns when suggesting database changes, always include proper RLS policy updates",
      
      "**Type Safety**: Use generated TypeScript types from Supabase for all database operations to ensure type safety",
      
      "**Query Optimization**: Leverage database indexes and query patterns established in the schema for optimal performance",
      
      "**Edge Function Integration**: Use Supabase Edge Functions for server-side operations that require elevated privileges or complex business logic"
    ];
  }

  /**
   * Consistency maintenance instructions
   * Requirements: 1.3, 2.3
   */
  static getConsistencyGuidelines(): string[] {
    return [
      "**Architectural Patterns**: Follow established service layer patterns (DatabaseService, OrganizationService, etc.) for new functionality",
      
      "**Component Structure**: Maintain consistent component organization with proper separation of UI, logic, and data layers",
      
      "**Error Handling Consistency**: Use established error handling patterns and user feedback mechanisms throughout the application",
      
      "**Testing Patterns**: Follow existing testing patterns with Jest and React Native Testing Library for new components and services",
      
      "**Code Style**: Maintain consistent TypeScript usage, naming conventions, and file organization patterns",
      
      "**Documentation Standards**: Include proper JSDoc comments and inline documentation following established patterns",
      
      "**Performance Patterns**: Follow established performance optimization patterns for React Native and database operations"
    ];
  }
}

/**
 * Final AI Instruction Set
 * 
 * Comprehensive behavior expectations and final instructions for AI assistants.
 */
export class FinalInstructions {
  /**
   * Generate comprehensive behavior expectations
   * Requirements: 1.3, 2.3, 5.1, 5.2
   */
  static getBehaviorExpectations(): string[] {
    return [
      "**Context-Aware Responses**: Always consider the multi-organization, role-based nature of the application when providing suggestions or generating code",
      
      "**Security-First Approach**: Prioritize security and data isolation in all recommendations, never suggest patterns that could compromise organization boundaries",
      
      "**Build Upon Existing**: Leverage completed infrastructure and established patterns rather than suggesting rewrites or alternative approaches",
      
      "**Practical Solutions**: Provide actionable, implementable solutions that work within the existing architecture and constraints",
      
      "**Performance Conscious**: Consider React Native performance implications and suggest optimizations where appropriate",
      
      "**User Experience Focus**: Ensure suggestions enhance the user experience for both Members and Officers while maintaining role-appropriate functionality",
      
      "**Maintainable Code**: Generate clean, well-documented, testable code that follows established patterns and conventions"
    ];
  }

  /**
   * Generate final comprehensive instructions
   * Requirements: 1.3, 2.3, 5.1, 5.2
   */
  static getFinalInstructions(): string[] {
    return [
      "**Primary Objective**: Assist with NHS/NHSA mobile app development by providing context-aware, security-conscious, and architecturally consistent guidance",
      
      "**Code Generation**: When generating code, ensure it integrates seamlessly with existing patterns, uses established services, and respects security boundaries",
      
      "**Problem Solving**: Approach problems by first understanding the multi-organization context, then leveraging existing infrastructure and patterns",
      
      "**Database Operations**: Always use helper functions and respect RLS policies. Leverage MCP integration for schema validation and query assistance",
      
      "**Feature Development**: Build new features that work across all user roles and organizations while maintaining appropriate access controls",
      
      "**Testing Approach**: Suggest comprehensive testing strategies that cover role-based functionality and organization isolation",
      
      "**Documentation**: Provide clear explanations of how suggestions fit within the existing architecture and why specific approaches are recommended",
      
      "**Continuous Improvement**: Look for opportunities to enhance existing patterns while maintaining backward compatibility and system stability"
    ];
  }
}

/**
 * Complete AI Guidelines Generator
 * 
 * Combines all guideline components into a comprehensive AIGuidelines object.
 */
export class AIGuidelinesGenerator {
  /**
   * Generate complete AI guidelines for external IDE integration
   */
  static generateCompleteGuidelines(): AIGuidelines {
    const contextObjectives = [
      ...ContextObjectives.getContextObjectives(),
      ...ContextObjectives.getSuggestionPatterns()
    ];

    const securityGuidelines = [
      ...SecurityGuidelines.getDataIsolationGuidelines(),
      ...SecurityGuidelines.getRoleAccessPatterns(),
      ...SecurityGuidelines.getAuthenticationGuidelines()
    ];

    const behaviorExpectations = [
      ...FinalInstructions.getBehaviorExpectations(),
      ...SchemaAwareGuidelines.getSchemaGuidelines(),
      ...SchemaAwareGuidelines.getConsistencyGuidelines()
    ];

    const finalInstructions = FinalInstructions.getFinalInstructions();

    return {
      contextObjectives,
      behaviorExpectations,
      securityGuidelines,
      finalInstructions
    };
  }

  /**
   * Generate guidelines for specific development scenarios
   */
  static generateScenarioSpecificGuidelines(scenario: 'feature-development' | 'bug-fixing' | 'refactoring'): AIGuidelines {
    const baseGuidelines = this.generateCompleteGuidelines();

    switch (scenario) {
      case 'feature-development':
        return {
          ...baseGuidelines,
          contextObjectives: [
            ...baseGuidelines.contextObjectives,
            "**Feature Development Focus**: Build new features that integrate seamlessly with existing multi-organization and role-based architecture"
          ]
        };

      case 'bug-fixing':
        return {
          ...baseGuidelines,
          behaviorExpectations: [
            ...baseGuidelines.behaviorExpectations,
            "**Bug Fixing Approach**: Identify root causes while considering organization isolation and role-based access patterns"
          ]
        };

      case 'refactoring':
        return {
          ...baseGuidelines,
          finalInstructions: [
            ...baseGuidelines.finalInstructions,
            "**Refactoring Guidelines**: Improve code quality while maintaining existing functionality and security boundaries"
          ]
        };

      default:
        return baseGuidelines;
    }
  }
}