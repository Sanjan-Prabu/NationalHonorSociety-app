/**
 * usePresignedUrl Hook Tests
 * Unit tests for presigned URL generation and caching logic
 */

import { renderHook, act } from '@testing-library/react-native';
import { usePresignedUrl, PresignedUrlError, PresignedUrlErrorType } from '../usePresignedUrl';
import { supabase } from '../../lib/supabaseClient';

// Mock dependencies
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn()
    }
  }
}));

jest.mock('../../services/NetworkErrorHandler', () => ({
  networkErrorHandler: {
    executeWithRetry: jest.fn((fn) => fn()),
    isRetryableError: jest.fn(() => true)
  }
}));

jest.mock('../../utils/imagePerformanceMonitor', () => ({
  default: {
    getInstance: () => ({
      trackCacheOperation: jest.fn()
    })
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('usePresignedUrl', () => {
  const mockSession = {
    access_token: 'test-token',
    user: { id: 'test-user-id' }
  };

  const validImagePath = 'volunteer-hours/12345678-1234-1234-1234-123456789012/87654321-4321-4321-4321-210987654321/1699234567890-a1b2c3.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    // Mock successful fetch response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        presignedUrl: 'https://test.r2.dev/signed-url',
        expiresAt: new Date(Date.now() + 3600000).toISOString()
      })
    });

    // Mock environment variables
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key';
  });

  describe('generateUrl', () => {
    it('should generate presigned URL successfully', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      let generatedUrl: string;
      await act(async () => {
        generatedUrl = await result.current.generateUrl(validImagePath);
      });

      expect(generatedUrl!).toBe('https://test.r2.dev/signed-url');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should return cached URL if available', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      // First call
      await act(async () => {
        await result.current.generateUrl(validImagePath);
      });

      // Second call should use cache
      await act(async () => {
        await result.current.generateUrl(validImagePath);
      });

      // Fetch should only be called once
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid image path', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      await act(async () => {
        await expect(result.current.generateUrl('invalid-path')).rejects.toThrow(PresignedUrlError);
      });

      expect(result.current.error).toContain('Invalid image path format');
    });

    it('should handle empty image path', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      await act(async () => {
        await expect(result.current.generateUrl('')).rejects.toThrow(PresignedUrlError);
      });

      expect(result.current.error).toContain('Image path is required');
    });

    it('should handle authentication error', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null
      });

      const { result } = renderHook(() => usePresignedUrl());

      await act(async () => {
        await expect(result.current.generateUrl(validImagePath)).rejects.toThrow(PresignedUrlError);
      });

      expect(result.current.error).toContain('You must be logged in');
    });

    it('should handle 403 permission denied', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          error: 'Permission denied',
          code: 'PERMISSION_DENIED'
        })
      });

      const { result } = renderHook(() => usePresignedUrl());

      await act(async () => {
        await expect(result.current.generateUrl(validImagePath)).rejects.toThrow(PresignedUrlError);
      });

      expect(result.current.error).toContain('Permission denied');
    });

    it('should handle 404 image not found', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({
          error: 'Image not found',
          code: 'IMAGE_NOT_FOUND'
        })
      });

      const { result } = renderHook(() => usePresignedUrl());

      await act(async () => {
        await expect(result.current.generateUrl(validImagePath)).rejects.toThrow(PresignedUrlError);
      });

      expect(result.current.error).toContain('The requested image could not be found');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network error'));

      const { result } = renderHook(() => usePresignedUrl());

      await act(async () => {
        await expect(result.current.generateUrl(validImagePath)).rejects.toThrow(PresignedUrlError);
      });

      expect(result.current.error).toContain('Network error');
    });

    it('should validate UUID format in image path', async () => {
      const invalidPath = 'volunteer-hours/invalid-org/invalid-user/file.jpg';
      const { result } = renderHook(() => usePresignedUrl());

      await act(async () => {
        await expect(result.current.generateUrl(invalidPath)).rejects.toThrow(PresignedUrlError);
      });

      expect(result.current.error).toContain('Invalid image path format');
    });
  });

  describe('batchGenerateUrls', () => {
    const validPaths = [
      'volunteer-hours/12345678-1234-1234-1234-123456789012/87654321-4321-4321-4321-210987654321/file1.jpg',
      'volunteer-hours/12345678-1234-1234-1234-123456789012/87654321-4321-4321-4321-210987654321/file2.jpg'
    ];

    it('should generate multiple URLs successfully', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      let urlMap: Map<string, string>;
      await act(async () => {
        urlMap = await result.current.batchGenerateUrls(validPaths);
      });

      expect(urlMap!.size).toBe(2);
      expect(urlMap!.get(validPaths[0])).toBe('https://test.r2.dev/signed-url');
      expect(urlMap!.get(validPaths[1])).toBe('https://test.r2.dev/signed-url');
    });

    it('should handle mixed valid and invalid paths', async () => {
      const mixedPaths = [
        validPaths[0],
        'invalid-path',
        validPaths[1]
      ];

      const { result } = renderHook(() => usePresignedUrl());

      let urlMap: Map<string, string>;
      await act(async () => {
        urlMap = await result.current.batchGenerateUrls(mixedPaths);
      });

      // Should only return URLs for valid paths
      expect(urlMap!.size).toBe(2);
      expect(urlMap!.has('invalid-path')).toBe(false);
    });

    it('should handle empty array', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      let urlMap: Map<string, string>;
      await act(async () => {
        urlMap = await result.current.batchGenerateUrls([]);
      });

      expect(urlMap!.size).toBe(0);
    });

    it('should handle invalid input type', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      await act(async () => {
        await expect(result.current.batchGenerateUrls('not-an-array' as any)).rejects.toThrow(PresignedUrlError);
      });
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      // Generate a URL to populate cache
      await act(async () => {
        await result.current.generateUrl(validImagePath);
      });

      expect(result.current.cachedUrls.size).toBe(1);

      // Clear cache
      let clearedCount: number;
      act(() => {
        clearedCount = result.current.clearCache();
      });

      expect(clearedCount!).toBe(1);
      expect(result.current.cachedUrls.size).toBe(0);
    });

    it('should cleanup expired URLs', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      // Mock expired URL response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          presignedUrl: 'https://test.r2.dev/signed-url',
          expiresAt: new Date(Date.now() - 1000).toISOString() // Expired 1 second ago
        })
      });

      // Generate URL with expired timestamp
      await act(async () => {
        await result.current.generateUrl(validImagePath);
      });

      // Cleanup expired URLs
      let cleanedCount: number;
      act(() => {
        cleanedCount = result.current.cleanupExpiredUrls();
      });

      expect(cleanedCount!).toBe(1);
    });

    it('should provide cache statistics', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      // Generate a URL
      await act(async () => {
        await result.current.generateUrl(validImagePath);
      });

      let stats: any;
      act(() => {
        stats = result.current.getCacheStats();
      });

      expect(stats!.totalSize).toBe(1);
      expect(stats!.validCount).toBe(1);
      expect(stats!.expiredCount).toBe(0);
      expect(stats!.hitRate).toBe(1);
    });
  });

  describe('error handling utilities', () => {
    it('should get user-friendly error message from PresignedUrlError', () => {
      const error = new PresignedUrlError(
        PresignedUrlErrorType.PERMISSION_ERROR,
        'Technical message',
        'User-friendly message',
        false
      );

      const message = require('../usePresignedUrl').getPresignedUrlErrorMessage(error);
      expect(message).toBe('User-friendly message');
    });

    it('should handle generic errors', () => {
      const error = new Error('Generic error');
      const message = require('../usePresignedUrl').getPresignedUrlErrorMessage(error);
      expect(message).toBe('Generic error');
    });

    it('should check if error is retryable', () => {
      const retryableError = new PresignedUrlError(
        PresignedUrlErrorType.NETWORK_ERROR,
        'Network error',
        'Network error',
        true
      );

      const isRetryable = require('../usePresignedUrl').isPresignedUrlErrorRetryable(retryableError);
      expect(isRetryable).toBe(true);
    });
  });
});