/**
 * R2 Image Upload Security Tests
 * Tests for organization isolation and permission verification
 */

import { usePresignedUrl } from '../../hooks/usePresignedUrl';
import { renderHook, act } from '@testing-library/react-native';

// Mock dependencies
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn()
    }
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('R2 Image Upload Security Tests', () => {
  const orgId1 = '12345678-1234-1234-1234-123456789012';
  const orgId2 = '87654321-4321-4321-4321-210987654321';
  const userId1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const userId2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key';
  });

  describe('Organization Isolation', () => {
    it('should prevent cross-organization image access', async () => {
      // Mock session for user in org1
      const mockSession = {
        access_token: 'test-token',
        user: { id: userId1 }
      };

      require('../../lib/supabaseClient').supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Mock 403 response for cross-org access attempt
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          error: 'You do not have permission to view this image',
          code: 'PERMISSION_DENIED'
        })
      });

      const { result } = renderHook(() => usePresignedUrl());

      // Try to access image from different organization
      const crossOrgImagePath = `volunteer-hours/${orgId2}/${userId2}/image.jpg`;

      await act(async () => {
        await expect(result.current.generateUrl(crossOrgImagePath)).rejects.toThrow();
      });

      expect(result.current.error).toContain('You do not have permission to view this image');
    });

    it('should allow same-organization image access for officers', async () => {
      // Mock session for officer in org1
      const mockSession = {
        access_token: 'officer-token',
        user: { id: userId1 }
      };

      require('../../lib/supabaseClient').supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Mock successful response for same-org officer access
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          presignedUrl: 'https://test.r2.dev/signed-url',
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        })
      });

      const { result } = renderHook(() => usePresignedUrl());

      // Officer accessing member image in same organization
      const sameOrgImagePath = `volunteer-hours/${orgId1}/${userId2}/image.jpg`;

      let presignedUrl: string;
      await act(async () => {
        presignedUrl = await result.current.generateUrl(sameOrgImagePath);
      });

      expect(presignedUrl!).toBe('https://test.r2.dev/signed-url');
      expect(result.current.error).toBe(null);
    });

    it('should allow users to access their own images', async () => {
      // Mock session for user
      const mockSession = {
        access_token: 'user-token',
        user: { id: userId1 }
      };

      require('../../lib/supabaseClient').supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Mock successful response for own image access
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          presignedUrl: 'https://test.r2.dev/signed-url',
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        })
      });

      const { result } = renderHook(() => usePresignedUrl());

      // User accessing their own image
      const ownImagePath = `volunteer-hours/${orgId1}/${userId1}/image.jpg`;

      let presignedUrl: string;
      await act(async () => {
        presignedUrl = await result.current.generateUrl(ownImagePath);
      });

      expect(presignedUrl!).toBe('https://test.r2.dev/signed-url');
      expect(result.current.error).toBe(null);
    });

    it('should prevent members from accessing other members images in same org', async () => {
      // Mock session for member
      const mockSession = {
        access_token: 'member-token',
        user: { id: userId1 }
      };

      require('../../lib/supabaseClient').supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Mock 403 response for member trying to access another member's image
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          error: 'You do not have permission to view this image',
          code: 'PERMISSION_DENIED'
        })
      });

      const { result } = renderHook(() => usePresignedUrl());

      // Member trying to access another member's image in same org
      const otherMemberImagePath = `volunteer-hours/${orgId1}/${userId2}/image.jpg`;

      await act(async () => {
        await expect(result.current.generateUrl(otherMemberImagePath)).rejects.toThrow();
      });

      expect(result.current.error).toContain('You do not have permission to view this image');
    });
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication', async () => {
      // Mock no session
      require('../../lib/supabaseClient').supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      });

      const { result } = renderHook(() => usePresignedUrl());

      const imagePath = `volunteer-hours/${orgId1}/${userId1}/image.jpg`;

      await act(async () => {
        await expect(result.current.generateUrl(imagePath)).rejects.toThrow();
      });

      expect(result.current.error).toContain('You must be logged in');
    });

    it('should reject requests with invalid tokens', async () => {
      // Mock session error
      require('../../lib/supabaseClient').supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Invalid token')
      });

      const { result } = renderHook(() => usePresignedUrl());

      const imagePath = `volunteer-hours/${orgId1}/${userId1}/image.jpg`;

      await act(async () => {
        await expect(result.current.generateUrl(imagePath)).rejects.toThrow();
      });

      expect(result.current.error).toContain('Authentication error');
    });

    it('should handle expired tokens', async () => {
      // Mock valid session initially
      const mockSession = {
        access_token: 'expired-token',
        user: { id: userId1 }
      };

      require('../../lib/supabaseClient').supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Mock 401 response for expired token
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          error: 'Token expired',
          code: 'INVALID_REQUEST'
        })
      });

      const { result } = renderHook(() => usePresignedUrl());

      const imagePath = `volunteer-hours/${orgId1}/${userId1}/image.jpg`;

      await act(async () => {
        await expect(result.current.generateUrl(imagePath)).rejects.toThrow();
      });

      expect(result.current.error).toContain('Authentication expired');
    });
  });

  describe('Input Validation Security', () => {
    beforeEach(() => {
      // Mock valid session
      const mockSession = {
        access_token: 'valid-token',
        user: { id: userId1 }
      };

      require('../../lib/supabaseClient').supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });
    });

    it('should reject malformed image paths', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      const malformedPaths = [
        '../../../etc/passwd',
        'volunteer-hours/../../../sensitive-file',
        'volunteer-hours/org/user/../../../other-file',
        'not-volunteer-hours/org/user/file.jpg',
        'volunteer-hours/org/user', // Missing filename
        'volunteer-hours/org', // Missing user and filename
        'volunteer-hours', // Missing org, user, and filename
      ];

      for (const path of malformedPaths) {
        await act(async () => {
          await expect(result.current.generateUrl(path)).rejects.toThrow();
        });
        expect(result.current.error).toContain('Invalid image path format');
      }
    });

    it('should reject non-UUID organization and user IDs', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      const invalidPaths = [
        'volunteer-hours/not-a-uuid/valid-user-id/file.jpg',
        'volunteer-hours/12345678-1234-1234-1234-123456789012/not-a-uuid/file.jpg',
        'volunteer-hours/invalid/invalid/file.jpg',
        'volunteer-hours/../../etc/passwd/file.jpg',
      ];

      for (const path of invalidPaths) {
        await act(async () => {
          await expect(result.current.generateUrl(path)).rejects.toThrow();
        });
        expect(result.current.error).toContain('Invalid image path format');
      }
    });

    it('should sanitize and validate input parameters', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      // Test various injection attempts
      const injectionAttempts = [
        'volunteer-hours/<script>alert("xss")</script>/user/file.jpg',
        'volunteer-hours/org/user/file.jpg; DROP TABLE users;',
        'volunteer-hours/org/user/file.jpg\x00hidden',
        'volunteer-hours/org/user/file.jpg\r\nHost: evil.com',
      ];

      for (const attempt of injectionAttempts) {
        await act(async () => {
          await expect(result.current.generateUrl(attempt)).rejects.toThrow();
        });
      }
    });
  });

  describe('Rate Limiting Security', () => {
    beforeEach(() => {
      // Mock valid session
      const mockSession = {
        access_token: 'valid-token',
        user: { id: userId1 }
      };

      require('../../lib/supabaseClient').supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });
    });

    it('should handle rate limiting responses', async () => {
      // Mock 429 rate limit response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: 'Rate limit exceeded',
          code: 'INVALID_REQUEST'
        })
      });

      const { result } = renderHook(() => usePresignedUrl());

      const imagePath = `volunteer-hours/${orgId1}/${userId1}/image.jpg`;

      await act(async () => {
        await expect(result.current.generateUrl(imagePath)).rejects.toThrow();
      });

      expect(result.current.error).toContain('Too many requests');
    });

    it('should handle concurrent request limits gracefully', async () => {
      // Mock successful responses
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          presignedUrl: 'https://test.r2.dev/signed-url',
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        })
      });

      const { result } = renderHook(() => usePresignedUrl());

      // Make many concurrent requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          act(async () => {
            return result.current.generateUrl(`volunteer-hours/${orgId1}/${userId1}/file${i}.jpg`);
          })
        );
      }

      // Should handle all requests without errors
      const results = await Promise.all(promises);
      results.forEach(url => {
        expect(url).toBe('https://test.r2.dev/signed-url');
      });
    });
  });

  describe('Error Information Disclosure', () => {
    beforeEach(() => {
      // Mock valid session
      const mockSession = {
        access_token: 'valid-token',
        user: { id: userId1 }
      };

      require('../../lib/supabaseClient').supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });
    });

    it('should not expose sensitive information in error messages', async () => {
      // Mock various error responses
      const errorResponses = [
        { status: 403, message: 'Database connection failed: host=internal-db port=5432' },
        { status: 500, message: 'Internal server error: /etc/passwd not found' },
        { status: 404, message: 'File not found: /var/secrets/api-keys.txt' },
      ];

      const { result } = renderHook(() => usePresignedUrl());

      for (const errorResponse of errorResponses) {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: errorResponse.status,
          json: () => Promise.resolve({
            error: errorResponse.message,
            code: 'SERVICE_UNAVAILABLE'
          })
        });

        const imagePath = `volunteer-hours/${orgId1}/${userId1}/image.jpg`;

        await act(async () => {
          await expect(result.current.generateUrl(imagePath)).rejects.toThrow();
        });

        // Error message should be generic, not expose internal details
        expect(result.current.error).not.toContain('Database connection');
        expect(result.current.error).not.toContain('/etc/passwd');
        expect(result.current.error).not.toContain('/var/secrets');
        expect(result.current.error).not.toContain('internal-db');
      }
    });

    it('should provide appropriate error messages for different scenarios', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      const testCases = [
        {
          status: 403,
          expectedMessage: 'You do not have permission to view this image',
          mockResponse: { error: 'Permission denied', code: 'PERMISSION_DENIED' }
        },
        {
          status: 404,
          expectedMessage: 'The requested image could not be found',
          mockResponse: { error: 'Image not found', code: 'IMAGE_NOT_FOUND' }
        },
        {
          status: 500,
          expectedMessage: 'Service temporarily unavailable',
          mockResponse: { error: 'Internal error', code: 'SERVICE_UNAVAILABLE' }
        }
      ];

      for (const testCase of testCases) {
        (global.fetch as jest.Mock).mockResolvedValue({
          ok: false,
          status: testCase.status,
          json: () => Promise.resolve(testCase.mockResponse)
        });

        const imagePath = `volunteer-hours/${orgId1}/${userId1}/image.jpg`;

        await act(async () => {
          await expect(result.current.generateUrl(imagePath)).rejects.toThrow();
        });

        expect(result.current.error).toContain(testCase.expectedMessage);
      }
    });
  });
});