import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { Profile, EnhancedSession, AuthError, AuthErrorType, STORAGE_KEYS } from '../types/auth';
import { SecurityUtils } from './SecurityUtils';

export interface SessionPersistenceInterface {
  saveSession(session: Session, profile: Profile): Promise<void>;
  restoreSession(): Promise<{session: Session | null, profile: Profile | null}>;
  clearSession(): Promise<void>;
  validateStoredData(): Promise<boolean>;
}

/**
 * SessionPersistence service handles secure storage and restoration of session and profile data
 * Implements encryption for sensitive data and provides data integrity validation
 */
class SessionPersistence implements SessionPersistenceInterface {
  private readonly ENCRYPTION_KEY = 'session_encryption_key';
  private readonly SESSION_VERSION = '1.0';
  private readonly MAX_SESSION_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

  /**
   * Save session and profile data securely
   * Encrypts sensitive data and stores with integrity checks
   */
  async saveSession(session: Session, profile: Profile): Promise<void> {
    try {
      console.log('💾 Saving session and profile data...');

      // Create enhanced session with metadata
      const enhancedSession: EnhancedSession = {
        ...session,
        stored_at: Date.now(),
        last_refreshed: Date.now()
      };

      // Validate input data before storing
      if (!this.validateSessionData(session)) {
        throw new AuthError({
          type: AuthErrorType.STORAGE_ERROR,
          message: 'Invalid session data provided for storage'
        });
      }

      if (!this.validateProfileData(profile)) {
        throw new AuthError({
          type: AuthErrorType.STORAGE_ERROR,
          message: 'Invalid profile data provided for storage'
        });
      }

      // Store sensitive tokens in SecureStore
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, session.access_token);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, session.refresh_token);

      // Prepare session metadata (non-sensitive data)
      const sessionMetadata = {
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
        stored_at: enhancedSession.stored_at,
        last_refreshed: enhancedSession.last_refreshed,
        version: this.SESSION_VERSION
      };

      // Store session metadata in AsyncStorage
      await AsyncStorage.setItem(
        STORAGE_KEYS.SESSION_DATA, 
        JSON.stringify(sessionMetadata)
      );

      // Encrypt and store profile data
      const encryptedProfile = await this.encryptData(profile);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, encryptedProfile);

      // Store integrity checksum
      const checksum = await this.generateDataChecksum(sessionMetadata, profile);
      await AsyncStorage.setItem('session_checksum', checksum);

      // Update last refresh timestamp
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_REFRESH, 
        (enhancedSession.last_refreshed || enhancedSession.stored_at).toString()
      );

      console.log('✅ Session and profile data saved successfully');
    } catch (error) {
      console.error('❌ Failed to save session data:', error);
      
      // Clean up any partially stored data
      await this.cleanupPartialData();
      
      if (error instanceof AuthError) {
        throw error;
      } else {
        throw new AuthError({
          type: AuthErrorType.STORAGE_ERROR,
          message: 'Failed to save session and profile data',
          originalError: error
        });
      }
    }
  }

  /**
   * Restore session and profile data from storage
   * Validates data integrity and handles corruption gracefully
   */
  async restoreSession(): Promise<{session: Session | null, profile: Profile | null}> {
    try {
      console.log('🔄 Restoring session from storage...');

      // Enhanced validation with corruption detection and recovery
      const isValid = await this.validateAndRecoverData();
      if (!isValid) {
        console.log('Stored data validation failed or corruption detected, data cleared');
        return { session: null, profile: null };
      }

      // Get tokens from SecureStore
      const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

      if (!accessToken || !refreshToken) {
        console.log('No stored tokens found');
        return { session: null, profile: null };
      }

      // Get session metadata from AsyncStorage
      const sessionDataString = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_DATA);
      if (!sessionDataString) {
        console.log('No stored session metadata found');
        await this.clearSession(); // Clean up orphaned tokens
        return { session: null, profile: null };
      }

      const sessionMetadata = JSON.parse(sessionDataString);

      // Check session age
      if (this.isSessionTooOld(sessionMetadata.stored_at)) {
        console.log('Stored session is too old, clearing');
        await this.clearSession();
        return { session: null, profile: null };
      }

      // Reconstruct the enhanced session
      const enhancedSession: EnhancedSession = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: sessionMetadata.expires_at,
        expires_in: sessionMetadata.expires_in,
        token_type: sessionMetadata.token_type,
        user: sessionMetadata.user,
        stored_at: sessionMetadata.stored_at,
        last_refreshed: sessionMetadata.last_refreshed
      };

      // Get and decrypt profile data
      let profile: Profile | null = null;
      const encryptedProfile = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (encryptedProfile) {
        try {
          profile = await this.decryptData(encryptedProfile);
        } catch (error) {
          console.error('Failed to decrypt profile data:', error);
          // Continue without profile data - it can be refetched
        }
      }

      console.log('✅ Session restored successfully');
      return { session: enhancedSession, profile };
    } catch (error) {
      console.error('❌ Failed to restore session:', error);
      
      // Clear potentially corrupted data
      await this.clearSession();
      
      return { session: null, profile: null };
    }
  }

  /**
   * Clear all session and profile data from storage with secure cleanup
   * Ensures complete cleanup for logout scenarios with data overwriting
   */
  async clearSession(): Promise<void> {
    try {
      console.log('🧹 Performing secure session data cleanup...');

      // Secure cleanup of SecureStore keys
      const secureStoreKeys = [
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        this.ENCRYPTION_KEY
      ];

      await SecurityUtils.secureCleanup(secureStoreKeys, 'secure');

      // Secure cleanup of AsyncStorage keys
      const asyncStorageKeys = [
        STORAGE_KEYS.SESSION_DATA,
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.LAST_REFRESH,
        'session_checksum'
      ];

      await SecurityUtils.secureCleanup(asyncStorageKeys, 'async');

      console.log('✅ All session data securely cleared');
    } catch (error) {
      console.error('❌ Failed to clear session data:', error);
      // Don't throw here - clearing should be best effort
    }
  }

  /**
   * Validate stored data integrity and format
   * Checks for corruption and ensures data consistency
   */
  async validateStoredData(): Promise<boolean> {
    try {
      // Check if required data exists
      const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      const sessionDataString = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_DATA);

      if (!accessToken || !refreshToken || !sessionDataString) {
        console.log('Missing required session data');
        return false;
      }

      // Validate session metadata format
      let sessionMetadata;
      try {
        sessionMetadata = JSON.parse(sessionDataString);
      } catch (error) {
        console.log('Invalid session metadata JSON');
        return false;
      }

      // Check session metadata structure
      if (!this.validateSessionMetadata(sessionMetadata)) {
        console.log('Invalid session metadata structure');
        return false;
      }

      // Validate token formats
      if (!this.isValidJWTFormat(accessToken) || !this.isValidJWTFormat(refreshToken)) {
        console.log('Invalid token formats');
        return false;
      }

      // Enhanced data integrity validation
      const storedChecksum = await AsyncStorage.getItem('session_checksum');
      if (storedChecksum) {
        const profileData = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
        let profile: Profile | null = null;
        
        if (profileData) {
          // Check for corruption before decryption
          if (SecurityUtils.detectCorruption(profileData)) {
            console.log('Profile data corruption detected');
            return false;
          }
          
          try {
            profile = await this.decryptData(profileData);
            
            // Validate decrypted profile structure
            if (!SecurityUtils.validateDataIntegrity(profile, {
              id: '',
              email: '',
              first_name: '',
              last_name: '',
              role: '',
              organization: ''
            })) {
              console.log('Decrypted profile data integrity validation failed');
              return false;
            }
          } catch (error) {
            console.log('Failed to decrypt profile for validation');
            return false;
          }
        }

        const currentChecksum = await this.generateDataChecksum(sessionMetadata, profile);
        if (currentChecksum !== storedChecksum) {
          console.log('Data integrity check failed - checksum mismatch');
          return false;
        }
      }

      // Check session age
      if (this.isSessionTooOld(sessionMetadata.stored_at)) {
        console.log('Session is too old');
        return false;
      }

      console.log('✅ Stored data validation passed');
      return true;
    } catch (error) {
      console.error('Error validating stored data:', error);
      return false;
    }
  }

  /**
   * Encrypt sensitive data before storage with enhanced security
   */
  private async encryptData(data: any): Promise<string> {
    try {
      // Get or create encryption key
      let encryptionKey = await SecureStore.getItemAsync(this.ENCRYPTION_KEY);
      if (!encryptionKey) {
        encryptionKey = SecurityUtils.generateSecureRandom(64); // More secure key generation
        await SecureStore.setItemAsync(this.ENCRYPTION_KEY, encryptionKey);
      }

      // Use enhanced encryption with integrity protection
      return await SecurityUtils.encryptWithIntegrity(data, encryptionKey);
    } catch (error) {
      console.error('Failed to encrypt data:', error);
      throw new AuthError({
        type: AuthErrorType.STORAGE_ERROR,
        message: 'Failed to encrypt sensitive data',
        originalError: error
      });
    }
  }

  /**
   * Decrypt sensitive data from storage with integrity verification
   */
  private async decryptData(encryptedData: string): Promise<any> {
    try {
      // Check for data corruption before attempting decryption
      if (SecurityUtils.detectCorruption(encryptedData)) {
        throw new Error('Data corruption detected');
      }

      const encryptionKey = await SecureStore.getItemAsync(this.ENCRYPTION_KEY);
      if (!encryptionKey) {
        throw new Error('Encryption key not found');
      }

      // Use enhanced decryption with integrity verification
      return await SecurityUtils.decryptWithIntegrity(encryptedData, encryptionKey);
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      throw new AuthError({
        type: AuthErrorType.STORAGE_ERROR,
        message: 'Failed to decrypt sensitive data or integrity verification failed',
        originalError: error
      });
    }
  }

  /**
   * Generate data checksum for integrity validation
   */
  private async generateDataChecksum(sessionMetadata: any, profile: Profile | null): Promise<string> {
    try {
      const dataToHash = {
        session: {
          expires_at: sessionMetadata.expires_at,
          user_id: sessionMetadata.user?.id,
          stored_at: sessionMetadata.stored_at
        },
        profile: profile ? {
          id: profile.id,
          email: profile.email,
          role: profile.role
        } : null
      };

      // Simple checksum using JSON string length and character codes
      const jsonString = JSON.stringify(dataToHash);
      let checksum = 0;
      for (let i = 0; i < jsonString.length; i++) {
        checksum += jsonString.charCodeAt(i) * (i + 1);
      }
      
      return checksum.toString(36); // Base36 encoding
    } catch (error) {
      console.error('Failed to generate checksum:', error);
      return '';
    }
  }



  /**
   * Validate session data structure
   */
  private validateSessionData(session: Session): boolean {
    return !!(
      session &&
      session.access_token &&
      session.refresh_token &&
      session.user &&
      session.user.id &&
      session.expires_at &&
      session.expires_in
    );
  }

  /**
   * Validate profile data structure
   */
  private validateProfileData(profile: Profile): boolean {
    return !!(
      profile &&
      profile.id &&
      profile.email &&
      profile.first_name &&
      profile.last_name &&
      profile.role &&
      profile.organization
    );
  }

  /**
   * Validate session metadata structure
   */
  private validateSessionMetadata(metadata: any): boolean {
    return !!(
      metadata &&
      metadata.expires_at &&
      metadata.expires_in &&
      metadata.token_type &&
      metadata.user &&
      metadata.user.id &&
      metadata.stored_at &&
      typeof metadata.stored_at === 'number'
    );
  }

  /**
   * Check if session is too old
   */
  private isSessionTooOld(storedAt: number): boolean {
    const now = Date.now();
    const age = now - storedAt;
    return age > this.MAX_SESSION_AGE;
  }

  /**
   * Validate JWT format
   */
  private isValidJWTFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  /**
   * Clean up partially stored data in case of errors with secure deletion
   */
  private async cleanupPartialData(): Promise<void> {
    try {
      console.log('🧹 Cleaning up partial data...');
      
      // Secure cleanup of potentially corrupted data
      const keysToClean = [
        STORAGE_KEYS.SESSION_DATA,
        STORAGE_KEYS.USER_PROFILE,
        'session_checksum'
      ];

      await SecurityUtils.secureCleanup(keysToClean, 'async');
      
      console.log('✅ Partial data cleanup completed');
    } catch (error) {
      console.warn('Partial data cleanup failed:', error);
      // Continue execution even if cleanup fails
    }
  }

  /**
   * Detect and recover from data corruption
   */
  private async detectAndRecoverCorruption(): Promise<boolean> {
    try {
      console.log('🔍 Checking for data corruption...');
      
      // Check each stored data item for corruption
      const itemsToCheck = [
        { key: STORAGE_KEYS.SESSION_DATA, type: 'json' },
        { key: STORAGE_KEYS.USER_PROFILE, type: 'encrypted' },
        { key: 'session_checksum', type: 'string' }
      ];

      let corruptionDetected = false;

      for (const item of itemsToCheck) {
        try {
          const data = await AsyncStorage.getItem(item.key);
          if (data) {
            if (SecurityUtils.detectCorruption(data)) {
              console.warn(`Corruption detected in ${item.key}`);
              corruptionDetected = true;
              
              // Mark corrupted data for cleanup
              await AsyncStorage.setItem(item.key, '__CORRUPTED__');
            }
          }
        } catch (error) {
          console.warn(`Error checking ${item.key} for corruption:`, error);
          corruptionDetected = true;
        }
      }

      if (corruptionDetected) {
        console.log('🚨 Data corruption detected, initiating recovery...');
        await this.clearSession();
        return false; // Indicate that recovery was needed
      }

      console.log('✅ No data corruption detected');
      return true; // Data is clean
    } catch (error) {
      console.error('Error during corruption detection:', error);
      // If we can't check for corruption, assume it's corrupted and clear
      await this.clearSession();
      return false;
    }
  }

  /**
   * Enhanced data validation with corruption recovery
   */
  async validateAndRecoverData(): Promise<boolean> {
    try {
      // First check for corruption
      const isClean = await this.detectAndRecoverCorruption();
      if (!isClean) {
        return false;
      }

      // Then validate stored data structure
      return await this.validateStoredData();
    } catch (error) {
      console.error('Data validation and recovery failed:', error);
      await this.clearSession();
      return false;
    }
  }
}

// Create and export a singleton instance
export const sessionPersistence = new SessionPersistence();
export default SessionPersistence;