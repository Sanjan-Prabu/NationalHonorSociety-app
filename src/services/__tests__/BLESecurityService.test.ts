/**
 * BLE Security Service Tests
 * Comprehensive testing for cryptographically secure token generation and validation
 */

// Mock supabase client before importing BLESecurityService
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    rpc: jest.fn()
  }
}));

import BLESecurityService from '../BLESecurityService';

// Mock crypto for testing environments
const mockCrypto = {
  getRandomValues: jest.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: {
    digest: jest.fn(async (algorithm: string, data: ArrayBuffer) => {
      // Simple mock hash for testing
      const view = new Uint8Array(data);
      const hash = new ArrayBuffer(32);
      const hashView = new Uint8Array(hash);
      for (let i = 0; i < 32; i++) {
        hashView[i] = (view[i % view.length] + i) % 256;
      }
      return hash;
    })
  }
};

// Setup crypto mock
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

describe('BLESecurityService', () => {
  beforeEach(() => {
    BLESecurityService.resetMetrics();
    jest.clearAllMocks();
  });

  describe('generateSecureToken', () => {
    it('should generate tokens of correct length', async () => {
      const token = await BLESecurityService.generateSecureToken();
      expect(token).toHaveLength(12);
    });

    it('should generate tokens with valid character set', async () => {
      const token = await BLESecurityService.generateSecureToken();
      const validChars = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
      expect(token).toMatch(validChars);
    });

    it('should generate unique tokens', async () => {
      const tokens = new Set<string>();
      const sampleSize = 100;

      for (let i = 0; i < sampleSize; i++) {
        const token = await BLESecurityService.generateSecureToken();
        tokens.add(token);
      }

      // Should have high uniqueness (allow for very small collision chance)
      expect(tokens.size).toBeGreaterThan(sampleSize * 0.95);
    });

    it('should use crypto.getRandomValues when available', async () => {
      await BLESecurityService.generateSecureToken();
      expect(mockCrypto.getRandomValues).toHaveBeenCalled();
    });

    it('should retry if token has low entropy', async () => {
      // Mock a scenario where first token has low entropy
      let callCount = 0;
      const originalGetRandomValues = mockCrypto.getRandomValues;
      
      mockCrypto.getRandomValues = jest.fn((array: Uint8Array) => {
        callCount++;
        if (callCount === 1) {
          // First call: generate low entropy token (all same character)
          array.fill(0);
        } else {
          // Subsequent calls: normal random values
          originalGetRandomValues(array);
        }
        return array;
      });

      const token = await BLESecurityService.generateSecureToken();
      expect(token).toHaveLength(12);
      expect(mockCrypto.getRandomValues).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateTokenSecurity', () => {
    it('should validate correct token format', () => {
      const validToken = 'ABCD23456789';
      const result = BLESecurityService.validateTokenSecurity(validToken);
      
      expect(result.isValid).toBe(true);
      expect(result.entropy).toBeGreaterThan(0);
      expect(result.collisionRisk).toBeDefined();
    });

    it('should reject null or undefined tokens', () => {
      expect(BLESecurityService.validateTokenSecurity(null as any).isValid).toBe(false);
      expect(BLESecurityService.validateTokenSecurity(undefined as any).isValid).toBe(false);
    });

    it('should reject tokens with incorrect length', () => {
      expect(BLESecurityService.validateTokenSecurity('SHORT').isValid).toBe(false);
      expect(BLESecurityService.validateTokenSecurity('TOOLONGTOKEN123').isValid).toBe(false);
    });

    it('should reject tokens with invalid characters', () => {
      const invalidTokens = [
        'ABCD1234567O', // Contains 'O' (ambiguous)
        'ABCD1234567I', // Contains 'I' (ambiguous)
        'ABCD1234567!', // Contains special character
        'abcd12345678', // Contains lowercase
      ];

      invalidTokens.forEach(token => {
        expect(BLESecurityService.validateTokenSecurity(token).isValid).toBe(false);
      });
    });

    it('should calculate entropy correctly', () => {
      const highEntropyToken = 'ABCDEFGH2345'; // Mixed characters
      const lowEntropyToken = 'AAAAAAAAAAAA'; // All same character
      
      const highResult = BLESecurityService.validateTokenSecurity(highEntropyToken);
      const lowResult = BLESecurityService.validateTokenSecurity(lowEntropyToken);
      
      expect(highResult.entropy).toBeGreaterThan(lowResult.entropy || 0);
    });

    it('should assess collision risk correctly', () => {
      const highEntropyToken = 'ABCDEFGH2345';
      const result = BLESecurityService.validateTokenSecurity(highEntropyToken);
      
      expect(['low', 'medium', 'high']).toContain(result.collisionRisk);
    });

    it('should reject tokens with insufficient entropy', () => {
      const lowEntropyToken = 'AAAAAAAAAAAA';
      const result = BLESecurityService.validateTokenSecurity(lowEntropyToken);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('entropy');
    });
  });

  describe('testTokenUniqueness', () => {
    it('should test token uniqueness with small sample', async () => {
      const result = await BLESecurityService.testTokenUniqueness(50);
      
      expect(result.uniqueTokens).toBeGreaterThan(0);
      expect(result.duplicates).toBeGreaterThanOrEqual(0);
      expect(result.collisionRate).toBeGreaterThanOrEqual(0);
      expect(result.averageEntropy).toBeGreaterThan(0);
    });

    it('should have low collision rate for reasonable sample sizes', async () => {
      const result = await BLESecurityService.testTokenUniqueness(100);
      
      // Should have very low collision rate
      expect(result.collisionRate).toBeLessThan(0.1);
    });
  });

  describe('isValidTokenFormat', () => {
    it('should validate correct token formats', () => {
      const validTokens = [
        'ABCDEFGH2345',
        'ZYXWVU987654',
        '234567890ABC'
      ];

      validTokens.forEach(token => {
        expect(BLESecurityService.isValidTokenFormat(token)).toBe(true);
      });
    });

    it('should reject invalid token formats', () => {
      const invalidTokens = [
        null,
        undefined,
        '',
        'SHORT',
        'TOOLONGTOKEN123',
        'ABCD1234567O', // Contains 'O'
        'ABCD1234567!', // Special character
      ];

      invalidTokens.forEach(token => {
        expect(BLESecurityService.isValidTokenFormat(token as any)).toBe(false);
      });
    });
  });

  describe('sanitizeToken', () => {
    it('should sanitize valid tokens', () => {
      expect(BLESecurityService.sanitizeToken('  abcdefgh2345  ')).toBe('ABCDEFGH2345');
      expect(BLESecurityService.sanitizeToken('abcdefgh2345')).toBe('ABCDEFGH2345');
    });

    it('should return null for invalid tokens', () => {
      expect(BLESecurityService.sanitizeToken('')).toBe(null);
      expect(BLESecurityService.sanitizeToken('SHORT')).toBe(null);
      expect(BLESecurityService.sanitizeToken('INVALID!')).toBe(null);
    });

    it('should handle null and undefined input', () => {
      expect(BLESecurityService.sanitizeToken(null as any)).toBe(null);
      expect(BLESecurityService.sanitizeToken(undefined as any)).toBe(null);
    });
  });

  describe('hashToken', () => {
    it('should hash valid tokens', async () => {
      const token = 'ABCDEFGH2345';
      const hash = await BLESecurityService.hashToken(token);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce consistent hashes', async () => {
      const token = 'ABCDEFGH2345';
      const hash1 = await BLESecurityService.hashToken(token);
      const hash2 = await BLESecurityService.hashToken(token);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different tokens', async () => {
      const token1 = 'ABCDEFGH2345';
      const token2 = 'ZYXWVU987654';
      
      const hash1 = await BLESecurityService.hashToken(token1);
      const hash2 = await BLESecurityService.hashToken(token2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should reject invalid token formats', async () => {
      await expect(BLESecurityService.hashToken('INVALID!')).rejects.toThrow();
      await expect(BLESecurityService.hashToken('SHORT')).rejects.toThrow();
    });

    it('should use crypto.subtle when available', async () => {
      const token = 'ABCDEFGH2345';
      await BLESecurityService.hashToken(token);
      
      expect(mockCrypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(ArrayBuffer));
    });
  });

  describe('getSecurityMetrics', () => {
    it('should return security metrics', () => {
      const metrics = BLESecurityService.getSecurityMetrics();
      
      expect(metrics).toHaveProperty('tokenEntropy');
      expect(metrics).toHaveProperty('collisionProbability');
      expect(metrics).toHaveProperty('uniqueTokensGenerated');
      expect(metrics).toHaveProperty('validationFailures');
      expect(metrics).toHaveProperty('securityLevel');
    });

    it('should update metrics after token generation', async () => {
      const initialMetrics = BLESecurityService.getSecurityMetrics();
      expect(initialMetrics.uniqueTokensGenerated).toBe(0);
      
      await BLESecurityService.generateSecureToken();
      
      const updatedMetrics = BLESecurityService.getSecurityMetrics();
      expect(updatedMetrics.uniqueTokensGenerated).toBe(1);
    });

    it('should track validation failures', () => {
      const initialMetrics = BLESecurityService.getSecurityMetrics();
      expect(initialMetrics.validationFailures).toBe(0);
      
      BLESecurityService.validateTokenSecurity('INVALID!');
      
      const updatedMetrics = BLESecurityService.getSecurityMetrics();
      expect(updatedMetrics.validationFailures).toBe(1);
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to initial state', async () => {
      // Generate some activity
      await BLESecurityService.generateSecureToken();
      BLESecurityService.validateTokenSecurity('INVALID!');
      
      const metricsBeforeReset = BLESecurityService.getSecurityMetrics();
      expect(metricsBeforeReset.uniqueTokensGenerated).toBeGreaterThan(0);
      expect(metricsBeforeReset.validationFailures).toBeGreaterThan(0);
      
      BLESecurityService.resetMetrics();
      
      const metricsAfterReset = BLESecurityService.getSecurityMetrics();
      expect(metricsAfterReset.uniqueTokensGenerated).toBe(0);
      expect(metricsAfterReset.validationFailures).toBe(0);
      expect(metricsAfterReset.securityLevel).toBe('weak');
    });
  });

  describe('entropy calculation', () => {
    it('should calculate higher entropy for diverse character sets', () => {
      const diverseToken = 'ABCDEFGH2345';
      const repetitiveToken = 'ABABABABAB23';
      
      const diverseResult = BLESecurityService.validateTokenSecurity(diverseToken);
      const repetitiveResult = BLESecurityService.validateTokenSecurity(repetitiveToken);
      
      expect(diverseResult.entropy).toBeGreaterThan(repetitiveResult.entropy || 0);
    });

    it('should assign appropriate collision risk levels', () => {
      const highEntropyToken = 'ABCDEFGH2345';
      const result = BLESecurityService.validateTokenSecurity(highEntropyToken);
      
      if (result.entropy && result.entropy >= 80) {
        expect(result.collisionRisk).toBe('low');
      } else if (result.entropy && result.entropy >= 60) {
        expect(result.collisionRisk).toBe('medium');
      } else {
        expect(result.collisionRisk).toBe('high');
      }
    });
  });

  describe('security level assessment', () => {
    it('should update security level based on metrics', async () => {
      // Generate multiple tokens to build up metrics
      for (let i = 0; i < 5; i++) {
        await BLESecurityService.generateSecureToken();
      }
      
      const metrics = BLESecurityService.getSecurityMetrics();
      expect(['weak', 'moderate', 'strong']).toContain(metrics.securityLevel);
    });
  });

  describe('error handling', () => {
    it('should handle crypto API unavailability gracefully', async () => {
      // Temporarily remove crypto API
      const originalCrypto = global.crypto;
      delete (global as any).crypto;
      
      try {
        const token = await BLESecurityService.generateSecureToken();
        expect(token).toHaveLength(12);
        expect(BLESecurityService.isValidTokenFormat(token)).toBe(true);
      } finally {
        // Restore crypto API
        (global as any).crypto = originalCrypto;
      }
    });

    it('should handle hashing failures gracefully', async () => {
      // Mock crypto.subtle to throw an error
      const originalSubtle = mockCrypto.subtle;
      mockCrypto.subtle = {
        digest: jest.fn().mockRejectedValue(new Error('Hashing failed'))
      };
      
      try {
        await expect(BLESecurityService.hashToken('ABCDEFGH2345')).rejects.toThrow('Token hashing failed');
      } finally {
        // Restore original subtle
        mockCrypto.subtle = originalSubtle;
      }
    });
  });
});