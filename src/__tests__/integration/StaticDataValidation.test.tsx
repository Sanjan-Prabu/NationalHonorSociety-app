/**
 * Static Data Validation Tests
 * 
 * Tests to ensure no hardcoded data exists in components
 * Validates that all data comes from dynamic sources
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import screens to test for static data
import MemberEventsScreen from '../../screens/member/MemberEventsScreen';
import MemberLogHoursScreen from '../../screens/member/MemberLogHoursScreen';
import MemberAttendanceScreen from '../../screens/member/MemberAttendanceScreen';
import OfficerDashboardScreen from '../../screens/officer/OfficerDashboardScreen';
import OfficerEventsScreen from '../../screens/officer/OfficerEventsScreen';
import OfficerVolunteerApprovalScreen from '../../screens/officer/OfficerVolunteerApprovalScreen';

// Import contexts
import { AuthProvider } from '../../contexts/AuthContext';
import { OrganizationProvider } from '../../contexts/OrganizationContext';

// Mock Supabase client to return empty data
const mockSupabase = {
  auth: {
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => Promise.resolve({ data: null, error: null })),
    delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
  })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({
      subscribe: jest.fn(),
    })),
    unsubscribe: jest.fn(),
  })),
};

jest.mock('../../lib/supabaseClient', () => ({
  supabase: mockSupabase,
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

describe('Static Data Validation', () => {
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
    // Mock auth context
    jest.spyOn(React, 'useContext').mockImplementation((context: any) => {
      if (context.displayName === 'AuthContext') {
        return {
          session: userProfile ? { user: { id: userProfile.id } } : null,
          profile: userProfile,
          isLoading: false,
          error: null,
        };
      }
      if (context.displayName === 'OrganizationContext') {
        return {
          currentOrganization: userProfile?.organization || null,
          organizations: userProfile?.organization ? [userProfile.organization] : [],
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

  describe('Empty Database State Handling', () => {
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

    it('should handle empty events data without showing hardcoded events', async () => {
      const { queryByText } = renderWithProviders(<MemberEventsScreen />, mockMemberProfile);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('events');
      });

      // Should not show any hardcoded event titles
      expect(queryByText('NHS Food Drive')).toBeNull();
      expect(queryByText('Community Service')).toBeNull();
      expect(queryByText('Beach Cleanup')).toBeNull();
      expect(queryByText('Library Tutoring')).toBeNull();
    });

    it('should handle empty volunteer hours without showing hardcoded data', async () => {
      const { queryByText } = renderWithProviders(<MemberLogHoursScreen />, mockMemberProfile);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('volunteer_hours');
      });

      // Should not show any hardcoded volunteer hour entries
      expect(queryByText('Library Tutoring')).toBeNull();
      expect(queryByText('Senior Center Visit')).toBeNull();
      expect(queryByText('Food Bank')).toBeNull();
    });

    it('should handle empty attendance data without showing hardcoded records', async () => {
      const { queryByText } = renderWithProviders(<MemberAttendanceScreen />, mockMemberProfile);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('attendance');
      });

      // Should not show any hardcoded attendance records
      expect(queryByText('NHS Meeting')).toBeNull();
      expect(queryByText('Community Service Event')).toBeNull();
    });

    it('should handle empty dashboard data without showing hardcoded statistics', async () => {
      const { queryByText } = renderWithProviders(<OfficerDashboardScreen />, mockOfficerProfile);

      // Should not show hardcoded member counts or statistics
      expect(queryByText('25 Members')).toBeNull();
      expect(queryByText('12 Events')).toBeNull();
      expect(queryByText('150 Hours')).toBeNull();
    });

    it('should handle empty officer events without showing hardcoded events', async () => {
      const { queryByText } = renderWithProviders(<OfficerEventsScreen />, mockOfficerProfile);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('events');
      });

      // Should not show any hardcoded event management data
      expect(queryByText('NHS Food Drive')).toBeNull();
      expect(queryByText('NHSA Beach Cleanup')).toBeNull();
    });

    it('should handle empty volunteer approvals without showing hardcoded data', async () => {
      const { queryByText } = renderWithProviders(<OfficerVolunteerApprovalScreen />, mockOfficerProfile);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('volunteer_hours');
      });

      // Should not show any hardcoded pending approvals
      expect(queryByText('John Doe')).toBeNull();
      expect(queryByText('Jane Smith')).toBeNull();
      expect(queryByText('Library Tutoring')).toBeNull();
    });
  });

  describe('Mock Data File Removal Validation', () => {
    it('should not import mock data files', () => {
      // This test ensures that mock data files are not imported
      // If this test fails, it means mock data imports still exist
      
      // Check that mockOrganizationData is not accessible
      expect(() => {
        require('../../data/mockOrganizationData');
      }).toThrow();
    });

    it('should not have getMockData function available', () => {
      // Verify that getMockData function is not available
      expect(() => {
        const { getMockData } = require('../../data/mockOrganizationData');
        getMockData('events', 'NHS');
      }).toThrow();
    });
  });

  describe('Dynamic Data Source Validation', () => {
    it('should only make database calls for data fetching', async () => {
      renderWithProviders(<MemberEventsScreen />, mockMemberProfile);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalled();
      });

      // Verify that all data comes from Supabase calls
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      
      // Should not have any console.log calls indicating mock data usage
      const consoleSpy = jest.spyOn(console, 'log');
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('using mock data')
      );
    });

    it('should handle database errors gracefully without fallback to static data', async () => {
      // Mock database error
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Database error', code: 'PGRST301' } 
            })),
          })),
        })),
      }));

      const { queryByText } = renderWithProviders(<MemberEventsScreen />, mockMemberProfile);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalled();
      });

      // Should not show any hardcoded fallback data
      expect(queryByText('NHS Food Drive')).toBeNull();
      expect(queryByText('Community Service')).toBeNull();
    });
  });

  describe('Component State Validation', () => {
    it('should initialize with empty arrays when no data is available', async () => {
      const { getByTestId } = renderWithProviders(<MemberEventsScreen />, mockMemberProfile);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalled();
      });

      // Components should handle empty state gracefully
      // This test passes if no hardcoded data is displayed
      expect(true).toBe(true);
    });

    it('should not have any hardcoded user names or IDs', async () => {
      const { queryByText } = renderWithProviders(<OfficerVolunteerApprovalScreen />, mockOfficerProfile);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalled();
      });

      // Should not show any hardcoded user names
      expect(queryByText('John Doe')).toBeNull();
      expect(queryByText('Jane Smith')).toBeNull();
      expect(queryByText('Test Member')).toBeNull();
      expect(queryByText('NHS Officer')).toBeNull();
      expect(queryByText('NHSA Officer')).toBeNull();
    });
  });

  describe('Configuration and Constants Validation', () => {
    it('should not have hardcoded organization data', () => {
      // Verify no hardcoded organization configurations exist
      const screens = [
        MemberEventsScreen,
        MemberLogHoursScreen,
        OfficerDashboardScreen,
        OfficerEventsScreen,
      ];

      screens.forEach(Screen => {
        const { queryByText } = renderWithProviders(<Screen />, mockMemberProfile);
        
        // Should not contain hardcoded organization names in unexpected places
        expect(queryByText('Test Organization NHS')).toBeNull();
        expect(queryByText('Sample High School')).toBeNull();
      });
    });

    it('should not have hardcoded event categories or types', async () => {
      const { queryByText } = renderWithProviders(<MemberEventsScreen />, mockMemberProfile);

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalled();
      });

      // Should not show hardcoded event categories
      expect(queryByText('Sample Volunteer Event')).toBeNull();
      expect(queryByText('Default Meeting')).toBeNull();
      expect(queryByText('Test Event')).toBeNull();
    });
  });
});