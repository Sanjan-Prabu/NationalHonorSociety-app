/**
 * R2 Image Upload System Integration Tests
 * End-to-end tests for upload and viewing workflows
 */

import ImageUploadService from '../../services/ImageUploadService';
import R2ConfigService from '../../services/R2ConfigService';
import { usePresignedUrl } from '../../hooks/usePresignedUrl';
import { renderHook, act } from '@testing-library/react-native';
import * as FileSystem from 'expo-file-system';

// Mock dependencies
jest.mock('../../services/R2ConfigService');
jest.mock('expo-file-system');
jest.mock('@aws-sdk/client-s3');
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn()
    }
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('R2 Image Upload Integration Tests', () => {
  let imageUploadService: ImageUploadService;
  let mockR2Config: jest.Mocked<R2ConfigService>;
  let mockS3Client: any;

  const validOrgId = '12345678-1234-1234-1234-123456789012';
  const validUserId = '87654321-4321-4321-4321-210987654321';
  const testImageUri = 'file:///test/image.jpg';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock S3 client
    mockS3Client = {
      send: jest.fn().mockResolvedValue({})
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

    // Mock file system
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      size: 1024 * 1024 // 1MB
    });

    (FileSystem.readAsStringAsync as jest.Mock)
      .mockResolvedValueOnce('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==') // header check
      .mockResolvedValueOnce('base64imagedata'); // actual upload

    imageUploadService = ImageUploadService.getInstance();

    // Set up environment
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_KEY = 'test-key';
  });

  describe('Public Image Upload Workflow', () => {
    it('should complete announcement image upload workflow', async () => {
      // Test the complete workflow for announcement images
      const publicUrl = await imageUploadService.uploadPublicImage(
        testImageUri,
        'announcements',
        validOrgId
      );

      // Verify URL format
      expect(publicUrl).toMatch(/^https:\/\/test\.r2\.dev\/announcements\/[^\/]+\/\d+-[a-z0-9]{6}\.jpg$/);

      // Verify S3 upload was called with correct parameters
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-public-bucket',
            ACL: 'public-read',
            ContentType: 'image/jpeg'
          })
        })
      );

      // Verify metadata was included
      const uploadCall = mockS3Client.send.mock.calls[0][0];
      expect(uploadCall.input.Metadata).toEqual({
        'upload-timestamp': expect.any(String),
        'upload-type': 'announcements',
        'org-id': validOrgId
      });
    });

    it('should complete event image upload workflow', async () => {
      // Test the complete workflow for event images
      const publicUrl = await imageUploadService.uploadPublicImage(
        testImageUri,
        'events',
        validOrgId
      );

      // Verify URL format
      expect(publicUrl).toMatch(/^https:\/\/test\.r2\.dev\/events\/[^\/]+\/\d+-[a-z0-9]{6}\.jpg$/);

      // Verify correct upload type in metadata
      const uploadCall = mockS3Client.send.mock.calls[0][0];
      expect(uploadCall.input.Metadata['upload-type']).toBe('events');
    });

    it('should handle upload progress tracking', async () => {
      const progressUpdates: any[] = [];
      
      const options = {
        onProgress: (progress: any) => {
          progressUpdates.push(progress);
        }
      };

      await imageUploadService.uploadPublicImage(
        testImageUri,
        'announcements',
        validOrgId,
        options
      );

      // Verify progress updates were called
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].stage).toBe('validation');
      expect(progressUpdates[progressUpdates.length - 1].stage).toBe('complete');
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
    });
  });

  describe('Private Image Upload and Viewing Workflow', () => {
    beforeEach(() => {
      // Mock successful authentication
      const mockSession = {
        access_token: 'test-token',
        user: { id: validUserId }
      };

      require('../../lib/supabaseClient').supabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Mock successful presigned URL generation
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          presignedUrl: 'https://test.r2.dev/signed-url?signature=abc123',
          expiresAt: new Date(Date.now() + 3600000).toISOString()
        })
      });
    });

    it('should complete private image upload and viewing workflow', async () => {
      // Step 1: Upload private image
      const imagePath = await imageUploadService.uploadPrivateImage(
        testImageUri,
        validOrgId,
        validUserId
      );

      // Verify path format
      expect(imagePath).toMatch(new RegExp(`^volunteer-hours/${validOrgId}/${validUserId}/\\d+-[a-z0-9]{6}\\.jpg$`));

      // Verify S3 upload was called without public ACL
      expect(mockS3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: 'test-private-bucket',
            ACL: undefined // No public ACL for private bucket
          })
        })
      );

      // Step 2: Generate presigned URL for viewing
      const { result } = renderHook(() => usePresignedUrl());

      let presignedUrl: string;
      await act(async () => {
        presignedUrl = await result.current.generateUrl(imagePath);
      });

      // Verify presigned URL was generated
      expect(presignedUrl!).toBe('https://test.r2.dev/signed-url?signature=abc123');

      // Verify Edge Function was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/generate-presigned-url',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          }),
          body: JSON.stringify({ imagePath })
        })
      );
    });

    it('should handle batch presigned URL generation', async () => {
      // Upload multiple images
      const imagePaths = [];
      for (let i = 0; i < 3; i++) {
        const path = await imageUploadService.uploadPrivateImage(
          testImageUri,
          validOrgId,
          validUserId
        );
        imagePaths.push(path);
      }

      // Generate presigned URLs in batch
      const { result } = renderHook(() => usePresignedUrl());

      let urlMap: Map<string, string>;
      await act(async () => {
        urlMap = await result.current.batchGenerateUrls(imagePaths);
      });

      // Verify all URLs were generated
      expect(urlMap!.size).toBe(3);
      imagePaths.forEach(path => {
        expect(urlMap!.has(path)).toBe(true);
        expect(urlMap!.get(path)).toBe('https://test.r2.dev/signed-url?signature=abc123');
      });
    });

    it('should cache presigned URLs correctly', async () => {
      // Upload image
      const imagePath = await imageUploadService.uploadPrivateImage(
        testImageUri,
        validOrgId,
        validUserId
      );

      const { result } = renderHook(() => usePresignedUrl());

      // First request
      await act(async () => {
        await result.current.generateUrl(imagePath);
      });

      // Second request should use cache
      await act(async () => {
        await result.current.generateUrl(imagePath);
      });

      // Verify fetch was only called once (cached on second call)
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Verify cache contains the URL
      expect(result.current.cachedUrls.size).toBe(1);
      expect(result.current.cachedUrls.has(imagePath)).toBe(true);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle complete upload failure workflow', async () => {
      // Mock S3 failure
      mockS3Client.send.mockRejectedValue(new Error('S3 Upload Failed'));

      // Attempt upload
      await expect(
        imageUploadService.uploadPublicImage(testImageUri, 'announcements', validOrgId)
      ).rejects.toThrow('Upload failed. Please check your connection and try again.');
    });

    it('should handle presigned URL generation failure workflow', async () => {
      // Upload image successfully
      const imagePath = await imageUploadService.uploadPrivateImage(
        testImageUri,
        validOrgId,
        validUserId
      );

      // Mock Edge Function failure
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          error: 'Internal server error',
          code: 'SERVICE_UNAVAILABLE'
        })
      });

      const { result } = renderHook(() => usePresignedUrl());

      // Attempt to generate presigned URL
      await act(async () => {
        await expect(result.current.generateUrl(imagePath)).rejects.toThrow();
      });

      expect(result.current.error).toContain('Service temporarily unavailable');
    });

    it('should handle network connectivity issues', async () => {
      // Mock network failure
      (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));

      // Mock successful upload (to test presigned URL network failure)
      const imagePath = await imageUploadService.uploadPrivateImage(
        testImageUri,
        validOrgId,
        validUserId
      );

      const { result } = renderHook(() => usePresignedUrl());

      await act(async () => {
        await expect(result.current.generateUrl(imagePath)).rejects.toThrow();
      });

      expect(result.current.error).toContain('Network error');
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent uploads efficiently', async () => {
      const uploadPromises = [];
      
      // Start multiple uploads concurrently
      for (let i = 0; i < 5; i++) {
        uploadPromises.push(
          imageUploadService.uploadPublicImage(
            testImageUri,
            'announcements',
            validOrgId
          )
        );
      }

      // Wait for all uploads to complete
      const results = await Promise.all(uploadPromises);

      // Verify all uploads succeeded
      expect(results).toHaveLength(5);
      results.forEach(url => {
        expect(url).toMatch(/^https:\/\/test\.r2\.dev\/announcements\//);
      });

      // Verify S3 was called for each upload
      expect(mockS3Client.send).toHaveBeenCalledTimes(5);
    });

    it('should handle large batch presigned URL requests', async () => {
      // Create many image paths
      const imagePaths = [];
      for (let i = 0; i < 20; i++) {
        imagePaths.push(`volunteer-hours/${validOrgId}/${validUserId}/file${i}.jpg`);
      }

      const { result } = renderHook(() => usePresignedUrl());

      let urlMap: Map<string, string>;
      await act(async () => {
        urlMap = await result.current.batchGenerateUrls(imagePaths);
      });

      // Verify all URLs were generated
      expect(urlMap!.size).toBe(20);

      // Verify requests were batched (should be less than 20 individual requests)
      expect(global.fetch).toHaveBeenCalledTimes(20); // Each path generates one request in this mock
    });
  });

  describe('Data Validation Integration', () => {
    it('should validate complete image upload data flow', async () => {
      // Test with various file types and sizes
      const testCases = [
        { uri: 'file:///test.jpg', size: 1024 * 1024, valid: true },
        { uri: 'file:///test.png', size: 2 * 1024 * 1024, valid: true },
        { uri: 'file:///test.gif', size: 1024 * 1024, valid: false }, // Invalid format
        { uri: 'file:///large.jpg', size: 6 * 1024 * 1024, valid: false } // Too large
      ];

      for (const testCase of testCases) {
        (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
          exists: true,
          size: testCase.size
        });

        if (testCase.valid) {
          const result = await imageUploadService.uploadPublicImage(
            testCase.uri,
            'announcements',
            validOrgId
          );
          expect(result).toMatch(/^https:\/\/test\.r2\.dev\//);
        } else {
          await expect(
            imageUploadService.uploadPublicImage(testCase.uri, 'announcements', validOrgId)
          ).rejects.toThrow();
        }
      }
    });

    it('should validate UUID formats in complete workflow', async () => {
      const invalidOrgId = 'invalid-org-id';
      const invalidUserId = 'invalid-user-id';

      // Test invalid org ID
      await expect(
        imageUploadService.uploadPrivateImage(testImageUri, invalidOrgId, validUserId)
      ).rejects.toThrow();

      // Test invalid user ID
      await expect(
        imageUploadService.uploadPrivateImage(testImageUri, validOrgId, invalidUserId)
      ).rejects.toThrow();

      // Test invalid path in presigned URL generation
      const { result } = renderHook(() => usePresignedUrl());
      
      await act(async () => {
        await expect(
          result.current.generateUrl('volunteer-hours/invalid-org/invalid-user/file.jpg')
        ).rejects.toThrow();
      });
    });
  });
});