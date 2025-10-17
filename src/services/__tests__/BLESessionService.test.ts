/**
 * BLE Session Service Tests
 * Tests for session management, token encoding, and organization code mapping
 */

// Mock the supabase client to avoid environment dependencies
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    rpc: jest.fn(),
  },
}));

import BLESessionService, { ORG_CODES } from '../BLESessionService';

describe('BLESessionService', () => {
  describe('Token Validation', () => {
    it('should validate correct session token format', () => {
      expect(BLESessionService.isValidSessionToken('ABC123def456')).toBe(true);
      expect(BLESessionService.isValidSessionToken('abcdefghijkl')).toBe(true);
      expect(BLESessionService.isValidSessionToken('123456789012')).toBe(true);
    });

    it('should reject invalid session token formats', () => {
      expect(BLESessionService.isValidSessionToken('')).toBe(false);
      expect(BLESessionService.isValidSessionToken('ABC123')).toBe(false); // Too short
      expect(BLESessionService.isValidSessionToken('ABC123def456789')).toBe(false); // Too long
      expect(BLESessionService.isValidSessionToken('ABC123def45@')).toBe(false); // Invalid character
      expect(BLESessionService.isValidSessionToken('ABC123def45 ')).toBe(false); // Space
      expect(BLESessionService.isValidSessionToken(null as any)).toBe(false);
      expect(BLESessionService.isValidSessionToken(undefined as any)).toBe(false);
    });
  });

  describe('Organization Code Mapping', () => {
    it('should return correct organization codes', () => {
      expect(BLESessionService.getOrgCode('nhs')).toBe(1);
      expect(BLESessionService.getOrgCode('nhsa')).toBe(2);
      expect(BLESessionService.getOrgCode('unknown')).toBe(0);
      expect(BLESessionService.getOrgCode('')).toBe(0);
    });

    it('should have consistent organization codes', () => {
      expect(BLESessionService.getOrgCode('nhs')).toBe(ORG_CODES.nhs);
      expect(BLESessionService.getOrgCode('nhsa')).toBe(ORG_CODES.nhsa);
    });
  });

  describe('Session Token Encoding', () => {
    it('should encode session tokens to 16-bit values', () => {
      const token1 = 'ABC123def456';
      const token2 = 'XYZ789ghi012';
      
      const hash1 = BLESessionService.encodeSessionToken(token1);
      const hash2 = BLESessionService.encodeSessionToken(token2);
      
      // Should be within 16-bit range
      expect(hash1).toBeGreaterThanOrEqual(0);
      expect(hash1).toBeLessThanOrEqual(0xFFFF);
      expect(hash2).toBeGreaterThanOrEqual(0);
      expect(hash2).toBeLessThanOrEqual(0xFFFF);
      
      // Different tokens should produce different hashes (most of the time)
      expect(hash1).not.toBe(hash2);
    });

    it('should produce consistent hashes for same token', () => {
      const token = 'ABC123def456';
      const hash1 = BLESessionService.encodeSessionToken(token);
      const hash2 = BLESessionService.encodeSessionToken(token);
      
      expect(hash1).toBe(hash2);
    });

    it('should throw error for invalid tokens', () => {
      expect(() => BLESessionService.encodeSessionToken('')).toThrow();
      expect(() => BLESessionService.encodeSessionToken('ABC123')).toThrow();
      expect(() => BLESessionService.encodeSessionToken('ABC123def45@')).toThrow();
    });
  });

  describe('Beacon Payload Generation', () => {
    it('should generate valid beacon payload', () => {
      const sessionToken = 'ABC123def456';
      const orgSlug = 'nhs';
      
      const payload = BLESessionService.generateBeaconPayload(sessionToken, orgSlug);
      
      expect(payload.major).toBe(1); // NHS org code
      expect(payload.minor).toBeGreaterThanOrEqual(0);
      expect(payload.minor).toBeLessThanOrEqual(0xFFFF);
      expect(payload.sessionToken).toBe(sessionToken);
      expect(payload.orgSlug).toBe(orgSlug);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => BLESessionService.generateBeaconPayload('', 'nhs')).toThrow();
      expect(() => BLESessionService.generateBeaconPayload('ABC123def456', 'unknown')).toThrow();
    });
  });

  describe('Beacon Payload Validation', () => {
    it('should validate correct beacon payloads', () => {
      expect(BLESessionService.validateBeaconPayload(1, 12345, 'nhs')).toBe(true);
      expect(BLESessionService.validateBeaconPayload(2, 54321, 'nhsa')).toBe(true);
      expect(BLESessionService.validateBeaconPayload(1, 0, 'nhs')).toBe(true);
      expect(BLESessionService.validateBeaconPayload(1, 0xFFFF, 'nhs')).toBe(true);
    });

    it('should reject invalid beacon payloads', () => {
      expect(BLESessionService.validateBeaconPayload(0, 12345, 'nhs')).toBe(false); // Wrong org code
      expect(BLESessionService.validateBeaconPayload(2, 12345, 'nhs')).toBe(false); // Mismatched org
      expect(BLESessionService.validateBeaconPayload(1, -1, 'nhs')).toBe(false); // Invalid minor
      expect(BLESessionService.validateBeaconPayload(1, 0x10000, 'nhs')).toBe(false); // Minor too large
    });
  });

  describe('Hash Collision Testing', () => {
    it('should have low collision rate for different tokens', () => {
      const tokens = [];
      const hashes = new Set();
      
      // Generate 1000 different tokens
      for (let i = 0; i < 1000; i++) {
        const token = Math.random().toString(36).substring(2, 14).padEnd(12, '0');
        if (BLESessionService.isValidSessionToken(token)) {
          tokens.push(token);
          hashes.add(BLESessionService.encodeSessionToken(token));
        }
      }
      
      // Collision rate should be reasonable (less than 10%)
      const collisionRate = (tokens.length - hashes.size) / tokens.length;
      expect(collisionRate).toBeLessThan(0.1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle boundary values correctly', () => {
      // Test with tokens at character boundaries
      const alphaToken = 'abcdefghijkl';
      const numericToken = '123456789012';
      const mixedToken = 'aB3dE6gH9jK2';
      
      expect(() => BLESessionService.encodeSessionToken(alphaToken)).not.toThrow();
      expect(() => BLESessionService.encodeSessionToken(numericToken)).not.toThrow();
      expect(() => BLESessionService.encodeSessionToken(mixedToken)).not.toThrow();
      
      // All should produce valid 16-bit values
      expect(BLESessionService.encodeSessionToken(alphaToken)).toBeLessThanOrEqual(0xFFFF);
      expect(BLESessionService.encodeSessionToken(numericToken)).toBeLessThanOrEqual(0xFFFF);
      expect(BLESessionService.encodeSessionToken(mixedToken)).toBeLessThanOrEqual(0xFFFF);
    });
  });
});