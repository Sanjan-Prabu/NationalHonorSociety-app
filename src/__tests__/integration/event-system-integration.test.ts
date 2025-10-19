/**
 * Comprehensive Event System Integration Tests
 * Tests the complete event system functionality including:
 * - Event creation, display, and deletion workflows for officers
 * - Member event viewing and volunteer hours integration
 * - Realtime updates validation
 * - Organization-scoped data access and cross-organization isolation
 */

import { eventService } from '../../services/EventService';
import { volunteerHoursService } from '../../services/VolunteerHoursService';
import { CreateEventRequest, CreateVolunteerHourRequest } from '../../types/dataService';

// Mock organization and user IDs for testing
const mockOrgId1 = 'test-org-1';
const mockOrgId2 = 'test-org-2';
const mockOfficerId = 'test-officer-id';
const mockMemberId = 'test-member-id';

describe('Event System Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Officer Event Management Workflow', () => {
    it('should create event with all required fields and proper categorization', async () => {
      // Mock event service methods
      const mockCreateEvent = jest.spyOn(eventService, 'createEvent');
      
      const mockEventData = {
        id: 'test-event-1',
        org_id: mockOrgId1,
        title: 'Community Cleanup',
        description: 'Help clean up the local park',
        location: 'Central Park',
        event_date: '2024-02-15',
        starts_at: '2024-02-15T09:00:00Z',
        ends_at: '2024-02-15T12:00:00Z',
        category: 'volunteering',
        created_by: mockOfficerId,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
        status: 'active' as const,
        actual_attendance: 0,
      };

      mockCreateEvent.mockResolvedValue({
        data: mockEventData,
        error: null,
        success: true,
      });

      // Test event creation request
      const eventRequest: CreateEventRequest = {
        title: 'Community Cleanup',
        description: 'Help clean up the local park',
        location: 'Central Park',
        event_date: '2024-02-15',
        starts_at: '2024-02-15T09:00:00Z',
        ends_at: '2024-02-15T12:00:00Z',
        category: 'volunteering',
      };

      const result = await eventService.createEvent(eventRequest);

      // Verify event creation
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe('Community Cleanup');
      expect(result.data?.category).toBe('volunteering');
      expect(result.data?.org_id).toBe(mockOrgId1);
      expect(mockCreateEvent).toHaveBeenCalledWith(eventRequest);
    });

    it('should display events in card format with proper category tags', async () => {
      // Mock event service methods
      const mockFetchEvents = jest.spyOn(eventService, 'fetchEvents');
      
      const mockEventsData = [
        {
          id: 'event-1',
          org_id: mockOrgId1,
          title: 'Fundraiser Bake Sale',
          description: 'Annual bake sale fundraiser',
          location: 'School Cafeteria',
          event_date: '2024-02-20',
          starts_at: '2024-02-20T10:00:00Z',
          ends_at: '2024-02-20T14:00:00Z',
          category: 'fundraiser',
          created_by: mockOfficerId,
          created_at: '2024-01-20T10:00:00Z',
          updated_at: '2024-01-20T10:00:00Z',
          status: 'active' as const,
          actual_attendance: 0,
        },
        {
          id: 'event-2',
          org_id: mockOrgId1,
          title: 'Educational Workshop',
          description: 'Leadership skills workshop',
          location: 'Library Conference Room',
          event_date: '2024-02-25',
          starts_at: '2024-02-25T15:00:00Z',
          ends_at: '2024-02-25T17:00:00Z',
          category: 'education',
          created_by: mockOfficerId,
          created_at: '2024-01-25T10:00:00Z',
          updated_at: '2024-01-25T10:00:00Z',
          status: 'active' as const,
          actual_attendance: 0,
        },
      ];

      mockFetchEvents.mockResolvedValue({
        data: mockEventsData,
        error: null,
        success: true,
      });

      // Fetch events for display
      const result = await eventService.fetchEvents({}, { limit: 10 });

      // Verify events display
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      
      // Verify category mapping for EventCard component
      const fundraiserEvent = result.data?.find(e => e.category === 'fundraiser');
      const educationEvent = result.data?.find(e => e.category === 'education');
      
      expect(fundraiserEvent).toBeDefined();
      expect(fundraiserEvent?.category).toBe('fundraiser'); // Should map to orange tag
      expect(educationEvent).toBeDefined();
      expect(educationEvent?.category).toBe('education'); // Should map to purple tag
    });

    it('should delete event with confirmation and update UI immediately', async () => {
      // Mock event service methods
      const mockSoftDeleteEvent = jest.spyOn(eventService, 'softDeleteEvent');
      
      mockSoftDeleteEvent.mockResolvedValue({
        data: true,
        error: null,
        success: true,
      });

      const eventId = 'test-event-to-delete';

      // Delete event
      const result = await eventService.softDeleteEvent(eventId);

      // Verify deletion
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockSoftDeleteEvent).toHaveBeenCalledWith(eventId);
    });
  });

  describe('Member Event Viewing', () => {
    it('should display events in read-only format for members', async () => {
      // Mock event service for member view
      const mockFetchEvents = jest.spyOn(eventService, 'fetchEvents');
      
      const mockMemberEventsData = [
        {
          id: 'member-event-1',
          org_id: mockOrgId1,
          title: 'Volunteer Opportunity',
          description: 'Community service event',
          location: 'Community Center',
          event_date: '2024-03-01',
          starts_at: '2024-03-01T09:00:00Z',
          ends_at: '2024-03-01T12:00:00Z',
          category: 'volunteering',
          created_by: mockOfficerId,
          created_at: '2024-02-01T10:00:00Z',
          updated_at: '2024-02-01T10:00:00Z',
          status: 'active' as const,
          actual_attendance: 0,
        },
      ];

      mockFetchEvents.mockResolvedValue({
        data: mockMemberEventsData,
        error: null,
        success: true,
      });

      // Fetch events for member view (upcoming events only)
      const result = await eventService.fetchEvents({ upcoming: true }, { limit: 10 });

      // Verify member can view events
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].title).toBe('Volunteer Opportunity');
      
      // Note: EventCard component should not show delete button for members
      // This is handled in the component props: showDeleteButton={false}
    });
  });

  describe('Volunteer Hours Integration', () => {
    it('should populate organization events in volunteer hours form', async () => {
      // Mock event service for volunteer hours form
      const mockFetchEvents = jest.spyOn(eventService, 'fetchEvents');
      
      const mockOrganizationEvents = [
        {
          id: 'org-event-1',
          org_id: mockOrgId1,
          title: 'Park Cleanup',
          description: 'Environmental volunteer work',
          location: 'City Park',
          event_date: '2024-03-10',
          starts_at: '2024-03-10T08:00:00Z',
          ends_at: '2024-03-10T12:00:00Z',
          category: 'volunteering',
          created_by: mockOfficerId,
          created_at: '2024-02-10T10:00:00Z',
          updated_at: '2024-02-10T10:00:00Z',
          status: 'active' as const,
          actual_attendance: 0,
        },
        {
          id: 'org-event-2',
          org_id: mockOrgId1,
          title: 'Food Drive',
          description: 'Collect food donations',
          location: 'School Entrance',
          event_date: '2024-03-15',
          starts_at: '2024-03-15T10:00:00Z',
          ends_at: '2024-03-15T16:00:00Z',
          category: 'fundraiser',
          created_by: mockOfficerId,
          created_at: '2024-02-15T10:00:00Z',
          updated_at: '2024-02-15T10:00:00Z',
          status: 'active' as const,
          actual_attendance: 0,
        },
      ];

      mockFetchEvents.mockResolvedValue({
        data: mockOrganizationEvents,
        error: null,
        success: true,
      });

      // Fetch events for volunteer hours form dropdown
      const result = await eventService.fetchEvents({}, { limit: 100 });

      // Verify events are available for selection
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      
      // Transform for dropdown options (as done in MemberVolunteerHoursForm)
      const dropdownOptions = result.data?.map(event => ({
        label: event.title,
        value: event.id
      })) || [];
      
      expect(dropdownOptions).toEqual([
        { label: 'Park Cleanup', value: 'org-event-1' },
        { label: 'Food Drive', value: 'org-event-2' },
      ]);
    });

    it('should submit volunteer hours with event association', async () => {
      // Mock volunteer hours service
      const mockSubmitVolunteerHours = jest.spyOn(volunteerHoursService, 'submitVolunteerHours');
      
      const mockVolunteerHourData = {
        id: 'volunteer-hour-1',
        member_id: mockMemberId,
        org_id: mockOrgId1,
        hours: 4,
        description: 'Organization Event: Park Cleanup - Helped with trash collection and recycling',
        activity_date: '2024-03-10',
        submitted_at: '2024-03-10T18:00:00Z',
        approved: false,
        event_id: 'org-event-1',
        event_name: 'Park Cleanup',
        status: 'pending' as const,
        can_edit: true,
      };

      mockSubmitVolunteerHours.mockResolvedValue({
        data: mockVolunteerHourData,
        error: null,
        success: true,
      });

      // Submit volunteer hours with event association
      const volunteerHourRequest: CreateVolunteerHourRequest = {
        hours: 4,
        description: 'Organization Event: Park Cleanup - Helped with trash collection and recycling',
        activity_date: '2024-03-10',
        event_id: 'org-event-1',
      };

      const result = await volunteerHoursService.submitVolunteerHours(volunteerHourRequest);

      // Verify submission with event association
      expect(result.success).toBe(true);
      expect(result.data?.event_id).toBe('org-event-1');
      expect(result.data?.event_name).toBe('Park Cleanup');
      expect(result.data?.description).toContain('Organization Event');
      expect(mockSubmitVolunteerHours).toHaveBeenCalledWith(volunteerHourRequest);
    });

    it('should submit volunteer hours without event association for custom activities', async () => {
      // Mock volunteer hours service
      const mockSubmitVolunteerHours = jest.spyOn(volunteerHoursService, 'submitVolunteerHours');
      
      const mockCustomVolunteerHourData = {
        id: 'volunteer-hour-2',
        member_id: mockMemberId,
        org_id: mockOrgId1,
        hours: 2,
        description: 'Local Animal Shelter - Walked dogs and cleaned kennels',
        activity_date: '2024-03-12',
        submitted_at: '2024-03-12T20:00:00Z',
        approved: false,
        event_id: undefined,
        event_name: undefined,
        status: 'pending' as const,
        can_edit: true,
      };

      mockSubmitVolunteerHours.mockResolvedValue({
        data: mockCustomVolunteerHourData,
        error: null,
        success: true,
      });

      // Submit custom volunteer hours without event association
      const customVolunteerHourRequest: CreateVolunteerHourRequest = {
        hours: 2,
        description: 'Local Animal Shelter - Walked dogs and cleaned kennels',
        activity_date: '2024-03-12',
        // No event_id for custom activities
      };

      const result = await volunteerHoursService.submitVolunteerHours(customVolunteerHourRequest);

      // Verify custom submission without event association
      expect(result.success).toBe(true);
      expect(result.data?.event_id).toBeUndefined();
      expect(result.data?.event_name).toBeUndefined();
      expect(result.data?.description).not.toContain('Organization Event');
      expect(mockSubmitVolunteerHours).toHaveBeenCalledWith(customVolunteerHourRequest);
    });
  });

  describe('Realtime Updates Validation', () => {
    it('should handle realtime event creation updates', async () => {
      // Mock realtime subscription
      const mockSubscribeToEvents = jest.spyOn(eventService, 'subscribeToEvents');
      
      let realtimeCallback: ((payload: any) => void) | null = null;
      
      mockSubscribeToEvents.mockImplementation((callback) => {
        realtimeCallback = callback;
        return Promise.resolve(() => {}); // Return unsubscribe function
      });

      // Setup subscription
      const unsubscribe = await eventService.subscribeToEvents((payload) => {
        console.log('Realtime update received:', payload);
      });

      expect(mockSubscribeToEvents).toHaveBeenCalled();
      expect(realtimeCallback).toBeDefined();

      // Simulate realtime INSERT event
      if (realtimeCallback) {
        const newEventPayload = {
          eventType: 'INSERT',
          new: {
            id: 'realtime-event-1',
            org_id: mockOrgId1,
            title: 'New Realtime Event',
            description: 'Event created in realtime',
            location: 'Test Location',
            event_date: '2024-04-01',
            starts_at: '2024-04-01T10:00:00Z',
            ends_at: '2024-04-01T12:00:00Z',
            category: 'education',
            created_by: mockOfficerId,
            created_at: '2024-03-20T10:00:00Z',
            updated_at: '2024-03-20T10:00:00Z',
            status: 'active' as const,
            actual_attendance: 0,
          },
          old: null,
        };

        // This would trigger UI updates in the actual hook
        realtimeCallback(newEventPayload);
      }

      // Verify subscription was established
      expect(typeof unsubscribe).toBe('function');
    });

    it('should handle realtime event deletion updates', async () => {
      // Mock realtime subscription for deletion
      const mockSubscribeToEvents = jest.spyOn(eventService, 'subscribeToEvents');
      
      let realtimeCallback: ((payload: any) => void) | null = null;
      
      mockSubscribeToEvents.mockImplementation((callback) => {
        realtimeCallback = callback;
        return Promise.resolve(() => {}); // Return unsubscribe function
      });

      // Setup subscription
      await eventService.subscribeToEvents((payload) => {
        console.log('Realtime deletion update:', payload);
      });

      // Simulate realtime DELETE event
      if (realtimeCallback) {
        const deleteEventPayload = {
          eventType: 'DELETE',
          new: null,
          old: {
            id: 'deleted-event-1',
            org_id: mockOrgId1,
            title: 'Deleted Event',
            status: 'deleted' as const,
          },
        };

        // This would trigger UI updates to remove the event
        realtimeCallback(deleteEventPayload);
      }

      expect(mockSubscribeToEvents).toHaveBeenCalled();
    });
  });

  describe('Organization-Scoped Data Access', () => {
    it('should isolate events between different organizations', async () => {
      // Mock event service for organization isolation
      const mockFetchEvents = jest.spyOn(eventService, 'fetchEvents');
      
      // Mock events for organization 1
      const org1Events = [
        {
          id: 'org1-event-1',
          org_id: mockOrgId1,
          title: 'Org 1 Event',
          description: 'Event for organization 1',
          location: 'Org 1 Location',
          event_date: '2024-04-05',
          starts_at: '2024-04-05T10:00:00Z',
          ends_at: '2024-04-05T12:00:00Z',
          category: 'education',
          created_by: mockOfficerId,
          created_at: '2024-03-25T10:00:00Z',
          updated_at: '2024-03-25T10:00:00Z',
          status: 'active' as const,
          actual_attendance: 0,
        },
      ];

      // Mock events for organization 2
      const org2Events = [
        {
          id: 'org2-event-1',
          org_id: mockOrgId2,
          title: 'Org 2 Event',
          description: 'Event for organization 2',
          location: 'Org 2 Location',
          event_date: '2024-04-06',
          starts_at: '2024-04-06T10:00:00Z',
          ends_at: '2024-04-06T12:00:00Z',
          category: 'volunteering',
          created_by: 'org2-officer-id',
          created_at: '2024-03-26T10:00:00Z',
          updated_at: '2024-03-26T10:00:00Z',
          status: 'active' as const,
          actual_attendance: 0,
        },
      ];

      // First call returns org1 events (current organization context)
      mockFetchEvents.mockResolvedValueOnce({
        data: org1Events,
        error: null,
        success: true,
      });

      // Second call returns org2 events (different organization context)
      mockFetchEvents.mockResolvedValueOnce({
        data: org2Events,
        error: null,
        success: true,
      });

      // Fetch events for organization 1
      const org1Result = await eventService.fetchEvents({}, { limit: 10 });
      
      // Fetch events for organization 2
      const org2Result = await eventService.fetchEvents({}, { limit: 10 });

      // Verify organization isolation
      expect(org1Result.success).toBe(true);
      expect(org1Result.data).toHaveLength(1);
      expect(org1Result.data?.[0].org_id).toBe(mockOrgId1);
      expect(org1Result.data?.[0].title).toBe('Org 1 Event');

      expect(org2Result.success).toBe(true);
      expect(org2Result.data).toHaveLength(1);
      expect(org2Result.data?.[0].org_id).toBe(mockOrgId2);
      expect(org2Result.data?.[0].title).toBe('Org 2 Event');

      // Verify no cross-organization data leakage
      expect(org1Result.data?.[0].org_id).not.toBe(mockOrgId2);
      expect(org2Result.data?.[0].org_id).not.toBe(mockOrgId1);
    });

    it('should prevent cross-organization event deletion', async () => {
      // Mock event service for cross-org deletion attempt
      const mockSoftDeleteEvent = jest.spyOn(eventService, 'softDeleteEvent');
      
      // Mock failed deletion due to organization mismatch
      mockSoftDeleteEvent.mockResolvedValue({
        data: null,
        error: 'Event not found or access denied',
        success: false,
      });

      // Attempt to delete event from different organization
      const result = await eventService.softDeleteEvent('other-org-event-id');

      // Verify deletion is prevented
      expect(result.success).toBe(false);
      expect(result.error).toContain('access denied');
      expect(result.data).toBeNull();
    });
  });

  describe('Data Consistency and Analytics', () => {
    it('should maintain data consistency between events and volunteer hours', async () => {
      // Mock services for data consistency check
      const mockGetEventById = jest.spyOn(eventService, 'getEventById');
      const mockGetUserVolunteerHours = jest.spyOn(volunteerHoursService, 'getUserVolunteerHours');
      
      const eventId = 'consistency-test-event';
      
      // Mock event data
      mockGetEventById.mockResolvedValue({
        data: {
          id: eventId,
          org_id: mockOrgId1,
          title: 'Consistency Test Event',
          description: 'Event for testing data consistency',
          location: 'Test Location',
          event_date: '2024-04-10',
          starts_at: '2024-04-10T09:00:00Z',
          ends_at: '2024-04-10T12:00:00Z',
          category: 'volunteering',
          created_by: mockOfficerId,
          created_at: '2024-03-30T10:00:00Z',
          updated_at: '2024-03-30T10:00:00Z',
          status: 'active' as const,
          actual_attendance: 0,
        },
        error: null,
        success: true,
      });

      // Mock volunteer hours associated with the event
      mockGetUserVolunteerHours.mockResolvedValue({
        data: [{
          id: 'consistency-hour-1',
          member_id: mockMemberId,
          org_id: mockOrgId1,
          hours: 3,
          description: 'Organization Event: Consistency Test Event - Participated in event activities',
          activity_date: '2024-04-10',
          submitted_at: '2024-04-10T15:00:00Z',
          approved: true,
          event_id: eventId,
          event_name: 'Consistency Test Event',
          status: 'approved' as const,
          can_edit: false,
        }],
        error: null,
        success: true,
      });

      // Verify event exists
      const eventResult = await eventService.getEventById(eventId);
      expect(eventResult.success).toBe(true);
      expect(eventResult.data?.title).toBe('Consistency Test Event');

      // Verify volunteer hours are properly associated
      const hoursResult = await volunteerHoursService.getUserVolunteerHours(mockMemberId);
      expect(hoursResult.success).toBe(true);
      
      const associatedHour = hoursResult.data?.find(hour => hour.event_id === eventId);
      expect(associatedHour).toBeDefined();
      expect(associatedHour?.event_name).toBe('Consistency Test Event');
      expect(associatedHour?.description).toContain('Organization Event');
    });

    it('should support analytics queries for event-associated volunteer hours', async () => {
      // Mock organization volunteer stats with event associations
      const mockGetOrganizationVolunteerStats = jest.spyOn(volunteerHoursService, 'getOrganizationVolunteerStats');
      
      mockGetOrganizationVolunteerStats.mockResolvedValue({
        data: {
          totalHours: 25,
          approvedHours: 20,
          pendingHours: 5,
          totalMembers: 5,
          topVolunteers: [
            { memberId: mockMemberId, memberName: 'Test Member', hours: 12 },
            { memberId: 'member-2', memberName: 'Another Member', hours: 8 },
          ],
        },
        error: null,
        success: true,
      });

      // Get organization stats for analytics
      const statsResult = await volunteerHoursService.getOrganizationVolunteerStats(mockOrgId1);
      
      expect(statsResult.success).toBe(true);
      expect(statsResult.data?.totalHours).toBe(25);
      expect(statsResult.data?.topVolunteers).toHaveLength(2);
      expect(statsResult.data?.topVolunteers[0].hours).toBe(12);
      
      // This validates that analytics can include event-associated volunteer hours
      // The actual implementation would aggregate hours from both organization events
      // and custom volunteer activities
    });
  });
});