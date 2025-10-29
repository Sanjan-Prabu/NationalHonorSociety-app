/**
 * ImageUploadService Tests
 * Comprehensive unit tests for image upload validation and upload logic
 */

import ImageUploadService, { ImageUploadError, ImageUploadErrorType } from '../ImageUploadService';
import R2ConfigService from '../R2ConfigService';
import * as FileSystem from 'expo-file-system';
import { PutObjectCommand } from '@aws-sdk/client-s3';

// Mock dependencies
jest.mock('../R2ConfigService');
jest.mock('expo-file-system');
jest.mock('@aws-sdk/client-s3');
// Mock the network error handler to bypass network checks
jest.mock('../NetworkErrorHandler', () => ({
  networkErrorHandler: {
    executeWithRetry: jest.fn((fn) => fn()),
    isRetryableError: jest.fn(() => true)
  }
}));

// Mock global fetch for network connectivity check
global.fetch = jest.fn();

describe('ImageUploadService', () => {
  let imageUploadService: ImageUploadService;
  let mockR2Config: jest.Mocked<R2ConfigService>;
  let mockS3Client: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock successful network connectivity check
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 204
    });
    
    // Mock R2ConfigService
    mockS3Client = {
      send: jest.fn()
    };
    
    mockR2Config = {
      validateConfiguration: jest.fn(() => true),
      getS3Client: jest.fn(() => mockS3Client),
      getPublicBucketName: jest.fn(() => 'test-public-bucket'),
      getPrivateBucketName: jest.fn(() => 'test-private-bucket'),
      getPublicBaseUrl: jest.fn(() => 'https://test.r2.dev')
    } as any;

    (R2ConfigService.getInstance as jest.Mock).mockReturnValue(mockR2Config);
    
    imageUploadService = ImageUploadService.getInstance();
    
    // Mock the private checkNetworkConnectivity method to always return success
    jest.spyOn(imageUploadService as any, 'checkNetworkConnectivity').mockResolvedValue({
      isConnected: true,
      canUpload: true
    });
  });

  describe('validateImage', () => {
    it('should validate a valid image successfully', async () => {
      // Mock file system responses
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024 * 1024 // 1MB
      });
      
      // Mock valid JPEG header
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==');

      const result = await imageUploadService.validateImage('file:///test/image.jpg');

      expect(result.valid).toBe(true);
      expect(result.fileSize).toBe(1024 * 1024);
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should reject invalid image URI', async () => {
      const result = await imageUploadService.validateImage('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Please select a valid image file');
    });

    it('should reject non-existent file', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: false
      });

      const result = await imageUploadService.validateImage('file:///nonexistent.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('The selected file could not be found. Please select another image.');
    });

    it('should reject oversized file', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 6 * 1024 * 1024 // 6MB (over 5MB limit)
      });

      const result = await imageUploadService.validateImage('file:///large.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File too large. Please select an image under 5MB');
    });

    it('should reject invalid file extension', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024 * 1024
      });

      const result = await imageUploadService.validateImage('file:///test.txt');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file type. Please select a JPG or PNG image');
    });

    it('should reject corrupted image file', async () => {
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024 * 1024
      });
      
      // Mock corrupted file header
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('aW52YWxpZCBkYXRh'); // "invalid data" in base64

      const result = await imageUploadService.validateImage('file:///corrupted.jpg');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('The selected file does not appear to be a valid image. Please select another file.');
    });
  });

  describe('generateFilename', () => {
    it('should generate public filename correctly', () => {
      const filename = imageUploadService.generateFilename('announcements', 'org-123');
      
      expect(filename).toMatch(/^announcements\/org-123\/\d+-[a-z0-9]{6}\.jpg$/);
    });

    it('should generate private filename correctly', () => {
      const filename = imageUploadService.generateFilename('volunteer-hours', 'org-123', 'user-456');
      
      expect(filename).toMatch(/^volunteer-hours\/org-123\/user-456\/\d+-[a-z0-9]{6}\.jpg$/);
    });
  });

  describe('uploadPublicImage', () => {
    beforeEach(() => {
      // Mock successful validation
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024 * 1024
      });
      
      // Mock valid JPEG header for validation
      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation((uri, options) => {
        if (options && options.length === 200) {
          // This is the header check - return valid JPEG header
          return Promise.resolve('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==');
        } else {
          // This is the actual file read for upload
          return Promise.resolve('base64imagedata');
        }
      });

      mockS3Client.send.mockResolvedValue({});
    });

    it('should upload public image successfully', async () => {
      const result = await imageUploadService.uploadPublicImage(
        'file:///test.jpg',
        'announcements',
        'org-123'
      );

      expect(result).toMatch(/^https:\/\/test\.r2\.dev\/announcements\/org-123\/\d+-[a-z0-9]{6}\.jpg$/);
      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
    });

    it('should handle missing parameters', async () => {
      await expect(
        imageUploadService.uploadPublicImage('', 'announcements', 'org-123')
      ).rejects.toThrow(ImageUploadError);
    });

    it('should handle S3 upload failure', async () => {
      mockS3Client.send.mockRejectedValue(new Error('S3 Error'));

      await expect(
        imageUploadService.uploadPublicImage('file:///test.jpg', 'announcements', 'org-123')
      ).rejects.toThrow(ImageUploadError);
    });

    it('should handle invalid configuration', async () => {
      // Mock validateConfiguration to return false, which should cause the upload to fail
      mockR2Config.validateConfiguration.mockReturnValueOnce(false);

      await expect(
        imageUploadService.uploadPublicImage('file:///test.jpg', 'announcements', 'org-123')
      ).rejects.toThrow(ImageUploadError);
    });
  });

  describe('uploadPrivateImage', () => {
    beforeEach(() => {
      // Mock successful validation
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
        exists: true,
        size: 1024 * 1024
      });
      
      // Mock valid JPEG header for validation
      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation((uri, options) => {
        if (options && options.length === 200) {
          // This is the header check - return valid JPEG header
          return Promise.resolve('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA==');
        } else {
          // This is the actual file read for upload
          return Promise.resolve('base64imagedata');
        }
      });

      mockS3Client.send.mockResolvedValue({});
    });

    it('should upload private image successfully', async () => {
      const validOrgId = '12345678-1234-1234-1234-123456789012';
      const validUserId = '87654321-4321-4321-4321-210987654321';

      const result = await imageUploadService.uploadPrivateImage(
        'file:///test.jpg',
        validOrgId,
        validUserId
      );

      expect(result).toMatch(new RegExp(`^volunteer-hours/${validOrgId}/${validUserId}/\\d+-[a-z0-9]{6}\\.jpg$`));
      expect(mockS3Client.send).toHaveBeenCalledTimes(1);
    });

    it('should validate UUID format for orgId', async () => {
      const invalidOrgId = 'invalid-org-id';
      const validUserId = '87654321-4321-4321-4321-210987654321';

      await expect(
        imageUploadService.uploadPrivateImage('file:///test.jpg', invalidOrgId, validUserId)
      ).rejects.toThrow(ImageUploadError);
    });

    it('should validate UUID format for userId', async () => {
      const validOrgId = '12345678-1234-1234-1234-123456789012';
      const invalidUserId = 'invalid-user-id';

      await expect(
        imageUploadService.uploadPrivateImage('file:///test.jpg', validOrgId, invalidUserId)
      ).rejects.toThrow(ImageUploadError);
    });
  });

  describe('error handling utilities', () => {
    it('should get user-friendly error message from ImageUploadError', () => {
      const error = new ImageUploadError(
        ImageUploadErrorType.VALIDATION_ERROR,
        'Technical message',
        'User-friendly message',
        false
      );

      const message = ImageUploadService.getErrorMessage(error);
      expect(message).toBe('User-friendly message');
    });

    it('should get generic message for unknown errors', () => {
      const error = new Error('Unknown error');
      const message = ImageUploadService.getErrorMessage(error);
      expect(message).toBe('Unknown error');
    });

    it('should check if error is retryable', () => {
      const retryableError = new ImageUploadError(
        ImageUploadErrorType.NETWORK_ERROR,
        'Network error',
        'Network error',
        true
      );

      const nonRetryableError = new ImageUploadError(
        ImageUploadErrorType.VALIDATION_ERROR,
        'Validation error',
        'Validation error',
        false
      );

      expect(ImageUploadService.isRetryableError(retryableError)).toBe(true);
      expect(ImageUploadService.isRetryableError(nonRetryableError)).toBe(false);
    });
  });

  describe('configuration validation', () => {
    it('should check if service is configured', () => {
      // Reset the mock to ensure clean state
      mockR2Config.validateConfiguration.mockReset();
      
      // Test true case
      mockR2Config.validateConfiguration.mockReturnValue(true);
      expect(imageUploadService.isConfigured()).toBe(true);

      // Test false case
      mockR2Config.validateConfiguration.mockReturnValue(false);
      expect(imageUploadService.isConfigured()).toBe(false);
    });
  });
});