# Requirements Document

## Introduction

This document defines the requirements for creating a comprehensive context prompt that enables external AI IDEs to understand and work effectively with the NHS/NHSA (National Honor Society/National Honor Society of America) mobile application project. The prompt must convey the complete project context, architecture, current state, and development guidelines to ensure consistent and informed assistance from external AI systems.

## Requirements

### Requirement 1

**User Story:** As a developer using an external AI IDE, I want a comprehensive context prompt so that the AI can understand the complete NHS/NHSA project structure and provide accurate assistance.

#### Acceptance Criteria

1. WHEN the context prompt is loaded into an external AI IDE THEN the AI SHALL understand the project's core purpose and functionality
2. WHEN the AI provides suggestions THEN it SHALL align with the React Native + Supabase + Cloudflare R2 technology stack
3. WHEN the AI generates code THEN it SHALL follow the established multi-organization architecture patterns
4. WHEN the AI makes database-related suggestions THEN it SHALL respect the RLS (Row Level Security) policies and helper functions

### Requirement 2

**User Story:** As a developer, I want the context prompt to include technical architecture details so that external AI can maintain consistency with existing patterns.

#### Acceptance Criteria

1. WHEN the AI suggests database operations THEN it SHALL use the established helper functions (is_member_of(), is_officer_of(), is_user_onboarded())
2. WHEN the AI creates new components THEN it SHALL follow the organization-aware design patterns
3. WHEN the AI suggests authentication code THEN it SHALL align with the optimized AuthContext implementation
4. WHEN the AI works with navigation THEN it SHALL respect the role-based navigation structure

### Requirement 3

**User Story:** As a developer, I want the context prompt to include current project status so that external AI understands what's completed and what's in progress.

#### Acceptance Criteria

1. WHEN the AI is asked about project features THEN it SHALL know which components are completed vs in-progress
2. WHEN the AI suggests new features THEN it SHALL build upon existing completed infrastructure
3. WHEN the AI identifies issues THEN it SHALL reference known completed solutions
4. WHEN the AI provides implementation guidance THEN it SHALL consider the current development phase

### Requirement 4

**User Story:** As a developer, I want the context prompt to include security and compliance guidelines so that external AI maintains data protection standards.

#### Acceptance Criteria

1. WHEN the AI suggests database queries THEN it SHALL ensure organization-level data isolation
2. WHEN the AI creates user-facing features THEN it SHALL implement proper role-based access control
3. WHEN the AI handles authentication THEN it SHALL follow secure token management practices
4. WHEN the AI works with file uploads THEN it SHALL use the established Cloudflare R2 + presigned URL pattern

### Requirement 5

**User Story:** As a developer, I want the context prompt to include MCP integration details so that external AI can leverage Supabase schema awareness.

#### Acceptance Criteria

1. WHEN the AI needs database schema information THEN it SHALL use the Supabase MCP connection
2. WHEN the AI validates SQL migrations THEN it SHALL leverage MCP schema validation
3. WHEN the AI generates RLS policies THEN it SHALL use MCP-aware helper functions
4. WHEN the AI manages edge functions THEN it SHALL use MCP for safe deployment

### Requirement 6

**User Story:** As a developer, I want the context prompt to be easily shareable and implementable so that it can be quickly deployed in different AI IDE environments.

#### Acceptance Criteria

1. WHEN the prompt is shared THEN it SHALL be in a ready-to-paste format
2. WHEN the prompt is implemented THEN it SHALL require minimal additional configuration
3. WHEN the prompt is used THEN it SHALL provide immediate context awareness
4. WHEN the prompt needs updates THEN it SHALL be easily maintainable and versionable