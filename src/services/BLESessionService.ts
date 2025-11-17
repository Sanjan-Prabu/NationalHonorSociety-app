/**
 * BLE Session Service
 * Handles session management, token encoding, and organization code mapping for BLE attendance
 */

import { supabase } from '../lib/supabaseClient';
import BLESecurityService from './BLESecurityService';
import SentryService from './SentryService';

// Organization code mapping for BLE beacon Major field
export const ORG_CODES = {
  nhs: 1,
  nhsa: 2,
} as const;

export type OrgSlug = keyof typeof ORG_CODES;

// Session token validation regex (12 alphanumeric characters)
const SESSION_TOKEN_REGEX = /^[A-Za-z0-9]{12}$/;

export interface BLESession {
  sessionToken: string;
  eventId: string;
  eventTitle: string;
  orgId: string;
  orgSlug: string;
  startsAt: Date;
  endsAt: Date;
  isValid: boolean;
  attendeeCount: number;
  orgCode: number;
  createdBy?: string;
  createdByName?: string;
}

export interface AttendanceResult {
  success: boolean;
  error?: string;
  message?: string;
  attendanceId?: string;
  eventId?: string;
  eventTitle?: string;
  orgSlug?: string;
  recordedAt?: Date;
  expiresAt?: Date;
}

export class BLESessionService {
  // Track recent attendance submissions to prevent duplicates
  private static recentSubmissions = new Map<string, Date>();
  private static readonly DUPLICATE_PREVENTION_WINDOW = 30000; // 30 seconds
  /**
   * Creates a new BLE attendance session with enhanced security
   */
  static async createSession(
    orgId: string,
    title: string,
    ttlSeconds: number = 3600
  ): Promise<string> {
    SentryService.addBreadcrumb(
      'BLE session creation started',
      'ble.session',
      'info',
      { orgId, title, ttlSeconds }
    );
    
    if (!orgId || !title.trim()) {
      throw new Error('Organization ID and title are required');
    }

    if (ttlSeconds <= 0 || ttlSeconds > 86400) {
      throw new Error('TTL must be between 1 and 86400 seconds (24 hours)');
    }

    // Use enhanced secure session creation
    const { data, error } = await supabase.rpc('create_session_secure', {
      p_org_id: orgId,
      p_title: title.trim(),
      p_starts_at: new Date().toISOString(),
      p_ttl_seconds: ttlSeconds,
    });

    if (error) {
      console.error('Failed to create secure BLE session:', error);
      
      SentryService.addBreadcrumb(
        'BLE session creation failed',
        'ble.session',
        'error',
        { orgId, title, error: error.message }
      );
      
      throw new Error(`Failed to create session: ${error.message}`);
    }

    if (!data || !data.success) {
      const errorMsg = data?.message || 'Unknown error occurred';
      throw new Error(`Session creation failed: ${errorMsg}`);
    }

    const sessionToken = data.session_token;
    if (!sessionToken || !BLESecurityService.isValidTokenFormat(sessionToken)) {
      throw new Error('Invalid session token received from server');
    }

    // Validate token security
    const validation = BLESecurityService.validateTokenSecurity(sessionToken);
    if (!validation.isValid) {
      console.warn('Generated token failed security validation:', validation.error);
      throw new Error(`Token security validation failed: ${validation.error}`);
    }

    if (__DEV__) {
      console.log('Secure BLE session created:', {
        eventId: data.event_id,
        entropyBits: data.entropy_bits,
        securityLevel: data.security_level,
        expiresAt: data.expires_at
      });
    }
    
    SentryService.addBreadcrumb(
      'BLE session created successfully',
      'ble.session',
      'info',
      { 
        orgId, 
        title, 
        eventId: data.event_id,
        securityLevel: data.security_level,
        expiresAt: data.expires_at
      }
    );

    return sessionToken;
  }

  /**
   * Resolves a session token to session information
   */
  static async resolveSession(sessionToken: string): Promise<BLESession | null> {
    if (!this.isValidSessionToken(sessionToken)) {
      return null;
    }

    const { data, error } = await supabase.rpc('resolve_session', {
      p_session_token: sessionToken,
    });

    if (error) {
      console.error('Failed to resolve session:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const session = data[0];
    return {
      sessionToken,
      eventId: session.event_id,
      eventTitle: session.event_title,
      orgId: session.org_id,
      orgSlug: session.org_slug,
      startsAt: new Date(session.starts_at),
      endsAt: new Date(session.expires_at),
      isValid: session.is_valid,
      attendeeCount: 0, // Will be populated by getActiveSessions
      orgCode: this.getOrgCode(session.org_slug),
    };
  }

  /**
   * Records attendance using a session token with enhanced security validation
   */
  static async addAttendance(sessionToken: string): Promise<AttendanceResult> {
    console.log('[BLESessionService.addAttendance] 🎫 Starting attendance recording:', {
      rawToken: sessionToken,
      rawTokenLength: sessionToken?.length,
      rawTokenType: typeof sessionToken,
    });

    SentryService.addBreadcrumb(
      'BLE attendance recording started',
      'ble.attendance',
      'info',
      { tokenLength: sessionToken?.length }
    );
    
    // Sanitize and validate token format
    const sanitizedToken = BLESecurityService.sanitizeToken(sessionToken);
    
    console.log('[BLESessionService.addAttendance] 🧹 After sanitization:', {
      sanitizedToken,
      sanitizedTokenLength: sanitizedToken?.length,
      wasModified: sanitizedToken !== sessionToken,
    });

    if (!sanitizedToken) {
      console.error('[BLESessionService.addAttendance] ❌ Token sanitization failed - token is null or invalid format');
      SentryService.addBreadcrumb(
        'BLE attendance failed - invalid token format',
        'ble.attendance',
        'warning',
        { error: 'invalid_token' }
      );
      
      return {
        success: false,
        error: 'invalid_token',
        message: 'Invalid session token format',
      };
    }

    // Validate token security properties
    console.log('[BLESessionService.addAttendance] 🔒 Validating token security...');
    const validation = BLESecurityService.validateTokenSecurity(sanitizedToken);
    
    console.log('[BLESessionService.addAttendance] 🔍 Token validation result:', {
      isValid: validation.isValid,
      error: validation.error,
      tokenLength: sanitizedToken.length,
    });

    if (!validation.isValid) {
      console.error('[BLESessionService.addAttendance] ❌ Token security validation failed:', {
        token: sanitizedToken,
        tokenLength: sanitizedToken.length,
        error: validation.error,
      });
      return {
        success: false,
        error: 'invalid_token_security',
        message: `Token security validation failed: ${validation.error}`,
      };
    }

    // Check for recent duplicate submission
    const now = new Date();
    const lastSubmission = this.recentSubmissions.get(sanitizedToken);
    if (lastSubmission && (now.getTime() - lastSubmission.getTime()) < this.DUPLICATE_PREVENTION_WINDOW) {
      return {
        success: false,
        error: 'duplicate_submission',
        message: 'Attendance already submitted recently',
      };
    }

    // Use enhanced secure attendance function
    const { data, error } = await supabase.rpc('add_attendance_secure', {
      p_session_token: sanitizedToken,
    });

    if (error) {
      console.error('Failed to add secure attendance:', error);
      
      SentryService.addBreadcrumb(
        'BLE attendance failed - network error',
        'ble.attendance',
        'error',
        { error: error.message }
      );
      
      return {
        success: false,
        error: 'network_error',
        message: `Failed to record attendance: ${error.message}`,
      };
    }

    // Handle JSONB response from secure function
    if (typeof data === 'object' && data !== null) {
      const result = data as any;
      
      if (result.success) {
        // Track successful submission to prevent duplicates
        this.recentSubmissions.set(sanitizedToken, now);
        this.cleanupRecentSubmissions();
        
        // Convert date strings to Date objects
        const attendanceResult: AttendanceResult = {
          success: true,
          attendanceId: result.attendance_id,
          eventId: result.event_id,
          eventTitle: result.event_title,
          orgSlug: result.org_slug,
          recordedAt: new Date(result.recorded_at),
          expiresAt: new Date(result.session_expires_at),
          message: 'Attendance recorded successfully with enhanced security validation'
        };

        if (__DEV__) {
          console.log('Secure attendance recorded:', {
            eventId: result.event_id,
            tokenSecurity: result.token_security,
            timeRemaining: result.time_remaining_seconds
          });
        }
        
        SentryService.addBreadcrumb(
          'BLE attendance recorded successfully',
          'ble.attendance',
          'info',
          { 
            eventId: result.event_id,
            eventTitle: result.event_title,
            orgSlug: result.org_slug,
            attendanceId: result.attendance_id
          }
        );

        return attendanceResult;
      } else {
        SentryService.addBreadcrumb(
          'BLE attendance failed - server error',
          'ble.attendance',
          'error',
          { error: result.error, message: result.message }
        );
        
        return {
          success: false,
          error: result.error || 'unknown_error',
          message: result.message || 'Failed to record attendance',
        };
      }
    }

    // Fallback for unexpected response format
    return {
      success: false,
      error: 'unexpected_response',
      message: 'Unexpected response from server',
    };
  }

  /**
   * Gets all active sessions for an organization
   */
  static async getActiveSessions(orgId: string): Promise<BLESession[]> {
    if (!orgId) {
      throw new Error('Organization ID is required');
    }

    const { data, error } = await supabase.rpc('get_active_sessions', {
      p_org_id: orgId,
    });

    if (error) {
      console.error('Failed to get active sessions:', error);
      throw new Error(`Failed to get active sessions: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    console.log(`[BLESessionService] 📋 Received ${data.length} sessions from database`);

    // Filter and validate sessions
    const validSessions = data
      .filter((session: any) => {
        const token = session.session_token;
        
        // Log each session for debugging
        console.log(`[BLESessionService] 🔍 Validating session:`, {
          title: session.event_title,
          token,
          tokenLength: token?.length,
          tokenType: typeof token,
          isValid: this.isValidSessionToken(token)
        });

        // Filter out sessions with invalid tokens
        if (!token || typeof token !== 'string') {
          console.warn(`[BLESessionService] ⚠️ Session "${session.event_title}" has null/invalid token`);
          return false;
        }

        if (!this.isValidSessionToken(token)) {
          console.warn(`[BLESessionService] ⚠️ Session "${session.event_title}" has invalid token format: "${token}" (length: ${token.length})`);
          return false;
        }

        return true;
      })
      .map((session: any) => {
        const mapped = {
          sessionToken: session.session_token,
          eventId: session.event_id,
          eventTitle: session.event_title,
          orgId,
          orgSlug: '', // Will be populated if needed
          startsAt: new Date(session.starts_at),
          endsAt: new Date(session.ends_at),
          isValid: true, // Active sessions are valid by definition
          attendeeCount: parseInt(session.attendee_count) || 0,
          orgCode: session.org_code,
          createdBy: session.created_by,
          createdByName: session.created_by_name || session.creator_name,
        };
        
        if (__DEV__) {
          console.log('[BLESessionService] 📧 Mapped session with creator:', {
            title: mapped.eventTitle,
            createdByName: mapped.createdByName,
            createdBy: mapped.createdBy
          });
        }
        
        return mapped;
      });

    console.log(`[BLESessionService] ✅ Returning ${validSessions.length} valid sessions (filtered from ${data.length} total)`);
    
    return validSessions;
  }

  /**
   * Gets organization code for BLE beacon Major field
   */
  static getOrgCode(orgSlug: string): number {
    return ORG_CODES[orgSlug as OrgSlug] || 0;
  }

  /**
   * Encodes session token to 16-bit hash for BLE beacon Minor field
   */
  static encodeSessionToken(sessionToken: string): number {
    if (!this.isValidSessionToken(sessionToken)) {
      throw new Error('Invalid session token format');
    }

    let hash = 0;
    for (let i = 0; i < sessionToken.length; i++) {
      const char = sessionToken.charCodeAt(i);
      hash = ((hash << 5) - hash + char) & 0xFFFF; // Keep within 16-bit range
    }
    return hash;
  }

  /**
   * Validates session token format using enhanced security service
   */
  static isValidSessionToken(token: string): boolean {
    return BLESecurityService.isValidTokenFormat(token);
  }

  /**
   * Cleans up old entries from recent submissions tracking
   */
  private static cleanupRecentSubmissions(): void {
    const now = new Date();
    const cutoff = now.getTime() - this.DUPLICATE_PREVENTION_WINDOW;
    
    for (const [token, timestamp] of this.recentSubmissions.entries()) {
      if (timestamp.getTime() < cutoff) {
        this.recentSubmissions.delete(token);
      }
    }
  }

  /**
   * Generates BLE beacon payload for attendance session
   */
  static generateBeaconPayload(sessionToken: string, orgSlug: string) {
    if (!this.isValidSessionToken(sessionToken)) {
      throw new Error('Invalid session token format');
    }

    const orgCode = this.getOrgCode(orgSlug);
    if (orgCode === 0) {
      throw new Error(`Unknown organization: ${orgSlug}`);
    }

    const tokenHash = this.encodeSessionToken(sessionToken);

    return {
      major: orgCode,
      minor: tokenHash,
      sessionToken,
      orgSlug,
    };
  }

  /**
   * Validates BLE beacon payload for attendance detection
   */
  static validateBeaconPayload(
    major: number,
    minor: number,
    expectedOrgSlug: string
  ): boolean {
    const expectedOrgCode = this.getOrgCode(expectedOrgSlug);
    return major === expectedOrgCode && minor >= 0 && minor <= 0xFFFF;
  }

  /**
   * Finds session by beacon payload (reverse lookup from hash)
   * Note: This is a best-effort approach since hash functions are one-way
   */
  static async findSessionByBeacon(
    major: number,
    minor: number,
    orgId: string
  ): Promise<BLESession | null> {
    try {
      console.log(`[BLESessionService] 🔍 findSessionByBeacon called with:`, {
        major,
        minor,
        orgId
      });
      
      // Validate beacon payload first
      const orgSlug = major === 1 ? 'nhs' : major === 2 ? 'nhsa' : '';
      console.log(`[BLESessionService] Determined orgSlug: ${orgSlug} from major: ${major}`);
      
      if (!orgSlug || !this.validateBeaconPayload(major, minor, orgSlug)) {
        console.log(`[BLESessionService] ❌ Invalid beacon payload - orgSlug: ${orgSlug}, validation: ${this.validateBeaconPayload(major, minor, orgSlug)}`);
        return null;
      }

      console.log(`[BLESessionService] ✅ Beacon payload valid, fetching active sessions for orgId: ${orgId}`);
      const activeSessions = await this.getActiveSessions(orgId);
      console.log(`[BLESessionService] 📋 Found ${activeSessions.length} active sessions`);
      
      // Find session with matching encoded token hash
      for (const session of activeSessions) {
        const sessionHash = this.encodeSessionToken(session.sessionToken);
        console.log(`[BLESessionService] Comparing session "${session.eventTitle}":`, {
          sessionToken: session.sessionToken,
          sessionHash,
          targetMinor: minor,
          match: sessionHash === minor
        });
        
        if (sessionHash === minor) {
          console.log(`[BLESessionService] ✅ MATCH FOUND! Session: "${session.eventTitle}"`);
          return {
            ...session,
            orgSlug,
            isValid: session.endsAt > new Date(), // Double-check validity
          };
        }
      }
      
      console.log(`[BLESessionService] ❌ No session found for beacon major:${major} minor:${minor} in ${activeSessions.length} active sessions`);
      return null;
    } catch (error) {
      console.error('[BLESessionService] ❌ Failed to find session by beacon:', error);
      return null;
    }
  }

  /**
   * Alternative method to find session by beacon using direct database query
   * This is more efficient for large numbers of sessions
   */
  static async findSessionByBeaconDirect(
    major: number,
    minor: number
  ): Promise<BLESession | null> {
    try {
      // Query database directly for sessions with matching beacon payload
      const { data, error } = await supabase.rpc('find_session_by_beacon', {
        p_major: major,
        p_minor: minor,
      });

      if (error) {
        console.error('Failed to find session by beacon (direct):', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const session = data[0];
      return {
        sessionToken: session.session_token,
        eventId: session.event_id,
        eventTitle: session.event_title,
        orgId: session.org_id,
        orgSlug: session.org_slug,
        startsAt: new Date(session.starts_at),
        endsAt: new Date(session.ends_at),
        isValid: session.is_valid,
        attendeeCount: parseInt(session.attendee_count) || 0,
        orgCode: major,
      };
    } catch (error) {
      console.error('Failed to find session by beacon (direct):', error);
      return null;
    }
  }

  /**
   * Validates session expiration with detailed information
   */
  static async validateSessionExpiration(sessionToken: string): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    timeRemaining?: number;
    sessionAge?: number;
    error?: string;
  }> {
    const sanitizedToken = BLESecurityService.sanitizeToken(sessionToken);
    if (!sanitizedToken) {
      return {
        isValid: false,
        error: 'Invalid token format'
      };
    }

    try {
      const result = await BLESecurityService.validateSessionExpiration(sanitizedToken);
      return result;
    } catch (error) {
      console.error('Session expiration validation failed:', error);
      return {
        isValid: false,
        error: `Validation failed: ${error}`
      };
    }
  }

  /**
   * Tests token collision resistance
   */
  static async testTokenCollisionResistance(sampleSize: number = 1000): Promise<{
    uniqueTokens: number;
    duplicates: number;
    collisionRate: number;
    averageEntropy: number;
    securityAssessment: string;
  }> {
    try {
      const result = await BLESecurityService.testTokenUniqueness(sampleSize);
      
      let securityAssessment = 'poor';
      if (result.collisionRate < 0.001) {
        securityAssessment = 'excellent';
      } else if (result.collisionRate < 0.01) {
        securityAssessment = 'good';
      } else if (result.collisionRate < 0.05) {
        securityAssessment = 'fair';
      }

      return {
        ...result,
        securityAssessment
      };
    } catch (error) {
      console.error('Token collision resistance test failed:', error);
      throw new Error(`Collision resistance test failed: ${error}`);
    }
  }

  /**
   * Gets security metrics for monitoring
   */
  static getSecurityMetrics() {
    return BLESecurityService.getSecurityMetrics();
  }

  /**
   * Terminates an active BLE session manually
   * Useful when officer needs to end session early or if app crashes
   */
  static async terminateSession(sessionToken: string): Promise<{
    success: boolean;
    error?: string;
    message?: string;
    eventId?: string;
    eventTitle?: string;
    terminatedAt?: Date;
    timeSavedSeconds?: number;
  }> {
    const sanitizedToken = BLESecurityService.sanitizeToken(sessionToken);
    if (!sanitizedToken) {
      return {
        success: false,
        error: 'invalid_token',
        message: 'Invalid session token format',
      };
    }

    try {
      const { data, error } = await supabase.rpc('terminate_session', {
        p_session_token: sanitizedToken,
      });

      if (error) {
        console.error('Failed to terminate session:', error);
        return {
          success: false,
          error: 'network_error',
          message: `Failed to terminate session: ${error.message}`,
        };
      }

      if (typeof data === 'object' && data !== null) {
        const result = data as any;
        
        if (result.success) {
          return {
            success: true,
            eventId: result.event_id,
            eventTitle: result.event_title,
            terminatedAt: new Date(result.terminated_at),
            timeSavedSeconds: result.time_saved_seconds,
            message: 'Session terminated successfully',
          };
        } else {
          return {
            success: false,
            error: result.error || 'unknown_error',
            message: result.message || 'Failed to terminate session',
          };
        }
      }

      return {
        success: false,
        error: 'unexpected_response',
        message: 'Unexpected response from server',
      };
    } catch (error) {
      console.error('Error terminating session:', error);
      return {
        success: false,
        error: 'exception',
        message: `Exception: ${error}`,
      };
    }
  }

  /**
   * Gets the current status of a BLE session
   */
  static async getSessionStatus(sessionToken: string): Promise<{
    success: boolean;
    status?: 'active' | 'expired' | 'terminated' | 'scheduled';
    isActive?: boolean;
    timeRemainingSeconds?: number;
    attendeeCount?: number;
    error?: string;
  }> {
    const sanitizedToken = BLESecurityService.sanitizeToken(sessionToken);
    if (!sanitizedToken) {
      return {
        success: false,
        error: 'invalid_token',
      };
    }

    try {
      const { data, error } = await supabase.rpc('get_session_status', {
        p_session_token: sanitizedToken,
      });

      if (error) {
        console.error('Failed to get session status:', error);
        return {
          success: false,
          error: 'network_error',
        };
      }

      if (typeof data === 'object' && data !== null) {
        const result = data as any;
        
        if (result.success) {
          return {
            success: true,
            status: result.status,
            isActive: result.is_active,
            timeRemainingSeconds: result.time_remaining_seconds,
            attendeeCount: result.attendee_count,
          };
        } else {
          return {
            success: false,
            error: result.error || 'unknown_error',
          };
        }
      }

      return {
        success: false,
        error: 'unexpected_response',
      };
    } catch (error) {
      console.error('Error getting session status:', error);
      return {
        success: false,
        error: 'exception',
      };
    }
  }

  /**
   * Validates multiple session tokens to check if they're still active
   * Returns array of tokens that are still valid
   */
  static async validateSessions(sessionTokens: string[]): Promise<string[]> {
    if (!sessionTokens || sessionTokens.length === 0) {
      return [];
    }

    try {
      // Sanitize all tokens
      const sanitizedTokens = sessionTokens
        .map(token => BLESecurityService.sanitizeToken(token))
        .filter(token => token !== null) as string[];

      if (sanitizedTokens.length === 0) {
        return [];
      }

      // Query database to check which sessions are still active
      const { data, error } = await supabase
        .from('events')
        .select('description')
        .gte('ends_at', new Date().toISOString())
        .eq('event_type', 'meeting');

      if (error) {
        console.error('[BLESessionService] Failed to validate sessions:', error);
        return sanitizedTokens; // Return all tokens on error to avoid false removals
      }

      if (!data || data.length === 0) {
        return []; // No active sessions
      }

      // Extract session tokens from active events
      const activeTokens = new Set<string>();
      for (const event of data) {
        try {
          const description = typeof event.description === 'string' 
            ? JSON.parse(event.description) 
            : event.description;
          
          if (description?.session_token && description?.attendance_method === 'ble') {
            activeTokens.add(description.session_token);
          }
        } catch (e) {
          // Skip events with invalid JSON
          continue;
        }
      }

      // Return only tokens that are still active
      return sanitizedTokens.filter(token => activeTokens.has(token));
    } catch (error) {
      console.error('[BLESessionService] Error validating sessions:', error);
      return sessionTokens; // Return all tokens on error to avoid false removals
    }
  }

  /**
   * Cleans up orphaned sessions (sessions that expired but weren't properly terminated)
   * Should be called periodically or when officer logs in
   */
  static async cleanupOrphanedSessions(): Promise<{
    success: boolean;
    orphanedCount?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.rpc('cleanup_orphaned_sessions');

      if (error) {
        console.error('Failed to cleanup orphaned sessions:', error);
        return {
          success: false,
          error: 'network_error',
        };
      }

      if (typeof data === 'object' && data !== null) {
        const result = data as any;
        
        if (result.success) {
          if (__DEV__ && result.orphaned_count > 0) {
            console.log(`Cleaned up ${result.orphaned_count} orphaned sessions`);
          }
          return {
            success: true,
            orphanedCount: result.orphaned_count,
          };
        } else {
          return {
            success: false,
            error: result.error || 'unknown_error',
          };
        }
      }

      return {
        success: false,
        error: 'unexpected_response',
      };
    } catch (error) {
      console.error('Error cleaning up orphaned sessions:', error);
      return {
        success: false,
        error: 'exception',
      };
    }
  }
}

export default BLESessionService;