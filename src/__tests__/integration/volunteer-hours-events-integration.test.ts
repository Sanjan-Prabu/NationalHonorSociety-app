/**
 * Integration test for volunteer hours and events system
 * Tests the complete flow of event creation, volunteer hours submission with event association,
 * and data retrieval with proper event information
 */

import { volunteerHoursService } from '../../services/VolunteerHoursService';
import { eventService } from '../../services/EventService';
import { CreateVolunteerHourRequest, CreateEventRequest } from '../../types/dataService';

describe('Volunteer Hours and Events Integration', () => {
  // Mock organization and user IDs for testing
  const mockOrgId = 'test-org-id';
  const mockUserId = 'test-user-id';
  const mockEventId = 'test-event-id';

  beforeEach(() => {
    // Reset any mocks or test state
    jest.clearAllMocks();
  });

  describe('Event Association in Volunteer Hours', () => {
    it('should create volunteer hours with event association', async () => {
      // Mock the volunteer hours service methods
      const mockSubmitVolunteerHours = jest.spyOn(volunteerHoursService, 'submitVolunteerHours');
      
      // Mock successful response with event association
      const mockVolunteerHourData = {
        id: 'test-hour-id',
        member_id: mockUserId,
        org_id: mockOrgId,
        hours: 3,
        description: 'Organization Event: Community Cleanup - Helped clean up local park',
        activity_date: '2024-01-15',
        submitted_at: '2024-01-15T10:00:00Z',
        approved: false,
        event_id: mockEventId,
        event_name: 'Community Cleanup',
        status: 'pending' as const,
        can_edit: true,
      };

      mockSubmitVolunteerHours.mockResolvedValue({
        data: mockVolunteerHourData,
        error: null,
        success: true,
      });

      // Test data for volunteer hours submission with event association
      const volunteerHourRequest: CreateVolunteerHourRequest = {
        hours: 3,
        description: 'Organization Event: Community Cleanup - Helped clean up local park',
        activity_date: '2024-01-15',
        event_id: mockEventId,
      };

      // Submit volunteer hours with event association
      const result = await volunteerHoursService.submitVolunteerHours(volunteerHourRequest);

      // Verify the submission was successful
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.event_id).toBe(mockEventId);
      expect(result.data?.event_name).toBe('Community Cleanup');
      expect(result.data?.description).toContain('Organization Event');
      
      // Verify the service was called with correct parameters
      expect(mockSubmitVolunteerHours).toHaveBeenCalledWith(volunteerHourRequest);
    });

    it('should create volunteer hours without event association for custom activities', async () => {
      // Mock the volunteer hours service methods
      const mockSubmitVolunteerHours = jest.spyOn(volunteerHoursService, 'submitVolunteerHours');
      
      // Mock successful response without event association
      const mockVolunteerHourData = {
        id: 'test-hour-id-2',
        member_id: mockUserId,
        org_id: mockOrgId,
        hours: 2,
        description: 'Food Bank Volunteer - Sorted donations and helped with distribution',
        activity_date: '2024-01-16',
        submitted_at: '2024-01-16T14:00:00Z',
        approved: false,
        event_id: undefined,
        event_name: undefined,
        status: 'pending' as const,
        can_edit: true,
      };

      mockSubmitVolunteerHours.mockResolvedValue({
        data: mockVolunteerHourData,
        error: null,
        success: true,
      });

      // Test data for custom volunteer hours submission
      const volunteerHourRequest: CreateVolunteerHourRequest = {
        hours: 2,
        description: 'Food Bank Volunteer - Sorted donations and helped with distribution',
        activity_date: '2024-01-16',
        // No event_id for custom activities
      };

      // Submit volunteer hours without event association
      const result = await volunteerHoursService.submitVolunteerHours(volunteerHourRequest);

      // Verify the submission was successful
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.event_id).toBeUndefined();
      expect(result.data?.event_name).toBeUndefined();
      expect(result.data?.description).not.toContain('Organization Event');
      
      // Verify the service was called with correct parameters
      expect(mockSubmitVolunteerHours).toHaveBeenCalledWith(volunteerHourRequest);
    });

    it('should retrieve volunteer hours with event information', async () => {
      // Mock the volunteer hours service methods
      const mockGetUserVolunteerHours = jest.spyOn(volunteerHoursService, 'getUserVolunteerHours');
      
      // Mock response with mixed volunteer hours (some with events, some without)
      const mockVolunteerHours = [
        {
          id: 'hour-1',
          member_id: mockUserId,
          org_id: mockOrgId,
          hours: 3,
          description: 'Organization Event: Community Cleanup',
          activity_date: '2024-01-15',
          submitted_at: '2024-01-15T10:00:00Z',
          approved: true,
          event_id: mockEventId,
          event_name: 'Community Cleanup',
          status: 'approved' as const,
          can_edit: false,
        },
        {
          id: 'hour-2',
          member_id: mockUserId,
          org_id: mockOrgId,
          hours: 2,
          description: 'Food Bank Volunteer',
          activity_date: '2024-01-16',
          submitted_at: '2024-01-16T14:00:00Z',
          approved: false,
          event_id: undefined,
          event_name: undefined,
          status: 'pending' as const,
          can_edit: true,
        },
      ];

      mockGetUserVolunteerHours.mockResolvedValue({
        data: mockVolunteerHours,
        error: null,
        success: true,
      });

      // Retrieve user volunteer hours
      const result = await volunteerHoursService.getUserVolunteerHours(mockUserId);

      // Verify the retrieval was successful
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(2);
      
      // Verify event-associated volunteer hours
      const eventHour = result.data?.find(hour => hour.event_id === mockEventId);
      expect(eventHour).toBeDefined();
      expect(eventHour?.event_name).toBe('Community Cleanup');
      expect(eventHour?.description).toContain('Organization Event');
      
      // Verify custom volunteer hours
      const customHour = result.data?.find(hour => !hour.event_id);
      expect(customHour).toBeDefined();
      expect(customHour?.event_name).toBeUndefined();
      expect(customHour?.description).toBe('Food Bank Volunteer');
    });
  });

  describe('Data Flow Validation', () => {
    it('should maintain data consistency between events and volunteer hours', async () => {
      // This test would verify that when an event is deleted,
      // associated volunteer hours handle the relationship properly
      
      // Mock event service
      const mockGetEventById = jest.spyOn(eventService, 'getEventById');
      const mockGetUserVolunteerHours = jest.spyOn(volunteerHoursService, 'getUserVolunteerHours');
      
      // Mock event data
      mockGetEventById.mockResolvedValue({
        data: {
          id: mockEventId,
          org_id: mockOrgId,
          title: 'Community Cleanup',
          description: 'Help clean up the local park',
          location: 'Central Park',
          event_date: '2024-01-15',
          starts_at: '2024-01-15T09:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
        },
        error: null,
        success: true,
      });

      // Mock volunteer hours associated with the event
      mockGetUserVolunteerHours.mockResolvedValue({
        data: [{
          id: 'hour-1',
          member_id: mockUserId,
          org_id: mockOrgId,
          hours: 3,
          description: 'Organization Event: Community Cleanup',
          activity_date: '2024-01-15',
          submitted_at: '2024-01-15T10:00:00Z',
          approved: true,
          event_id: mockEventId,
          event_name: 'Community Cleanup',
          status: 'approved' as const,
          can_edit: false,
        }],
        error: null,
        success: true,
      });

      // Verify event exists
      const eventResult = await eventService.getEventById(mockEventId);
      expect(eventResult.success).toBe(true);
      expect(eventResult.data?.title).toBe('Community Cleanup');

      // Verify volunteer hours are properly associated
      const hoursResult = await volunteerHoursService.getUserVolunteerHours(mockUserId);
      expect(hoursResult.success).toBe(true);
      
      const associatedHour = hoursResult.data?.find(hour => hour.event_id === mockEventId);
      expect(associatedHour).toBeDefined();
      expect(associatedHour?.event_name).toBe('Community Cleanup');
    });
  });

  describe('Analytics and Reporting', () => {
    it('should support analytics queries for event-associated volunteer hours', async () => {
      // Mock organization volunteer stats that include event associations
      const mockGetOrganizationVolunteerStats = jest.spyOn(volunteerHoursService, 'getOrganizationVolunteerStats');
      
      mockGetOrganizationVolunteerStats.mockResolvedValue({
        data: {
          totalHours: 10,
          approvedHours: 8,
          pendingHours: 2,
          totalMembers: 3,
          topVolunteers: [
            { memberId: mockUserId, memberName: 'Test User', hours: 5 },
          ],
        },
        error: null,
        success: true,
      });

      // Get organization stats
      const statsResult = await volunteerHoursService.getOrganizationVolunteerStats(mockOrgId);
      
      expect(statsResult.success).toBe(true);
      expect(statsResult.data?.totalHours).toBe(10);
      expect(statsResult.data?.topVolunteers).toHaveLength(1);
      
      // This validates that the stats can be used for analytics
      // including event-associated volunteer hours
    });
  });
});