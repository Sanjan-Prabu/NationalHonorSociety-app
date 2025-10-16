/**
 * Centralized Loading State Management
 * Provides consistent loading state handling across the application
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { LoadingState, MutationState, DataServiceError } from '../types/dataService';

// =============================================================================
// LOADING STATE HOOK
// =============================================================================

/**
 * Hook for managing loading states with error handling
 */
export function useLoadingState(initialLoading: boolean = false): {
  loadingState: LoadingState;
  setLoading: (loading: boolean) => void;
  setError: (error: DataServiceError | string | null) => void;
  setSuccess: () => void;
  reset: () => void;
} {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: initialLoading,
    isError: false,
    error: undefined,
    isRefetching: false,
    isFetching: false,
  });

  const setLoading = useCallback((loading: boolean) => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: loading,
      isFetching: loading,
      isError: false,
      error: undefined,
    }));
  }, []);

  const setError = useCallback((error: DataServiceError | string | null) => {
    const errorObj = typeof error === 'string' 
      ? { code: 'UNKNOWN_ERROR', message: error, timestamp: new Date().toISOString() } as DataServiceError
      : error;

    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      isFetching: false,
      isRefetching: false,
      isError: !!errorObj,
      error: errorObj || undefined,
    }));
  }, []);

  const setSuccess = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      isFetching: false,
      isRefetching: false,
      isError: false,
      error: undefined,
    }));
  }, []);

  const reset = useCallback(() => {
    setLoadingState({
      isLoading: false,
      isError: false,
      error: undefined,
      isRefetching: false,
      isFetching: false,
    });
  }, []);

  return {
    loadingState,
    setLoading,
    setError,
    setSuccess,
    reset,
  };
}

// =============================================================================
// MUTATION STATE HOOK
// =============================================================================

/**
 * Hook for managing mutation states (create, update, delete operations)
 */
export function useMutationState<T = any>(): {
  mutationState: MutationState<T>;
  setLoading: () => void;
  setSuccess: (data?: T) => void;
  setError: (error: DataServiceError | string) => void;
  reset: () => void;
} {
  const [mutationState, setMutationState] = useState<MutationState<T>>({
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: undefined,
    data: undefined,
  });

  const setLoading = useCallback(() => {
    setMutationState({
      isLoading: true,
      isError: false,
      isSuccess: false,
      error: undefined,
      data: undefined,
    });
  }, []);

  const setSuccess = useCallback((data?: T) => {
    setMutationState({
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: undefined,
      data,
    });
  }, []);

  const setError = useCallback((error: DataServiceError | string) => {
    const errorObj = typeof error === 'string' 
      ? { code: 'UNKNOWN_ERROR', message: error, timestamp: new Date().toISOString() } as DataServiceError
      : error;

    setMutationState({
      isLoading: false,
      isError: true,
      isSuccess: false,
      error: errorObj,
      data: undefined,
    });
  }, []);

  const reset = useCallback(() => {
    setMutationState({
      isLoading: false,
      isError: false,
      isSuccess: false,
      error: undefined,
      data: undefined,
    });
  }, []);

  return {
    mutationState,
    setLoading,
    setSuccess,
    setError,
    reset,
  };
}

// =============================================================================
// ASYNC OPERATION HOOK
// =============================================================================

/**
 * Hook for executing async operations with automatic loading state management
 */
export function useAsyncOperation<T = any>() {
  const { loadingState, setLoading, setError, setSuccess } = useLoadingState();
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (
    operation: (signal?: AbortSignal) => Promise<T>
  ): Promise<T | null> => {
    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);

    try {
      const result = await operation(signal);
      
      // Check if operation was aborted
      if (signal.aborted) {
        return null;
      }

      setSuccess();
      return result;
    } catch (error: any) {
      // Don't set error if operation was aborted
      if (signal.aborted) {
        return null;
      }

      setError(error);
      return null;
    }
  }, [setLoading, setError, setSuccess]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    loadingState,
    execute,
    cancel,
  };
}

// =============================================================================
// BATCH LOADING STATE HOOK
// =============================================================================

/**
 * Hook for managing multiple loading states (useful for screens with multiple data sources)
 */
export function useBatchLoadingState(keys: string[]) {
  const [loadingStates, setLoadingStates] = useState<Record<string, LoadingState>>(() => {
    const initial: Record<string, LoadingState> = {};
    keys.forEach(key => {
      initial[key] = {
        isLoading: false,
        isError: false,
        error: undefined,
        isRefetching: false,
        isFetching: false,
      };
    });
    return initial;
  });

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: loading,
        isFetching: loading,
        isError: false,
        error: undefined,
      },
    }));
  }, []);

  const setError = useCallback((key: string, error: DataServiceError | string | null) => {
    const errorObj = typeof error === 'string' 
      ? { code: 'UNKNOWN_ERROR', message: error, timestamp: new Date().toISOString() } as DataServiceError
      : error;

    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: false,
        isFetching: false,
        isRefetching: false,
        isError: !!errorObj,
        error: errorObj || undefined,
      },
    }));
  }, []);

  const setSuccess = useCallback((key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        isLoading: false,
        isFetching: false,
        isRefetching: false,
        isError: false,
        error: undefined,
      },
    }));
  }, []);

  const reset = useCallback((key?: string) => {
    if (key) {
      setLoadingStates(prev => ({
        ...prev,
        [key]: {
          isLoading: false,
          isError: false,
          error: undefined,
          isRefetching: false,
          isFetching: false,
        },
      }));
    } else {
      // Reset all states
      setLoadingStates(prev => {
        const reset: Record<string, LoadingState> = {};
        Object.keys(prev).forEach(k => {
          reset[k] = {
            isLoading: false,
            isError: false,
            error: undefined,
            isRefetching: false,
            isFetching: false,
          };
        });
        return reset;
      });
    }
  }, []);

  // Computed states
  const isAnyLoading = Object.values(loadingStates).some(state => state.isLoading);
  const isAnyError = Object.values(loadingStates).some(state => state.isError);
  const allErrors = Object.entries(loadingStates)
    .filter(([, state]) => state.isError && state.error)
    .map(([key, state]) => ({ key, error: state.error! }));

  return {
    loadingStates,
    setLoading,
    setError,
    setSuccess,
    reset,
    isAnyLoading,
    isAnyError,
    allErrors,
  };
}

// =============================================================================
// LOADING STATE UTILITIES
// =============================================================================

/**
 * Utility functions for working with loading states
 */
export const loadingStateUtils = {
  /**
   * Combines multiple loading states into a single state
   */
  combineLoadingStates: (states: LoadingState[]): LoadingState => {
    return {
      isLoading: states.some(state => state.isLoading),
      isError: states.some(state => state.isError),
      error: states.find(state => state.error)?.error,
      isRefetching: states.some(state => state.isRefetching),
      isFetching: states.some(state => state.isFetching),
    };
  },

  /**
   * Creates a loading state from a React Query state
   */
  fromReactQueryState: (queryState: {
    isLoading?: boolean;
    isError?: boolean;
    error?: any;
    isRefetching?: boolean;
    isFetching?: boolean;
  }): LoadingState => {
    return {
      isLoading: queryState.isLoading ?? false,
      isError: queryState.isError ?? false,
      error: queryState.error,
      isRefetching: queryState.isRefetching ?? false,
      isFetching: queryState.isFetching ?? false,
    };
  },

  /**
   * Checks if a loading state indicates the operation is in progress
   */
  isInProgress: (state: LoadingState): boolean => {
    return state.isLoading || (state.isFetching ?? false) || (state.isRefetching ?? false);
  },

  /**
   * Gets a user-friendly message for a loading state
   */
  getStateMessage: (state: LoadingState): string => {
    if (state.isError && state.error) {
      return state.error.message;
    }
    if (state.isRefetching) {
      return 'Refreshing...';
    }
    if (state.isLoading || state.isFetching) {
      return 'Loading...';
    }
    return '';
  },
};