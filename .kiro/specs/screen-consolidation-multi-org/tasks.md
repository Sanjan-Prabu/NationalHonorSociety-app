# Implementation Plan

- [x] 1. Consolidate member screens from NHS folder to parent directory
  - Move all screens from `src/screens/member/nhs/` to `src/screens/member/`
  - Delete duplicate screens in `src/screens/member/nhsa/` folder
  - Delete any duplicate screens at root `src/screens/member/` level
  - Update file names to match existing patterns (e.g., EventScreen.tsx → MemberEventsScreen.tsx)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Consolidate officer screens and remove duplicates
  - Move officer screens from NHS/NHSA subfolders to parent `src/screens/officer/` directory
  - Delete duplicate officer screens in subfolders
  - Ensure consistent naming convention for officer screens
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Add organization context integration to all member screens
  - Import and use `useOrganization()` hook in each member screen
  - Update all data queries to filter by `organizationId`
  - Replace hardcoded organization references with dynamic context values
  - Preserve all existing TODO comments and functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.2_

- [x] 4. Add organization context integration to all officer screens  
  - Import and use `useOrganization()` hook in each officer screen
  - Update all data queries and creation operations to use `organizationId`
  - Ensure officers can only manage data for their organization
  - Preserve all existing TODO comments and functionality
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.2_

- [x] 5. Update navigation and clean up unused files
  - Update all navigation imports to point to consolidated screen locations
  - Remove empty NHS/NHSA folders after moving screens
  - Verify all navigation flows work correctly
  - Test organization switching functionality
  - _Requirements: 5.1, 5.3, 5.4_