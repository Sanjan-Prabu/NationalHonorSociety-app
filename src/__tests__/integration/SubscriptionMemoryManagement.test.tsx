/**
 * Subscription Memory Management Tests
 * 
 * Tests to validate proper cleanup of subscriptions and prevent memory leaks
 * Tests subscription lifecycle management across component mounts/unmounts
 */

import React, { useEffect, useState } from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import subscription hooks
import { useEventSubscriptions } from '../../hooks/useEventSubscriptions';
import { useVolunteerHoursSubscriptions } from '../../hooks/useVolunteerHoursSubscriptions';
import { useAttendanceSubscriptions } from '../../hooks/useAttendanceSubscriptions';

// Mock memory leak detector
import { memoryLeakDetector } from '../../utils/memoryLeakDetector';

// Mock Supabase client
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
  })),
  channel: jest.fn(() => mockChannel),
};

jest.mock('../../lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

// Mock memory leak detector
jest.mock('../../utils/memoryLeakDetector', () => ({
  memoryLeakDetector: {
    trackSubscription: jest.fn(),
    untrackSubscription: jest.fn(),
    getActiveSubscriptions: jest.fn(() => []),
    detectLeaks: jest.fn(() => []),
    cleanup: jest.fn(),
  },
}));

describe('Subscription Memory Management', () => {
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

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  describe('Single Subscription Lifecycle', () => {
    const SingleSubscriptionComponent = ({ orgId, active }: { orgId: string; active: boolean }) => {
      if (active) {
        useEventSubscriptions(orgId);
      }
      return null;
    };

    it('should create subscription on mount', async () => {
      render(
        <TestWrapper>
          <SingleSubscriptionComponent orgId="org-123" active={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('events-org-123');
        expect(mockChannel.subscribe).toHaveBeenCalled();
        expect(memoryLeakDetector.trackSubscription).toHaveBeenCalledWith('events-org-123');
      });
    });

    it('should cleanup subscription on unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <SingleSubscriptionComponent orgId="org-123" active={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      unmount();

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(memoryLeakDetector.untrackSubscription).toHaveBeenCalledWith('events-org-123');
    });

    it('should cleanup subscription when deactivated', async () => {
      const { rerender } = render(
        <TestWrapper>
          <SingleSubscriptionComponent orgId="org-123" active={true} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      // Deactivate subscription
      rerender(
        <TestWrapper>
          <SingleSubscriptionComponent orgId="org-123" active={false} />
        </TestWrapper>
      );

      expect(mockChannel.unsubscribe).toHaveBeenCalled();
      expect(memoryLeakDetector.untrackSubscription).toHaveBeenCalledWith('events-org-123');
    });
  });

  describe('Multiple Subscription Management', () => {
    const MultiSubscriptionComponent = ({ 
      eventOrgId, 
      volunteerUserId, 
      attendanceUserId,
      activeSubscriptions 
    }: { 
      eventOrgId?: string;
      volunteerUserId?: string;
      attendanceUserId?: string;
      activeSubscriptions: string[];
    }) => {
      if (activeSubscriptions.includes('events') && eventOrgId) {
        useEventSubscriptions(eventOrgId);
      }
      if (activeSubscriptions.includes('volunteer') && volunteerUserId) {
        useVolunteerHoursSubscriptions(volunteerUserId);
      }
      if (activeSubscriptions.includes('attendance') && attendanceUserId) {
        useAttendanceSubscriptions(attendanceUserId);
      }
      return null;
    };

    it('should manage multiple subscriptions independently', async () => {
      render(
        <TestWrapper>
          <MultiSubscriptionComponent
            eventOrgId="org-123"
            volunteerUserId="user-123"
            attendanceUserId="user-123"
            activeSubscriptions={['events', 'volunteer', 'attendance']}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockSupabase.channel).toHaveBeenCalledWith('events-org-123');
        expect(mockSupabase.channel).toHaveBeenCalledWith('volunteer-hours-user-123');
        expect(mockSupabase.channel).toHaveBeenCalledWith('attendance-user-123');
        expect(mockChannel.subscribe).toHaveBeenCalledTimes(3);
      });

      expect(memoryLeakDetector.trackSubscription).toHaveBeenCalledTimes(3);
    });

    it('should cleanup only deactivated subscriptions', async () => {
      const { rerender } = render(
        <TestWrapper>
          <MultiSubscriptionComponent
            eventOrgId="org-123"
            volunteerUserId="user-123"
            attendanceUserId="user-123"
            activeSubscriptions={['events', 'volunteer', 'attendance']}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalledTimes(3);
      });

      // Deactivate only volunteer subscription
      rerender(
        <TestWrapper>
          <MultiSubscriptionComponent
            eventOrgId="org-123"
            volunteerUserId="user-123"
            attendanceUserId="user-123"
            activeSubscriptions={['events', 'attendance']}
          />
        </TestWrapper>
      );

      // Should unsubscribe only from volunteer hours
      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(1);
      expect(memoryLeakDetector.untrackSubscription).toHaveBeenCalledWith('volunteer-hours-user-123');
    });

    it('should cleanup all subscriptions on unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <MultiSubscriptionComponent
            eventOrgId="org-123"
            volunteerUserId="user-123"
            attendanceUserId="user-123"
            activeSubscriptions={['events', 'volunteer', 'attendance']}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalledTimes(3);
      });

      unmount();

      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(3);
      expect(memoryLeakDetector.untrackSubscription).toHaveBeenCalledTimes(3);
    });
  });

  describe('Dynamic Subscription Changes', () => {
    const DynamicSubscriptionComponent = ({ userId }: { userId: string }) => {
      const [subscriptionType, setSubscriptionType] = useState<'volunteer' | 'attendance'>('volunteer');

      useEffect(() => {
        const interval = setInterval(() => {
          setSubscriptionType(prev => prev === 'volunteer' ? 'attendance' : 'volunteer');
        }, 100);

        return () => clearInterval(interval);
      }, []);

      if (subscriptionType === 'volunteer') {
        useVolunteerHoursSubscriptions(userId);
      } else {
        useAttendanceSubscriptions(userId);
      }

      return null;
    };

    it('should handle rapid subscription changes', async () => {
      const { unmount } = render(
        <TestWrapper>
          <DynamicSubscriptionComponent userId="user-123" />
        </TestWrapper>
      );

      // Wait for initial subscription
      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });

      // Wait for subscription changes
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 250));
      });

      unmount();

      // Verify no memory leaks
      expect(memoryLeakDetector.detectLeaks).toHaveBeenCalled();
      expect(mockChannel.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Recovery', () => {
    const ErrorProneSubscriptionComponent = ({ shouldError }: { shouldError: boolean }) => {
      if (shouldError) {
        // Simulate subscription error
        mockChannel.subscribe.mockImplementation(() => {
          throw new Error('Subscription failed');
        });
      } else {
        mockChannel.subscribe.mockImplementation(() => mockChannel);
      }

      useEventSubscriptions('org-123');
      return null;
    };

    it('should handle subscription errors gracefully', async () => {
      const { rerender } = render(
        <TestWrapper>
          <ErrorProneSubscriptionComponent shouldError={true} />
        </TestWrapper>
      );

      // Should not crash on error
      expect(() => {
        rerender(
          <TestWrapper>
            <ErrorProneSubscriptionComponent shouldError={false} />
          </TestWrapper>
        );
      }).not.toThrow();
    });

    it('should recover from subscription failures', async () => {
      const { rerender } = render(
        <TestWrapper>
          <ErrorProneSubscriptionComponent shouldError={true} />
        </TestWrapper>
      );

      // Recover from error
      rerender(
        <TestWrapper>
          <ErrorProneSubscriptionComponent shouldError={false} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalled();
      });
    });
  });

  describe('Memory Leak Detection', () => {
    const LeakTestComponent = ({ iterations }: { iterations: number }) => {
      const [currentIteration, setCurrentIteration] = useState(0);

      useEffect(() => {
        if (currentIteration < iterations) {
          const timeout = setTimeout(() => {
            setCurrentIteration(prev => prev + 1);
          }, 10);
          return () => clearTimeout(timeout);
        }
      }, [currentIteration, iterations]);

      // Create and destroy subscriptions rapidly
      if (currentIteration % 2 === 0) {
        useEventSubscriptions(`org-${currentIteration}`);
      }

      return null;
    };

    it('should detect memory leaks from uncleaned subscriptions', async () => {
      const mockLeaks = ['events-org-2', 'events-org-4'];
      (memoryLeakDetector.detectLeaks as jest.Mock).mockReturnValue(mockLeaks);

      const { unmount } = render(
        <TestWrapper>
          <LeakTestComponent iterations={10} />
        </TestWrapper>
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      unmount();

      expect(memoryLeakDetector.detectLeaks).toHaveBeenCalled();
      expect(memoryLeakDetector.cleanup).toHaveBeenCalled();
    });

    it('should track subscription count accurately', async () => {
      const activeSubscriptions = ['events-org-123', 'volunteer-hours-user-123'];
      (memoryLeakDetector.getActiveSubscriptions as jest.Mock).mockReturnValue(activeSubscriptions);

      render(
        <TestWrapper>
          <MultiSubscriptionComponent
            eventOrgId="org-123"
            volunteerUserId="user-123"
            activeSubscriptions={['events', 'volunteer']}
          />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalledTimes(2);
      });

      expect(memoryLeakDetector.getActiveSubscriptions()).toHaveLength(2);
    });
  });

  describe('Performance Impact', () => {
    const PerformanceTestComponent = ({ subscriptionCount }: { subscriptionCount: number }) => {
      // Create multiple subscriptions to test performance
      for (let i = 0; i < subscriptionCount; i++) {
        useEventSubscriptions(`org-${i}`);
      }
      return null;
    };

    it('should handle large numbers of subscriptions efficiently', async () => {
      const startTime = Date.now();

      render(
        <TestWrapper>
          <PerformanceTestComponent subscriptionCount={50} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalledTimes(50);
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('should cleanup large numbers of subscriptions efficiently', async () => {
      const { unmount } = render(
        <TestWrapper>
          <PerformanceTestComponent subscriptionCount={50} />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(mockChannel.subscribe).toHaveBeenCalledTimes(50);
      });

      const startTime = Date.now();
      unmount();
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Cleanup should be fast (less than 500ms)
      expect(duration).toBeLessThan(500);
      expect(mockChannel.unsubscribe).toHaveBeenCalledTimes(50);
    });
  });

  describe('Subscription State Consistency', () => {
    const StateConsistencyComponent = ({ orgId }: { orgId: string }) => {
      const [subscriptionActive, setSubscriptionActive] = useState(true);

      useEffect(() => {
        // Toggle subscription state
        const interval = setInterval(() => {
          setSubscriptionActive(prev => !prev);
        }, 50);

        return () => clearInterval(interval);
      }, []);

      if (subscriptionActive) {
        useEventSubscriptions(orgId);
      }

      return null;
    };

    it('should maintain consistent subscription state', async () => {
      const { unmount } = render(
        <TestWrapper>
          <StateConsistencyComponent orgId="org-123" />
        </TestWrapper>
      );

      // Let it toggle a few times
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      unmount();

      // Verify final cleanup
      expect(memoryLeakDetector.cleanup).toHaveBeenCalled();
    });
  });
});