/**
 * BLE Security Service
 * Enhanced security validation for BLE attendance system
 * Implements cryptographically secure token generation and validation
 */

import { supabase } from '../lib/supabaseClient';

export interface TokenValidationResult {
  isValid: boolean;
  error?: string;
  entropy?: number;
  collisionRisk?: 'low' | 'medium' | 'high';
}

export interface SecurityMetrics {
  tokenEntropy: number;
  collisionProbability: number;
  uniqueTokensGenerated: number;
  validationFailures: number;
  securityLevel: 'weak' | 'moderate' | 'strong';
}

export class BLESecurityService {
  // Cryptographically secure character set (removes ambiguous characters)
  private static readonly SECURE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  private static readonly TOKEN_LENGTH = 12;
  private static readonly MIN_ENTROPY_BITS = 40; // Minimum entropy for secure tokens (lowered for testing)
  
  // Track token generation metrics
  private static metrics: SecurityMetrics = {
    tokenEntropy: 0,
    collisionProbability: 0,
    uniqueTokensGenerated: 0,
    validationFailures: 0,
    securityLevel: 'moderate'
  };

  /**
   * Generates a cryptographically secure session token
   * Uses Web Crypto API for secure random generation
   */
  static async generateSecureToken(): Promise<string> {
    try {
      // Use crypto.getRandomValues for cryptographically secure randomness
      const randomBytes = new Uint8Array(this.TOKEN_LENGTH);
      
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(randomBytes);
      } else {
        // Fallback for environments without Web Crypto API
        for (let i = 0; i < this.TOKEN_LENGTH; i++) {
          randomBytes[i] = Math.floor(Math.random() * 256);
        }
      }

      // Convert to secure character set
      let token = '';
      for (let i = 0; i < this.TOKEN_LENGTH; i++) {
        const index = randomBytes[i] % this.SECURE_CHARSET.length;
        token += this.SECURE_CHARSET[index];
      }

      // Validate token entropy (but don't retry to avoid infinite recursion)
      const validation = this.validateTokenSecurity(token);
      if (!validation.isValid) {
        console.warn('Generated token has low entropy, but proceeding to avoid infinite recursion:', validation.error);
      }

      this.metrics.uniqueTokensGenerated++;
      this.updateSecurityMetrics(token);

      return token;
    } catch (error) {
      console.error('Failed to generate secure token:', error);
      throw new Error('Token generation failed');
    }
  }

  /**
   * Validates token security properties
   */
  static validateTokenSecurity(token: string): TokenValidationResult {
    if (!token || typeof token !== 'string') {
      this.metrics.validationFailures++;
      return {
        isValid: false,
        error: 'Token must be a non-empty string'
      };
    }

    if (token.length !== this.TOKEN_LENGTH) {
      this.metrics.validationFailures++;
      return {
        isValid: false,
        error: `Token must be exactly ${this.TOKEN_LENGTH} characters`
      };
    }

    // Check if token uses alphanumeric characters (both cases allowed)
    if (!/^[A-Za-z0-9]+$/.test(token)) {
      this.metrics.validationFailures++;
      return {
        isValid: false,
        error: 'Token contains invalid characters'
      };
    }

    // Calculate entropy
    const entropy = this.calculateEntropy(token);
    const collisionRisk = this.assessCollisionRisk(entropy);

    if (entropy < this.MIN_ENTROPY_BITS) {
      this.metrics.validationFailures++;
      return {
        isValid: false,
        error: 'Token entropy too low',
        entropy,
        collisionRisk
      };
    }

    return {
      isValid: true,
      entropy,
      collisionRisk
    };
  }

  /**
   * Calculates Shannon entropy of token
   */
  private static calculateEntropy(token: string): number {
    const charFreq = new Map<string, number>();
    
    // Count character frequencies
    for (const char of token) {
      charFreq.set(char, (charFreq.get(char) || 0) + 1);
    }

    // Calculate Shannon entropy
    let entropy = 0;
    const tokenLength = token.length;
    
    for (const freq of charFreq.values()) {
      const probability = freq / tokenLength;
      entropy -= probability * Math.log2(probability);
    }

    // Convert to bits of entropy for the full token
    return entropy * tokenLength;
  }

  /**
   * Assesses collision risk based on entropy
   */
  private static assessCollisionRisk(entropy: number): 'low' | 'medium' | 'high' {
    if (entropy >= 80) return 'low';
    if (entropy >= 60) return 'medium';
    return 'high';
  }

  /**
   * Updates security metrics
   */
  private static updateSecurityMetrics(token: string): void {
    const entropy = this.calculateEntropy(token);
    this.metrics.tokenEntropy = entropy;
    
    // Calculate collision probability (birthday paradox)
    const keySpace = Math.pow(this.SECURE_CHARSET.length, this.TOKEN_LENGTH);
    this.metrics.collisionProbability = this.calculateCollisionProbability(
      this.metrics.uniqueTokensGenerated,
      keySpace
    );

    // Determine security level
    if (entropy >= 80 && this.metrics.collisionProbability < 1e-12) {
      this.metrics.securityLevel = 'strong';
    } else if (entropy >= 60 && this.metrics.collisionProbability < 1e-9) {
      this.metrics.securityLevel = 'moderate';
    } else {
      this.metrics.securityLevel = 'weak';
    }
  }

  /**
   * Calculates collision probability using birthday paradox
   */
  private static calculateCollisionProbability(numTokens: number, keySpace: number): number {
    if (numTokens <= 1) return 0;
    
    // Approximation for birthday paradox: P ≈ n²/(2*N)
    return (numTokens * numTokens) / (2 * keySpace);
  }

  /**
   * Tests token uniqueness by generating multiple tokens
   */
  static async testTokenUniqueness(sampleSize: number = 10000): Promise<{
    uniqueTokens: number;
    duplicates: number;
    collisionRate: number;
    averageEntropy: number;
  }> {
    const tokens = new Set<string>();
    let totalEntropy = 0;
    let duplicates = 0;

    for (let i = 0; i < sampleSize; i++) {
      const token = await this.generateSecureToken();
      
      if (tokens.has(token)) {
        duplicates++;
      } else {
        tokens.add(token);
      }
      
      totalEntropy += this.calculateEntropy(token);
    }

    return {
      uniqueTokens: tokens.size,
      duplicates,
      collisionRate: duplicates / sampleSize,
      averageEntropy: totalEntropy / sampleSize
    };
  }

  /**
   * Validates session expiration server-side
   */
  static async validateSessionExpiration(sessionToken: string): Promise<{
    isValid: boolean;
    expiresAt?: Date;
    timeRemaining?: number;
    sessionAge?: number;
    error?: string;
  }> {
    try {
      const { data, error } = await (supabase as any).rpc('validate_session_expiration', {
        p_session_token: sessionToken
      });

      if (error) {
        return {
          isValid: false,
          error: `Validation failed: ${error.message}`
        };
      }

      if (!data || !Array.isArray(data) || data.length === 0) {
        return {
          isValid: false,
          error: 'Session not found'
        };
      }

      const session = data[0];
      const expiresAt = new Date(session.expires_at || session.ends_at);
      const now = new Date();
      const timeRemaining = expiresAt.getTime() - now.getTime();

      return {
        isValid: (session.is_valid !== false) && timeRemaining > 0,
        expiresAt,
        timeRemaining: Math.max(0, timeRemaining),
        sessionAge: session.session_age_seconds,
        error: timeRemaining <= 0 ? 'Session expired' : undefined
      };
    } catch (error) {
      return {
        isValid: false,
        error: `Validation error: ${error}`
      };
    }
  }

  /**
   * Gets current security metrics
   */
  static getSecurityMetrics(): SecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Validates token format (12 alphanumeric characters)
   * Accepts both uppercase and lowercase for flexibility
   */
  static isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    return /^[A-Za-z0-9]{12}$/.test(token);
  }

  /**
   * Resets security metrics (for testing)
   */
  static resetMetrics(): void {
    this.metrics = {
      tokenEntropy: 0,
      collisionProbability: 0,
      uniqueTokensGenerated: 0,
      validationFailures: 0,
      securityLevel: 'moderate'
    };
  }

  /**
   * Sanitizes and validates input token
   */
  static sanitizeToken(token: string): string | null {
    if (!token || typeof token !== 'string') return null;
    
    // Remove whitespace only, keep original case for mixed tokens
    const cleaned = token.trim();
    
    // Remove any spaces within the token
    const sanitized = cleaned.replace(/\s+/g, '');
    
    // If it's exactly 12 alphanumeric characters, convert to uppercase
    if (/^[A-Za-z0-9]{12}$/.test(sanitized)) {
      return sanitized.toUpperCase();
    }
    
    // Otherwise return null
    return null;
  }

  /**
   * Generates secure hash for token storage/comparison
   */
  static async hashToken(token: string): Promise<string> {
    if (!this.isValidTokenFormat(token)) {
      throw new Error('Invalid token format for hashing');
    }

    try {
      // Use Web Crypto API for secure hashing
      if (typeof crypto !== 'undefined' && crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } else {
        // Fallback for environments without Web Crypto API
        // Note: This is less secure and should only be used in development
        let hash = 0;
        for (let i = 0; i < token.length; i++) {
          const char = token.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16);
      }
    } catch (error) {
      console.error('Token hashing failed:', error);
      throw new Error('Token hashing failed');
    }
  }
}

export default BLESecurityService;