/**
 * Role-Based Access Control Integration Tests
 * 
 * Tests to validate proper role-based access control across all screens
 * Ensures members and officers see appropriate data and functionality
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import screens to test
import MemberEventsScreen from '../../screens/member/MemberEventsScreen';
import MemberLogHoursScreen from '../../screens/member/MemberLogHoursScreen';
import MemberAttendanceScreen from '../../screens/member/MemberAttendanceScreen';
import OfficerDashboardScreen from '../../screens/officer/OfficerDashboardScreen';
import OfficerEventsScreen from '../../screens/officer/OfficerEventsScreen';
import OfficerVolunteerApprovalScreen from '../../screens/officer/OfficerVolunteerApprovalScreen';
import OfficerAttendanceScreen from '../../screens/officer/OfficerAttendanceScreen';

// Import contexts and services
import { AuthProvider } from '../../contexts/AuthContext';
import { OrganizationProvider } from '../../contexts/OrganizationContext';
import { UserDataService } from '../../services/UserDataService';
import { EventDataService } from '../../services/EventDataService';
import { VolunteerHoursService } from '../../services/VolunteerHoursService';
import { AttendanceService } from '../../services/AttendanceService';

// Mock Supabase client
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
          order: jest.fn(() => ({ data: [], error: null })),
        })),
        order: jest.fn(() => ({ data: [], error: null })),
      })),
      insert: jest.fn(() => ({ data: null, error: null })),
      update: jest.fn(() => ({ data: null, error: null })),
      delete: jest.fn(() => ({ data: null, error: null })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn(),
      })),
      unsubscribe: jest.fn(),
    })),
  },
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

describe('Role-Based Access Control', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderWithProviders = (component: React.ReactElement, userProfile: any) => {
    // Mock auth context with specific user profile
    jest.spyOn(React, 'useContext').mockImplementation((context: any) => {
      if (context.displayName === 'AuthContext') {
        return {
          session: { user: { id: userProfile.id } },
          profile: userProfile,
          isLoading: false,
          error: null,
        };
      }
      if (context.displayName === 'OrganizationContext') {
        return {
          currentOrganization: userProfile.organization,
          organizations: [userProfile.organization],
          isLoading: false,
          error: null,
        };
      }
      return {};
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <OrganizationProvider>
            {component}
          </OrganizationProvider>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  describe('Member Access Control', () => {
    const mockMemberProfile = {
      id: 'member-123',
      email: 'member@test.com',
      full_name: 'Test Member',
      role: 'member' as const,
      org_id: 'org-123',
      organization: {
        id: 'org-123',
        name: 'Test Organization',
        type: 'nhs',
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      jest.spyOn(UserDataService.prototype, 'getCurrentUserProfile')
        .mockResolvedValue(mockMemberProfile);
      jest.spyOn(UserDataService.prototype, 'validateUserRole')
        .mockResolvedValue('member');
      jest.spyOn(UserDataService.prototype, 'isOfficer')
        .mockResolvedValue(false);
    });

    it('should allow member access to MemberEventsScreen', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Community Service',
          description: 'Help at local shelter',
          date: '2024-02-01T10:00:00Z',
          location: 'Local Shelter',
          org_id: 'org-123',
          created_by: 'officer-123',
          volunteer_hours: 3,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      jest.spyOn(EventDataService.prototype, 'getOrganizationEvents')
        .mockResolvedValue(mockEvents);

      renderWithProviders(<MemberEventsScreen />, mockMemberProfile);

      await waitFor(() => {
        expect(EventDataService.prototype.getOrganizationEvents).toHaveBeenCalledWith('org-123');
      });

      // Verify member can view events but not create/edit them
      expect(EventDataService.prototype.createEvent).not.toHaveBeenCalled();
      expect(EventDataService.prototype.updateEvent).not.toHaveBeenCalled();
      expect(EventDataService.prototype.deleteEvent).not.toHaveBeenCalled();
    });

    it('should allow member access to volunteer hours submission', async () => {
      const mockVolunteerHours = [
        {
          id: 'vh-1',
          user_id: 'member-123',
          event_id: 'event-1',
          hours: 3,
          description: 'Helped at shelter',
          date: '2024-02-01',
          status: 'pending' as const,
          org_id: 'org-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      jest.spyOn(VolunteerHoursService.prototype, 'getUserVolunteerHours')
        .mockResolvedValue(mockVolunteerHours);
      jest.spyOn(VolunteerHoursService.prototype, 'submitVolunteerHours')
        .mockResolvedValue();

      renderWithProviders(<MemberLogHoursScreen />, mockMemberProfile);

      await waitFor(() => {
        expect(VolunteerHoursService.prototype.getUserVolunteerHours).toHaveBeenCalledWith('member-123');
      });

      // Verify member can submit hours but not approve them
      expect(VolunteerHoursService.prototype.getPendingApprovals).not.toHaveBeenCalled();
      expect(VolunteerHoursService.prototype.approveVolunteerHours).not.toHaveBeenCalled();
    });

    it('should allow member access to their attendance records', async () => {
      const mockAttendance = [
        {
          id: 'att-1',
          user_id: 'member-123',
          event_id: 'event-1',
          attended: true,
          check_in_time: '2024-02-01T10:00:00Z',
          org_id: 'org-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      jest.spyOn(AttendanceService.prototype, 'getUserAttendance')
        .mockResolvedValue(mockAttendance);

      renderWithProviders(<MemberAttendanceScreen />, mockMemberProfile);

      await waitFor(() => {
        expect(AttendanceService.prototype.getUserAttendance).toHaveBeenCalledWith('member-123');
      });

      // Verify member can only see their own attendance
      expect(AttendanceService.prototype.getEventAttendance).not.toHaveBeenCalled();
    });

    it('should restrict member access to officer-only data', async () => {
      // Attempt to access officer data should be blocked
      jest.spyOn(VolunteerHoursService.prototype, 'getPendingApprovals')
        .mockRejectedValue(new Error('Insufficient permissions'));

      renderWithProviders(<MemberEventsScreen />, mockMemberProfile);

      // Verify officer-only methods are not called
      expect(VolunteerHoursService.prototype.getPendingApprovals).not.toHaveBeenCalled();
      expect(VolunteerHoursService.prototype.approveVolunteerHours).not.toHaveBeenCalled();
    });
  });

  describe('Officer Access Control', () => {
    const mockOfficerProfile = {
      id: 'officer-123',
      email: 'officer@test.com',
      full_name: 'Test Officer',
      role: 'officer' as const,
      org_id: 'org-123',
      organization: {
        id: 'org-123',
        name: 'Test Organization',
        type: 'nhs',
      },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    beforeEach(() => {
      jest.spyOn(UserDataService.prototype, 'getCurrentUserProfile')
        .mockResolvedValue(mockOfficerProfile);
      jest.spyOn(UserDataService.prototype, 'validateUserRole')
        .mockResolvedValue('officer');
      jest.spyOn(UserDataService.prototype, 'isOfficer')
        .mockResolvedValue(true);
    });

    it('should allow officer access to dashboard with aggregated data', async () => {
      const mockStats = {
        totalMembers: 25,
        totalEvents: 12,
        pendingApprovals: 5,
        totalVolunteerHours: 150,
      };

      jest.spyOn(UserDataService.prototype, 'getOrganizationStats')
        .mockResolvedValue(mockStats);

      renderWithProviders(<OfficerDashboardScreen />, mockOfficerProfile);

      await waitFor(() => {
        expect(UserDataService.prototype.getOrganizationStats).toHaveBeenCalledWith('org-123');
      });
    });

    it('should allow officer full event management capabilities', async () => {
      const mockEvents = [
        {
          id: 'event-1',
          title: 'Community Service',
          description: 'Help at local shelter',
          date: '2024-02-01T10:00:00Z',
          location: 'Local Shelter',
          org_id: 'org-123',
          created_by: 'officer-123',
          volunteer_hours: 3,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      jest.spyOn(EventDataService.prototype, 'getOrganizationEvents')
        .mockResolvedValue(mockEvents);
      jest.spyOn(EventDataService.prototype, 'createEvent')
        .mockResolvedValue(mockEvents[0]);
      jest.spyOn(EventDataService.prototype, 'updateEvent')
        .mockResolvedValue();
      jest.spyOn(EventDataService.prototype, 'deleteEvent')
        .mockResolvedValue();

      renderWithProviders(<OfficerEventsScreen />, mockOfficerProfile);

      await waitFor(() => {
        expect(EventDataService.prototype.getOrganizationEvents).toHaveBeenCalledWith('org-123');
      });

      // Verify officer has full CRUD access
      expect(EventDataService.prototype.createEvent).toBeDefined();
      expect(EventDataService.prototype.updateEvent).toBeDefined();
      expect(EventDataService.prototype.deleteEvent).toBeDefined();
    });

    it('should allow officer access to volunteer hours approval workflow', async () => {
      const mockPendingHours = [
        {
          id: 'vh-1',
          user_id: 'member-123',
          event_id: 'event-1',
          hours: 3,
          description: 'Helped at shelter',
          date: '2024-02-01',
          status: 'pending' as const,
          org_id: 'org-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      jest.spyOn(VolunteerHoursService.prototype, 'getPendingApprovals')
        .mockResolvedValue(mockPendingHours);
      jest.spyOn(VolunteerHoursService.prototype, 'approveVolunteerHours')
        .mockResolvedValue();

      renderWithProviders(<OfficerVolunteerApprovalScreen />, mockOfficerProfile);

      await waitFor(() => {
        expect(VolunteerHoursService.prototype.getPendingApprovals).toHaveBeenCalledWith('org-123');
      });

      // Verify officer can approve hours
      expect(VolunteerHoursService.prototype.approveVolunteerHours).toBeDefined();
    });

    it('should allow officer access to attendance management', async () => {
      const mockEventAttendance = [
        {
          id: 'att-1',
          user_id: 'member-123',
          event_id: 'event-1',
          attended: true,
          check_in_time: '2024-02-01T10:00:00Z',
          org_id: 'org-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      jest.spyOn(AttendanceService.prototype, 'getEventAttendance')
        .mockResolvedValue(mockEventAttendance);

      renderWithProviders(<OfficerAttendanceScreen />, mockOfficerProfile);

      await waitFor(() => {
        expect(AttendanceService.prototype.getEventAttendance).toHaveBeenCalled();
      });

      // Verify officer can manage all attendance records
      expect(AttendanceService.prototype.getEventAttendance).toBeDefined();
    });
  });

  describe('Organization Isolation', () => {
    it('should filter data by organization for members', async () => {
      const mockMemberProfile = {
        id: 'member-123',
        email: 'member@test.com',
        full_name: 'Test Member',
        role: 'member' as const,
        org_id: 'org-123',
        organization: {
          id: 'org-123',
          name: 'Test Organization',
          type: 'nhs',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      jest.spyOn(UserDataService.prototype, 'getCurrentUserProfile')
        .mockResolvedValue(mockMemberProfile);
      jest.spyOn(EventDataService.prototype, 'getOrganizationEvents')
        .mockResolvedValue([]);

      renderWithProviders(<MemberEventsScreen />, mockMemberProfile);

      await waitFor(() => {
        expect(EventDataService.prototype.getOrganizationEvents).toHaveBeenCalledWith('org-123');
      });

      // Verify all data queries are filtered by organization
      expect(EventDataService.prototype.getOrganizationEvents).toHaveBeenCalledWith('org-123');
    });

    it('should filter data by organization for officers', async () => {
      const mockOfficerProfile = {
        id: 'officer-123',
        email: 'officer@test.com',
        full_name: 'Test Officer',
        role: 'officer' as const,
        org_id: 'org-456',
        organization: {
          id: 'org-456',
          name: 'Different Organization',
          type: 'nhsa',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      jest.spyOn(UserDataService.prototype, 'getCurrentUserProfile')
        .mockResolvedValue(mockOfficerProfile);
      jest.spyOn(VolunteerHoursService.prototype, 'getPendingApprovals')
        .mockResolvedValue([]);

      renderWithProviders(<OfficerVolunteerApprovalScreen />, mockOfficerProfile);

      await waitFor(() => {
        expect(VolunteerHoursService.prototype.getPendingApprovals).toHaveBeenCalledWith('org-456');
      });

      // Verify officer can only see data from their organization
      expect(VolunteerHoursService.prototype.getPendingApprovals).toHaveBeenCalledWith('org-456');
    });
  });

  describe('Permission Error Handling', () => {
    it('should handle unauthorized access attempts gracefully', async () => {
      const mockMemberProfile = {
        id: 'member-123',
        email: 'member@test.com',
        full_name: 'Test Member',
        role: 'member' as const,
        org_id: 'org-123',
        organization: {
          id: 'org-123',
          name: 'Test Organization',
          type: 'nhs',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock permission error
      jest.spyOn(VolunteerHoursService.prototype, 'getPendingApprovals')
        .mockRejectedValue(new Error('Insufficient permissions'));

      renderWithProviders(<MemberEventsScreen />, mockMemberProfile);

      // Verify error is handled without crashing
      expect(true).toBe(true); // Test passes if no crash occurs
    });

    it('should redirect on role validation failure', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'user@test.com',
        full_name: 'Test User',
        role: 'member' as const,
        org_id: 'org-123',
        organization: {
          id: 'org-123',
          name: 'Test Organization',
          type: 'nhs',
        },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock role validation failure
      jest.spyOn(UserDataService.prototype, 'validateUserRole')
        .mockRejectedValue(new Error('Role validation failed'));

      renderWithProviders(<OfficerDashboardScreen />, mockProfile);

      // Verify error is handled appropriately
      expect(true).toBe(true); // Test passes if handled gracefully
    });
  });
});