/**
 * BLE Session Service
 * Handles session management, token encoding, and organization code mapping for BLE attendance
 */

import { supabase } from '../lib/supabaseClient';
import BLESecurityService from './BLESecurityService';

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

    console.log('Secure BLE session created:', {
      eventId: data.event_id,
      entropyBits: data.entropy_bits,
      securityLevel: data.security_level,
      expiresAt: data.expires_at
    });

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
    // Sanitize and validate token format
    const sanitizedToken = BLESecurityService.sanitizeToken(sessionToken);
    if (!sanitizedToken) {
      return {
        success: false,
        error: 'invalid_token',
        message: 'Invalid session token format',
      };
    }

    // Validate token security properties
    const validation = BLESecurityService.validateTokenSecurity(sanitizedToken);
    if (!validation.isValid) {
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

        console.log('Secure attendance recorded:', {
          eventId: result.event_id,
          tokenSecurity: result.token_security,
          timeRemaining: result.time_remaining_seconds
        });

        return attendanceResult;
      } else {
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

    return data.map((session: any) => ({
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
    }));
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
      // Validate beacon payload first
      const orgSlug = major === 1 ? 'nhs' : major === 2 ? 'nhsa' : '';
      if (!orgSlug || !this.validateBeaconPayload(major, minor, orgSlug)) {
        console.log('Invalid beacon payload for findSessionByBeacon');
        return null;
      }

      const activeSessions = await this.getActiveSessions(orgId);
      
      // Find session with matching encoded token hash
      for (const session of activeSessions) {
        const sessionHash = this.encodeSessionToken(session.sessionToken);
        if (sessionHash === minor) {
          return {
            ...session,
            orgSlug,
            isValid: session.endsAt > new Date(), // Double-check validity
          };
        }
      }
      
      console.log(`No session found for beacon major:${major} minor:${minor} in ${activeSessions.length} active sessions`);
      return null;
    } catch (error) {
      console.error('Failed to find session by beacon:', error);
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
}

export default BLESessionService;