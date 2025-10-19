# Implementation Plan

- [x] 1. Enhance Tag component with new color variants
  - Add orange and teal color variants to Tag component for event categories
  - Update color constants and variant mapping to support fundraiser and volunteering categories
  - _Requirements: 6.1, 6.4, 6.5_

- [x] 2. Create EventCard component based on AnnouncementCard pattern
  - Create EventCard component that displays event information in card format
  - Implement event-specific fields: date, time, location, category tag
  - Add delete button functionality for officers only
  - Include proper date/time formatting and category color mapping
  - _Requirements: 2.1, 2.2, 2.3, 7.1, 7.2_

- [x] 3. Update CreateEventScreen with category selection and validation
  - Add category selection buttons for fundraiser, volunteering, education, custom
  - Implement custom category input field that appears when custom is selected
  - Update form validation to include category selection as required field
  - Connect form submission to EventService and navigate back on success
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 4. Integrate EventCard into OfficerEventsScreen
  - Replace existing event display with EventCard components
  - Implement delete confirmation dialog and soft-delete functionality
  - Add realtime updates to immediately refresh UI after create/delete operations
  - Connect create event button to navigate to CreateEventScreen
  - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1, 3.2, 3.4_

- [x] 5. Add member event viewing capability
  - Update member screens to display events using EventCard without delete functionality
  - Ensure events are filtered by organization and show only active events
  - Implement realtime updates for members to see new events immediately
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Integrate events with volunteer hours system
  - Update volunteer hours form to populate organization events as selectable options
  - Add event selection functionality in the organization event toggle section
  - Store event association with volunteer hours entries for analytics
  - Ensure proper data flow from events table to volunteer hours form
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Test and validate complete event system functionality
  - Test event creation, display, and deletion workflows for officers
  - Verify member event viewing and volunteer hours integration
  - Validate realtime updates work correctly across all screens
  - Test organization-scoped data access and cross-organization isolation
  - _Requirements: 3.3, 3.5, 7.3, 7.4, 7.5_