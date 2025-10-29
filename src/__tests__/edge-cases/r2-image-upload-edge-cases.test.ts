/**
 * R2 Image Upload Edge Cases Tests
 * Tests for error scenarios and edge cases
 */

import ImageUploadService, { ImageUploadError, ImageUploadErrorType } from '../../services/ImageUploadService';
import R2ConfigService from '../../services/R2ConfigService';
import { usePresignedUrl } from '../../hooks/usePresignedUrl';
import { renderHook, act } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system';

// Mock dependencies
jest.mock('../../services/R2ConfigService');
jest.mock('expo-file-system');
jest.mock('@aws-sdk/client-s3');
jest.mock('../../lib/supabaseClient');

// Mock fetch globally
global.fetch = jest.fn();

describe('R2 Image Upload Edge Cases Tests', () => {
  let imageUploadService: ImageUploadService;
  let mockR2Config: jest.Mocked<R2ConfigService>;
  let mockS3Client: any;

  const validOrgId = '12345678-1234-1234-1234-123456789012';
  const validUserId = '87654321-4321-4321-4321-210987654321';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock S3 client
    mockS3Client = {
      send: jest.fn()
    };

    // Mock R2 config
    mockR2Config = {
      validateConfiguration: jest.fn(() => true),
      getS3Client: jest.fn(() => mockS3Client),
      getPublicBucketName: jest.fn(() => 'test-public-bucket'),
      getPrivateBucketName: jest.fn(() => 'test-private-bucket'),
      getPublicBaseUrl: jest.fn(() => 'https://test.r2.dev')
    } as any;

    (R2ConfigService.getInstance as jest.Mock).mockReturnValue(mockR2Config);

    imageUploadService = ImageUploadService.getInstance();

    // Set up environment
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key';
  });

  describe('File System Edge Cases', () => {
    it('should handle file system permission errors', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      );

      const result = await imageUploadService.validateImage('file:///restricted/image.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unable to access the selected file. Please try selecting the image again.');
    });

    it('should handle corrupted file system responses', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: null // Corrupted response
      });

      const result = await imageUploadService.validateImage('file:///corrupted.jpg');

      expect(result.valid).toBe(false);
    });

    it('should handle extremely large files', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: Number.MAX_SAFE_INTEGER
      });

      const result = await imageUploadService.validateImage('file:///huge.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File too large. Please select an image under 5MB');
    });

    it('should handle zero-byte files', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 0
      });

      const result = await imageUploadService.validateImage('file:///empty.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('The selected file appears to be empty or corrupted. Please select another image.');
    });

    it('should handle file read timeouts', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024 * 1024
      });

      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Read timeout')), 100)
        )
      );

      const result = await imageUploadService.validateImage('file:///slow.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Selected file appears to be corrupted or inaccessible. Please select another image.');
    });
  });

  describe('Network Edge Cases', () => {
    beforeEach(() => {
      // Mock successful validation
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024 * 1024
      });
      
      (FileSystem.readAsStringAsync as jest.Mock)
        .mockResolvedValueOnce('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        .mockResolvedValueOnce('base64imagedata');
    });

    it('should handle network timeouts during upload', async () => {
      mockS3Client.send.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(
        imageUploadService.uploadPublicImage('file:///test.jpg', 'announcements', validOrgId)
      ).rejects.toThrow(ImageUploadError);
    });

    it('should handle intermittent network failures', async () => {
      let callCount = 0;
      mockS3Client.send.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({});
      });

      // Should succeed after retries
      const result = await imageUploadService.uploadPublicImage(
        'file:///test.jpg',
        'announcements',
        validOrgId
      );

      expect(result).toMatch(/^https:\/\/test\.r2\.dev\//);
      expect(mockS3Client.send).toHaveBeenCalledTimes(3);
    });

    it('should handle DNS resolution failures', async () => {
      mockS3Client.send.mockRejectedValue(new Error('ENOTFOUND'));

      await expect(
        imageUploadService.uploadPublicImage('file:///test.jpg', 'announcements', validOrgId)
      ).rejects.toThrow(ImageUploadError);
    });

    it('should handle SSL certificate errors', async () => {
      mockS3Client.send.mockRejectedValue(new Error('CERT_UNTRUSTED'));

      await expect(
        imageUploadService.uploadPublicImage('file:///test.jpg', 'announcements', validOrgId)
      ).rejects.toThrow(ImageUploadError);
    });
  });

  describe('Memory and Resource Edge Cases', () => {
    beforeEach(() => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024 * 1024
      });
    });

    it('should handle out of memory errors', async () => {
      (FileSystem.readAsStringAsync as jest.Mock).mockRejectedValue(
        new Error('Out of memory')
      );

      const result = await imageUploadService.validateImage('file:///large.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Selected file appears to be corrupted or inaccessible. Please select another image.');
    });

    it('should handle concurrent upload limits', async () => {
      mockS3Client.send.mockResolvedValue({});
      (FileSystem.readAsStringAsync as jest.Mock)
        .mockResolvedValue('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        .mockResolvedValue('base64imagedata');

      // Start many concurrent uploads
      const uploadPromises = [];
      for (let i = 0; i < 50; i++) {
        uploadPromises.push(
          imageUploadService.uploadPublicImage(
            `file:///test${i}.jpg`,
            'announcements',
            validOrgId
          )
        );
      }

      // Should handle all uploads without crashing
      const results = await Promise.allSettled(uploadPromises);
      
      // Most should succeed (some might fail due to resource limits)
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle missing environment variables gracefully', async () => {
      mockR2Config.validateConfiguration.mockReturnValue(false);

      await expect(
        imageUploadService.uploadPublicImage('file:///test.jpg', 'announcements', validOrgId)
      ).rejects.toThrow(ImageUploadError);
    });

    it('should handle malformed configuration', async () => {
      mockR2Config.getS3Client.mockImplementation(() => {
        throw new Error('Invalid configuration');
      });

      await expect(
        imageUploadService.uploadPublicImage('file:///test.jpg', 'announcements', validOrgId)
      ).rejects.toThrow(ImageUploadError);
    });

    it('should handle bucket name conflicts', async () => {
      mockR2Config.getPublicBucketName.mockReturnValue('');
      mockR2Config.getPrivateBucketName.mockReturnValue('');

      await expect(
        imageUploadService.uploadPublicImage('file:///test.jpg', 'announcements', validOrgId)
      ).rejects.toThrow();
    });
  });

  describe('Presigned URL Edge Cases', () => {
    beforeEach(() => {
      // Mock valid session
      const mockSession = {
        access_token: 'valid-token',
        user: { id: validUserId }
      };

      require('../../lib/supabaseClient').supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });
    });

    it('should handle malformed presigned URL responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          // Missing required fields
          invalidResponse: true
        })
      });

      const { result } = renderHook(() => usePresignedUrl());

      const imagePath = `volunteer-hours/${validOrgId}/${validUserId}/image.jpg`;

      await act(async () => {
        await expect(result.current.generateUrl(imagePath)).rejects.toThrow();
      });

      expect(result.current.error).toContain('Invalid response from server');
    });

    it('should handle invalid URLs in responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          presignedUrl: 'not-a-valid-url',
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        })
      });

      const { result } = renderHook(() => usePresignedUrl());

      const imagePath = `volunteer-hours/${validOrgId}/${validUserId}/image.jpg`;

      await act(async () => {
        await expect(result.current.generateUrl(imagePath)).rejects.toThrow();
      });

      expect(result.current.error).toContain('Invalid image URL received');
    });

    it('should handle response parsing errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('JSON parse error'))
      });

      const { result } = renderHook(() => usePresignedUrl());

      const imagePath = `volunteer-hours/${validOrgId}/${validUserId}/image.jpg`;

      await act(async () => {
        await expect(result.current.generateUrl(imagePath)).rejects.toThrow();
      });

      expect(result.current.error).toContain('Invalid response from server');
    });

    it('should handle extremely long image paths', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      // Create an extremely long path
      const longPath = 'volunteer-hours/' + validOrgId + '/' + validUserId + '/' + 'a'.repeat(1000) + '.jpg';

      await act(async () => {
        await expect(result.current.generateUrl(longPath)).rejects.toThrow();
      });
    });

    it('should handle cache corruption scenarios', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      // Mock successful first request
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          presignedUrl: 'https://test.r2.dev/signed-url',
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        })
      });

      const imagePath = `volunteer-hours/${validOrgId}/${validUserId}/image.jpg`;

      // First request
      await act(async () => {
        await result.current.generateUrl(imagePath);
      });

      // Manually corrupt cache
      act(() => {
        result.current.cachedUrls.set(imagePath, {
          url: 'corrupted-url',
          expiresAt: new Date(Date.now() - 1000) // Expired
        } as any);
      });

      // Second request should handle corrupted cache gracefully
      await act(async () => {
        await result.current.generateUrl(imagePath);
      });

      // Should make a new request
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle exactly 5MB files', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 5 * 1024 * 1024 // Exactly 5MB
      });

      const result = await imageUploadService.validateImage('file:///exactly5mb.jpg');

      expect(result.valid).toBe(true);
    });

    it('should handle 5MB + 1 byte files', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 5 * 1024 * 1024 + 1 // 5MB + 1 byte
      });

      const result = await imageUploadService.validateImage('file:///over5mb.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File too large. Please select an image under 5MB');
    });

    it('should handle minimum file size boundary', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024 // Exactly 1KB (minimum)
      });

      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      );

      const result = await imageUploadService.validateImage('file:///min.jpg');

      expect(result.valid).toBe(true);
    });

    it('should handle files just under minimum size', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1023 // Just under 1KB minimum
      });

      const result = await imageUploadService.validateImage('file:///toosmall.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('The selected file appears to be empty or corrupted. Please select another image.');
    });
  });

  describe('Unicode and Special Character Handling', () => {
    it('should handle Unicode filenames', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024 * 1024
      });

      (FileSystem.readAsStringAsync as jest.Mock)
        .mockResolvedValueOnce('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')
        .mockResolvedValueOnce('base64imagedata');

      mockS3Client.send.mockResolvedValue({});

      // Test with Unicode filename
      const result = await imageUploadService.uploadPublicImage(
        'file:///测试图片.jpg',
        'announcements',
        validOrgId
      );

      expect(result).toMatch(/^https:\/\/test\.r2\.dev\//);
    });

    it('should handle special characters in paths', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      // Test with various special characters that should be rejected
      const specialCharPaths = [
        `volunteer-hours/${validOrgId}/${validUserId}/file with spaces.jpg`,
        `volunteer-hours/${validOrgId}/${validUserId}/file&with&ampersands.jpg`,
        `volunteer-hours/${validOrgId}/${validUserId}/file<with>brackets.jpg`,
        `volunteer-hours/${validOrgId}/${validUserId}/file"with"quotes.jpg`,
      ];

      for (const path of specialCharPaths) {
        await act(async () => {
          await expect(result.current.generateUrl(path)).rejects.toThrow();
        });
      }
    });
  });

  describe('Concurrent Access Edge Cases', () => {
    it('should handle simultaneous cache operations', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          presignedUrl: 'https://test.r2.dev/signed-url',
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        })
      });

      const imagePath = `volunteer-hours/${validOrgId}/${validUserId}/image.jpg`;

      // Start multiple simultaneous requests for the same image
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          act(async () => {
            return result.current.generateUrl(imagePath);
          })
        );
      }

      const results = await Promise.all(promises);

      // All should return the same URL
      results.forEach(url => {
        expect(url).toBe('https://test.r2.dev/signed-url');
      });

      // Should only make one actual request due to deduplication
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle cache cleanup during active requests', async () => {
      const { result } = renderHook(() => usePresignedUrl());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          presignedUrl: 'https://test.r2.dev/signed-url',
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        })
      });

      const imagePath = `volunteer-hours/${validOrgId}/${validUserId}/image.jpg`;

      // Start a request
      const requestPromise = act(async () => {
        return result.current.generateUrl(imagePath);
      });

      // Clear cache while request is in progress
      act(() => {
        result.current.clearCache();
      });

      // Request should still complete successfully
      const url = await requestPromise;
      expect(url).toBe('https://test.r2.dev/signed-url');
    });
  });
});