/**
 * React Hook for Permission Error Handling
 * Provides easy integration of permission error handling in React components
 * Requirements: 5.4, 5.5 - Permission error handling with appropriate redirects
 */

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useOrganization } from '../contexts/OrganizationContext';
import { permissionErrorHandler, PermissionError, PermissionContext } from '../services/PermissionErrorHandler';
import { UserRole } from '../utils/roleUtils';

// Mock toast provider - replace with your actual toast implementation
interface ToastProvider {
  showError: (title: string, message: string) => void;
  showWarning: (title: string, message: string) => void;
  showInfo: (title: string, message: string) => void;
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
  };
};

export interface UsePermissionErrorHandlerReturn {
  handlePermissionError: (error: unknown, context?: Partial<PermissionContext>) => Promise<void>;
  validateRole: (requiredRole: UserRole, operation?: string) => void;
  validateOrganization: (requiredOrgId?: string, operation?: string) => void;
  isPermissionError: (error: unknown) => boolean;
  createPermissionContext: (operation: string, options?: Partial<PermissionContext>) => PermissionContext;
  currentRole?: UserRole;
  currentOrgId?: string;
  isAuthenticated: boolean;
}

/**
 * Hook for handling permission errors in React components
 */
export function usePermissionErrorHandler(): UsePermissionErrorHandlerReturn {
  const navigation = useNavigation();
  const { profile } = useAuth();
  const { activeMembership } = useOrganization();
  const toast = useToast();

  const currentRole = activeMembership?.role as UserRole | undefined;
  const currentOrgId = activeMembership?.org_id;
  const isAuthenticated = !!profile;

  const showToast = useCallback((title: string, message: string, type: 'error' | 'warning' | 'info' = 'error') => {
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
    }
  }, [toast]);

  const handlePermissionError = useCallback(async (
    error: unknown,
    context: Partial<PermissionContext> = {}
  ): Promise<void> => {
    if (!permissionErrorHandler.isPermissionError(error)) {
      // Not a permission error, don't handle it here
      return;
    }

    const fullContext: PermissionContext = {
      operation: 'unknown_operation',
      currentRole,
      organizationId: currentOrgId,
      userId: profile?.id,
      ...context,
    };

    const permissionError = permissionErrorHandler.enhancePermissionError(error, fullContext);

    await permissionErrorHandler.handlePermissionError(permissionError, {
      navigation,
      showToast,
      fallbackScreen: 'Landing',
      preserveParams: false,
    });
  }, [navigation, showToast, currentRole, currentOrgId, profile?.id]);

  const validateRole = useCallback((
    requiredRole: UserRole,
    operation: string = 'operation'
  ): void => {
    try {
      permissionErrorHandler.validatePermission(requiredRole, currentRole, operation);
    } catch (error) {
      // Handle the validation error immediately
      handlePermissionError(error, {
        operation,
        requiredRole,
        currentRole,
      });
      throw error; // Re-throw so calling code knows validation failed
    }
  }, [currentRole, handlePermissionError]);

  const validateOrganization = useCallback((
    requiredOrgId?: string,
    operation: string = 'operation'
  ): void => {
    try {
      permissionErrorHandler.validateOrganizationAccess(currentOrgId, requiredOrgId, operation);
    } catch (error) {
      // Handle the validation error immediately
      handlePermissionError(error, {
        operation,
        organizationId: requiredOrgId,
      });
      throw error; // Re-throw so calling code knows validation failed
    }
  }, [currentOrgId, handlePermissionError]);

  const isPermissionError = useCallback((error: unknown): boolean => {
    return permissionErrorHandler.isPermissionError(error);
  }, []);

  const createPermissionContext = useCallback((
    operation: string,
    options: Partial<PermissionContext> = {}
  ): PermissionContext => {
    return permissionErrorHandler.createPermissionContext(operation, {
      currentRole,
      organizationId: currentOrgId,
      userId: profile?.id,
      ...options,
    });
  }, [currentRole, currentOrgId, profile?.id]);

  return {
    handlePermissionError,
    validateRole,
    validateOrganization,
    isPermissionError,
    createPermissionContext,
    currentRole,
    currentOrgId,
    isAuthenticated,
  };
}

/**
 * Hook for components that require specific role access
 */
export function useRequirePermission(
  requiredRole: UserRole,
  operation: string = 'access_component'
): {
  hasPermission: boolean;
  isLoading: boolean;
  error?: PermissionError;
} {
  const { currentRole, isAuthenticated, handlePermissionError, createPermissionContext } = usePermissionErrorHandler();
  const { isLoading } = useAuth();

  // Don't check permissions while still loading
  if (isLoading) {
    return {
      hasPermission: false,
      isLoading: true,
    };
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    const context = createPermissionContext(operation, { requiredRole });
    const error = permissionErrorHandler.enhancePermissionError(
      new Error('User not authenticated'),
      context
    );
    
    // Handle the error asynchronously
    handlePermissionError(error, context);
    
    return {
      hasPermission: false,
      isLoading: false,
      error,
    };
  }

  // Check role permission
  const hasPermission = currentRole === requiredRole || 
                       (requiredRole === 'member' && currentRole === 'officer'); // Officers can access member features

  if (!hasPermission) {
    const context = createPermissionContext(operation, { requiredRole, currentRole });
    const error = permissionErrorHandler.enhancePermissionError(
      new Error('Insufficient role privileges'),
      context
    );
    
    // Handle the error asynchronously
    handlePermissionError(error, context);
    
    return {
      hasPermission: false,
      isLoading: false,
      error,
    };
  }

  return {
    hasPermission: true,
    isLoading: false,
  };
}

/**
 * Hook for handling async operations with permission error handling
 */
export function usePermissionAwareOperation() {
  const { handlePermissionError, createPermissionContext } = usePermissionErrorHandler();

  const executeWithPermissionHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    context?: Partial<PermissionContext>
  ): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      const permissionContext = createPermissionContext(operationName, context);
      
      if (permissionErrorHandler.isPermissionError(error)) {
        await handlePermissionError(error, permissionContext);
      }
      
      // Re-throw the error so calling code can handle it appropriately
      throw error;
    }
  }, [handlePermissionError, createPermissionContext]);

  return {
    executeWithPermissionHandling,
  };
}