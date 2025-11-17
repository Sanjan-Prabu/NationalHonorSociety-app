import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { networkErrorHandler } from '../services/NetworkErrorHandler';
import ImagePerformanceMonitor from '../utils/imagePerformanceMonitor';
import Constants from 'expo-constants';
import SentryService from '../services/SentryService';

interface CachedUrl {
  url: string;
  expiresAt: Date;
}

interface UsePresignedUrlResult {
  generateUrl: (imagePath: string) => Promise<string>;
  cachedUrls: Map<string, CachedUrl>;
  loading: boolean;
  error: string | null;
  clearCache: () => number;
  batchGenerateUrls: (imagePaths: string[]) => Promise<Map<string, string>>;
  cleanupExpiredUrls: () => number;
  getCacheStats: () => {
    totalSize: number;
    validCount: number;
    expiredCount: number;
    hitRate: number;
  };
}

interface PresignedUrlResponse {
  presignedUrl: string;
  expiresAt: string;
}

interface PresignedUrlError {
  error: string;
  code: 'PERMISSION_DENIED' | 'IMAGE_NOT_FOUND' | 'INVALID_REQUEST' | 'SERVICE_UNAVAILABLE';
}

/**
 * Enhanced error types for presigned URL operations
 */
export enum PresignedUrlErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  SERVICE_ERROR = 'SERVICE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Enhanced error class for presigned URL operations
 */
class PresignedUrlErrorClass extends Error {
  public readonly type: PresignedUrlErrorType;
  public readonly isRetryable: boolean;
  public readonly userMessage: string;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;

  constructor(
    type: PresignedUrlErrorType,
    message: string,
    userMessage: string,
    isRetryable: boolean = false,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PresignedUrlError';
    this.type = type;
    this.isRetryable = isRetryable;
    this.userMessage = userMessage;
    this.originalError = originalError;
    this.context = context;
  }
}

// Export the class with the correct name
export { PresignedUrlErrorClass as PresignedUrlError };

/**
 * React hook for managing presigned URL generation and caching
 * Provides efficient caching and batch request capabilities for secure image viewing
 */
export const usePresignedUrl = (): UsePresignedUrlResult => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, CachedUrl>>(new Map());
  const pendingRequestsRef = useRef<Map<string, Promise<string>>>(new Map());
  const performanceMonitor = ImagePerformanceMonitor.getInstance();

  /**
   * Check if a cached URL is still valid (not expired)
   */
  const isCacheValid = useCallback((cachedUrl: CachedUrl): boolean => {
    return new Date() < cachedUrl.expiresAt;
  }, []);

  /**
   * Get cached URL if valid, otherwise return null
   */
  const getCachedUrl = useCallback((imagePath: string): string | null => {
    const startTime = performance.now();
    const cached = cacheRef.current.get(imagePath);
    
    if (cached && isCacheValid(cached)) {
      const responseTime = performance.now() - startTime;
      performanceMonitor.trackCacheOperation('hit', imagePath, responseTime);
      return cached.url;
    }

    // Remove expired cache entry
    if (cached) {
      cacheRef.current.delete(imagePath);
    }

    const responseTime = performance.now() - startTime;
    performanceMonitor.trackCacheOperation('miss', imagePath, responseTime);
    return null;
  }, [isCacheValid, performanceMonitor]);

  /**
   * Cache a presigned URL with expiration time and automatic cleanup
   */
  const cacheUrl = useCallback((imagePath: string, url: string, expiresAt: string): void => {
    const expirationDate = new Date(expiresAt);
    // Cache for slightly less time to account for network delays
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    const adjustedExpiration = new Date(expirationDate.getTime() - bufferTime);

    cacheRef.current.set(imagePath, {
      url,
      expiresAt: adjustedExpiration
    });

    // Set up automatic cleanup when URL expires
    const timeUntilExpiry = adjustedExpiration.getTime() - Date.now();
    if (timeUntilExpiry > 0) {
      setTimeout(() => {
        cacheRef.current.delete(imagePath);
      }, timeUntilExpiry);
    }
  }, []);

  /**
   * Validate image path format
   */
  const validateImagePath = useCallback((imagePath: string): void => {
    if (!imagePath || typeof imagePath !== 'string') {
      throw new PresignedUrlErrorClass(
        PresignedUrlErrorType.VALIDATION_ERROR,
        'Invalid image path provided',
        'Invalid image path. Please try again.',
        false,
        undefined,
        { imagePath }
      );
    }

    const trimmedPath = imagePath.trim();
    if (!trimmedPath) {
      throw new PresignedUrlErrorClass(
        PresignedUrlErrorType.VALIDATION_ERROR,
        'Empty image path provided',
        'Invalid image path. Please try again.',
        false,
        undefined,
        { imagePath }
      );
    }

    if (!trimmedPath.startsWith('volunteer-hours/')) {
      throw new PresignedUrlErrorClass(
        PresignedUrlErrorType.VALIDATION_ERROR,
        'Invalid image path format',
        'Invalid image path format. Only volunteer hour images are supported.',
        false,
        undefined,
        { imagePath: trimmedPath }
      );
    }

    // Validate path structure: volunteer-hours/{org_id}/{user_id}/{filename}
    const pathParts = trimmedPath.split('/');
    if (pathParts.length !== 4) {
      throw new PresignedUrlErrorClass(
        PresignedUrlErrorType.VALIDATION_ERROR,
        'Invalid image path structure',
        'Invalid image path format. Please contact support.',
        false,
        undefined,
        { imagePath: trimmedPath, pathParts }
      );
    }

    // Validate UUID format for org_id and user_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(pathParts[1])) {
      throw new PresignedUrlErrorClass(
        PresignedUrlErrorType.VALIDATION_ERROR,
        'Invalid organization ID in path',
        'Invalid image path format. Please contact support.',
        false,
        undefined,
        { imagePath: trimmedPath, orgId: pathParts[1] }
      );
    }

    if (!uuidRegex.test(pathParts[2])) {
      throw new PresignedUrlErrorClass(
        PresignedUrlErrorType.VALIDATION_ERROR,
        'Invalid user ID in path',
        'Invalid image path format. Please contact support.',
        false,
        undefined,
        { imagePath: trimmedPath, userId: pathParts[2] }
      );
    }
  }, []);

  /**
   * Make API call to generate presigned URL with comprehensive error handling
   */
  const fetchPresignedUrl = useCallback(async (imagePath: string): Promise<string> => {
    const context = { operation: 'fetchPresignedUrl', imagePath };

    try {
      // Validate input
      validateImagePath(imagePath);

      // Check authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new PresignedUrlErrorClass(
          PresignedUrlErrorType.AUTHENTICATION_ERROR,
          'Failed to get session',
          'Authentication error. Please try logging out and back in.',
          false,
          sessionError,
          context
        );
      }

      if (!session?.access_token) {
        throw new PresignedUrlErrorClass(
          PresignedUrlErrorType.AUTHENTICATION_ERROR,
          'No valid session found',
          'You must be logged in to view images. Please log in and try again.',
          false,
          undefined,
          context
        );
      }

      // Execute request with retry logic and network awareness
      return await networkErrorHandler.executeWithRetry(
        async () => {
          try {
            const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || Constants.expoConfig?.extra?.SUPABASE_URL || 'https://lncrggkgvstvlmrlykpi.supabase.co';
            const supabaseKey = Constants.expoConfig?.extra?.supabaseAnonKey || Constants.expoConfig?.extra?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuY3JnZ2tndnN0dmxtcmx5a3BpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTc1OTksImV4cCI6MjA3MzgzMzU5OX0.m605pLqr_Ie9a8jPT18MlPFH8CWRJArZTddABiSq5Yc';
            
            const response = await fetch(`${supabaseUrl}/functions/v1/generate-presigned-url`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': supabaseKey
              },
              body: JSON.stringify({ imagePath: imagePath.trim() }),
              signal: AbortSignal.timeout(15000) // 15 second timeout
            });

            if (!response.ok) {
              let errorData: any;
              try {
                errorData = await response.json();
              } catch (parseError) {
                throw new PresignedUrlErrorClass(
                  PresignedUrlErrorType.SERVICE_ERROR,
                  `HTTP ${response.status} - Failed to parse error response`,
                  'Unable to load image. Please try again later.',
                  true,
                  parseError as Error,
                  { ...context, status: response.status }
                );
              }

              // Map HTTP status codes to appropriate error types
              switch (response.status) {
                case 401:
                  throw new PresignedUrlErrorClass(
                    PresignedUrlErrorType.AUTHENTICATION_ERROR,
                    'Authentication failed',
                    'Authentication expired. Please log out and back in.',
                    false,
                    undefined,
                    { ...context, errorData }
                  );
                case 403:
                  throw new PresignedUrlErrorClass(
                    PresignedUrlErrorType.PERMISSION_ERROR,
                    'Permission denied',
                    errorData.error || 'You don\'t have permission to view this image.',
                    false,
                    undefined,
                    { ...context, errorData }
                  );
                case 404:
                  throw new PresignedUrlErrorClass(
                    PresignedUrlErrorType.NOT_FOUND_ERROR,
                    'Image not found',
                    'The requested image could not be found.',
                    false,
                    undefined,
                    { ...context, errorData }
                  );
                case 429:
                  throw new PresignedUrlErrorClass(
                    PresignedUrlErrorType.SERVICE_ERROR,
                    'Rate limit exceeded',
                    'Too many requests. Please wait a moment and try again.',
                    true,
                    undefined,
                    { ...context, errorData }
                  );
                case 500:
                case 502:
                case 503:
                case 504:
                  throw new PresignedUrlErrorClass(
                    PresignedUrlErrorType.SERVICE_ERROR,
                    'Server error',
                    'Service temporarily unavailable. Please try again later.',
                    true,
                    undefined,
                    { ...context, status: response.status, errorData }
                  );
                default:
                  throw new PresignedUrlErrorClass(
                    PresignedUrlErrorType.SERVICE_ERROR,
                    `HTTP ${response.status}`,
                    errorData.error || 'Unable to load image. Please try again later.',
                    response.status >= 500,
                    undefined,
                    { ...context, status: response.status, errorData }
                  );
              }
            }

            let data: PresignedUrlResponse;
            try {
              data = await response.json();
            } catch (parseError) {
              throw new PresignedUrlErrorClass(
                PresignedUrlErrorType.SERVICE_ERROR,
                'Failed to parse response',
                'Invalid response from server. Please try again.',
                true,
                parseError as Error,
                context
              );
            }

            // Validate response data
            if (!data.presignedUrl || !data.expiresAt) {
              throw new PresignedUrlErrorClass(
                PresignedUrlErrorType.SERVICE_ERROR,
                'Invalid response format',
                'Invalid response from server. Please try again.',
                true,
                undefined,
                { ...context, data }
              );
            }

            // Validate URL format
            try {
              new URL(data.presignedUrl);
            } catch (urlError) {
              throw new PresignedUrlErrorClass(
                PresignedUrlErrorType.SERVICE_ERROR,
                'Invalid URL in response',
                'Invalid image URL received. Please try again.',
                true,
                urlError as Error,
                { ...context, presignedUrl: data.presignedUrl }
              );
            }

            // Cache the URL
            cacheUrl(imagePath, data.presignedUrl, data.expiresAt);

            // Track successful generation
            performanceMonitor.trackCacheOperation('generate', imagePath);
            
            SentryService.addBreadcrumb(
              'Presigned URL generated successfully',
              'image.render',
              'info',
              { imagePath }
            );

            return data.presignedUrl;
          } catch (error) {
            if (error instanceof PresignedUrlErrorClass) {
              throw error;
            }

            // Handle fetch-specific errors
            if (error instanceof TypeError && error.message.includes('fetch')) {
              throw new PresignedUrlErrorClass(
                PresignedUrlErrorType.NETWORK_ERROR,
                'Network request failed',
                'Network error. Please check your connection and try again.',
                true,
                error,
                context
              );
            }

            // Handle timeout errors
            if (error instanceof Error && error.name === 'AbortError') {
              throw new PresignedUrlErrorClass(
                PresignedUrlErrorType.TIMEOUT_ERROR,
                'Request timed out',
                'Request timed out. Please check your connection and try again.',
                true,
                error,
                context
              );
            }

            // Handle unknown errors
            throw new PresignedUrlErrorClass(
              PresignedUrlErrorType.UNKNOWN_ERROR,
              'Unexpected error',
              'An unexpected error occurred. Please try again.',
              true,
              error as Error,
              context
            );
          }
        },
        'generate_presigned_url',
        {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 5000,
          timeoutMs: 15000
        }
      );
    } catch (error) {
      if (error instanceof PresignedUrlErrorClass) {
        console.error('Presigned URL generation error:', error.message, error.context);
        
        SentryService.addBreadcrumb(
          'Presigned URL generation failed',
          'image.render',
          'error',
          { imagePath, errorType: error.type, errorMessage: error.message }
        );
        
        throw error;
      }

      console.error('Unexpected presigned URL error:', error);
      
      SentryService.addBreadcrumb(
        'Presigned URL unexpected error',
        'image.render',
        'error',
        { imagePath, error: error instanceof Error ? error.message : 'Unknown error' }
      );
      
      throw new PresignedUrlErrorClass(
        PresignedUrlErrorType.UNKNOWN_ERROR,
        'Unexpected error',
        'Failed to generate presigned URL. Please try again.',
        true,
        error as Error,
        context
      );
    }
  }, [cacheUrl, validateImagePath]);

  /**
   * Generate a presigned URL for a single image path with enhanced error handling
   * Uses caching and deduplication to avoid redundant requests
   */
  const generateUrl = useCallback(async (imagePath: string): Promise<string> => {
    try {
      if (!imagePath) {
        throw new PresignedUrlErrorClass(
          PresignedUrlErrorType.VALIDATION_ERROR,
          'Image path is required',
          'Image path is required',
          false
        );
      }

      // Check cache first
      const cachedUrl = getCachedUrl(imagePath);
      if (cachedUrl) {
        return cachedUrl;
      }

      // Check if there's already a pending request for this path
      const pendingRequest = pendingRequestsRef.current.get(imagePath);
      if (pendingRequest) {
        return pendingRequest;
      }

      // Create new request
      setLoading(true);
      setError(null);

      const request = fetchPresignedUrl(imagePath)
        .finally(() => {
          // Clean up pending request
          pendingRequestsRef.current.delete(imagePath);
          setLoading(false);
        });

      // Store pending request to avoid duplicates
      pendingRequestsRef.current.set(imagePath, request);

      try {
        const url = await request;
        return url;
      } catch (error) {
        let errorMessage: string;

        if (error instanceof PresignedUrlErrorClass) {
          errorMessage = error.userMessage;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        } else {
          errorMessage = 'Failed to generate presigned URL';
        }

        setError(errorMessage);
        throw error;
      }
    } catch (error) {
      if (error instanceof PresignedUrlErrorClass) {
        setError(error.userMessage);
        throw error;
      }

      const errorMessage = 'An unexpected error occurred while loading the image';
      setError(errorMessage);
      throw new PresignedUrlErrorClass(
        PresignedUrlErrorType.UNKNOWN_ERROR,
        'Unexpected error in generateUrl',
        errorMessage,
        true,
        error as Error,
        { imagePath }
      );
    }
  }, [getCachedUrl, fetchPresignedUrl]);

  /**
   * Generate presigned URLs for multiple image paths in batch with enhanced error handling
   * More efficient than individual requests when loading lists
   */
  const batchGenerateUrls = useCallback(async (imagePaths: string[]): Promise<Map<string, string>> => {
    try {
      if (!Array.isArray(imagePaths)) {
        throw new PresignedUrlErrorClass(
          PresignedUrlErrorType.VALIDATION_ERROR,
          'Invalid image paths array',
          'Invalid input provided',
          false,
          undefined,
          { imagePaths }
        );
      }

      const results = new Map<string, string>();
      const uncachedPaths: string[] = [];
      const errors: string[] = [];

      // Validate and filter paths
      const validPaths = imagePaths.filter(path => {
        try {
          validateImagePath(path);
          return true;
        } catch (error) {
          if (error instanceof PresignedUrlErrorClass) {
            errors.push(`${path}: ${error.userMessage}`);
          } else {
            errors.push(`${path}: Invalid path format`);
          }
          return false;
        }
      });

      if (validPaths.length === 0) {
        if (errors.length > 0) {
          throw new PresignedUrlErrorClass(
            PresignedUrlErrorType.VALIDATION_ERROR,
            'No valid image paths provided',
            'No valid image paths found',
            false,
            undefined,
            { errors }
          );
        }
        return results;
      }

      // First, check cache for all valid paths
      for (const path of validPaths) {
        const cachedUrl = getCachedUrl(path);
        if (cachedUrl) {
          results.set(path, cachedUrl);
        } else {
          uncachedPaths.push(path);
        }
      }

      // If all URLs were cached, return immediately
      if (uncachedPaths.length === 0) {
        return results;
      }

      setLoading(true);
      setError(null);

      try {
        // Generate URLs for uncached paths with controlled concurrency
        const maxConcurrent = 5; // Limit concurrent requests
        const batches: string[][] = [];

        for (let i = 0; i < uncachedPaths.length; i += maxConcurrent) {
          batches.push(uncachedPaths.slice(i, i + maxConcurrent));
        }

        for (const batch of batches) {
          const promises = batch.map(async (path) => {
            try {
              const url = await fetchPresignedUrl(path);
              return { path, url, success: true, error: null };
            } catch (error) {
              const errorMessage = error instanceof PresignedUrlErrorClass
                ? error.userMessage
                : 'Failed to generate URL';
              console.error(`Failed to generate URL for ${path}:`, error);
              return { path, url: '', success: false, error: errorMessage };
            }
          });

          const responses = await Promise.allSettled(promises);

          responses.forEach((response) => {
            if (response.status === 'fulfilled') {
              if (response.value.success) {
                results.set(response.value.path, response.value.url);
              } else {
                errors.push(`${response.value.path}: ${response.value.error}`);
              }
            } else {
              errors.push(`Request failed: ${response.reason}`);
            }
          });

          // Small delay between batches to avoid overwhelming the server
          if (batches.indexOf(batch) < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // Set error if some requests failed but don't throw (partial success is acceptable)
        if (errors.length > 0 && results.size === 0) {
          const errorMessage = `Failed to generate URLs: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`;
          setError(errorMessage);
        } else if (errors.length > 0) {
          console.warn('Some URL generation requests failed:', errors);
        }

        return results;
      } catch (error) {
        const errorMessage = error instanceof PresignedUrlErrorClass
          ? error.userMessage
          : 'Failed to generate presigned URLs';
        setError(errorMessage);
        throw error;
      } finally {
        setLoading(false);
      }
    } catch (error) {
      if (error instanceof PresignedUrlErrorClass) {
        setError(error.userMessage);
        throw error;
      }

      const errorMessage = 'An unexpected error occurred while loading images';
      setError(errorMessage);
      throw new PresignedUrlErrorClass(
        PresignedUrlErrorType.UNKNOWN_ERROR,
        'Unexpected error in batchGenerateUrls',
        errorMessage,
        true,
        error as Error,
        { imagePaths }
      );
    }
  }, [getCachedUrl, fetchPresignedUrl, validateImagePath]);

  /**
   * Clear expired URLs from cache
   */
  const cleanupExpiredUrls = useCallback(() => {
    const now = new Date();
    const expiredKeys: string[] = [];
    
    cacheRef.current.forEach((cachedUrl, key) => {
      if (now >= cachedUrl.expiresAt) {
        expiredKeys.push(key);
      }
    });
    
    expiredKeys.forEach(key => {
      cacheRef.current.delete(key);
    });
    
    return expiredKeys.length;
  }, []);

  /**
   * Clear all cached URLs
   */
  const clearCache = useCallback(() => {
    const size = cacheRef.current.size;
    cacheRef.current.clear();
    return size;
  }, []);

  /**
   * Get cache statistics for performance monitoring
   */
  const getCacheStats = useCallback(() => {
    const now = new Date();
    let validCount = 0;
    let expiredCount = 0;
    
    cacheRef.current.forEach((cachedUrl) => {
      if (now < cachedUrl.expiresAt) {
        validCount++;
      } else {
        expiredCount++;
      }
    });
    
    return {
      totalSize: cacheRef.current.size,
      validCount,
      expiredCount,
      hitRate: validCount / Math.max(1, cacheRef.current.size),
    };
  }, []);

  // Periodic cache cleanup
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const cleanedCount = cleanupExpiredUrls();
      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired presigned URLs from cache`);
      }
    }, 5 * 60 * 1000); // Clean up every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, [cleanupExpiredUrls]);

  return {
    generateUrl,
    cachedUrls: cacheRef.current,
    loading,
    error,
    clearCache,
    batchGenerateUrls,
    cleanupExpiredUrls,
    getCacheStats
  };
};

/**
 * Get user-friendly error message from PresignedUrlError
 */
export const getPresignedUrlErrorMessage = (error: unknown): string => {
  if (error instanceof PresignedUrlErrorClass) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    // Handle common error patterns
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'Network error. Please check your connection and try again.';
    }

    if (message.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You don\'t have permission to view this image.';
    }

    if (message.includes('not found')) {
      return 'The requested image could not be found.';
    }

    return error.message;
  }

  return 'Unable to load image. Please try again later.';
};

/**
 * Check if a presigned URL error is retryable
 */
export const isPresignedUrlErrorRetryable = (error: unknown): boolean => {
  if (error instanceof PresignedUrlErrorClass) {
    return error.isRetryable;
  }

  // Default retry logic for non-PresignedUrlError instances
  return networkErrorHandler.isRetryableError(error as Error);
};

export default usePresignedUrl;