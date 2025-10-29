import { PutObjectCommand } from '@aws-sdk/client-s3';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import R2ConfigService from './R2ConfigService';
import { networkErrorHandler } from './NetworkErrorHandler';
import { useNetworkConnectivity } from '../hooks/useNetworkConnectivity';

/**
 * Image validation result interface
 */
interface ValidationResult {
  valid: boolean;
  error?: string;
  fileSize?: number;
  mimeType?: string;
}

/**
 * Upload progress callback interface
 */
interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'validation' | 'upload' | 'processing' | 'complete';
  message?: string;
}

/**
 * Upload options interface
 */
interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  enableProgressTracking?: boolean;
  chunkSize?: number;
}

/**
 * Enhanced error types for image upload operations
 */
export enum ImageUploadErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Enhanced error class for image upload operations
 */
class ImageUploadErrorClass extends Error {
  public readonly type: ImageUploadErrorType;
  public readonly isRetryable: boolean;
  public readonly userMessage: string;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;

  constructor(
    type: ImageUploadErrorType,
    message: string,
    userMessage: string,
    isRetryable: boolean = false,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ImageUploadError';
    this.type = type;
    this.isRetryable = isRetryable;
    this.userMessage = userMessage;
    this.originalError = originalError;
    this.context = context;
  }
}

// Export the class with the correct name
export { ImageUploadErrorClass as ImageUploadError };

/**
 * Network connectivity check result
 */
interface ConnectivityCheckResult {
  isConnected: boolean;
  canUpload: boolean;
  error?: string;
}

/**
 * Service for handling image uploads to Cloudflare R2 storage
 * Supports both public (announcements/events) and private (volunteer hours) uploads
 */
class ImageUploadService {
  private static instance: ImageUploadService;
  private r2Config: R2ConfigService;

  private constructor() {
    this.r2Config = R2ConfigService.getInstance();
  }

  /**
   * Get singleton instance of ImageUploadService
   */
  static getInstance(): ImageUploadService {
    if (!ImageUploadService.instance) {
      ImageUploadService.instance = new ImageUploadService();
    }
    return ImageUploadService.instance;
  }

  /**
   * iOS-optimized connectivity check - simplified to avoid blocking uploads
   */
  private async checkNetworkConnectivity(): Promise<ConnectivityCheckResult> {
    console.log('[ImageUpload] Skipping network pre-check for iOS compatibility');
    
    // Skip network pre-check on iOS to avoid blocking uploads
    // The actual upload will provide proper network error feedback if needed
    return {
      isConnected: true,
      canUpload: true,
    };
  }

  /**
   * iOS-optimized image validation with minimal file system access
   */
  async validateImage(imageUri: string): Promise<ValidationResult> {
    try {
      console.log('[ImageUpload] Starting iOS-optimized validation for:', imageUri);

      // Input validation
      if (!imageUri || typeof imageUri !== 'string') {
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.VALIDATION_ERROR,
          'Invalid image URI provided',
          'Please select a valid image file',
          false
        );
      }

      // Sanitize URI
      const sanitizedUri = imageUri.trim();
      if (!sanitizedUri) {
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.VALIDATION_ERROR,
          'Empty image URI provided',
          'Please select an image file',
          false
        );
      }

      // Basic file extension validation (trust the ImagePicker for the rest)
      const validExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];
      const extension = sanitizedUri.toLowerCase().split('.').pop();
      
      if (!extension || !validExtensions.includes(`.${extension}`)) {
        console.log('[ImageUpload] Invalid extension:', extension);
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.VALIDATION_ERROR,
          `Invalid file extension: ${extension}`,
          'Invalid file type. Please select a JPG, PNG, or HEIC image',
          false,
          undefined,
          { extension, validExtensions }
        );
      }

      // Determine MIME type based on extension
      let mimeType = 'image/jpeg';
      if (extension === 'png') {
        mimeType = 'image/png';
      } else if (extension === 'heic') {
        mimeType = 'image/heic';
      } else if (extension === 'heif') {
        mimeType = 'image/heif';
      }

      console.log('[ImageUpload] Validation successful - Extension:', extension, 'MIME:', mimeType);

      // Return success without file system checks that cause issues on iOS
      return {
        valid: true,
        fileSize: undefined, // Skip size check to avoid iOS file access issues
        mimeType
      };
    } catch (error) {
      console.error('[ImageUpload] Validation error:', error);
      
      if (error instanceof ImageUploadErrorClass) {
        return {
          valid: false,
          error: error.userMessage
        };
      }

      return {
        valid: false,
        error: 'Unable to validate image. Please try again.'
      };
    }
  }

  /**
   * Validate image file header to detect corruption or invalid formats
   */
  private validateImageHeader(headerBuffer: Buffer, extension: string): boolean {
    if (headerBuffer.length < 4) {
      return false;
    }

    // Check for common image file signatures
    const header = headerBuffer.subarray(0, 12); // Need more bytes for HEIC detection
    
    if (extension === 'jpg' || extension === 'jpeg') {
      // JPEG files start with FF D8 FF
      return header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
    } else if (extension === 'png') {
      // PNG files start with 89 50 4E 47
      return header[0] === 0x89 && header[1] === 0x50 && 
             header[2] === 0x4E && header[3] === 0x47;
    } else if (extension === 'heic' || extension === 'heif') {
      // HEIC/HEIF files have "ftyp" at bytes 4-7 and "heic" or "mif1" at bytes 8-11
      if (header.length >= 12) {
        const ftypSignature = header.subarray(4, 8).toString('ascii');
        const brandSignature = header.subarray(8, 12).toString('ascii');
        return ftypSignature === 'ftyp' && (brandSignature === 'heic' || brandSignature === 'mif1' || brandSignature === 'msf1');
      }
      return false;
    }

    return false;
  }

  /**
   * Generate unique filename with proper path convention
   */
  generateFilename(prefix: string, orgId: string, userId?: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const filename = `${timestamp}-${randomString}.jpg`;
    
    if (userId) {
      // Private path for volunteer hours: volunteer-hours/{org_id}/{user_id}/{filename}
      return `${prefix}/${orgId}/${userId}/${filename}`;
    } else {
      // Public path for announcements/events: {prefix}/{org_id}/{filename}
      return `${prefix}/${orgId}/${filename}`;
    }
  }

  /**
   * Upload image to public bucket (for announcements, events, and proof images)
   * Returns the direct public URL with comprehensive error handling
   */
  async uploadPublicImage(
    imageUri: string, 
    type: 'announcements' | 'events' | 'proof-images', 
    orgId: string,
    options?: UploadOptions
  ): Promise<string> {
    const context = { operation: 'uploadPublicImage', type, orgId, imageUri };
    
    try {
      console.log('[ImageUpload] Starting public image upload:', context);
      // Check network connectivity first
      const connectivityCheck = await this.checkNetworkConnectivity();
      if (!connectivityCheck.canUpload) {
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.NETWORK_ERROR,
          'Network connectivity check failed',
          connectivityCheck.error || 'No internet connection. Please check your network and try again.',
          true,
          undefined,
          context
        );
      }

      // Validate inputs
      if (!imageUri || !type || !orgId) {
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.VALIDATION_ERROR,
          'Missing required parameters',
          'Invalid upload parameters. Please try again.',
          false,
          undefined,
          context
        );
      }

      // Report validation progress
      if (options?.onProgress) {
        options.onProgress({
          loaded: 0,
          total: 100,
          percentage: 0,
          stage: 'validation',
          message: 'Validating image...'
        });
      }

      // Validate image
      const validation = await this.validateImage(imageUri);
      if (!validation.valid) {
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.VALIDATION_ERROR,
          validation.error || 'Image validation failed',
          validation.error || 'Image validation failed',
          false,
          undefined,
          context
        );
      }

      // Report validation complete
      if (options?.onProgress) {
        options.onProgress({
          loaded: 25,
          total: 100,
          percentage: 25,
          stage: 'validation',
          message: 'Validation complete'
        });
      }

      // Check R2 configuration
      if (!this.r2Config.validateConfiguration()) {
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.CONFIGURATION_ERROR,
          'R2 configuration is invalid',
          'Upload service is not properly configured. Please try again later.',
          false,
          undefined,
          context
        );
      }

      // Execute upload with simplified error handling for debugging
      try {
        console.log('[ImageUpload] Getting R2 configuration...');
        const s3Client = this.r2Config.getS3Client();
        const bucketName = this.r2Config.getPublicBucketName();
        const publicBaseUrl = this.r2Config.getPublicBaseUrl();
        console.log('[ImageUpload] R2 config loaded:', { bucketName, publicBaseUrl });
            
            // Generate filename with proper path
            const key = this.generateFilename(type, orgId);
            
            // Report upload start
            if (options?.onProgress) {
              options.onProgress({
                loaded: 30,
                total: 100,
                percentage: 30,
                stage: 'upload',
                message: 'Reading image file...'
              });
            }
            
            // Read file content with error handling using legacy API
            let fileContent: string;
            try {
              fileContent = await FileSystem.readAsStringAsync(imageUri, {
                encoding: 'base64'
              });
            } catch (fsError) {
              throw new ImageUploadErrorClass(
                ImageUploadErrorType.FILE_SYSTEM_ERROR,
                'Failed to read image file',
                'Unable to read the selected image. Please try selecting it again.',
                true,
                fsError as Error,
                { ...context, key }
              );
            }

            // Report file read complete
            if (options?.onProgress) {
              options.onProgress({
                loaded: 50,
                total: 100,
                percentage: 50,
                stage: 'upload',
                message: 'Uploading to cloud storage...'
              });
            }
            
            // Convert base64 to buffer
            const buffer = Buffer.from(fileContent, 'base64');
            
            // Validate buffer size
            if (buffer.length === 0) {
              throw new ImageUploadErrorClass(
                ImageUploadErrorType.VALIDATION_ERROR,
                'Empty file buffer',
                'The selected image appears to be empty. Please select another image.',
                false,
                undefined,
                { ...context, key }
              );
            }
            
            // Create upload command
            const command = new PutObjectCommand({
              Bucket: bucketName,
              Key: key,
              Body: buffer,
              ContentType: validation.mimeType,
              ACL: 'public-read',
              Metadata: {
                'upload-timestamp': Date.now().toString(),
                'upload-type': type,
                'org-id': orgId
              }
            });

            // Execute S3 upload
            try {
              console.log('[ImageUpload] Sending S3 command:', { bucketName, key, contentType: validation.mimeType });
              await s3Client.send(command);
              console.log('[ImageUpload] S3 upload successful');
            } catch (s3Error) {
              console.error('[ImageUpload] S3 upload failed:', s3Error);
              throw new ImageUploadErrorClass(
                ImageUploadErrorType.STORAGE_ERROR,
                'S3 upload failed',
                'Upload failed. Please check your connection and try again.',
                true,
                s3Error as Error,
                { ...context, key, bucketName }
              );
            }

            // Report upload complete
            if (options?.onProgress) {
              options.onProgress({
                loaded: 90,
                total: 100,
                percentage: 90,
                stage: 'processing',
                message: 'Finalizing upload...'
              });
            }

            // Return direct public URL
            const publicUrl = `${publicBaseUrl}/${key}`;
            
            // Validate the generated URL format - MUST use public R2 format
            if (!publicUrl.startsWith('https://pub-')) {
              console.error('[ImageUpload] ❌ CRITICAL: Wrong URL format detected!');
              console.error('[ImageUpload] Expected: https://pub-[hash].r2.dev');
              console.error('[ImageUpload] Got:', publicUrl);
              console.error('[ImageUpload] Base URL:', publicBaseUrl);
              
              throw new ImageUploadErrorClass(
                ImageUploadErrorType.CONFIGURATION_ERROR,
                'Invalid public URL format - must use R2 public domain',
                'Upload service configuration error. Please restart the app.',
                false,
                undefined,
                { ...context, key, publicUrl, publicBaseUrl }
              );
            }
            
            if (!publicUrl.includes('.r2.dev/')) {
              throw new ImageUploadErrorClass(
                ImageUploadErrorType.CONFIGURATION_ERROR,
                'Invalid R2 public URL format',
                'Upload service configuration error. Please restart the app.',
                false,
                undefined,
                { ...context, key, publicUrl }
              );
            }

            // Report complete
            if (options?.onProgress) {
              options.onProgress({
                loaded: 100,
                total: 100,
                percentage: 100,
                stage: 'complete',
                message: 'Upload complete!'
              });
            }
            
        console.log('[ImageUpload] Upload completed successfully:', publicUrl);
        return publicUrl;
      } catch (error) {
        console.error('[ImageUpload] Upload failed at step:', error);
        if (error instanceof ImageUploadErrorClass) {
          throw error;
        }
        
        // Handle unexpected errors with more details
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.UNKNOWN_ERROR,
          'Unexpected upload error',
          'Upload failed due to an unexpected error. Please try again.',
          true,
          error as Error,
          context
        );
      }
      
    } catch (error) {
      if (error instanceof ImageUploadErrorClass) {
        console.error('Public image upload error:', error.message, error.context);
        throw error;
      }
      
      console.error('Unexpected public image upload error:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        context
      });
      throw new ImageUploadErrorClass(
        ImageUploadErrorType.UNKNOWN_ERROR,
        'Unexpected upload error',
        'Upload failed. Please check your connection and try again.',
        true,
        error as Error,
        context
      );
    }
  }

  /**
   * Upload image to private bucket (for volunteer hours)
   * Returns the file path (not a URL) with comprehensive error handling
   */
  async uploadPrivateImage(
    imageUri: string,
    orgId: string,
    userId: string,
    options?: UploadOptions
  ): Promise<string> {
    const context = { operation: 'uploadPrivateImage', orgId, userId, imageUri };
    
    try {
      // Check network connectivity first
      const connectivityCheck = await this.checkNetworkConnectivity();
      if (!connectivityCheck.canUpload) {
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.NETWORK_ERROR,
          'Network connectivity check failed',
          connectivityCheck.error || 'No internet connection. Please check your network and try again.',
          true,
          undefined,
          context
        );
      }

      // Validate inputs
      if (!imageUri || !orgId || !userId) {
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.VALIDATION_ERROR,
          'Missing required parameters',
          'Invalid upload parameters. Please try again.',
          false,
          undefined,
          context
        );
      }

      // Validate UUID format for orgId and userId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(orgId)) {
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.VALIDATION_ERROR,
          'Invalid organization ID format',
          'Invalid organization information. Please try logging out and back in.',
          false,
          undefined,
          context
        );
      }
      
      if (!uuidRegex.test(userId)) {
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.VALIDATION_ERROR,
          'Invalid user ID format',
          'Invalid user information. Please try logging out and back in.',
          false,
          undefined,
          context
        );
      }

      // Validate image
      const validation = await this.validateImage(imageUri);
      if (!validation.valid) {
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.VALIDATION_ERROR,
          validation.error || 'Image validation failed',
          validation.error || 'Image validation failed',
          false,
          undefined,
          context
        );
      }

      // Check R2 configuration
      if (!this.r2Config.validateConfiguration()) {
        throw new ImageUploadErrorClass(
          ImageUploadErrorType.CONFIGURATION_ERROR,
          'R2 configuration is invalid',
          'Upload service is not properly configured. Please try again later.',
          false,
          undefined,
          context
        );
      }

      // Execute upload with comprehensive error handling
      return await networkErrorHandler.executeWithRetry(
        async () => {
          try {
            const s3Client = this.r2Config.getS3Client();
            const bucketName = this.r2Config.getPrivateBucketName();
            
            // Generate filename with proper path
            const key = this.generateFilename('volunteer-hours', orgId, userId);
            
            // Read file content with error handling using legacy API
            let fileContent: string;
            try {
              fileContent = await FileSystem.readAsStringAsync(imageUri, {
                encoding: 'base64'
              });
            } catch (fsError) {
              throw new ImageUploadErrorClass(
                ImageUploadErrorType.FILE_SYSTEM_ERROR,
                'Failed to read image file',
                'Unable to read the selected image. Please try selecting it again.',
                true,
                fsError as Error,
                { ...context, key }
              );
            }
            
            // Convert base64 to buffer
            const buffer = Buffer.from(fileContent, 'base64');
            
            // Validate buffer size
            if (buffer.length === 0) {
              throw new ImageUploadErrorClass(
                ImageUploadErrorType.VALIDATION_ERROR,
                'Empty file buffer',
                'The selected image appears to be empty. Please select another image.',
                false,
                undefined,
                { ...context, key }
              );
            }
            
            // Create upload command (no public ACL for private bucket)
            const command = new PutObjectCommand({
              Bucket: bucketName,
              Key: key,
              Body: buffer,
              ContentType: validation.mimeType,
              Metadata: {
                'upload-timestamp': Date.now().toString(),
                'upload-type': 'volunteer-hours',
                'org-id': orgId,
                'user-id': userId
              }
            });

            // Execute S3 upload
            try {
              await s3Client.send(command);
            } catch (s3Error) {
              throw new ImageUploadErrorClass(
                ImageUploadErrorType.STORAGE_ERROR,
                'S3 upload failed',
                'Upload failed. Please check your connection and try again.',
                true,
                s3Error as Error,
                { ...context, key, bucketName }
              );
            }

            // Validate the generated key
            if (!key.startsWith('volunteer-hours/')) {
              throw new ImageUploadErrorClass(
                ImageUploadErrorType.CONFIGURATION_ERROR,
                'Invalid file path generated',
                'Upload completed but path generation failed. Please contact support.',
                false,
                undefined,
                { ...context, key }
              );
            }
            
            return key;
          } catch (error) {
            if (error instanceof ImageUploadErrorClass) {
              throw error;
            }
            
            // Handle unexpected errors
            throw new ImageUploadErrorClass(
              ImageUploadErrorType.UNKNOWN_ERROR,
              'Unexpected upload error',
              'Upload failed due to an unexpected error. Please try again.',
              true,
              error as Error,
              context
            );
          }
        },
        'upload_private_image',
        {
          maxRetries: 3,
          baseDelay: 1000,
          maxDelay: 10000,
          timeoutMs: 30000
        }
      );
      
    } catch (error) {
      if (error instanceof ImageUploadErrorClass) {
        console.error('Private image upload error:', error.message, error.context);
        throw error;
      }
      
      console.error('Unexpected private image upload error:', error);
      throw new ImageUploadErrorClass(
        ImageUploadErrorType.UNKNOWN_ERROR,
        'Unexpected upload error',
        'Upload failed. Please check your connection and try again.',
        true,
        error as Error,
        context
      );
    }
  }

  /**
   * Get user-friendly error message from ImageUploadError
   */
  public static getErrorMessage(error: unknown): string {
    if (error instanceof ImageUploadErrorClass) {
      return error.userMessage;
    }
    
    if (error instanceof Error) {
      // Handle common error patterns
      const message = error.message.toLowerCase();
      
      if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
        return 'Network error. Please check your connection and try again.';
      }
      
      if (message.includes('timeout')) {
        return 'Upload timed out. Please check your connection and try again.';
      }
      
      if (message.includes('permission') || message.includes('unauthorized')) {
        return 'Permission denied. Please try logging out and back in.';
      }
      
      if (message.includes('file') && message.includes('not found')) {
        return 'The selected file could not be found. Please select another image.';
      }
      
      return error.message;
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Check if an error is retryable
   */
  public static isRetryableError(error: unknown): boolean {
    if (error instanceof ImageUploadErrorClass) {
      return error.isRetryable;
    }
    
    // Default retry logic for non-ImageUploadError instances
    return networkErrorHandler.isRetryableError(error as Error);
  }

  /**
   * Check if R2 configuration is valid
   */
  isConfigured(): boolean {
    return this.r2Config.validateConfiguration();
  }
}

export default ImageUploadService;
export type { ValidationResult, UploadProgress };