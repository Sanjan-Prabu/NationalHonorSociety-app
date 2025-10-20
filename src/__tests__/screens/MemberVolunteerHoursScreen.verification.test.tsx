/**
 * Tests for MemberVolunteerHoursScreen verification workflow features
 * Tests progress bar calculations, status tracking, and tabbed interface
 * Requirements: 3.1, 3.2, 4.1, 4.4
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MemberVolunteerHoursScreen from '../../screens/member/MemberVolunteerHoursScreen';
import { OrganizationProvider } from '../../contexts/OrganizationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks
jest.mock('../../hooks/useVolunteerHoursData', () => ({
  useUserVolunteerHours: jest.fn(),
  useDeleteVolunteerHours: jest.fn(),
}));

jest.mock('../../services/VerificationRequestService', () => ({
  verificationRequestService: {
    calculateMemberHours: jest.fn(),
    getOrganizationEventHours: jest.fn(),
  },
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

// Mock organization context
const mockOrganization = {
  id: 'test-org-id',
  name: 'Test Organization',
  display_name: 'Test Org',
};

describe('MemberVolunteerHoursScreen Verification Features', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <OrganizationProvider>
          {component}
        </OrganizationProvider>
      </QueryClientProvider>
    );
  };

  describe('Progress Bar Calculations', () => {
    it('should display correct total verified hours in progress bar', async () => {
      const { useUserVolunteerHours } = require('../../hooks/useVolunteerHoursData');
      const { verificationRequestService } = require('../../services/VerificationRequestService');

      // Mock volunteer hours data with mixed statuses
      const mockVolunteerHours = [
        {
          id: 'hour-1',
          member_id: 'member-1',
          org_id: 'test-org-id',
          hours: 4,
          status: 'verified',
          is_organization_event: true,
          description: 'Community cleanup',
          activity_date: '2024-01-15',
          submitted_at: '2024-01-15T10:00:00Z',
          approved: true,
          can_edit: false,
          member_name: 'Test Member',
        },
        {
          id: 'hour-2',
          member_id: 'member-1',
          org_id: 'test-org-id',
          hours: 3,
          status: 'verified',
          is_organization_event: false,
          description: 'Food bank volunteer',
          activity_date: '2024-01-16',
          submitted_at: '2024-01-16T10:00:00Z',
          approved: true,
          can_edit: false,
          member_name: 'Test Member',
        },
        {
          id: 'hour-3',
          member_id: 'member-1',
          org_id: 'test-org-id',
          hours: 2,
          status: 'pending',
          is_organization_event: false,
          description: 'Library volunteer',
          activity_date: '2024-01-17',
          submitted_at: '2024-01-17T10:00:00Z',
          approved: false,
          can_edit: true,
          member_name: 'Test Member',
        },
      ];

      useUserVolunteerHours.mockReturnValue({
        data: mockVolunteerHours,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      // Mock hours calculations
      verificationRequestService.calculateMemberHours.mockResolvedValue({
        data: {
          totalHours: 9,
          organizationEventHours: 4,
          pendingHours: 2,
          verifiedHours: 7, // 4 + 3
          rejectedHours: 0,
        },
        error: null,
        success: true,
      });

      verificationRequestService.getOrganizationEventHours.mockResolvedValue({
        data: {
          totalOrganizationEventHours: 4,
          verifiedOrganizationEventHours: 4,
          pendingOrganizationEventHours: 0,
        },
        error: null,
        success: true,
      });

      const { getByText } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        // Check that verified hours are displayed correctly
        expect(getByText('7')).toBeTruthy(); // Total verified hours
        expect(getByText('NHS Events: 4')).toBeTruthy(); // Organization event hours
      });
    });

    it('should update progress bar when hours are approved', async () => {
      const { useUserVolunteerHours } = require('../../hooks/useVolunteerHoursData');
      const { verificationRequestService } = require('../../services/VerificationRequestService');

      // Initial state with pending hours
      const initialHours = [
        {
          id: 'hour-1',
          member_id: 'member-1',
          org_id: 'test-org-id',
          hours: 5,
          status: 'pending',
          is_organization_event: true,
          description: 'Fundraising event',
          activity_date: '2024-01-18',
          submitted_at: '2024-01-18T10:00:00Z',
          approved: false,
          can_edit: true,
          member_name: 'Test Member',
        },
      ];

      // Updated state after approval
      const updatedHours = [
        {
          ...initialHours[0],
          status: 'verified',
          approved: true,
          verified_by: 'officer-1',
          verified_at: '2024-01-18T14:00:00Z',
          can_edit: false,
        },
      ];

      const mockRefetch = jest.fn();
      
      useUserVolunteerHours
        .mockReturnValueOnce({
          data: initialHours,
          isLoading: false,
          error: null,
          refetch: mockRefetch,
        })
        .mockReturnValueOnce({
          data: updatedHours,
          isLoading: false,
          error: null,
          refetch: mockRefetch,
        });

      // Mock initial calculations
      verificationRequestService.calculateMemberHours
        .mockResolvedValueOnce({
          data: {
            totalHours: 5,
            organizationEventHours: 5,
            pendingHours: 5,
            verifiedHours: 0,
            rejectedHours: 0,
          },
          error: null,
          success: true,
        })
        .mockResolvedValueOnce({
          data: {
            totalHours: 5,
            organizationEventHours: 5,
            pendingHours: 0,
            verifiedHours: 5,
            rejectedHours: 0,
          },
          error: null,
          success: true,
        });

      verificationRequestService.getOrganizationEventHours
        .mockResolvedValueOnce({
          data: {
            totalOrganizationEventHours: 5,
            verifiedOrganizationEventHours: 0,
            pendingOrganizationEventHours: 5,
          },
          error: null,
          success: true,
        })
        .mockResolvedValueOnce({
          data: {
            totalOrganizationEventHours: 5,
            verifiedOrganizationEventHours: 5,
            pendingOrganizationEventHours: 0,
          },
          error: null,
          success: true,
        });

      const { getByText, rerender } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      // Initial state - no verified hours
      await waitFor(() => {
        expect(getByText('0')).toBeTruthy(); // No verified hours initially
        expect(getByText('NHS Events: 0')).toBeTruthy(); // No verified org event hours
      });

      // Simulate approval and re-render
      rerender(
        <QueryClientProvider client={queryClient}>
          <OrganizationProvider>
            <MemberVolunteerHoursScreen navigation={mockNavigation} />
          </OrganizationProvider>
        </QueryClientProvider>
      );

      // Updated state - hours approved
      await waitFor(() => {
        expect(getByText('5')).toBeTruthy(); // Verified hours updated
        expect(getByText('NHS Events: 5')).toBeTruthy(); // Org event hours updated
      });
    });

    it('should separate organization event hours from total hours correctly', async () => {
      const { useUserVolunteerHours } = require('../../hooks/useVolunteerHoursData');
      const { verificationRequestService } = require('../../services/VerificationRequestService');

      const mockMixedHours = [
        {
          id: 'hour-1',
          hours: 6,
          status: 'verified',
          is_organization_event: true,
          description: 'NHS Community Service',
        },
        {
          id: 'hour-2',
          hours: 4,
          status: 'verified',
          is_organization_event: false,
          description: 'Personal volunteer work',
        },
        {
          id: 'hour-3',
          hours: 3,
          status: 'verified',
          is_organization_event: true,
          description: 'NHS Fundraiser',
        },
      ];

      useUserVolunteerHours.mockReturnValue({
        data: mockMixedHours,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      verificationRequestService.calculateMemberHours.mockResolvedValue({
        data: {
          totalHours: 13, // 6 + 4 + 3
          organizationEventHours: 9, // 6 + 3
          pendingHours: 0,
          verifiedHours: 13,
          rejectedHours: 0,
        },
        error: null,
        success: true,
      });

      verificationRequestService.getOrganizationEventHours.mockResolvedValue({
        data: {
          totalOrganizationEventHours: 9,
          verifiedOrganizationEventHours: 9,
          pendingOrganizationEventHours: 0,
        },
        error: null,
        success: true,
      });

      const { getByText } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('13')).toBeTruthy(); // Total verified hours
        expect(getByText('NHS Events: 9')).toBeTruthy(); // Organization event hours only
      });

      // Verify that custom volunteer hours = total - organization event hours
      // 13 - 9 = 4 custom hours (this would be calculated in the component)
    });
  });

  describe('Status Tracking and Tabbed Interface', () => {
    it('should display pending entries in the correct tab', async () => {
      const { useUserVolunteerHours } = require('../../hooks/useVolunteerHoursData');

      const mockPendingHours = [
        {
          id: 'hour-1',
          member_id: 'member-1',
          org_id: 'test-org-id',
          hours: 3,
          status: 'pending',
          description: 'Pending volunteer work',
          activity_date: '2024-01-15',
          submitted_at: '2024-01-15T10:00:00Z',
          approved: false,
          can_edit: true,
          member_name: 'Test Member',
        },
      ];

      useUserVolunteerHours.mockReturnValue({
        data: mockPendingHours,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Pending Entries')).toBeTruthy();
        expect(getByText('Pending volunteer work')).toBeTruthy();
      });
    });

    it('should display recently approved entries in the correct tab', async () => {
      const { useUserVolunteerHours } = require('../../hooks/useVolunteerHoursData');

      const mockApprovedHours = [
        {
          id: 'hour-1',
          member_id: 'member-1',
          org_id: 'test-org-id',
          hours: 4,
          status: 'verified',
          description: 'Approved volunteer work',
          activity_date: '2024-01-15',
          submitted_at: '2024-01-15T10:00:00Z',
          approved: true,
          approved_by: 'officer-1',
          approved_at: '2024-01-15T14:00:00Z',
          can_edit: false,
          member_name: 'Test Member',
        },
      ];

      useUserVolunteerHours.mockReturnValue({
        data: mockApprovedHours,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      // Switch to Recently Approved tab
      const recentlyApprovedTab = getByText('Recently Approved');
      fireEvent.press(recentlyApprovedTab);

      await waitFor(() => {
        expect(getByText('Approved volunteer work')).toBeTruthy();
      });
    });

    it('should allow switching between tabs', async () => {
      const { useUserVolunteerHours } = require('../../hooks/useVolunteerHoursData');

      const mockMixedHours = [
        {
          id: 'hour-1',
          hours: 3,
          status: 'pending',
          description: 'Pending work',
          can_edit: true,
        },
        {
          id: 'hour-2',
          hours: 4,
          status: 'verified',
          description: 'Approved work',
          can_edit: false,
        },
      ];

      useUserVolunteerHours.mockReturnValue({
        data: mockMixedHours,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText, queryByText } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      // Initially on Pending Entries tab
      await waitFor(() => {
        expect(getByText('Pending work')).toBeTruthy();
        expect(queryByText('Approved work')).toBeNull();
      });

      // Switch to Recently Approved tab
      const recentlyApprovedTab = getByText('Recently Approved');
      fireEvent.press(recentlyApprovedTab);

      await waitFor(() => {
        expect(queryByText('Pending work')).toBeNull();
        expect(getByText('Approved work')).toBeTruthy();
      });

      // Switch back to Pending Entries tab
      const pendingEntriesTab = getByText('Pending Entries');
      fireEvent.press(pendingEntriesTab);

      await waitFor(() => {
        expect(getByText('Pending work')).toBeTruthy();
        expect(queryByText('Approved work')).toBeNull();
      });
    });

    it('should show empty state when no entries exist for a tab', async () => {
      const { useUserVolunteerHours } = require('../../hooks/useVolunteerHoursData');

      useUserVolunteerHours.mockReturnValue({
        data: [], // No volunteer hours
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('No Pending Entries')).toBeTruthy();
        expect(getByText('You have no volunteer hours awaiting approval.')).toBeTruthy();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should allow deleting pending entries', async () => {
      const { useUserVolunteerHours, useDeleteVolunteerHours } = require('../../hooks/useVolunteerHoursData');

      const mockDeleteMutation = {
        mutateAsync: jest.fn().mockResolvedValue({}),
        isPending: false,
      };

      useDeleteVolunteerHours.mockReturnValue(mockDeleteMutation);

      const mockPendingHours = [
        {
          id: 'hour-1',
          member_id: 'member-1',
          org_id: 'test-org-id',
          hours: 2,
          status: 'pending',
          description: 'Deletable pending work',
          activity_date: '2024-01-15',
          submitted_at: '2024-01-15T10:00:00Z',
          approved: false,
          can_edit: true,
          member_name: 'Test Member',
        },
      ];

      useUserVolunteerHours.mockReturnValue({
        data: mockPendingHours,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText, getByRole } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Deletable pending work')).toBeTruthy();
      });

      // Find and press delete button (this would be in the VolunteerHourCard)
      const deleteButton = getByRole('button');
      fireEvent.press(deleteButton);

      // Verify delete mutation was called
      await waitFor(() => {
        expect(mockDeleteMutation.mutateAsync).toHaveBeenCalledWith('hour-1');
      });
    });

    it('should allow deleting rejected entries', async () => {
      const { useUserVolunteerHours, useDeleteVolunteerHours } = require('../../hooks/useVolunteerHoursData');

      const mockDeleteMutation = {
        mutateAsync: jest.fn().mockResolvedValue({}),
        isPending: false,
      };

      useDeleteVolunteerHours.mockReturnValue(mockDeleteMutation);

      const mockRejectedHours = [
        {
          id: 'hour-2',
          member_id: 'member-1',
          org_id: 'test-org-id',
          hours: 3,
          status: 'rejected',
          rejection_reason: 'Insufficient documentation',
          description: 'Rejected work',
          activity_date: '2024-01-16',
          submitted_at: '2024-01-16T10:00:00Z',
          approved: false,
          can_edit: true,
          member_name: 'Test Member',
        },
      ];

      useUserVolunteerHours.mockReturnValue({
        data: mockRejectedHours,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText, getByRole } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Rejected work')).toBeTruthy();
      });

      // Find and press delete button
      const deleteButton = getByRole('button');
      fireEvent.press(deleteButton);

      // Verify delete mutation was called
      await waitFor(() => {
        expect(mockDeleteMutation.mutateAsync).toHaveBeenCalledWith('hour-2');
      });
    });

    it('should not show delete button for verified entries', async () => {
      const { useUserVolunteerHours } = require('../../hooks/useVolunteerHoursData');

      const mockVerifiedHours = [
        {
          id: 'hour-3',
          member_id: 'member-1',
          org_id: 'test-org-id',
          hours: 5,
          status: 'verified',
          description: 'Verified work - cannot delete',
          activity_date: '2024-01-17',
          submitted_at: '2024-01-17T10:00:00Z',
          approved: true,
          can_edit: false, // Cannot edit verified entries
          member_name: 'Test Member',
        },
      ];

      useUserVolunteerHours.mockReturnValue({
        data: mockVerifiedHours,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { getByText, queryByRole } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      // Switch to Recently Approved tab
      const recentlyApprovedTab = getByText('Recently Approved');
      fireEvent.press(recentlyApprovedTab);

      await waitFor(() => {
        expect(getByText('Verified work - cannot delete')).toBeTruthy();
        // Should not have delete button for verified entries
        expect(queryByRole('button')).toBeNull();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching data', () => {
      const { useUserVolunteerHours } = require('../../hooks/useVolunteerHoursData');

      useUserVolunteerHours.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { getByTestId } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      expect(getByTestId('loading-skeleton')).toBeTruthy();
    });

    it('should show error state when data fetching fails', () => {
      const { useUserVolunteerHours } = require('../../hooks/useVolunteerHoursData');

      useUserVolunteerHours.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch volunteer hours'),
        refetch: jest.fn(),
      });

      const { getByText } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      expect(getByText('Error Loading Data')).toBeTruthy();
      expect(getByText('Failed to load volunteer hours. Please try again.')).toBeTruthy();
    });

    it('should allow retrying after error', () => {
      const { useUserVolunteerHours } = require('../../hooks/useVolunteerHoursData');

      const mockRefetch = jest.fn();

      useUserVolunteerHours.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Network error'),
        refetch: mockRefetch,
      });

      const { getByText } = renderWithProviders(
        <MemberVolunteerHoursScreen navigation={mockNavigation} />
      );

      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});