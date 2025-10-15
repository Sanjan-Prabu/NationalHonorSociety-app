 # Requirements Document

## Introduction

The current app has duplicate screen files scattered across multiple folders (nhs/, nhsa/, and root level) which creates maintenance overhead and confusion. We need to consolidate all screens into a single shared location and make them dynamically filter data based on the user's organization context. This will eliminate code duplication while maintaining the multi-organization functionality where NHS and NHSA members see only their organization's data.

## Requirements

### Requirement 1

**User Story:** As a developer, I want a single set of screen files that work for all organizations, so that I don't have to maintain duplicate code.

#### Acceptance Criteria

1. WHEN consolidating screens THEN the system SHALL use the screens from the nhs folder as the base implementation
2. WHEN consolidating screens THEN the system SHALL delete duplicate screens from nhsa folder and root member/officer folders
3. WHEN consolidating screens THEN the system SHALL move nhs folder screens to the parent member/officer directories
4. WHEN consolidating screens THEN the system SHALL ensure no functionality is lost during the move

### Requirement 2

**User Story:** As a NHS member, I want to see only NHS data on all screens, so that I don't see NHSA information.

#### Acceptance Criteria

1. WHEN a NHS member views any screen THEN the system SHALL filter all data by their org_id
2. WHEN a NHS member views events THEN the system SHALL show only events where org_id matches their organization
3. WHEN a NHS member views announcements THEN the system SHALL show only announcements for their organization
4. WHEN a NHS member views volunteer hours THEN the system SHALL show only their own hours within their organization

### Requirement 3

**User Story:** As a NHSA member, I want to see only NHSA data on all screens, so that I don't see NHS information.

#### Acceptance Criteria

1. WHEN a NHSA member views any screen THEN the system SHALL filter all data by their org_id
2. WHEN a NHSA member views events THEN the system SHALL show only events where org_id matches their organization
3. WHEN a NHSA member views announcements THEN the system SHALL show only announcements for their organization
4. WHEN a NHSA member views volunteer hours THEN the system SHALL show only their own hours within their organization

### Requirement 4

**User Story:** As an officer, I want to manage data only for my organization, so that I don't accidentally affect other organizations.

#### Acceptance Criteria

1. WHEN an officer creates new content THEN the system SHALL automatically set the org_id to their organization
2. WHEN an officer views management screens THEN the system SHALL show only data for their organization
3. WHEN an officer approves volunteer hours THEN the system SHALL only show hours from members in their organization
4. WHEN an officer manages events THEN the system SHALL only show events for their organization

### Requirement 5

**User Story:** As a user, I want all existing functionality to work after consolidation, so that no features are broken.

#### Acceptance Criteria

1. WHEN screens are consolidated THEN all existing navigation SHALL continue to work
2. WHEN screens are consolidated THEN all data fetching SHALL continue to work with org_id filtering
3. WHEN screens are consolidated THEN all user interactions SHALL continue to work as expected
4. WHEN screens are consolidated THEN all TODO items SHALL be preserved for future implementation