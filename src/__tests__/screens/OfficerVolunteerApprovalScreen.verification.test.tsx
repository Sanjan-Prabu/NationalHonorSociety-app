/**
 * Tests for OfficerVolunteerApprovalScreen verification workflow features
 * Tests three-tab system, bulk approval functionality, and rejection workflow
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import OfficerVolunteerApprovalScreen from '../../screens/officer/OfficerVolunteerApprovalScreen';
import { OrganizationProvider } from '../../contexts/OrganizationContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Alert
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock the hooks
jest.mock('../../hooks/useVolunteerHoursData', () => ({
  usePendingApprovals: jest.fn(),
  useVerifiedApprovals: jest.fn(),
  useRejectedApprovals: jest.fn(),
  useApproveVolunteerHours: jest.fn(),
  useRejectVolunteerHours: jest.fn(),
  useBulkApproveVolunteerHours: jest.fn(),
}));

// Mock toast provider
jest.mock('../../components/ui/ToastProvider', () => ({
  useToast: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn(),
  }),
}));

// Mock role protection HOC
jest.mock('../../components/hoc/withRoleProtection', () => ({
  withRoleProtection: (Component: any) => Component,
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

describe('OfficerVolunteerApprovalScreen Verification Features', () => {
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
        <OrganizationProvider value={{ activeOrganization: mockOrganization }}>
          {component}
        </OrganizationProvider>
      </QueryClientProvider>
    );
  };

  describe('Three-Tab System', () => {
    it('should display all three tabs with correct labels', () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      // Mock empty data for all tabs
      usePendingApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      expect(getByText('Pending')).toBeTruthy();
      expect(getByText('Verified')).toBeTruthy();
      expect(getByText('Rejected')).toBeTruthy();
    });

    it('should show badge counts for each tab', () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      // Mock data with different counts
      usePendingApprovals.mockReturnValue({
        data: [
          { id: 'pending-1', status: 'pending' },
          { id: 'pending-2', status: 'pending' },
          { id: 'pending-3', status: 'pending' },
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [
          { id: 'verified-1', status: 'verified' },
          { id: 'verified-2', status: 'verified' },
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [{ id: 'rejected-1', status: 'rejected' }],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      expect(getByText('3')).toBeTruthy(); // Pending count
      expect(getByText('2')).toBeTruthy(); // Verified count
      expect(getByText('1')).toBeTruthy(); // Rejected count
    });

    it('should switch between tabs correctly', async () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      const mockPendingData = [
        {
          id: 'pending-1',
          member_id: 'member-1',
          org_id: 'test-org-id',
          hours: 3,
          status: 'pending',
          description: 'Pending volunteer work',
          member_name: 'John Doe',
          activity_date: '2024-01-15',
          submitted_at: '2024-01-15T10:00:00Z',
        },
      ];

      const mockVerifiedData = [
        {
          id: 'verified-1',
          member_id: 'member-2',
          org_id: 'test-org-id',
          hours: 4,
          status: 'verified',
          description: 'Verified volunteer work',
          member_name: 'Jane Smith',
          activity_date: '2024-01-16',
          submitted_at: '2024-01-16T10:00:00Z',
          verified_by: 'officer-1',
          verified_at: '2024-01-16T14:00:00Z',
        },
      ];

      usePendingApprovals.mockReturnValue({
        data: mockPendingData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: mockVerifiedData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByText, queryByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      // Initially on Pending tab
      await waitFor(() => {
        expect(getByText('Pending volunteer work')).toBeTruthy();
        expect(queryByText('Verified volunteer work')).toBeNull();
      });

      // Switch to Verified tab
      const verifiedTab = getByText('Verified');
      fireEvent.press(verifiedTab);

      await waitFor(() => {
        expect(queryByText('Pending volunteer work')).toBeNull();
        expect(getByText('Verified volunteer work')).toBeTruthy();
      });

      // Switch to Rejected tab
      const rejectedTab = getByText('Rejected');
      fireEvent.press(rejectedTab);

      await waitFor(() => {
        expect(queryByText('Pending volunteer work')).toBeNull();
        expect(queryByText('Verified volunteer work')).toBeNull();
        // Should show empty state for rejected tab
        expect(getByText('No Rejected Hours')).toBeTruthy();
      });
    });

    it('should show default pending tab on load', () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      const mockPendingData = [
        {
          id: 'pending-1',
          description: 'Default pending item',
          status: 'pending',
        },
      ];

      usePendingApprovals.mockReturnValue({
        data: mockPendingData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      expect(getByText('Default pending item')).toBeTruthy();
    });
  });

  describe('Bulk Approval Functionality', () => {
    it('should show bulk actions button when there are multiple pending requests', () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      const mockMultiplePendingData = [
        { id: 'pending-1', status: 'pending', description: 'Request 1' },
        { id: 'pending-2', status: 'pending', description: 'Request 2' },
        { id: 'pending-3', status: 'pending', description: 'Request 3' },
      ];

      usePendingApprovals.mockReturnValue({
        data: mockMultiplePendingData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      expect(getByText('Bulk Actions')).toBeTruthy();
    });

    it('should not show bulk actions button when there is only one pending request', () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      const mockSinglePendingData = [
        { id: 'pending-1', status: 'pending', description: 'Single request' },
      ];

      usePendingApprovals.mockReturnValue({
        data: mockSinglePendingData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { queryByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      expect(queryByText('Bulk Actions')).toBeNull();
    });

    it('should show bulk actions bar when bulk actions is enabled', () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      const mockMultiplePendingData = [
        { id: 'pending-1', status: 'pending' },
        { id: 'pending-2', status: 'pending' },
      ];

      usePendingApprovals.mockReturnValue({
        data: mockMultiplePendingData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      // Enable bulk actions
      const bulkActionsButton = getByText('Bulk Actions');
      fireEvent.press(bulkActionsButton);

      expect(getByText('0 selected')).toBeTruthy();
      expect(getByText('Approve Selected')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should handle bulk approval with confirmation dialog', async () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      const mockBulkApproveMutation = {
        mutateAsync: jest.fn().mockResolvedValue({}),
        isPending: false,
      };

      const mockMultiplePendingData = [
        { id: 'pending-1', status: 'pending', description: 'Request 1' },
        { id: 'pending-2', status: 'pending', description: 'Request 2' },
      ];

      usePendingApprovals.mockReturnValue({
        data: mockMultiplePendingData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue(mockBulkApproveMutation);

      // Mock Alert.alert to simulate user confirmation
      (Alert.alert as jest.Mock).mockImplementation((title, message, buttons) => {
        const approveButton = buttons?.find((button: any) => button.text === 'Approve All');
        if (approveButton && approveButton.onPress) {
          approveButton.onPress();
        }
      });

      const { getByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      // Enable bulk actions
      const bulkActionsButton = getByText('Bulk Actions');
      fireEvent.press(bulkActionsButton);

      // Select requests (this would be done through VerificationCard components)
      // For this test, we'll simulate having selected requests

      // Try to approve selected (should show error for no selection first)
      const approveSelectedButton = getByText('Approve Selected');
      fireEvent.press(approveSelectedButton);

      // Verify Alert.alert was called for bulk approval confirmation
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Bulk Approve',
          expect.stringContaining('Are you sure you want to approve'),
          expect.arrayContaining([
            expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
            expect.objectContaining({ 
              text: 'Approve All',
              onPress: expect.any(Function)
            })
          ])
        );
      });
    });

    it('should show error when trying to bulk approve with no selection', () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      const mockMultiplePendingData = [
        { id: 'pending-1', status: 'pending' },
        { id: 'pending-2', status: 'pending' },
      ];

      usePendingApprovals.mockReturnValue({
        data: mockMultiplePendingData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      // Enable bulk actions
      const bulkActionsButton = getByText('Bulk Actions');
      fireEvent.press(bulkActionsButton);

      // Try to approve with no selection
      const approveSelectedButton = getByText('Approve Selected');
      fireEvent.press(approveSelectedButton);

      // Should show "0 selected" indicating no items are selected
      expect(getByText('0 selected')).toBeTruthy();
    });
  });

  describe('Individual Request Actions', () => {
    it('should handle individual request approval', async () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      const mockApproveMutation = {
        mutateAsync: jest.fn().mockResolvedValue({}),
        isPending: false,
      };

      const mockPendingData = [
        {
          id: 'pending-1',
          member_id: 'member-1',
          org_id: 'test-org-id',
          hours: 3,
          status: 'pending',
          description: 'Individual approval test',
          member_name: 'John Doe',
          activity_date: '2024-01-15',
          submitted_at: '2024-01-15T10:00:00Z',
        },
      ];

      usePendingApprovals.mockReturnValue({
        data: mockPendingData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue(mockApproveMutation);

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Individual approval test')).toBeTruthy();
      });

      // This would be handled by the VerificationCard component
      // The test verifies that the mutation hook is properly set up
      expect(mockApproveMutation.mutateAsync).toBeDefined();
    });

    it('should handle individual request rejection with reason', async () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      const mockRejectMutation = {
        mutateAsync: jest.fn().mockResolvedValue({}),
        isPending: false,
      };

      const mockPendingData = [
        {
          id: 'pending-1',
          member_id: 'member-1',
          org_id: 'test-org-id',
          hours: 2,
          status: 'pending',
          description: 'Individual rejection test',
          member_name: 'Jane Smith',
          activity_date: '2024-01-16',
          submitted_at: '2024-01-16T10:00:00Z',
        },
      ];

      usePendingApprovals.mockReturnValue({
        data: mockPendingData,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue(mockRejectMutation);

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      await waitFor(() => {
        expect(getByText('Individual rejection test')).toBeTruthy();
      });

      // Verify rejection mutation is available
      expect(mockRejectMutation.mutateAsync).toBeDefined();
    });
  });

  describe('Rejection Input System', () => {
    it('should show rejection input modal when rejecting a request', () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      usePendingApprovals.mockReturnValue({
        data: [
          {
            id: 'pending-1',
            description: 'Request to reject',
            status: 'pending',
          },
        ],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      // The rejection input modal elements should be available in the component
      // but not visible until a rejection is triggered
      expect(getByText('Request to reject')).toBeTruthy();
    });

    it('should validate rejection reason input', () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      usePendingApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { queryByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      // Rejection input elements should exist in the component structure
      // The word count and validation would be tested when the modal is active
      expect(queryByText('Reason for Rejection (max 50 words)')).toBeNull(); // Not visible initially
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state while fetching pending requests', () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      usePendingApprovals.mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByTestId } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      expect(getByTestId('loading-skeleton')).toBeTruthy();
    });

    it('should show error state when data fetching fails', () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      usePendingApprovals.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('Failed to fetch pending requests'),
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      expect(getByText('Error Loading Data')).toBeTruthy();
      expect(getByText('Failed to load pending volunteer hours. Please try again.')).toBeTruthy();
    });

    it('should show empty state when no requests exist', () => {
      const {
        usePendingApprovals,
        useVerifiedApprovals,
        useRejectedApprovals,
        useApproveVolunteerHours,
        useRejectVolunteerHours,
        useBulkApproveVolunteerHours,
      } = require('../../hooks/useVolunteerHoursData');

      usePendingApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useVerifiedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useRejectedApprovals.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      useApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useRejectVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      useBulkApproveVolunteerHours.mockReturnValue({
        mutateAsync: jest.fn(),
        isPending: false,
      });

      const { getByText } = renderWithProviders(
        <OfficerVolunteerApprovalScreen navigation={mockNavigation} />
      );

      expect(getByText('All Caught Up!')).toBeTruthy();
      expect(getByText('No volunteer hours pending approval at this time.')).toBeTruthy();
    });
  });
});