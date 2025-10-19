/**
 * useAnnouncementData - React hook for announcement data with realtime subscriptions
 * Provides CRUD operations and realtime updates for announcements
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  announcementService, 
  Announcement, 
  CreateAnnouncementRequest, 
  UpdateAnnouncementRequest,
  AnnouncementFilters 
} from '../services/AnnouncementService';
import { ApiResponse, LoadingState, MutationState } from '../types/dataService';
import { UUID } from '../types/database';

// =============================================================================
// HOOK INTERFACES
// =============================================================================

interface UseAnnouncementDataOptions {
  filters?: AnnouncementFilters;
  limit?: number;
  offset?: number;
  enableRealtime?: boolean;
}

interface UseAnnouncementDataReturn {
  // Data state
  announcements: Announcement[];
  loading: LoadingState;
  
  // CRUD operations
  createAnnouncement: (data: CreateAnnouncementRequest) => Promise<ApiResponse<Announcement>>;
  updateAnnouncement: (id: string, data: UpdateAnnouncementRequest) => Promise<ApiResponse<Announcement>>;
  deleteAnnouncement: (id: string) => Promise<ApiResponse<boolean>>;
  refreshAnnouncements: () => Promise<void>;
  
  // Mutation states
  createState: MutationState<Announcement>;
  updateState: MutationState<Announcement>;
  deleteState: MutationState<boolean>;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useAnnouncementData(
  options: UseAnnouncementDataOptions = {}
): UseAnnouncementDataReturn {
  const {
    filters,
    limit,
    offset,
    enableRealtime = true
  } = options;

  // State management
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    isError: false,
  });

  // Mutation states
  const [createState, setCreateState] = useState<MutationState<Announcement>>({
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const [updateState, setUpdateState] = useState<MutationState<Announcement>>({
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  const [deleteState, setDeleteState] = useState<MutationState<boolean>>({
    isLoading: false,
    isError: false,
    isSuccess: false,
  });

  // Refs for cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(true);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchAnnouncements = useCallback(async () => {
    if (!mountedRef.current) return;

    setLoading(prev => ({ ...prev, isLoading: true, isError: false }));

    try {
      const result = await announcementService.fetchAnnouncements(
        filters,
        { limit, offset }
      );

      if (!mountedRef.current) return;

      if (result.success && result.data) {
        setAnnouncements(result.data);
        setLoading({
          isLoading: false,
          isError: false,
        });
      } else {
        setLoading({
          isLoading: false,
          isError: true,
          error: {
            code: 'FETCH_ERROR',
            message: result.error || 'Failed to fetch announcements',
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      if (!mountedRef.current) return;

      setLoading({
        isLoading: false,
        isError: true,
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }, [filters, limit, offset]);

  // =============================================================================
  // REALTIME SUBSCRIPTION
  // =============================================================================

  const setupRealtimeSubscription = useCallback(async () => {
    if (!enableRealtime || !mountedRef.current) return;

    try {
      const unsubscribe = await announcementService.subscribeToAnnouncements(
        (payload) => {
          if (!mountedRef.current) return;
          


          setAnnouncements(prev => {
            let updated = prev;
            
            switch (payload.eventType) {
              case 'INSERT':
                if (payload.new) {
                  // Robust duplicate check - prevent any duplicates
                  const existingIndex = prev.findIndex(announcement => announcement.id === payload.new!.id);
                  if (existingIndex !== -1) {
                    // Update the existing announcement with the real data from server
                    updated = [...prev];
                    updated[existingIndex] = payload.new;
                  } else {
                    // Add new announcement to the beginning of the list
                    updated = [payload.new, ...prev];
                  }
                }
                break;

              case 'UPDATE':
                if (payload.new) {
                  // Update existing announcement
                  updated = prev.map(announcement => 
                    announcement.id === payload.new!.id ? payload.new! : announcement
                  );
                }
                break;

              case 'DELETE':
                if (payload.old) {
                  // Remove deleted announcement
                  updated = prev.filter(announcement => announcement.id !== payload.old!.id);
                }
                break;

              default:
                break;
            }

            // Final deduplication safety check to prevent any duplicates
            const seen = new Set();
            const deduplicated = updated.filter(announcement => {
              if (seen.has(announcement.id)) {
                console.warn('Duplicate announcement detected and removed:', announcement.id);
                return false;
              }
              seen.add(announcement.id);
              return true;
            });

            return deduplicated;
          });
        },
        filters
      );

      unsubscribeRef.current = unsubscribe;
    } catch (error) {
      console.error('Failed to setup realtime subscription:', error);
    }
  }, [enableRealtime, filters]);

  // =============================================================================
  // CRUD OPERATIONS
  // =============================================================================

  const createAnnouncement = useCallback(async (
    data: CreateAnnouncementRequest
  ): Promise<ApiResponse<Announcement>> => {
    setCreateState({
      isLoading: true,
      isError: false,
      isSuccess: false,
    });

    try {
      const result = await announcementService.createAnnouncement(data);

      if (result.success && result.data) {
        setCreateState({
          isLoading: false,
          isError: false,
          isSuccess: true,
          data: result.data,
        });

        // Don't do optimistic updates for creation when realtime is enabled
        // The realtime subscription will handle the UI update to prevent duplicates
        if (!enableRealtime) {
          setAnnouncements(prev => [result.data!, ...prev]);
        }
      } else {
        setCreateState({
          isLoading: false,
          isError: true,
          isSuccess: false,
          error: {
            code: 'CREATE_ERROR',
            message: result.error || 'Failed to create announcement',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setCreateState({
        isLoading: false,
        isError: true,
        isSuccess: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }, []);

  const updateAnnouncement = useCallback(async (
    id: string,
    data: UpdateAnnouncementRequest
  ): Promise<ApiResponse<Announcement>> => {
    setUpdateState({
      isLoading: true,
      isError: false,
      isSuccess: false,
    });

    try {
      const result = await announcementService.updateAnnouncement(id, data);

      if (result.success && result.data) {
        setUpdateState({
          isLoading: false,
          isError: false,
          isSuccess: true,
          data: result.data,
        });

        // Optimistically update local state immediately for better UX
        // Realtime will handle any conflicts
        setAnnouncements(prev => 
          prev.map(announcement => 
            announcement.id === id ? result.data! : announcement
          )
        );
      } else {
        setUpdateState({
          isLoading: false,
          isError: true,
          isSuccess: false,
          error: {
            code: 'UPDATE_ERROR',
            message: result.error || 'Failed to update announcement',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setUpdateState({
        isLoading: false,
        isError: true,
        isSuccess: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        data: null,
        error: errorMessage,
        success: false,
      };
    }
  }, []);

  const deleteAnnouncement = useCallback(async (
    id: string
  ): Promise<ApiResponse<boolean>> => {
    setDeleteState({
      isLoading: true,
      isError: false,
      isSuccess: false,
    });

    // Optimistically remove from UI immediately for better UX
    const originalAnnouncements = announcements;
    setAnnouncements(prev => prev.filter(announcement => announcement.id !== id));

    try {
      const result = await announcementService.softDeleteAnnouncement(id);

      if (result.success) {
        setDeleteState({
          isLoading: false,
          isError: false,
          isSuccess: true,
          data: result.data || undefined,
        });
        // Keep the optimistic update since it was successful
      } else {
        // Revert optimistic update on failure
        setAnnouncements(originalAnnouncements);
        setDeleteState({
          isLoading: false,
          isError: true,
          isSuccess: false,
          error: {
            code: 'DELETE_ERROR',
            message: result.error || 'Failed to delete announcement',
            timestamp: new Date().toISOString(),
          },
        });
      }

      return result;
    } catch (error) {
      // Revert optimistic update on error
      setAnnouncements(originalAnnouncements);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setDeleteState({
        isLoading: false,
        isError: true,
        isSuccess: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString(),
        },
      });

      return {
        data: false,
        error: errorMessage,
        success: false,
      };
    }
  }, [announcements]);

  const refreshAnnouncements = useCallback(async () => {
    await fetchAnnouncements();
  }, [fetchAnnouncements]);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  // Initial data fetch
  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Setup realtime subscription after initial data is loaded
  useEffect(() => {
    // Only set up subscription after we have loaded initial data
    if (!loading.isLoading && !loading.isError) {
      setupRealtimeSubscription();
    }

    // Cleanup subscription on unmount or dependency change
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [setupRealtimeSubscription, loading.isLoading, loading.isError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // =============================================================================
  // RETURN HOOK INTERFACE
  // =============================================================================

  return {
    announcements,
    loading,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    refreshAnnouncements,
    createState,
    updateState,
    deleteState,
  };
}

// =============================================================================
// ADDITIONAL HOOKS
// =============================================================================

/**
 * Hook for fetching a single announcement by ID
 */
export function useAnnouncement(announcementId: string) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    isError: false,
  });

  useEffect(() => {
    if (!announcementId) return;

    const fetchAnnouncement = async () => {
      setLoading({ isLoading: true, isError: false });

      try {
        const result = await announcementService.getAnnouncementById(announcementId);

        if (result.success && result.data) {
          setAnnouncement(result.data);
          setLoading({ isLoading: false, isError: false });
        } else {
          setLoading({
            isLoading: false,
            isError: true,
            error: {
              code: 'FETCH_ERROR',
              message: result.error || 'Failed to fetch announcement',
              timestamp: new Date().toISOString(),
            },
          });
        }
      } catch (error) {
        setLoading({
          isLoading: false,
          isError: true,
          error: {
            code: 'UNKNOWN_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        });
      }
    };

    fetchAnnouncement();
  }, [announcementId]);

  return { announcement, loading };
}