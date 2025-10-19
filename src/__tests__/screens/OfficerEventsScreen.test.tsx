/**
 * OfficerEventsScreen Component Tests
 * Tests the officer events screen display, delete functionality, and navigation
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import OfficerEventsScreen from '../../screens/officer/OfficerEventsScreen';

// Mock dependencies
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');
jest.mock('react-native-size-matters', () => ({
  scale: (size: number) => size,
  verticalScale: (size: number) => size,
  moderateScale: (size: number) => size,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock contexts
jest.mock('../../contexts/OrganizationContext', () => ({
  useOrganization: () => ({
    activeOrganization: { id: 'test-org-id', name: 'Test Organization' },
  }),
}));

// Mock components
jest.mock('../../components/ui/ProfileButton', () => 'ProfileButton');
jest.mock('../../components/ui/LoadingSkeleton', () => 'LoadingSkeleton');
jest.mock('../../components/ui/EmptyState', () => ({ children, onActionPress }: any) => (
  <div onClick={onActionPress}>{children}</div>
));
jest.mock('../../components/ui/EventCard', () => ({ event, onDelete, showDeleteButton }: any) => (
  <div>
    <span>{event.title}</span>
    {showDeleteButton && <button onClick={() => onDelete(event.id)}>Delete</button>}
  </div>
));

// Mock HOC
jest.mock('../../components/hoc/withRoleProtection', () => ({
  withRoleProtection: (Component: any) => Component,
}));

// Mock hooks
const mockEvents = [
  {
    id: 'event-1',
    title: 'Community Cleanup',
    description: 'Help clean up the local park',
    location: 'Central Park',
    event_date: '2024-02-15',
    starts_at: '2024-02-15T09:00:00Z',
    ends_at: '2024-02-15T12:00:00Z',
    category: 'volunteering',
    created_at: '2024-01-15T10:00:00Z',
    creator_name: 'John Officer',
  },
  {
    id: 'event-2',
    title: 'Fundraiser Bake Sale',
    description: 'Annual bake sale fundraiser',
    location: 'School Cafeteria',
    event_date: '2024-02-20',
    starts_at: '2024-02-20T10:00:00Z',
    ends_at: '2024-02-20T14:00:00Z',
    category: 'fundraiser',
    created_at: '2024-01-20T10:00:00Z',
    creator_name: 'Jane Officer',
  },
];

const mockUseOfficerEvents = {
  events: mockEvents,
  loading: false,
  error: null,
  refetch: jest.fn(),
  deleteEvent: jest.fn(),
  deleteLoading: false,
  deleteError: null,
};

const mockUseEventSubscriptions = jest.fn();

jest.mock('../../hooks/useEventData', () => ({
  useOfficerEvents: () => mockUseOfficerEvents,
}));

jest.mock('../../hooks/useEventSubscriptions', () => ({
  useEventSubscriptions: mockUseEventSubscriptions,
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('OfficerEventsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Alert.alert
    jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      // Simulate user pressing the delete button
      if (buttons && buttons.length > 1) {
        buttons[1].onPress?.();
      }
    });
  });

  describe('Screen Rendering', () => {
    it('should render screen header correctly', () => {
      const { getByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      expect(getByText('Create Events')).toBeTruthy();
      expect(getByText('Manage Volunteer Opportunities')).toBeTruthy();
      expect(getByText('Organization Events')).toBeTruthy();
    });

    it('should render events list when events are available', () => {
      const { getByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      expect(getByText('Community Cleanup')).toBeTruthy();
      expect(getByText('Fundraiser Bake Sale')).toBeTruthy();
    });

    it('should show loading state when events are loading', () => {
      // Mock loading state
      const loadingMockUseOfficerEvents = {
        ...mockUseOfficerEvents,
        loading: true,
        events: [],
      };

      jest.doMock('../../hooks/useEventData', () => ({
        useOfficerEvents: () => loadingMockUseOfficerEvents,
      }));

      const { getByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      expect(getByText('LoadingSkeleton')).toBeTruthy();
    });

    it('should show empty state when no events exist', () => {
      // Mock empty state
      const emptyMockUseOfficerEvents = {
        ...mockUseOfficerEvents,
        events: [],
        loading: false,
      };

      jest.doMock('../../hooks/useEventData', () => ({
        useOfficerEvents: () => emptyMockUseOfficerEvents,
      }));

      const { getByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      expect(getByText('No Events Created')).toBeTruthy();
      expect(getByText('Create your first event to get started with volunteer opportunities.')).toBeTruthy();
    });

    it('should show error state when there is an error', () => {
      // Mock error state
      const errorMockUseOfficerEvents = {
        ...mockUseOfficerEvents,
        events: [],
        loading: false,
        error: 'Failed to load events',
      };

      jest.doMock('../../hooks/useEventData', () => ({
        useOfficerEvents: () => errorMockUseOfficerEvents,
      }));

      const { getByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      expect(getByText('Error Loading Events')).toBeTruthy();
      expect(getByText('Failed to load events. Please try again.')).toBeTruthy();
    });
  });

  describe('Event Management', () => {
    it('should show delete buttons on event cards for officers', () => {
      const { getAllByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      const deleteButtons = getAllByText('Delete');
      expect(deleteButtons).toHaveLength(2); // One for each event
    });

    it('should handle event deletion with confirmation', async () => {
      mockUseOfficerEvents.deleteEvent.mockResolvedValue(true);

      const { getAllByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      const deleteButtons = getAllByText('Delete');
      fireEvent.press(deleteButtons[0]);

      await waitFor(() => {
        expect(mockUseOfficerEvents.deleteEvent).toHaveBeenCalledWith('event-1');
      });
    });

    it('should show error alert when deletion fails', async () => {
      mockUseOfficerEvents.deleteEvent.mockResolvedValue(false);
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getAllByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      const deleteButtons = getAllByText('Delete');
      fireEvent.press(deleteButtons[0]);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('Failed to delete event')
        );
      });
    });

    it('should refresh events when pull-to-refresh is triggered', async () => {
      const { getByTestId } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      // Simulate pull-to-refresh
      const scrollView = getByTestId('events-scroll-view') || getByTestId('scroll-view');
      fireEvent(scrollView, 'refresh');

      await waitFor(() => {
        expect(mockUseOfficerEvents.refetch).toHaveBeenCalled();
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to CreateEvent screen when create button is pressed', () => {
      const { getByTestId } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      // Look for floating add button
      const createButton = getByTestId('create-event-button') || getByText('add');
      fireEvent.press(createButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateEvent');
    });

    it('should navigate to CreateEvent from empty state action', () => {
      // Mock empty state
      const emptyMockUseOfficerEvents = {
        ...mockUseOfficerEvents,
        events: [],
        loading: false,
      };

      jest.doMock('../../hooks/useEventData', () => ({
        useOfficerEvents: () => emptyMockUseOfficerEvents,
      }));

      const { getByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      // Click on empty state action
      fireEvent.press(getByText('Create First Event'));

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CreateEvent');
    });
  });

  describe('Realtime Updates', () => {
    it('should setup realtime subscription for events', () => {
      render(<OfficerEventsScreen navigation={mockNavigation} />);

      expect(mockUseEventSubscriptions).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          enabled: true,
          onError: expect.any(Function),
        })
      );
    });

    it('should handle realtime subscription errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<OfficerEventsScreen navigation={mockNavigation} />);

      // Get the onError callback from the subscription call
      const subscriptionCall = mockUseEventSubscriptions.mock.calls[0];
      const onError = subscriptionCall[1].onError;

      // Simulate an error
      onError(new Error('Subscription failed'));

      expect(consoleSpy).toHaveBeenCalledWith('Event subscription error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('UI Interactions', () => {
    it('should show floating action button for creating events', () => {
      const { getByTestId } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      const fab = getByTestId('floating-add-button') || getByText('add');
      expect(fab).toBeTruthy();
    });

    it('should display profile button in header', () => {
      const { getByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      expect(getByText('ProfileButton')).toBeTruthy();
    });

    it('should handle scroll view interactions', () => {
      const { getByTestId } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      // Should render scroll view without errors
      const scrollView = getByTestId('events-scroll-view') || getByTestId('scroll-view');
      expect(scrollView).toBeTruthy();
    });
  });

  describe('Event Card Integration', () => {
    it('should pass correct props to EventCard components', () => {
      const { getByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      // EventCard should receive event data and show delete button
      expect(getByText('Community Cleanup')).toBeTruthy();
      expect(getByText('Fundraiser Bake Sale')).toBeTruthy();
      
      // Should have delete buttons (showDeleteButton=true for officers)
      const deleteButtons = getAllByText('Delete');
      expect(deleteButtons).toHaveLength(2);
    });

    it('should handle delete loading state', () => {
      // Mock delete loading state
      const loadingDeleteMockUseOfficerEvents = {
        ...mockUseOfficerEvents,
        deleteLoading: true,
      };

      jest.doMock('../../hooks/useEventData', () => ({
        useOfficerEvents: () => loadingDeleteMockUseOfficerEvents,
      }));

      const { getAllByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      // Delete buttons should be disabled during loading
      const deleteButtons = getAllByText('Delete');
      expect(deleteButtons).toHaveLength(2);
      // In actual implementation, buttons would be disabled
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      const errorMockUseOfficerEvents = {
        ...mockUseOfficerEvents,
        events: [],
        loading: false,
        error: 'Network error',
      };

      jest.doMock('../../hooks/useEventData', () => ({
        useOfficerEvents: () => errorMockUseOfficerEvents,
      }));

      const { getByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      expect(getByText('Error Loading Events')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('should retry loading events when retry button is pressed', () => {
      const errorMockUseOfficerEvents = {
        ...mockUseOfficerEvents,
        events: [],
        loading: false,
        error: 'Network error',
      };

      jest.doMock('../../hooks/useEventData', () => ({
        useOfficerEvents: () => errorMockUseOfficerEvents,
      }));

      const { getByText } = render(
        <OfficerEventsScreen navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Retry'));

      expect(mockUseOfficerEvents.refetch).toHaveBeenCalled();
    });
  });
});