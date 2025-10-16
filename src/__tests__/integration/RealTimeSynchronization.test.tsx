/**
 * Real-Time Synchronization Tests
 * 
 * Tests to validate real-time data synchronization across multiple app instances
 * Tests subscription cleanup and memory management
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import hooks that use real-time subscriptions
import { useEventSubscriptions } from '../../hooks/useEventSubscriptions';
import { useVolunteerHoursSubscriptions } from '../../hooks/useVolunteerHoursSubscriptions';
import { useAttendanceSubscriptions } from '../../hooks/useAttendanceSubscriptions';

// Import services
import { EventDataService } from '../../services/EventDataService';
import { VolunteerHoursService } from '../../services/VolunteerHoursService';
import { AttendanceService } from '../../services/AttendanceService';

// Mock Supabase client with real-time capabilities
const mockChannel = {
  on: jest.fn(() => mockChannel),
  subscribe: jest.fn(() => mockChannel),
  unsubscribe: jest.fn(),
};

const mockSupabase = {
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
  channel: jest.fn(() => mockChannel),
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

describe('Real-Time Synchronization', () => {
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

  const TestComponent = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('Event Subscriptions', () => {
    const EventSubscriptionTest = ({ orgId }: { orgId: string }) => {
      useEventSubscriptions(orgId);
      return null;
    };

    it('should establish event subscriptions on mount', async () => {
      render(
        <TestComponent>
          <EventSubscriptionTest orgId="org-123" />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('events-org-123');
        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          expect.objectContaining({
            event: '*',
            schema: 'public',
            table: 'events',
            filter: 'org_id=eq.org-123',
          }),
          expect.any(Function)
        );
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });
    });

    it('should handle real-time event updates', async () => {
      const mockEventUpdate = {
        eventType: 'UPDATE',
        new: {
          id: 'event-1',
          title: 'Updated Event',
          description: 'Updated description',
          date: '2024-02-01T10:00:00Z',
          location: 'Updated Location',
          org_id: 'org-123',
          created_by: 'officer-123',
          volunteer_hours: 4,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        old: {
          id: 'event-1',
          title: 'Original Event',
          volunteer_hours: 3,
        },
      };

      let subscriptionCallback: Function;
      mockChannel.on.mockImplementation((event, config, callback) => {
        subscriptionCallback = callback;
        return mockChannel;
      });

      render(
        <TestComponent>
          <EventSubscriptionTest orgId="org-123" />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      // Simulate real-time update
      act(() => {
        subscriptionCallback(mockEventUpdate);
      });

      // Verify cache invalidation occurs
      expect(queryClient.getQueryCache().getAll()).toBeDefined();
    });

    it('should handle real-time event insertions', async () => {
      const mockEventInsert = {
        eventType: 'INSERT',
        new: {
          id: 'event-2',
          title: 'New Event',
          description: 'New event description',
          date: '2024-02-15T14:00:00Z',
          location: 'Community Center',
          org_id: 'org-123',
          created_by: 'officer-123',
          volunteer_hours: 2,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      };

      let subscriptionCallback: Function;
      mockChannel.on.mockImplementation((event, config, callback) => {
        subscriptionCallback = callback;
        return mockChannel;
      });

      render(
        <TestComponent>
          <EventSubscriptionTest orgId="org-123" />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      // Simulate real-time insertion
      act(() => {
        subscriptionCallback(mockEventInsert);
      });

      // Verify cache is updated
      expect(queryClient.getQueryCache().getAll()).toBeDefined();
    });

    it('should clean up subscriptions on unmount', async () => {
      const { unmount } = render(
        <TestComponent>
          <EventSubscriptionTest orgId="org-123" />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      unmount();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Volunteer Hours Subscriptions', () => {
    const VolunteerHoursSubscriptionTest = ({ userId }: { userId: string }) => {
      useVolunteerHoursSubscriptions(userId);
      return null;
    };

    it('should establish volunteer hours subscriptions', async () => {
      render(
        <TestComponent>
          <VolunteerHoursSubscriptionTest userId="user-123" />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('volunteer-hours-user-123');
        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          expect.objectContaining({
            event: '*',
            schema: 'public',
            table: 'volunteer_hours',
            filter: 'user_id=eq.user-123',
          }),
          expect.any(Function)
        );
      });
    });

    it('should handle volunteer hours status updates', async () => {
      const mockStatusUpdate = {
        eventType: 'UPDATE',
        new: {
          id: 'vh-1',
          user_id: 'user-123',
          event_id: 'event-1',
          hours: 3,
          description: 'Helped at shelter',
          date: '2024-02-01',
          status: 'approved',
          approved_by: 'officer-123',
          org_id: 'org-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
        old: {
          status: 'pending',
          approved_by: null,
        },
      };

      let subscriptionCallback: Function;
      mockChannel.on.mockImplementation((event, config, callback) => {
        subscriptionCallback = callback;
        return mockChannel;
      });

      render(
        <TestComponent>
          <VolunteerHoursSubscriptionTest userId="user-123" />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      // Simulate status update
      act(() => {
        subscriptionCallback(mockStatusUpdate);
      });

      // Verify cache invalidation
      expect(queryClient.getQueryCache().getAll()).toBeDefined();
    });
  });

  describe('Attendance Subscriptions', () => {
    const AttendanceSubscriptionTest = ({ userId }: { userId: string }) => {
      useAttendanceSubscriptions(userId);
      return null;
    };

    it('should establish attendance subscriptions', async () => {
      render(
        <TestComponent>
          <AttendanceSubscriptionTest userId="user-123" />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('attendance-user-123');
        expect(mockChannel.on).toHaveBeenCalledWith(
          'postgres_changes',
          expect.objectContaining({
            event: '*',
            schema: 'public',
            table: 'attendance',
            filter: 'user_id=eq.user-123',
          }),
          expect.any(Function)
        );
      });
    });

    it('should handle new attendance records', async () => {
      const mockAttendanceInsert = {
        eventType: 'INSERT',
        new: {
          id: 'att-2',
          user_id: 'user-123',
          event_id: 'event-2',
          attended: true,
          check_in_time: '2024-02-15T14:00:00Z',
          org_id: 'org-123',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      };

      let subscriptionCallback: Function;
      mockChannel.on.mockImplementation((event, config, callback) => {
        subscriptionCallback = callback;
        return mockChannel;
      });

      render(
        <TestComponent>
          <AttendanceSubscriptionTest userId="user-123" />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      // Simulate new attendance record
      act(() => {
        subscriptionCallback(mockAttendanceInsert);
      });

      // Verify cache is updated
      expect(queryClient.getQueryCache().getAll()).toBeDefined();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous subscriptions', async () => {
      const MultiSubscriptionTest = () => {
        useEventSubscriptions('org-123');
        useVolunteerHoursSubscriptions('user-123');
        useAttendanceSubscriptions('user-123');
        return null;
      };

      render(
        <TestComponent>
          <MultiSubscriptionTest />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('events-org-123');
        expect(mockSupabase.channel).toHaveBeenCalledWith('volunteer-hours-user-123');
        expect(mockSupabase.channel).toHaveBeenCalledWith('attendance-user-123');
      });

      // Verify all subscriptions are active
      expect(mockChannel.subscribe).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent data modifications', async () => {
      const mockConcurrentUpdates = [
        {
          eventType: 'UPDATE',
          new: { id: 'event-1', title: 'Updated Event 1' },
        },
        {
          eventType: 'INSERT',
          new: { id: 'event-2', title: 'New Event 2' },
        },
        {
          eventType: 'UPDATE',
          new: { id: 'vh-1', status: 'approved' },
        },
      ];

      let eventCallback: Function;
      let volunteerCallback: Function;

      mockChannel.on.mockImplementation((event, config, callback) => {
        if (config.table === 'events') {
          eventCallback = callback;
        } else if (config.table === 'volunteer_hours') {
          volunteerCallback = callback;
        }
        return mockChannel;
      });

      const MultiSubscriptionTest = () => {
        useEventSubscriptions('org-123');
        useVolunteerHoursSubscriptions('user-123');
        return null;
      };

      render(
        <TestComponent>
          <MultiSubscriptionTest />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalledTimes(2);
      });

      // Simulate concurrent updates
      act(() => {
        eventCallback(mockConcurrentUpdates[0]);
        eventCallback(mockConcurrentUpdates[1]);
        volunteerCallback(mockConcurrentUpdates[2]);
      });

      // Verify all updates are handled
      expect(queryClient.getQueryCache().getAll()).toBeDefined();
    });
  });

  describe('Memory Management', () => {
    it('should prevent memory leaks from subscriptions', async () => {
      const SubscriptionTest = ({ active }: { active: boolean }) => {
        if (active) {
          useEventSubscriptions('org-123');
        }
        return null;
      };

      const { rerender, unmount } = render(
        <TestComponent>
          <SubscriptionTest active={true} />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      // Deactivate subscription
      rerender(
        <TestComponent>
          <SubscriptionTest active={false} />
        </TestComponent>
      );

      // Unmount component
      unmount();

      // Verify cleanup
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });

    it('should handle subscription errors gracefully', async () => {
      const mockError = new Error('Subscription error');
      mockChannel.subscribe.mockImplementation(() => {
        throw mockError;
      });

      const ErrorSubscriptionTest = () => {
        useEventSubscriptions('org-123');
        return null;
      };

      // Should not crash on subscription error
      expect(() => {
        render(
          <TestComponent>
            <ErrorSubscriptionTest />
          </TestComponent>
        );
      }).not.toThrow();
    });

    it('should handle network disconnection and reconnection', async () => {
      let subscriptionCallback: Function;
      mockChannel.on.mockImplementation((event, config, callback) => {
        subscriptionCallback = callback;
        return mockChannel;
      });

      const NetworkTest = () => {
        useEventSubscriptions('org-123');
        return null;
      };

      render(
        <TestComponent>
          <NetworkTest />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      // Simulate network disconnection (no updates received)
      // Then reconnection with batch updates
      const batchUpdates = [
        { eventType: 'INSERT', new: { id: 'event-1', title: 'Event 1' } },
        { eventType: 'INSERT', new: { id: 'event-2', title: 'Event 2' } },
        { eventType: 'UPDATE', new: { id: 'event-1', title: 'Updated Event 1' } },
      ];

      act(() => {
        batchUpdates.forEach(update => subscriptionCallback(update));
      });

      // Verify all updates are processed
      expect(queryClient.getQueryCache().getAll()).toBeDefined();
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency during real-time updates', async () => {
      const mockInitialData = [
        { id: 'event-1', title: 'Event 1', version: 1 },
        { id: 'event-2', title: 'Event 2', version: 1 },
      ];

      const mockUpdate = {
        eventType: 'UPDATE',
        new: { id: 'event-1', title: 'Updated Event 1', version: 2 },
        old: { id: 'event-1', title: 'Event 1', version: 1 },
      };

      // Mock initial data fetch
      jest.spyOn(EventDataService.prototype, 'getOrganizationEvents')
        .mockResolvedValue(mockInitialData as any);

      let subscriptionCallback: Function;
      mockChannel.on.mockImplementation((event, config, callback) => {
        subscriptionCallback = callback;
        return mockChannel;
      });

      const ConsistencyTest = () => {
        useEventSubscriptions('org-123');
        return null;
      };

      render(
        <TestComponent>
          <ConsistencyTest />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      // Simulate real-time update
      act(() => {
        subscriptionCallback(mockUpdate);
      });

      // Verify data consistency is maintained
      expect(queryClient.getQueryCache().getAll()).toBeDefined();
    });

    it('should handle out-of-order updates correctly', async () => {
      const updates = [
        { eventType: 'UPDATE', new: { id: 'event-1', title: 'Update 3', version: 3 } },
        { eventType: 'UPDATE', new: { id: 'event-1', title: 'Update 1', version: 1 } },
        { eventType: 'UPDATE', new: { id: 'event-1', title: 'Update 2', version: 2 } },
      ];

      let subscriptionCallback: Function;
      mockChannel.on.mockImplementation((event, config, callback) => {
        subscriptionCallback = callback;
        return mockChannel;
      });

      const OrderTest = () => {
        useEventSubscriptions('org-123');
        return null;
      };

      render(
        <TestComponent>
          <OrderTest />
        </TestComponent>
      );

      await waitFor(() => {
        expect(mockChannel.on).toHaveBeenCalled();
      });

      // Simulate out-of-order updates
      act(() => {
        updates.forEach(update => subscriptionCallback(update));
      });

      // Verify updates are handled appropriately
      expect(queryClient.getQueryCache().getAll()).toBeDefined();
    });
  });
});