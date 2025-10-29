import 'react-native-url-polyfill/auto';
import { S3Client } from '@aws-sdk/client-s3';
import { FetchHttpHandler } from '@aws-sdk/fetch-http-handler';
import Constants from 'expo-constants';

/**
 * R2 Configuration interface defining all required environment variables
 */
interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  publicBucketName: string;
  privateBucketName: string;
  publicBaseUrl: string;
}

/**
 * Service for managing Cloudflare R2 configuration and S3 client setup
 * Handles environment-based configuration for development and production
 */
class R2ConfigService {
  private static instance: R2ConfigService;
  private s3Client: S3Client | null = null;
  private config: R2Config | null = null;

  private constructor() {}

  /**
   * Get singleton instance of R2ConfigService
   */
  static getInstance(): R2ConfigService {
    if (!R2ConfigService.instance) {
      R2ConfigService.instance = new R2ConfigService();
    }
    return R2ConfigService.instance;
  }

  /**
   * Load and validate R2 configuration from environment variables with enhanced error handling
   */
  private loadConfig(): R2Config {
    if (this.config) {
      return this.config;
    }

    try {
      // Get configuration from Expo Constants (loaded from app.config.js)
      const extra = Constants.expoConfig?.extra || {};
      
      const requiredVars = {
        accountId: extra.r2AccountId,
        accessKeyId: extra.r2AccessKeyId,
        secretAccessKey: extra.r2SecretAccessKey,
        endpoint: extra.r2Endpoint,
        publicBucketName: extra.r2PublicBucketName,
        privateBucketName: extra.r2PrivateBucketName,
        publicUrl: extra.r2PublicUrl,
        privateUrl: extra.r2PrivateUrl,
      };

      // Check for missing configuration values
      const missingVars = Object.entries(requiredVars)
        .filter(([key, value]) => !value || (typeof value === 'string' && value.trim().length === 0))
        .map(([key]) => key);
      
      if (missingVars.length > 0) {
        const errorMessage = `Missing or empty R2 configuration: ${missingVars.join(', ')}`;
        console.error('[R2ConfigService] Configuration error:', errorMessage);
        console.error('[R2ConfigService] Available extra config:', Object.keys(extra));
        throw new Error(errorMessage);
      }

      // Validate configuration formats
      const endpoint = requiredVars.endpoint!.trim();
      const publicUrl = requiredVars.publicUrl!.trim();
      
      if (!endpoint.startsWith('https://')) {
        throw new Error('R2_ENDPOINT must start with https://');
      }
      
      if (!publicUrl.startsWith('https://')) {
        throw new Error('R2_PUBLIC_URL must start with https://');
      }

      // Validate account ID format (should be 32 character hex string)
      const accountId = requiredVars.accountId!.trim();
      if (!/^[a-f0-9]{32}$/i.test(accountId)) {
        console.warn('[R2ConfigService] Account ID format may be invalid');
      }

      // Validate access key format (should be 32 character string)
      const accessKeyId = requiredVars.accessKeyId!.trim();
      if (accessKeyId.length < 20) {
        console.warn('[R2ConfigService] Access key ID format may be invalid');
      }

      // Validate secret key format (should be 43 character base64 string)
      const secretAccessKey = requiredVars.secretAccessKey!.trim();
      if (secretAccessKey.length < 40) {
        console.warn('[R2ConfigService] Secret access key format may be invalid');
      }

      this.config = {
        accountId,
        accessKeyId,
        secretAccessKey,
        endpoint,
        publicBucketName: requiredVars.publicBucketName!.trim(),
        privateBucketName: requiredVars.privateBucketName!.trim(),
        publicBaseUrl: publicUrl
      };

      // STARTUP VALIDATION: Ensure correct URL format
      if (!publicUrl.startsWith('https://pub-') || !publicUrl.includes('.r2.dev')) {
        console.error('🚨 CRITICAL R2 CONFIGURATION ERROR 🚨');
        console.error('Public URL format is incorrect!');
        console.error('Expected: https://pub-[hash].r2.dev');
        console.error('Current:', publicUrl);
        console.error('Please update R2_PUBLIC_URL in your .env file');
        throw new Error('Invalid R2 public URL format - must use https://pub-[hash].r2.dev');
      }

      console.log('[R2ConfigService] ✅ Configuration loaded and validated successfully');
      console.log('[R2ConfigService] Public URL:', publicUrl);
      return this.config;
    } catch (error) {
      console.error('[R2ConfigService] Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * Get configured S3 client for R2 operations with enhanced error handling
   */
  getS3Client(): S3Client {
    if (this.s3Client) {
      return this.s3Client;
    }

    try {
      const config = this.loadConfig();

      this.s3Client = new S3Client({
        region: 'auto', // Cloudflare R2 uses 'auto' region
        endpoint: config.endpoint,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        },
        // Force path-style addressing for R2 compatibility
        forcePathStyle: true,
        // Use React Native compatible request handler
        requestHandler: new FetchHttpHandler({
          requestTimeout: 30000, // 30 second timeout
        }),
        maxAttempts: 3
      });

      console.log('[R2ConfigService] S3 client initialized successfully');
      return this.s3Client;
    } catch (error) {
      console.error('[R2ConfigService] Failed to initialize S3 client:', error);
      throw new Error(`Failed to initialize R2 client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get public bucket name for announcements and events
   */
  getPublicBucketName(): string {
    const config = this.loadConfig();
    return config.publicBucketName;
  }

  /**
   * Get private bucket name for volunteer hour images
   */
  getPrivateBucketName(): string {
    const config = this.loadConfig();
    return config.privateBucketName;
  }

  /**
   * Get public base URL for direct access to public images
   */
  getPublicBaseUrl(): string {
    const config = this.loadConfig();
    return config.publicBaseUrl;
  }

  /**
   * Get R2 account ID
   */
  getAccountId(): string {
    const config = this.loadConfig();
    return config.accountId;
  }

  /**
   * Validate that all required configuration is present and valid with detailed error reporting
   */
  validateConfiguration(): boolean {
    try {
      const config = this.loadConfig();
      
      const validationResults = [
        { check: config.accountId.length > 0, field: 'accountId' },
        { check: config.accessKeyId.length > 0, field: 'accessKeyId' },
        { check: config.secretAccessKey.length > 0, field: 'secretAccessKey' },
        { check: config.endpoint.startsWith('https://'), field: 'endpoint (must start with https://)' },
        { check: config.publicBucketName.length > 0, field: 'publicBucketName' },
        { check: config.privateBucketName.length > 0, field: 'privateBucketName' },
        { check: config.publicBaseUrl.startsWith('https://'), field: 'publicBaseUrl (must start with https://)' }
      ];

      const failedValidations = validationResults.filter(result => !result.check);
      
      if (failedValidations.length > 0) {
        const failedFields = failedValidations.map(result => result.field).join(', ');
        console.error(`[R2ConfigService] Configuration validation failed for: ${failedFields}`);
        return false;
      }

      // Additional validation for bucket names (should not be the same)
      if (config.publicBucketName === config.privateBucketName) {
        console.error('[R2ConfigService] Public and private bucket names must be different');
        return false;
      }

      // Validate URL formats more thoroughly
      try {
        new URL(config.endpoint);
        new URL(config.publicBaseUrl);
      } catch (urlError) {
        console.error('[R2ConfigService] Invalid URL format in configuration:', urlError);
        return false;
      }

      // CRITICAL: Ensure public URL uses correct R2 public format
      if (!config.publicBaseUrl.startsWith('https://pub-')) {
        console.error('[R2ConfigService] ❌ CRITICAL: Wrong public URL format!');
        console.error('[R2ConfigService] Expected: https://pub-[hash].r2.dev');
        console.error('[R2ConfigService] Got:', config.publicBaseUrl);
        console.error('[R2ConfigService] Check R2_PUBLIC_URL in environment variables');
        return false;
      }

      if (!config.publicBaseUrl.includes('.r2.dev')) {
        console.error('[R2ConfigService] ❌ CRITICAL: Public URL must use .r2.dev domain');
        console.error('[R2ConfigService] Got:', config.publicBaseUrl);
        return false;
      }

      console.log('[R2ConfigService] Configuration validation passed');
      return true;
    } catch (error) {
      console.error('[R2ConfigService] Configuration validation failed:', error);
      return false;
    }
  }

  /**
   * Get detailed configuration status for debugging
   */
  getConfigurationStatus(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const config = this.loadConfig();
      
      // Check each field
      if (!config.accountId || config.accountId.length === 0) {
        errors.push('Account ID is missing');
      } else if (!/^[a-f0-9]{32}$/i.test(config.accountId)) {
        warnings.push('Account ID format may be invalid');
      }

      if (!config.accessKeyId || config.accessKeyId.length === 0) {
        errors.push('Access Key ID is missing');
      } else if (config.accessKeyId.length < 20) {
        warnings.push('Access Key ID format may be invalid');
      }

      if (!config.secretAccessKey || config.secretAccessKey.length === 0) {
        errors.push('Secret Access Key is missing');
      } else if (config.secretAccessKey.length < 40) {
        warnings.push('Secret Access Key format may be invalid');
      }

      if (!config.endpoint || !config.endpoint.startsWith('https://')) {
        errors.push('Endpoint is missing or invalid (must start with https://)');
      }

      if (!config.publicBucketName || config.publicBucketName.length === 0) {
        errors.push('Public bucket name is missing');
      }

      if (!config.privateBucketName || config.privateBucketName.length === 0) {
        errors.push('Private bucket name is missing');
      }

      if (config.publicBucketName === config.privateBucketName) {
        errors.push('Public and private bucket names must be different');
      }

      if (!config.publicBaseUrl || !config.publicBaseUrl.startsWith('https://')) {
        errors.push('Public base URL is missing or invalid (must start with https://)');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Configuration loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Get full configuration object (for debugging/testing)
   */
  getConfig(): R2Config {
    return this.loadConfig();
  }

  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    R2ConfigService.instance = new R2ConfigService();
  }
}

export default R2ConfigService;
export type { R2Config };