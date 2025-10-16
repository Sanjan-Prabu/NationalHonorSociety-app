/**
 * Permission and Authorization Error Handler
 * Implements comprehensive permission error detection and handling with appropriate redirects
 * Requirements: 5.4, 5.5 - Permission error handling and user-friendly messages
 */

import { NavigationProp } from '@react-navigation/native';
import { DataServiceError } from '../types/dataService';
import { UserRole } from '../utils/roleUtils';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface PermissionError extends DataServiceError {
  code: 'PERMISSION_DENIED' | 'ROLE_INSUFFICIENT' | 'ORGANIZATION_ACCESS_DENIED' | 'SESSION_EXPIRED';
  requiredRole?: UserRole;
  currentRole?: UserRole;
  organizationId?: string;
  action?: string;
}

export interface PermissionContext {
  operation: string;
  requiredRole?: UserRole;
  currentRole?: UserRole;
  organizationId?: string;
  userId?: string;
  resource?: string;
}

export interface RedirectConfig {
  navigation: NavigationProp<any>;
  showToast?: (title: string, message: string, type?: 'error' | 'warning' | 'info') => void;
  fallbackScreen?: string;
  preserveParams?: boolean;
}

// =============================================================================
// PERMISSION ERROR HANDLER CLASS
// =============================================================================

export class PermissionErrorHandler {
  private static instance: PermissionErrorHandler;

  private constructor() {}

  public static getInstance(): PermissionErrorHandler {
    if (!PermissionErrorHandler.instance) {
      PermissionErrorHandler.instance = new PermissionErrorHandler();
    }
    return PermissionErrorHandler.instance;
  }

  // =============================================================================
  // ERROR DETECTION AND CLASSIFICATION
  // =============================================================================

  public isPermissionError(error: unknown): boolean {
    if (!error) return false;

    // Check for explicit permission error codes
    if (typeof error === 'object' && 'code' in error) {
      const code = (error as any).code;
      return code === 'PERMISSION_DENIED' || 
             code === 'ROLE_INSUFFICIENT' || 
             code === 'ORGANIZATION_ACCESS_DENIED' ||
             code === 'SESSION_EXPIRED' ||
             code === 'PGRST301'; // Supabase permission denied
    }

    // Check error message for permission-related keywords
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    return message.includes('permission') ||
           message.includes('unauthorized') ||
           message.includes('forbidden') ||
           message.includes('access denied') ||
           message.includes('insufficient privileges') ||
           message.includes('role') ||
           message.includes('not allowed') ||
           message.includes('authentication required') ||
           message.includes('session expired') ||
           message.includes('token expired') ||
           message.includes('invalid token');
  }

  public isRoleError(error: unknown): boolean {
    if (!error) return false;

    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    return message.includes('role') ||
           message.includes('officer') ||
           message.includes('member') ||
           message.includes('insufficient privileges') ||
           message.includes('access level');
  }

  public isOrganizationError(error: unknown): boolean {
    if (!error) return false;

    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    return message.includes('organization') ||
           message.includes('org_id') ||
           message.includes('organization access') ||
           message.includes('wrong organization');
  }

  public isSessionError(error: unknown): boolean {
    if (!error) return false;

    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    
    return message.includes('session') ||
           message.includes('token expired') ||
           message.includes('authentication required') ||
           message.includes('invalid token') ||
           message.includes('jwt');
  }

  // =============================================================================
  // ERROR ENHANCEMENT AND CLASSIFICATION
  // =============================================================================

  public enhancePermissionError(
    error: unknown,
    context: PermissionContext
  ): PermissionError {
    const baseError = this.createBasePermissionError(error, context);
    
    // Classify the specific type of permission error
    if (this.isSessionError(error)) {
      return {
        ...baseError,
        code: 'SESSION_EXPIRED',
        message: 'Your session has expired. Please log in again to continue.',
      };
    }

    if (this.isRoleError(error)) {
      return {
        ...baseError,
        code: 'ROLE_INSUFFICIENT',
        message: this.getRoleErrorMessage(context),
        requiredRole: context.requiredRole,
        currentRole: context.currentRole,
      };
    }

    if (this.isOrganizationError(error)) {
      return {
        ...baseError,
        code: 'ORGANIZATION_ACCESS_DENIED',
        message: 'You do not have access to this organization or the organization data.',
        organizationId: context.organizationId,
      };
    }

    // Default permission denied
    return {
      ...baseError,
      code: 'PERMISSION_DENIED',
      message: this.getGenericPermissionMessage(context),
    };
  }

  private createBasePermissionError(
    error: unknown,
    context: PermissionContext
  ): PermissionError {
    const originalMessage = error instanceof Error ? error.message : String(error);
    
    return {
      code: 'PERMISSION_DENIED',
      message: originalMessage,
      details: {
        originalError: originalMessage,
        operation: context.operation,
        requiredRole: context.requiredRole,
        currentRole: context.currentRole,
        organizationId: context.organizationId,
        userId: context.userId,
        resource: context.resource,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    };
  }

  // =============================================================================
  // ERROR MESSAGE GENERATION
  // =============================================================================

  private getRoleErrorMessage(context: PermissionContext): string {
    const { operation, requiredRole, currentRole } = context;
    
    if (requiredRole && currentRole) {
      return `This ${operation} requires ${requiredRole} privileges. You are currently logged in as a ${currentRole}.`;
    }
    
    if (requiredRole) {
      return `This ${operation} requires ${requiredRole} privileges. Please contact an administrator if you believe this is an error.`;
    }
    
    return `You do not have sufficient privileges to perform this ${operation}.`;
  }

  private getGenericPermissionMessage(context: PermissionContext): string {
    const { operation, resource } = context;
    
    if (resource) {
      return `You do not have permission to access ${resource}. Please contact an administrator if you believe this is an error.`;
    }
    
    return `You do not have permission to perform this ${operation}. Please contact an administrator if you believe this is an error.`;
  }

  // =============================================================================
  // REDIRECT HANDLING
  // =============================================================================

  public async handlePermissionError(
    error: PermissionError,
    redirectConfig: RedirectConfig
  ): Promise<void> {
    const { navigation, showToast, fallbackScreen = 'Landing', preserveParams = false } = redirectConfig;

    // Show user-friendly error message
    if (showToast) {
      this.showPermissionErrorToast(error, showToast);
    }

    // Log the error for debugging
    this.logPermissionError(error);

    // Determine appropriate redirect based on error type
    const redirectTarget = this.getRedirectTarget(error, fallbackScreen);
    
    try {
      if (redirectTarget === 'Landing') {
        // Reset navigation stack to landing page
        navigation.reset({
          index: 0,
          routes: [{ name: 'Landing' }],
        });
      } else if (redirectTarget === 'RoleBasedRoot') {
        // Redirect to appropriate role-based root
        const rootScreen = this.getRoleBasedRoot(error.currentRole);
        navigation.reset({
          index: 0,
          routes: [{ name: rootScreen }],
        });
      } else {
        // Navigate to specific screen
        if (preserveParams && navigation.getState().routes.length > 0) {
          const currentRoute = navigation.getState().routes[navigation.getState().index];
          navigation.navigate(redirectTarget as never, currentRoute.params as never);
        } else {
          navigation.navigate(redirectTarget as never);
        }
      }
    } catch (navigationError) {
      console.error('Navigation error during permission handling:', navigationError);
      
      // Fallback to landing page if navigation fails
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Landing' }],
        });
      } catch (fallbackError) {
        console.error('Fallback navigation also failed:', fallbackError);
      }
    }
  }

  private getRedirectTarget(error: PermissionError, fallbackScreen: string): string {
    switch (error.code) {
      case 'SESSION_EXPIRED':
        return 'Landing';
      
      case 'ROLE_INSUFFICIENT':
        return 'RoleBasedRoot';
      
      case 'ORGANIZATION_ACCESS_DENIED':
        return 'RoleBasedRoot';
      
      case 'PERMISSION_DENIED':
      default:
        return fallbackScreen;
    }
  }

  private getRoleBasedRoot(currentRole?: UserRole): string {
    switch (currentRole) {
      case 'officer':
        return 'OfficerRoot';
      case 'member':
        return 'MemberRoot';
      default:
        return 'Landing';
    }
  }

  // =============================================================================
  // USER FEEDBACK
  // =============================================================================

  private showPermissionErrorToast(
    error: PermissionError,
    showToast: (title: string, message: string, type?: 'error' | 'warning' | 'info') => void
  ): void {
    const { title, message, type } = this.getToastContent(error);
    showToast(title, message, type);
  }

  private getToastContent(error: PermissionError): {
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
  } {
    switch (error.code) {
      case 'SESSION_EXPIRED':
        return {
          title: 'Session Expired',
          message: 'Your session has expired. Please log in again.',
          type: 'warning',
        };
      
      case 'ROLE_INSUFFICIENT':
        return {
          title: 'Access Denied',
          message: error.message,
          type: 'error',
        };
      
      case 'ORGANIZATION_ACCESS_DENIED':
        return {
          title: 'Organization Access Denied',
          message: 'You do not have access to this organization.',
          type: 'error',
        };
      
      case 'PERMISSION_DENIED':
      default:
        return {
          title: 'Permission Denied',
          message: error.message,
          type: 'error',
        };
    }
  }

  // =============================================================================
  // PERMISSION VALIDATION
  // =============================================================================

  public validatePermission(
    requiredRole: UserRole,
    currentRole?: UserRole,
    operation: string = 'operation'
  ): void {
    if (!currentRole) {
      throw this.enhancePermissionError(
        new Error('User not authenticated'),
        {
          operation,
          requiredRole,
          currentRole,
        }
      );
    }

    if (currentRole !== requiredRole && requiredRole === 'officer') {
      throw this.enhancePermissionError(
        new Error('Insufficient role privileges'),
        {
          operation,
          requiredRole,
          currentRole,
        }
      );
    }
  }

  public validateOrganizationAccess(
    userOrgId?: string,
    requiredOrgId?: string,
    operation: string = 'operation'
  ): void {
    if (!userOrgId || !requiredOrgId) {
      throw this.enhancePermissionError(
        new Error('Organization context missing'),
        {
          operation,
          organizationId: requiredOrgId,
        }
      );
    }

    if (userOrgId !== requiredOrgId) {
      throw this.enhancePermissionError(
        new Error('Organization access denied'),
        {
          operation,
          organizationId: requiredOrgId,
        }
      );
    }
  }

  // =============================================================================
  // LOGGING AND MONITORING
  // =============================================================================

  private logPermissionError(error: PermissionError): void {
    if (__DEV__) {
      console.error('[PermissionErrorHandler] Permission error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp,
      });
    }

    // In production, you might want to send to analytics/monitoring service
    // TODO: Implement production error reporting service integration
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  public createPermissionContext(
    operation: string,
    options: Partial<PermissionContext> = {}
  ): PermissionContext {
    return {
      operation,
      ...options,
    };
  }

  public isRecoverablePermissionError(error: PermissionError): boolean {
    // Session errors are recoverable by re-authentication
    return error.code === 'SESSION_EXPIRED';
  }

  public getRecoveryAction(error: PermissionError): string {
    switch (error.code) {
      case 'SESSION_EXPIRED':
        return 'Please log in again to continue.';
      
      case 'ROLE_INSUFFICIENT':
        return 'Contact an administrator to request elevated privileges.';
      
      case 'ORGANIZATION_ACCESS_DENIED':
        return 'Ensure you are accessing data from your organization.';
      
      case 'PERMISSION_DENIED':
      default:
        return 'Contact an administrator if you believe this is an error.';
    }
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const permissionErrorHandler = PermissionErrorHandler.getInstance();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

export function createPermissionError(
  message: string,
  context: PermissionContext
): PermissionError {
  return permissionErrorHandler.enhancePermissionError(new Error(message), context);
}

export function validateRole(
  requiredRole: UserRole,
  currentRole?: UserRole,
  operation: string = 'operation'
): void {
  permissionErrorHandler.validatePermission(requiredRole, currentRole, operation);
}

export function validateOrganization(
  userOrgId?: string,
  requiredOrgId?: string,
  operation: string = 'operation'
): void {
  permissionErrorHandler.validateOrganizationAccess(userOrgId, requiredOrgId, operation);
}