/**
 * R2ConfigService Tests
 * Unit tests for R2 configuration management and validation
 */

import R2ConfigService from '../R2ConfigService';
import { S3Client } from '@aws-sdk/client-s3';

// Mock AWS SDK
jest.mock('@aws-sdk/client-s3');

describe('R2ConfigService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Reset singleton instance
    R2ConfigService.resetInstance();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  const setValidEnvironment = () => {
    process.env.R2_ACCOUNT_ID = 'a1b2c3d4e5f6789012345678901234567890abcd';
    process.env.R2_ACCESS_KEY_ID = 'test-access-key-id-12345';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret-access-key-abcdefghijklmnopqrstuvwxyz';
    process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com';
    process.env.R2_PUBLIC_BUCKET_NAME = 'test-public-bucket';
    process.env.R2_PRIVATE_BUCKET_NAME = 'test-private-bucket';
    process.env.R2_PUBLIC_URL = 'https://pub-test.r2.dev';
  };

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = R2ConfigService.getInstance();
      const instance2 = R2ConfigService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('configuration loading', () => {
    it('should load valid configuration successfully', () => {
      setValidEnvironment();
      
      const service = R2ConfigService.getInstance();
      const config = service.getConfig();
      
      expect(config.accountId).toBe('a1b2c3d4e5f6789012345678901234567890abcd');
      expect(config.accessKeyId).toBe('test-access-key-id-12345');
      expect(config.secretAccessKey).toBe('test-secret-access-key-abcdefghijklmnopqrstuvwxyz');
      expect(config.endpoint).toBe('https://test.r2.cloudflarestorage.com');
      expect(config.publicBucketName).toBe('test-public-bucket');
      expect(config.privateBucketName).toBe('test-private-bucket');
      expect(config.publicBaseUrl).toBe('https://pub-test.r2.dev');
    });

    it('should throw error for missing environment variables', () => {
      // Don't set any environment variables
      
      const service = R2ConfigService.getInstance();
      
      expect(() => service.getConfig()).toThrow('Missing or empty R2 environment variables');
    });

    it('should throw error for invalid endpoint URL', () => {
      setValidEnvironment();
      process.env.R2_ENDPOINT = 'invalid-url';
      
      const service = R2ConfigService.getInstance();
      
      expect(() => service.getConfig()).toThrow('R2_ENDPOINT must start with https://');
    });

    it('should throw error for invalid public URL', () => {
      setValidEnvironment();
      process.env.R2_PUBLIC_URL = 'invalid-url';
      
      const service = R2ConfigService.getInstance();
      
      expect(() => service.getConfig()).toThrow('R2_PUBLIC_URL must start with https://');
    });
  });

  describe('S3 client creation', () => {
    it('should create S3 client with correct configuration', () => {
      setValidEnvironment();
      
      const service = R2ConfigService.getInstance();
      const client = service.getS3Client();
      
      expect(S3Client).toHaveBeenCalledWith({
        region: 'auto',
        endpoint: 'https://test.r2.cloudflarestorage.com',
        credentials: {
          accessKeyId: 'test-access-key-id-12345',
          secretAccessKey: 'test-secret-access-key-abcdefghijklmnopqrstuvwxyz'
        },
        forcePathStyle: true,
        requestHandler: {
          requestTimeout: 30000,
          httpsAgent: undefined
        },
        maxAttempts: 3
      });
    });

    it('should reuse existing S3 client', () => {
      setValidEnvironment();
      
      const service = R2ConfigService.getInstance();
      const client1 = service.getS3Client();
      const client2 = service.getS3Client();
      
      expect(client1).toBe(client2);
      expect(S3Client).toHaveBeenCalledTimes(1);
    });

    it('should throw error when configuration is invalid', () => {
      // Don't set environment variables
      
      const service = R2ConfigService.getInstance();
      
      expect(() => service.getS3Client()).toThrow('Failed to initialize R2 client');
    });
  });

  describe('bucket name getters', () => {
    beforeEach(() => {
      setValidEnvironment();
    });

    it('should return public bucket name', () => {
      const service = R2ConfigService.getInstance();
      expect(service.getPublicBucketName()).toBe('test-public-bucket');
    });

    it('should return private bucket name', () => {
      const service = R2ConfigService.getInstance();
      expect(service.getPrivateBucketName()).toBe('test-private-bucket');
    });

    it('should return public base URL', () => {
      const service = R2ConfigService.getInstance();
      expect(service.getPublicBaseUrl()).toBe('https://pub-test.r2.dev');
    });

    it('should return account ID', () => {
      const service = R2ConfigService.getInstance();
      expect(service.getAccountId()).toBe('a1b2c3d4e5f6789012345678901234567890abcd');
    });
  });

  describe('configuration validation', () => {
    it('should validate correct configuration', () => {
      setValidEnvironment();
      
      const service = R2ConfigService.getInstance();
      expect(service.validateConfiguration()).toBe(true);
    });

    it('should reject configuration with missing fields', () => {
      setValidEnvironment();
      delete process.env.R2_ACCOUNT_ID;
      
      const service = R2ConfigService.getInstance();
      expect(service.validateConfiguration()).toBe(false);
    });

    it('should reject configuration with invalid URLs', () => {
      setValidEnvironment();
      process.env.R2_ENDPOINT = 'invalid-url';
      
      const service = R2ConfigService.getInstance();
      expect(service.validateConfiguration()).toBe(false);
    });

    it('should reject configuration with same bucket names', () => {
      setValidEnvironment();
      process.env.R2_PRIVATE_BUCKET_NAME = 'test-public-bucket'; // Same as public
      
      const service = R2ConfigService.getInstance();
      expect(service.validateConfiguration()).toBe(false);
    });
  });

  describe('configuration status', () => {
    it('should return detailed status for valid configuration', () => {
      setValidEnvironment();
      
      const service = R2ConfigService.getInstance();
      const status = service.getConfigurationStatus();
      
      expect(status.isValid).toBe(true);
      expect(status.errors).toHaveLength(0);
      expect(status.warnings).toHaveLength(0);
    });

    it('should return errors for invalid configuration', () => {
      // Set incomplete configuration
      process.env.R2_ACCOUNT_ID = 'test-account';
      process.env.R2_ACCESS_KEY_ID = 'short'; // Too short
      
      const service = R2ConfigService.getInstance();
      const status = service.getConfigurationStatus();
      
      expect(status.isValid).toBe(false);
      expect(status.errors.length).toBeGreaterThan(0);
    });

    it('should return warnings for suspicious configuration', () => {
      setValidEnvironment();
      process.env.R2_ACCOUNT_ID = 'invalid-format'; // Invalid format
      
      const service = R2ConfigService.getInstance();
      const status = service.getConfigurationStatus();
      
      expect(status.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('resetInstance', () => {
    it('should reset singleton instance', () => {
      const instance1 = R2ConfigService.getInstance();
      R2ConfigService.resetInstance();
      const instance2 = R2ConfigService.getInstance();
      
      expect(instance1).not.toBe(instance2);
    });
  });
});