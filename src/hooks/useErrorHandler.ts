/**
 * Comprehensive Error Handler Hook
 * Provides unified error handling for React components with validation, permission, and network error support
 * Requirements: 4.1, 4.2, 4.3, 5.4, 5.5 - Comprehensive error handling
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { 
  errorReportingService, 
  ErrorReport, 
  ErrorContext 
} from '../services/ErrorReportingService';
import { 
  permissionErrorHandler, 
  PermissionError 
} from '../services/PermissionErrorHandler';
import { 
  networkErrorHandler 
} from '../services/NetworkErrorHandler';
import { 
  dataValidationService, 
  ValidationError 
} from '../services/DataValidationService';
import { DataServiceError } from '../types/dataService';

// Mock toast provider - replace with your actual toast implementation
interface ToastProvider {
  showError: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
  showSuccess: (title: string, message: string) => void;
}

// You'll need to implement or import your actual toast provider
const useToast = (): ToastProvider => {
  return {
    showError: (title: string, message: string) => {
      console.error(`${title}: ${message}`);
      // TODO: Replace with actual toast implementation
    },
    showWarning: (title: string, message: string) => {
      console.warn(`${title}: ${message}`);
      // TODO: Replace with actual toast implementation
    },
    showInfo: (title: string, message: string) => {
      console.info(`${title}: ${message}`);
      // TODO: Replace with actual toast implementation
    },
    showSuccess: (title: string, message: string) => {
      console.log(`${title}: ${message}`);
      // TODO: Replace with actual toast implementation
    },
  };
};

export interface UseErrorHandlerReturn {
  handleError: (error: unknown, context?: Partial<ErrorContext>) => Promise<string>;
  handleValidationError: (error: ValidationError, showToast?: boolean) => void;
  handlePermissionError: (error: PermissionError) => Promise<void>;
  handleNetworkError: (error: Error, context?: Partial<ErrorContext>) => Promise<void>;
  reportError: (error: unknown, context?: Partial<ErrorContext>) => string;
  submitFeedback: (reportId: string, feedback: string, rating?: number) => void;
  clearErrors: () => void;
  recentErrors: ErrorReport[];
  isOnline: boolean;
}

/**
 * Comprehensive error handler hook for React components
 */
export function useErrorHandler(componentName?: string): UseErrorHandlerReturn {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { profile } = useAuth();
  const { activeMembership } = useOrganization();
  const toast = useToast();
  const [recentErrors, setRecentErrors] = useState<ErrorReport[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Set user context for error reporting
  useEffect(() => {
    if (profile?.id) {
      errorReportingService.setUserContext(profile.id, activeMembership?.org_id);
    } else {
      errorReportingService.clearUserContext();
    }
  }, [profile?.id, activeMembership?.org_id]);

  // Monitor network state
  useEffect(() => {
    const unsubscribe = networkErrorHandler.addNetworkListener((state) => {
      setIsOnline(state.isConnected && state.isInternetReachable !== false);
    });

    return unsubscribe;
  }, []);

  // Update recent errors periodically
  useEffect(() => {
    const updateRecentErrors = () => {
      setRecentErrors(errorReportingService.getErrorReports(10));
    };

    updateRecentErrors();
    const interval = setInterval(updateRecentErrors, 5000);

    return () => clearInterval(interval);
  }, []);

  const showToast = useCallback((title: string, message: string, type: 'error' | 'warning' | 'info' | 'success' = 'error') => {
    switch (type) {
      case 'error':
        toast.showError(title, message);
        break;
      case 'warning':
        toast.showWarning(title, message);
        break;
      case 'info':
        toast.showInfo(title, message);
        break;
      case 'success':
        toast.showSuccess(title, message);
        break;
    }
  }, [toast]);

  const createErrorContext = useCallback((context: Partial<ErrorContext> = {}): ErrorContext => {
    return {
      component: componentName,
      networkState: isOnline ? 'online' : 'offline',
      ...context,
    };
  }, [componentName, isOnline]);

  const handleError = useCallback(async (
    error: unknown,
    context: Partial<ErrorContext> = {}
  ): Promise<string> => {
    const fullContext = createErrorContext(context);

    // Handle different types of errors
    if (permissionErrorHandler.isPermissionError(error)) {
      await handlePermissionError(error as PermissionError);
      return reportError(error, fullContext);
    }

    if (networkErrorHandler.isNetworkError(error)) {
      await handleNetworkError(error as Error, fullContext);
      return reportError(error, fullContext);
    }

    if (error && typeof error === 'object' && 'code' in error && (error as any).code === 'VALIDATION_ERROR') {
      handleValidationError(error as ValidationError, true);
      return reportError(error, fullContext);
    }

    // Generic error handling
    const reportId = reportError(error, fullContext);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    showToast('Error', errorMessage, 'error');

    return reportId;
  }, [createErrorContext, showToast]);

  const handleValidationError = useCallback((
    error: ValidationError,
    showToastMessage: boolean = true
  ): void => {
    // Report the validation error
    dataValidationService.reportValidationError(error);

    if (showToastMessage) {
      const message = error.field 
        ? `Validation error in field '${error.field}': ${error.message}`
        : error.message;
      
      showToast('Validation Error', message, 'warning');
    }
  }, [showToast]);

  const handlePermissionError = useCallback(async (error: PermissionError): Promise<void> => {
    try {
      await permissionErrorHandler.handlePermissionError(error, {
        navigation,
        showToast: (title, message, type) => showToast(title, message, type as any),
        fallbackScreen: 'Landing',
        preserveParams: false,
      });
    } catch (handlingError) {
      console.error('Error while handling permission error:', handlingError);
      showToast('System Error', 'An error occurred while handling the permission error.', 'error');
    }
  }, [navigation, showToast]);

  const handleNetworkError = useCallback(async (
    error: Error,
    context: Partial<ErrorContext> = {}
  ): Promise<void> => {
    const fullContext = createErrorContext({
      ...context,
      operation: context.operation || 'network_operation',
    });

    // Show appropriate message based on network state
    if (!isOnline) {
      showToast(
        'No Internet Connection',
        'Please check your internet connection and try again. Your request will be retried when connection is restored.',
        'warning'
      );
    } else {
      showToast(
        'Network Error',
        'A network error occurred. Please try again in a moment.',
        'error'
      );
    }

    // Report the network error
    errorReportingService.reportError(error, {
      category: 'network',
      context: fullContext,
    });
  }, [createErrorContext, isOnline, showToast]);

  const reportError = useCallback((
    error: unknown,
    context: Partial<ErrorContext> = {}
  ): string => {
    const fullContext = createErrorContext(context);
    
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    return errorReportingService.reportError(errorObj, {
      context: fullContext,
    });
  }, [createErrorContext]);

  const submitFeedback = useCallback((
    reportId: string,
    feedback: string,
    rating?: number
  ): void => {
    errorReportingService.submitUserFeedback(reportId, feedback, rating);
    showToast('Feedback Submitted', 'Thank you for your feedback!', 'success');
  }, [showToast]);

  const clearErrors = useCallback(() => {
    errorReportingService.clearErrorReports();
    setRecentErrors([]);
  }, []);

  return {
    handleError,
    handleValidationError,
    handlePermissionError,
    handleNetworkError,
    reportError,
    submitFeedback,
    clearErrors,
    recentErrors,
    isOnline,
  };
}

/**
 * Hook for handling async operations with comprehensive error handling
 */
export function useAsyncErrorHandler(componentName?: string) {
  const errorHandler = useErrorHandler(componentName);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Partial<ErrorContext>
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      await errorHandler.handleError(error, {
        ...context,
        operation: operationName,
      });
      return null;
    }
  }, [errorHandler]);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    context?: Partial<ErrorContext>
  ): Promise<T | null> => {
    try {
      return await networkErrorHandler.executeWithRetry(
        operation,
        `${componentName}.${operationName}`,
        { maxRetries }
      );
    } catch (error) {
      await errorHandler.handleError(error, {
        ...context,
        operation: operationName,
      });
      return null;
    }
  }, [errorHandler, componentName]);

  return {
    ...errorHandler,
    executeWithErrorHandling,
    executeWithRetry,
  };
}

/**
 * Hook for form validation with error handling
 */
export function useFormErrorHandler(componentName?: string) {
  const errorHandler = useErrorHandler(componentName);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateField = useCallback((
    fieldName: string,
    value: unknown,
    validationType: string
  ): boolean => {
    try {
      const result = dataValidationService.validateWithRules({ [fieldName]: value }, validationType);
      
      if (!result.isValid) {
        const fieldError = result.errors.find((error: any) => error.field === fieldName);
        if (fieldError) {
          setValidationErrors(prev => ({
            ...prev,
            [fieldName]: fieldError.message,
          }));
          return false;
        }
      }

      // Clear any existing error for this field
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });

      return true;
    } catch (error) {
      errorHandler.handleError(error, {
        operation: 'field_validation',
        userAction: `validate_${fieldName}`,
      });
      return false;
    }
  }, [errorHandler]);

  const validateForm = useCallback((
    formData: unknown,
    validationType: string
  ): boolean => {
    try {
      const result = dataValidationService.validateWithRules(formData, validationType);
      
      if (!result.isValid) {
        const fieldErrors: Record<string, string> = {};
        result.errors.forEach((error: any) => {
          if (error.field) {
            fieldErrors[error.field] = error.message;
          }
        });
        setValidationErrors(fieldErrors);
        return false;
      }

      setValidationErrors({});
      return true;
    } catch (error) {
      errorHandler.handleError(error, {
        operation: 'form_validation',
        userAction: 'validate_form',
      });
      return false;
    }
  }, [errorHandler]);

  const clearValidationErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  return {
    ...errorHandler,
    validateField,
    validateForm,
    validationErrors,
    clearValidationErrors,
  };
}