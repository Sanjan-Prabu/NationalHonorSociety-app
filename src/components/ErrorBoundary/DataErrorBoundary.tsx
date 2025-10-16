/**
 * Data Error Boundary Component
 * Provides graceful error handling for data-related errors
 */

import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DataServiceError } from '../../types/dataService';

// =============================================================================
// TYPES
// =============================================================================

interface DataErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface DataErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

// =============================================================================
// ERROR BOUNDARY COMPONENT
// =============================================================================

export class DataErrorBoundary extends Component<DataErrorBoundaryProps, DataErrorBoundaryState> {
  constructor(props: DataErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<DataErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Log error for monitoring
    console.error('[DataErrorBoundary] Caught error:', error);
    console.error('[DataErrorBoundary] Error info:', errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, you might want to send this to an error reporting service
    if (!__DEV__) {
      // TODO: Send to error reporting service
    }
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      // Default error UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          retry={this.retry}
        />
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// DEFAULT ERROR FALLBACK COMPONENT
// =============================================================================

interface DefaultErrorFallbackProps {
  error: Error;
  retry: () => void;
}

function DefaultErrorFallback({ error, retry }: DefaultErrorFallbackProps) {
  const getErrorMessage = (error: Error): string => {
    // Check if it's a DataServiceError
    if ('code' in error && 'timestamp' in error) {
      const dataError = error as unknown as DataServiceError;
      switch (dataError.code) {
        case 'NETWORK_ERROR':
          return 'Unable to connect to the server. Please check your internet connection and try again.';
        case 'PERMISSION_DENIED':
          return 'You don\'t have permission to access this data. Please contact your administrator.';
        case 'NOT_FOUND':
          return 'The requested data could not be found.';
        case 'VALIDATION_ERROR':
          return 'There was a problem with the data format. Please try again.';
        case 'DATABASE_ERROR':
          return 'There was a problem with the database. Please try again later.';
        default:
          return 'An unexpected error occurred. Please try again.';
      }
    }

    // Generic error message
    return 'Something went wrong. Please try again.';
  };

  const getErrorTitle = (error: Error): string => {
    if ('code' in error && 'timestamp' in error) {
      const dataError = error as unknown as DataServiceError;
      switch (dataError.code) {
        case 'NETWORK_ERROR':
          return 'Connection Problem';
        case 'PERMISSION_DENIED':
          return 'Access Denied';
        case 'NOT_FOUND':
          return 'Data Not Found';
        case 'VALIDATION_ERROR':
          return 'Invalid Data';
        case 'DATABASE_ERROR':
          return 'Server Error';
        default:
          return 'Error';
      }
    }

    return 'Oops!';
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{getErrorTitle(error)}</Text>
        <Text style={styles.message}>{getErrorMessage(error)}</Text>
        
        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text style={styles.debugTitle}>Debug Info:</Text>
            <Text style={styles.debugText}>{error.message}</Text>
            <Text style={styles.debugText}>{error.stack}</Text>
          </View>
        )}
        
        <TouchableOpacity style={styles.retryButton} onPress={retry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// =============================================================================
// QUERY ERROR BOUNDARY COMPONENT
// =============================================================================

/**
 * Specialized error boundary for React Query errors
 */
interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

export function QueryErrorBoundary({ children, fallback }: QueryErrorBoundaryProps) {
  return (
    <DataErrorBoundary
      fallback={fallback}
      onError={(error, errorInfo) => {
        // Log React Query specific errors
        console.error('[QueryErrorBoundary] React Query error:', error);
        
        // You might want to invalidate certain queries or clear cache
        // depending on the error type
      }}
    >
      {children}
    </DataErrorBoundary>
  );
}

// =============================================================================
// LOADING ERROR COMPONENT
// =============================================================================

/**
 * Component for displaying loading errors (not crashes)
 */
interface LoadingErrorProps {
  error: string | Error;
  retry?: () => void;
  title?: string;
}

export function LoadingError({ error, retry, title = 'Loading Error' }: LoadingErrorProps) {
  const errorMessage = typeof error === 'string' ? error : error.message;

  return (
    <View style={styles.loadingErrorContainer}>
      <Text style={styles.loadingErrorTitle}>{title}</Text>
      <Text style={styles.loadingErrorMessage}>{errorMessage}</Text>
      
      {retry && (
        <TouchableOpacity style={styles.retryButton} onPress={retry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  content: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    maxWidth: 400,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  debugInfo: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingErrorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingErrorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingErrorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
});

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Hook for handling errors in functional components
 */
export function useErrorHandler() {
  const handleError = (error: Error) => {
    console.error('[useErrorHandler] Error:', error);
    
    // You could trigger a toast notification, log to analytics, etc.
    // For now, we'll just log it
  };

  return { handleError };
}