import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { EnhancedSession, AuthError, AuthErrorType, STORAGE_KEYS } from '../types/auth';
import { supabase } from '../lib/supabaseClient';

export interface TokenManagerInterface {
  storeTokens(session: Session): Promise<void>;
  getStoredSession(): Promise<EnhancedSession | null>;
  refreshTokens(): Promise<Session | null>;
  clearTokens(): Promise<void>;
  isTokenExpired(token: string): boolean;
  validateSession(session: Session): boolean;
  shouldRefreshToken(session: Session): boolean;
  scheduleTokenRefresh(session: Session): void;
  cancelScheduledRefresh(): void;
  
  // Enhanced background monitoring methods
  startBackgroundMonitoring(callbacks?: {
    onSessionExpired?: () => void;
    onSessionRefreshed?: (session: Session) => void;
  }): void;
  stopBackgroundMonitoring(): void;
  pauseBackgroundMonitoring(): void;
  resumeBackgroundMonitoring(): void;
  isBackgroundMonitoringActive(): boolean;
  setMonitoringInterval(intervalMs: number): void;
  setRefreshBuffer(bufferSeconds: number): void;
}

class TokenManager implements TokenManagerInterface {
  private refreshPromise: Promise<Session | null> | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private refreshQueue: Array<{
    resolve: (session: Session | null) => void;
    reject: (error: any) => void;
  }> = [];
  
  // Enhanced background monitoring
  private monitoringTimer: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;
  private monitoringInterval: number = 60000; // Check every minute
  private refreshBuffer: number = 600; // Refresh 10 minutes before expiry
  private onSessionExpired?: () => void;
  private onSessionRefreshed?: (session: Session) => void;

  /**
   * Store tokens securely using Expo SecureStore for sensitive data
   * and AsyncStorage for non-sensitive session metadata
   */
  async storeTokens(session: Session): Promise<void> {
    try {
      const enhancedSession: EnhancedSession = {
        ...session,
        stored_at: Date.now(),
        last_refreshed: Date.now()
      };

      // Store sensitive tokens in SecureStore
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, session.access_token);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, session.refresh_token);

      // Store non-sensitive session data in AsyncStorage
      const sessionData = {
        expires_at: session.expires_at,
        expires_in: session.expires_in,
        token_type: session.token_type,
        user: session.user,
        stored_at: enhancedSession.stored_at,
        last_refreshed: enhancedSession.last_refreshed
      };

      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_DATA, JSON.stringify(sessionData));
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_REFRESH, (enhancedSession.last_refreshed || enhancedSession.stored_at).toString());

      console.log('✅ Tokens stored successfully');
    } catch (error) {
      console.error('❌ Failed to store tokens:', error);
      const authError = new AuthError({
        type: AuthErrorType.STORAGE_ERROR,
        message: 'Failed to store authentication tokens',
        originalError: error
      });
      throw authError;
    }
  }

  /**
   * Retrieve and validate stored session from secure storage
   */
  async getStoredSession(): Promise<EnhancedSession | null> {
    try {
      // Get tokens from SecureStore
      const accessToken = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

      if (!accessToken || !refreshToken) {
        console.log('No stored tokens found');
        return null;
      }

      // Get session data from AsyncStorage
      const sessionDataString = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_DATA);
      if (!sessionDataString) {
        console.log('No stored session data found');
        await this.clearTokens(); // Clean up orphaned tokens
        return null;
      }

      const sessionData = JSON.parse(sessionDataString);
      
      // Reconstruct the enhanced session
      const enhancedSession: EnhancedSession = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: sessionData.expires_at,
        expires_in: sessionData.expires_in,
        token_type: sessionData.token_type,
        user: sessionData.user,
        stored_at: sessionData.stored_at,
        last_refreshed: sessionData.last_refreshed
      };

      // Validate the session
      if (!this.validateSession(enhancedSession)) {
        console.log('Stored session is invalid');
        await this.clearTokens();
        return null;
      }

      console.log('✅ Retrieved valid stored session');
      return enhancedSession;
    } catch (error) {
      console.error('❌ Failed to retrieve stored session:', error);
      // Clear potentially corrupted data
      await this.clearTokens();
      return null;
    }
  }

  /**
   * Clear all stored tokens and session data
   */
  async clearTokens(): Promise<void> {
    try {
      // Cancel any scheduled refresh
      this.cancelScheduledRefresh();

      // Clear from SecureStore
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

      // Clear from AsyncStorage
      await AsyncStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_REFRESH);

      console.log('✅ All tokens cleared successfully');
    } catch (error) {
      console.error('❌ Failed to clear tokens:', error);
      // Don't throw here - clearing should be best effort
    }
  }

  /**
   * Cleanup method to cancel timers and clear resources
   */
  cleanup(): void {
    this.cancelScheduledRefresh();
    this.stopBackgroundMonitoring();
    this.refreshQueue = [];
    this.refreshPromise = null;
  }

  /**
   * Check if a token is expired based on its expiry time
   * Includes buffer time to refresh tokens before they actually expire
   */
  isTokenExpired(token: string): boolean {
    try {
      // First check basic format
      if (!this.isValidJWTFormat(token)) {
        console.log('Token has invalid JWT format');
        return true;
      }

      // Decode JWT token to get expiry
      const payload = this.decodeJWTPayload(token);
      if (!payload || !payload.exp) {
        console.log('Token missing expiry information');
        return true;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp <= (currentTime + this.refreshBuffer);
      
      if (isExpired) {
        console.log(`Token expired or expiring soon. Exp: ${payload.exp}, Current: ${currentTime}, Buffer: ${this.refreshBuffer}s`);
      }
      
      return isExpired;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      return true; // Consider invalid tokens as expired
    }
  }

  /**
   * Validate session data integrity and format with comprehensive security checks
   */
  validateSession(session: Session): boolean {
    try {
      // Check required fields exist
      if (!session.access_token || !session.refresh_token || !session.user) {
        console.log('Session missing required fields');
        return false;
      }

      // Validate token formats (JWT structure)
      if (!this.isValidJWTFormat(session.access_token)) {
        console.log('Invalid access token format');
        return false;
      }

      if (!this.isValidJWTFormat(session.refresh_token)) {
        console.log('Invalid refresh token format');
        return false;
      }

      // Validate token contents
      const accessPayload = this.decodeJWTPayload(session.access_token);
      const refreshPayload = this.decodeJWTPayload(session.refresh_token);

      if (!accessPayload || !refreshPayload) {
        console.log('Failed to decode token payloads');
        return false;
      }

      // Check token expiry information
      if (!accessPayload.exp || !refreshPayload.exp) {
        console.log('Tokens missing expiry information');
        return false;
      }

      // Validate user object structure
      if (!session.user.id || !session.user.email) {
        console.log('Invalid user object in session');
        return false;
      }

      // Validate user ID format (should be UUID)
      if (!this.isValidUUID(session.user.id)) {
        console.log('Invalid user ID format');
        return false;
      }

      // Validate email format
      if (!this.isValidEmail(session.user.email)) {
        console.log('Invalid email format');
        return false;
      }

      // Check session expiry information
      if (!session.expires_at || !session.expires_in) {
        console.log('Session missing expiry information');
        return false;
      }

      // Validate expiry values are reasonable
      const currentTime = Math.floor(Date.now() / 1000);
      if (session.expires_at <= currentTime) {
        console.log('Session already expired');
        return false;
      }

      // Check if expires_in is reasonable (not too long or too short)
      if (session.expires_in < 300 || session.expires_in > 86400) { // 5 minutes to 24 hours
        console.log('Session expires_in value is unreasonable:', session.expires_in);
        return false;
      }

      // Validate token type
      if (session.token_type !== 'bearer') {
        console.log('Invalid token type:', session.token_type);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }

  /**
   * Check if token should be refreshed (before it expires)
   */
  shouldRefreshToken(session: Session): boolean {
    if (!session.access_token) {
      return false;
    }

    // Check if access token is expired or expiring soon
    return this.isTokenExpired(session.access_token);
  }

  /**
   * Schedule automatic token refresh before expiry
   */
  scheduleTokenRefresh(session: Session): void {
    // Cancel any existing scheduled refresh
    this.cancelScheduledRefresh();

    if (!session.access_token) {
      return;
    }

    try {
      const payload = this.decodeJWTPayload(session.access_token);
      if (!payload || !payload.exp) {
        return;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - currentTime;
      const refreshTime = Math.max(timeUntilExpiry - this.refreshBuffer, 60); // Refresh before expiry based on buffer, but at least in 1 minute

      if (refreshTime > 0) {
        console.log(`Scheduling token refresh in ${refreshTime} seconds`);
        this.refreshTimer = setTimeout(async () => {
          try {
            console.log('🔄 Automatic token refresh triggered');
            await this.refreshTokens();
          } catch (error) {
            console.error('❌ Scheduled token refresh failed:', error);
          }
        }, refreshTime * 1000);
      }
    } catch (error) {
      console.error('Error scheduling token refresh:', error);
    }
  }

  /**
   * Cancel scheduled token refresh
   */
  cancelScheduledRefresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
      console.log('Cancelled scheduled token refresh');
    }
  }

  /**
   * Start background monitoring for automatic token refresh
   * This provides continuous monitoring beyond the single scheduled refresh
   */
  startBackgroundMonitoring(callbacks?: {
    onSessionExpired?: () => void;
    onSessionRefreshed?: (session: Session) => void;
  }): void {
    if (this.isMonitoring) {
      console.log('Background monitoring already active');
      return;
    }

    console.log(`🔍 Starting background token monitoring (interval: ${this.monitoringInterval}ms)`);
    
    // Set callbacks
    this.onSessionExpired = callbacks?.onSessionExpired;
    this.onSessionRefreshed = callbacks?.onSessionRefreshed;
    
    this.isMonitoring = true;
    
    // Start monitoring loop
    this.monitoringTimer = setInterval(async () => {
      await this.performBackgroundCheck();
    }, this.monitoringInterval);

    // Perform initial check
    this.performBackgroundCheck();
  }

  /**
   * Stop background monitoring
   */
  stopBackgroundMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    this.isMonitoring = false;
    this.onSessionExpired = undefined;
    this.onSessionRefreshed = undefined;
    
    console.log('🛑 Background token monitoring stopped');
  }

  /**
   * Check if background monitoring is currently active
   */
  isBackgroundMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Set the monitoring interval (how often to check tokens)
   */
  setMonitoringInterval(intervalMs: number): void {
    if (intervalMs < 30000) { // Minimum 30 seconds
      console.warn('Monitoring interval too short, setting to minimum 30 seconds');
      intervalMs = 30000;
    }
    
    this.monitoringInterval = intervalMs;
    
    // Restart monitoring with new interval if currently active
    if (this.isMonitoring) {
      this.stopBackgroundMonitoring();
      this.startBackgroundMonitoring({
        onSessionExpired: this.onSessionExpired,
        onSessionRefreshed: this.onSessionRefreshed
      });
    }
  }

  /**
   * Set the refresh buffer time (how early to refresh before expiry)
   */
  setRefreshBuffer(bufferSeconds: number): void {
    if (bufferSeconds < 60) { // Minimum 1 minute buffer
      console.warn('Refresh buffer too short, setting to minimum 60 seconds');
      bufferSeconds = 60;
    }
    
    this.refreshBuffer = bufferSeconds;
    console.log(`🔧 Refresh buffer set to ${bufferSeconds} seconds`);
  }

  /**
   * Pause background monitoring (useful when app goes to background)
   */
  pauseBackgroundMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
      console.log('⏸️ Background monitoring paused');
    }
  }

  /**
   * Resume background monitoring (useful when app becomes active)
   */
  resumeBackgroundMonitoring(): void {
    if (this.isMonitoring && !this.monitoringTimer) {
      console.log('▶️ Resuming background monitoring');
      
      this.monitoringTimer = setInterval(async () => {
        await this.performBackgroundCheck();
      }, this.monitoringInterval);

      // Perform immediate check on resume
      this.performBackgroundCheck();
    }
  }

  /**
   * Perform background check for token expiry and refresh if needed
   */
  private async performBackgroundCheck(): Promise<void> {
    try {
      const storedSession = await this.getStoredSession();
      
      if (!storedSession) {
        // No session to monitor
        return;
      }

      // Check if token needs refresh
      if (this.shouldRefreshToken(storedSession)) {
        console.log('🔄 Background monitoring detected token needs refresh');
        
        try {
          const refreshedSession = await this.refreshTokens();
          
          if (refreshedSession) {
            console.log('✅ Background token refresh successful');
            
            // Notify callback of successful refresh
            if (this.onSessionRefreshed) {
              this.onSessionRefreshed(refreshedSession);
            }
          } else {
            console.log('❌ Background token refresh failed');
            
            // Notify callback of session expiry
            if (this.onSessionExpired) {
              this.onSessionExpired();
            }
          }
        } catch (error) {
          console.error('❌ Background token refresh error:', error);
          
          // Check if this is a terminal error (invalid refresh token)
          if (error instanceof AuthError && error.type === AuthErrorType.REFRESH_FAILED) {
            console.log('🚨 Terminal refresh error detected, stopping monitoring');
            
            // Clear tokens and notify of expiry
            await this.clearTokens();
            
            if (this.onSessionExpired) {
              this.onSessionExpired();
            }
          }
        }
      } else {
        // Token is still valid, check if we need to reschedule single refresh
        const payload = this.decodeJWTPayload(storedSession.access_token);
        if (payload && payload.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = payload.exp - currentTime;
          const refreshTime = timeUntilExpiry - this.refreshBuffer;
          
          // If we're getting close to refresh time and no timer is set, schedule one
          if (refreshTime > 0 && refreshTime < this.monitoringInterval / 1000 && !this.refreshTimer) {
            console.log(`⏰ Scheduling single refresh in ${refreshTime} seconds`);
            this.scheduleTokenRefresh(storedSession);
          }
        }
      }
    } catch (error) {
      console.error('❌ Background monitoring check error:', error);
      // Continue monitoring despite errors
    }
  }

  /**
   * Refresh tokens using the stored refresh token
   * Implements retry logic and prevents multiple simultaneous refresh requests
   */
  async refreshTokens(): Promise<Session | null> {
    // If refresh is already in progress, add to queue
    if (this.refreshPromise) {
      console.log('Refresh already in progress, adding to queue...');
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      });
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      
      // Resolve all queued requests
      this.refreshQueue.forEach(({ resolve }) => resolve(result));
      this.refreshQueue = [];
      
      return result;
    } catch (error) {
      // Reject all queued requests
      this.refreshQueue.forEach(({ reject }) => reject(error));
      this.refreshQueue = [];
      
      throw error;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual token refresh with enhanced retry logic and error handling
   */
  private async performTokenRefresh(): Promise<Session | null> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    let lastError: any = null;

    // Get current stored session for refresh token
    const storedSession = await this.getStoredSession();
    if (!storedSession || !storedSession.refresh_token) {
      const authError = new AuthError({
        type: AuthErrorType.REFRESH_FAILED,
        message: 'No refresh token available'
      });
      throw authError;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempting token refresh (${attempt}/${maxRetries})`);

        // Use the stored refresh token explicitly
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: storedSession.refresh_token
        });

        if (error) {
          lastError = error;
          console.error(`Token refresh attempt ${attempt} failed:`, error);
          
          // Check if this is a non-retryable error
          if (!this.isRetryableError(error)) {
            console.log('Non-retryable error encountered, stopping retries');
            break;
          }

          // If it's the last attempt, don't wait
          if (attempt === maxRetries) {
            break;
          }

          // Wait before retrying with exponential backoff + jitter
          const jitter = Math.random() * 1000; // Add up to 1 second of jitter
          const delay = (baseDelay * Math.pow(2, attempt - 1)) + jitter;
          console.log(`Waiting ${Math.round(delay)}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (!data.session) {
          const authError = new AuthError({
            type: AuthErrorType.REFRESH_FAILED,
            message: 'No session returned from refresh'
          });
          throw authError;
        }

        // Validate the new session before storing
        if (!this.validateSession(data.session)) {
          const authError = new AuthError({
            type: AuthErrorType.REFRESH_FAILED,
            message: 'Invalid session returned from refresh'
          });
          throw authError;
        }

        // Store the new tokens
        await this.storeTokens(data.session);
        
        // Schedule next refresh
        this.scheduleTokenRefresh(data.session);
        
        console.log('✅ Token refresh successful');
        return data.session;
      } catch (error) {
        lastError = error;
        console.error(`Token refresh attempt ${attempt} error:`, error);
        
        if (attempt === maxRetries) {
          break;
        }
      }
    }

    // All attempts failed
    console.error('❌ All token refresh attempts failed');
    
    // Clear tokens on final failure
    await this.clearTokens();
    
    // Throw the most recent error
    if (lastError instanceof AuthError) {
      throw lastError;
    } else {
      const authError = new AuthError({
        type: AuthErrorType.REFRESH_FAILED,
        message: 'Failed to refresh authentication tokens after multiple attempts',
        originalError: lastError
      });
      throw authError;
    }
  }

  /**
   * Check if an error is retryable with enhanced error classification
   */
  private isRetryableError(error: any): boolean {
    // Network connectivity errors are retryable
    if (error.message?.toLowerCase().includes('network') || 
        error.message?.toLowerCase().includes('timeout') ||
        error.message?.toLowerCase().includes('fetch') ||
        error.message?.toLowerCase().includes('connection') ||
        error.code === 'NETWORK_ERROR') {
      return true;
    }

    // Server errors (5xx) are retryable
    if (error.status >= 500 && error.status < 600) {
      return true;
    }

    // Rate limiting is retryable
    if (error.status === 429) {
      return true;
    }

    // Temporary service unavailable
    if (error.status === 503) {
      return true;
    }

    // Invalid refresh token or expired refresh token are NOT retryable
    if (error.message?.toLowerCase().includes('invalid_grant') ||
        error.message?.toLowerCase().includes('refresh_token_not_found') ||
        error.message?.toLowerCase().includes('invalid refresh token')) {
      return false;
    }

    // Authentication errors are generally not retryable
    if (error.status === 401 || error.status === 403) {
      return false;
    }

    // Bad request errors are not retryable
    if (error.status === 400) {
      return false;
    }

    // Default to not retryable for unknown errors
    return false;
  }

  /**
   * Validate JWT format and basic structure
   */
  private isValidJWTFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Check that each part is base64url encoded
    for (const part of parts) {
      if (!part || !this.isValidBase64Url(part)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Decode JWT payload (basic implementation without signature verification)
   */
  private decodeJWTPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      // Handle base64url decoding
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      const parsed = JSON.parse(decoded);

      // Basic payload validation
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Error decoding JWT payload:', error);
      return null;
    }
  }

  /**
   * Validate base64url encoding
   */
  private isValidBase64Url(str: string): boolean {
    try {
      // Base64url should only contain A-Z, a-z, 0-9, -, _
      const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
      return base64UrlRegex.test(str);
    } catch (error) {
      return false;
    }
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Create and export a singleton instance
export const tokenManager = new TokenManager();
export default TokenManager;