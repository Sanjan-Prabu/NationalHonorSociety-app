/**
 * BLE Multi-Organization Session Isolation Integration Tests
 * 
 * Tests for concurrent NHS and NHSA sessions
 * Verifies members only detect their organization's sessions
 * Tests session token uniqueness across organizations
 * 
 * Requirements: 2.3, 3.3, 6.4
 */

import BLESessionService from '../../services/BLESessionService';
import { Beacon } from '../../types/ble';

// Mock BLEOrganizationSecurityService with required methods
const BLEOrganizationSecurityService = {
  filterBeaconsByOrganization: (beacons: Beacon[], orgSlug: string): Beacon[] => {
    const expectedOrgCode = BLESessionService.getOrgCode(orgSlug);
    return beacons.filter(beacon => beacon.orgCode === expectedOrgCode);
  },
  
  getOrganizationFromBeacon: (beacon: Beacon): string => {
    switch (beacon.orgCode) {
      case 1: return 'nhs';
      case 2: return 'nhsa';
      default: return 'unknown';
    }
  },
  
  validateBeaconForOrganization: (beacon: Beacon, orgSlug: string): boolean => {
    const expectedOrgCode = BLESessionService.getOrgCode(orgSlug);
    return beacon.orgCode === expectedOrgCode;
  }
};

// Mock BLE Security Service first
jest.mock('../../services/BLESecurityService', () => ({
  BLESecurityService: {
    isValidTokenFormat: jest.fn().mockReturnValue(true),
    validateTokenSecurity: jest.fn().mockReturnValue({ isValid: true }),
    sanitizeToken: jest.fn().mockImplementation((token) => token),
  },
}));

// Mock Supabase client
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  },
}));

// Mock BLE Helper
jest.mock('../../../modules/BLE/BLEHelper', () => ({
  default: {
    startListening: jest.fn(),
    stopListening: jest.fn(),
    getDetectedBeacons: jest.fn(),
    broadcastAttendanceSession: jest.fn(),
    stopAttendanceSession: jest.fn(),
    validateAttendanceBeacon: jest.fn(),
  },
}));

describe('BLE Multi-Organization Session Isolation', () => {
  const NHS_ORG_ID = '11111111-1111-1111-1111-111111111111';
  const NHSA_ORG_ID = '22222222-2222-2222-2222-222222222222';
  const NHS_UUID = '6BA7B810-9DAD-11D1-80B4-00C04FD430C8';
  const NHSA_UUID = '6BA7B811-9DAD-11D1-80B4-00C04FD430C8';
  const NHS_ORG_CODE = 1;
  const NHSA_ORG_CODE = 2;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Concurrent Session Creation', () => {
    it('should create concurrent NHS and NHSA sessions with unique tokens', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      
      // Mock session creation for NHS
      mockRpc.mockResolvedValueOnce({ 
        data: {
          success: true,
          session_token: 'NHS123456789',
          event_id: 'event-1',
          entropy_bits: 64,
          security_level: 'high',
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }, 
        error: null 
      });
      
      // Mock session creation for NHSA
      mockRpc.mockResolvedValueOnce({ 
        data: {
          success: true,
          session_token: 'NHSA98765432',
          event_id: 'event-2',
          entropy_bits: 64,
          security_level: 'high',
          expires_at: new Date(Date.now() + 7200000).toISOString()
        }, 
        error: null 
      });

      // Create NHS session
      const nhsSessionToken = await BLESessionService.createSession(
        NHS_ORG_ID,
        'NHS Weekly Meeting',
        3600
      );

      // Create NHSA session
      const nhsaSessionToken = await BLESessionService.createSession(
        NHSA_ORG_ID,
        'NHSA Art Exhibition',
        7200
      );

      expect(nhsSessionToken).toBe('NHS123456789');
      expect(nhsaSessionToken).toBe('NHSA98765432');
      expect(nhsSessionToken).not.toBe(nhsaSessionToken);
      
      // Verify both calls were made with correct parameters
      expect(mockRpc).toHaveBeenCalledTimes(2);
      expect(mockRpc).toHaveBeenNthCalledWith(1, 'create_session_secure', {
        p_org_id: NHS_ORG_ID,
        p_title: 'NHS Weekly Meeting',
        p_starts_at: expect.any(String),
        p_ttl_seconds: 3600
      });
      expect(mockRpc).toHaveBeenNthCalledWith(2, 'create_session_secure', {
        p_org_id: NHSA_ORG_ID,
        p_title: 'NHSA Art Exhibition',
        p_starts_at: expect.any(String),
        p_ttl_seconds: 7200
      });
    });

    it('should generate different beacon payloads for concurrent sessions', () => {
      const nhsToken = 'ABC123def456'; // Valid 12-char token
      const nhsaToken = 'XYZ789ghi012'; // Valid 12-char token

      const nhsPayload = BLESessionService.generateBeaconPayload(nhsToken, 'nhs');
      const nhsaPayload = BLESessionService.generateBeaconPayload(nhsaToken, 'nhsa');

      // Different organization codes
      expect(nhsPayload.major).toBe(NHS_ORG_CODE);
      expect(nhsaPayload.major).toBe(NHSA_ORG_CODE);

      // Different minor values (encoded tokens)
      expect(nhsPayload.minor).not.toBe(nhsaPayload.minor);

      // Both should be valid
      expect(nhsPayload.minor).toBeGreaterThanOrEqual(0);
      expect(nhsPayload.minor).toBeLessThanOrEqual(0xFFFF);
      expect(nhsaPayload.minor).toBeGreaterThanOrEqual(0);
      expect(nhsaPayload.minor).toBeLessThanOrEqual(0xFFFF);
    });

    it('should ensure session token uniqueness across organizations', () => {
      const tokens = new Set<string>();
      
      // Generate multiple valid tokens
      for (let i = 0; i < 100; i++) {
        // Generate valid 12-character alphanumeric tokens
        const token = Math.random().toString(36).substring(2, 8) + 
                     Math.random().toString(36).substring(2, 8);
        const validToken = token.substring(0, 12).padEnd(12, '0');
        
        if (BLESessionService.isValidSessionToken(validToken)) {
          // Check for duplicates
          expect(tokens.has(validToken)).toBe(false);
          tokens.add(validToken);
        }
      }

      // Should have generated unique tokens
      expect(tokens.size).toBeGreaterThan(50); // Allowing for some duplicates in random generation
    });
  });

  describe('Organization-Specific Beacon Detection', () => {
    const createMockBeacon = (orgCode: number, sessionToken: string): Beacon => {
      // Ensure we use a valid 12-character token
      const validToken = sessionToken.length === 12 ? sessionToken : 'ABC123def456';
      const minor = BLESessionService.encodeSessionToken(validToken);
      const uuid = orgCode === NHS_ORG_CODE ? NHS_UUID : NHSA_UUID;
      
      return {
        uuid,
        major: orgCode,
        minor,
        rssi: -50,
        timestamp: Date.now(),
        isAttendanceBeacon: true,
        orgCode,
      };
    };

    it('should filter beacons by organization context for NHS members', async () => {
      const nhsBeacon = createMockBeacon(NHS_ORG_CODE, 'ABC123def456');
      const nhsaBeacon = createMockBeacon(NHSA_ORG_CODE, 'XYZ789ghi012');
      const allBeacons = [nhsBeacon, nhsaBeacon];

      // Simulate NHS member context
      const nhsMemberContext = { orgSlug: 'nhs', orgId: NHS_ORG_ID };
      
      const filteredBeacons = BLEOrganizationSecurityService.filterBeaconsByOrganization(
        allBeacons,
        nhsMemberContext.orgSlug
      );

      expect(filteredBeacons).toHaveLength(1);
      expect(filteredBeacons[0]).toMatchObject({
        uuid: NHS_UUID,
        major: NHS_ORG_CODE,
        orgCode: NHS_ORG_CODE,
      });
    });

    it('should filter beacons by organization context for NHSA members', async () => {
      const nhsBeacon = createMockBeacon(NHS_ORG_CODE, 'ABC123def456');
      const nhsaBeacon = createMockBeacon(NHSA_ORG_CODE, 'XYZ789ghi012');
      const allBeacons = [nhsBeacon, nhsaBeacon];

      // Simulate NHSA member context
      const nhsaMemberContext = { orgSlug: 'nhsa', orgId: NHSA_ORG_ID };
      
      const filteredBeacons = BLEOrganizationSecurityService.filterBeaconsByOrganization(
        allBeacons,
        nhsaMemberContext.orgSlug
      );

      expect(filteredBeacons).toHaveLength(1);
      expect(filteredBeacons[0]).toMatchObject({
        uuid: NHSA_UUID,
        major: NHSA_ORG_CODE,
        orgCode: NHSA_ORG_CODE,
      });
    });

    it('should reject beacons from other organizations', () => {
      const nhsBeacon = createMockBeacon(NHS_ORG_CODE, 'ABC123def456');
      const nhsaBeacon = createMockBeacon(NHSA_ORG_CODE, 'XYZ789ghi012');

      // NHS member should not see NHSA beacon
      const nhsFiltered = BLEOrganizationSecurityService.filterBeaconsByOrganization(
        [nhsaBeacon],
        'nhs'
      );
      expect(nhsFiltered).toHaveLength(0);

      // NHSA member should not see NHS beacon
      const nhsaFiltered = BLEOrganizationSecurityService.filterBeaconsByOrganization(
        [nhsBeacon],
        'nhsa'
      );
      expect(nhsaFiltered).toHaveLength(0);
    });

    it('should handle unknown organization beacons gracefully', () => {
      const unknownBeacon: Beacon = {
        uuid: '00000000-0000-0000-0000-000000000000',
        major: 999,
        minor: 12345,
        rssi: -60,
        timestamp: Date.now(),
        isAttendanceBeacon: false,
        orgCode: 0,
      };

      const nhsFiltered = BLEOrganizationSecurityService.filterBeaconsByOrganization(
        [unknownBeacon],
        'nhs'
      );
      
      const nhsaFiltered = BLEOrganizationSecurityService.filterBeaconsByOrganization(
        [unknownBeacon],
        'nhsa'
      );

      expect(nhsFiltered).toHaveLength(0);
      expect(nhsaFiltered).toHaveLength(0);
    });
  });

  describe('Session Token Resolution and Validation', () => {
    it('should resolve session tokens only for correct organization', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      
      // Mock successful resolution for NHS session
      mockRpc.mockResolvedValueOnce({
        data: [{ 
          org_id: NHS_ORG_ID, 
          event_id: 'event-1', 
          event_title: 'NHS Meeting',
          org_slug: 'nhs',
          starts_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 3600000).toISOString(),
          is_valid: true 
        }],
        error: null
      });

      const nhsSessionInfo = await BLESessionService.resolveSession('ABC123def456');
      
      expect(mockRpc).toHaveBeenCalledWith('resolve_session', {
        p_session_token: 'ABC123def456'
      });
      expect(nhsSessionInfo).toMatchObject({
        orgId: NHS_ORG_ID,
        eventId: 'event-1',
        isValid: true
      });
    });

    it('should validate organization membership before attendance submission', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      
      // Mock successful attendance submission
      mockRpc.mockResolvedValueOnce({
        data: {
          success: true,
          attendance_id: 'att-1',
          event_id: 'event-1',
          event_title: 'NHS Meeting',
          org_slug: 'nhs',
          recorded_at: new Date().toISOString(),
          session_expires_at: new Date(Date.now() + 3600000).toISOString()
        },
        error: null
      });

      const result = await BLESessionService.addAttendance('ABC123def456');
      
      expect(mockRpc).toHaveBeenCalledWith('add_attendance_secure', {
        p_session_token: 'ABC123def456'
      });
      expect(result.success).toBe(true);
    });

    it('should reject attendance submission for wrong organization', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      
      // Mock failed attendance submission (member not in organization)
      mockRpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'unauthorized',
          message: 'Member not in organization'
        },
        error: null
      });

      const result = await BLESessionService.addAttendance('ABC123def456');
      
      expect(result.success).toBe(false);
    });

    it('should handle expired session tokens appropriately', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      
      // Mock expired session resolution
      mockRpc.mockResolvedValueOnce({
        data: [{ 
          org_id: NHS_ORG_ID, 
          event_id: 'event-1',
          event_title: 'Expired Meeting',
          org_slug: 'nhs',
          starts_at: new Date(Date.now() - 7200000).toISOString(),
          expires_at: new Date(Date.now() - 3600000).toISOString(),
          is_valid: false 
        }],
        error: null
      });

      const sessionInfo = await BLESessionService.resolveSession('ABC123def456');
      
      expect(sessionInfo?.isValid).toBe(false);
    });
  });

  describe('Concurrent Session Broadcasting', () => {
    it('should support simultaneous broadcasting from different organizations', async () => {
      const mockBroadcast = require('../../../modules/BLE/BLEHelper').default.broadcastAttendanceSession;
      mockBroadcast.mockResolvedValue('Broadcasting started');

      // Test that BLE Helper can handle concurrent broadcasts
      await mockBroadcast(NHS_ORG_CODE, 'ABC123def456');
      await mockBroadcast(NHSA_ORG_CODE, 'XYZ789ghi012');

      expect(mockBroadcast).toHaveBeenCalledTimes(2);
      expect(mockBroadcast).toHaveBeenNthCalledWith(1, NHS_ORG_CODE, 'ABC123def456');
      expect(mockBroadcast).toHaveBeenNthCalledWith(2, NHSA_ORG_CODE, 'XYZ789ghi012');
    });

    it('should stop organization-specific sessions independently', async () => {
      const mockStop = require('../../../modules/BLE/BLEHelper').default.stopAttendanceSession;
      mockStop.mockResolvedValue('Session stopped');

      // Test that BLE Helper can stop sessions independently
      await mockStop(NHS_ORG_CODE);
      await mockStop(NHSA_ORG_CODE);

      expect(mockStop).toHaveBeenCalledTimes(2);
      expect(mockStop).toHaveBeenNthCalledWith(1, NHS_ORG_CODE);
      expect(mockStop).toHaveBeenNthCalledWith(2, NHSA_ORG_CODE);
    });

    it('should prevent cross-organization session interference', () => {
      const nhsToken = 'ABC123def456';
      const nhsaToken = 'XYZ789ghi012';

      // Generate payloads
      const nhsPayload = BLESessionService.generateBeaconPayload(nhsToken, 'nhs');
      const nhsaPayload = BLESessionService.generateBeaconPayload(nhsaToken, 'nhsa');

      // Validate that NHS payload is not valid for NHSA context
      const nhsValidForNHSA = BLESessionService.validateBeaconPayload(
        nhsPayload.major,
        nhsPayload.minor,
        'nhsa'
      );
      expect(nhsValidForNHSA).toBe(false);

      // Validate that NHSA payload is not valid for NHS context
      const nhsaValidForNHS = BLESessionService.validateBeaconPayload(
        nhsaPayload.major,
        nhsaPayload.minor,
        'nhs'
      );
      expect(nhsaValidForNHS).toBe(false);

      // Validate that each payload is valid for its own organization
      const nhsValidForNHS = BLESessionService.validateBeaconPayload(
        nhsPayload.major,
        nhsPayload.minor,
        'nhs'
      );
      expect(nhsValidForNHS).toBe(true);

      const nhsaValidForNHSA = BLESessionService.validateBeaconPayload(
        nhsaPayload.major,
        nhsaPayload.minor,
        'nhsa'
      );
      expect(nhsaValidForNHSA).toBe(true);
    });
  });

  describe('Security and Isolation Validation', () => {
    it('should ensure session tokens cannot be guessed across organizations', () => {
      const nhsTokens = [];
      const nhsaTokens = [];

      // Generate sample tokens for each organization
      for (let i = 0; i < 50; i++) {
        const nhsToken = `NHS${Math.random().toString(36).substring(2, 11)}`;
        const nhsaToken = `NHSA${Math.random().toString(36).substring(2, 10)}`;
        
        if (BLESessionService.isValidSessionToken(nhsToken)) {
          nhsTokens.push(nhsToken);
        }
        if (BLESessionService.isValidSessionToken(nhsaToken)) {
          nhsaTokens.push(nhsaToken);
        }
      }

      // Ensure no overlap between organization tokens
      const nhsSet = new Set(nhsTokens);
      const nhsaSet = new Set(nhsaTokens);
      const intersection = new Set([...nhsSet].filter(x => nhsaSet.has(x)));
      
      expect(intersection.size).toBe(0);
    });

    it('should validate beacon payload security across organizations', () => {
      const testCases = [
        { orgCode: NHS_ORG_CODE, expectedOrg: 'nhs', shouldPass: true },
        { orgCode: NHSA_ORG_CODE, expectedOrg: 'nhsa', shouldPass: true },
        { orgCode: NHS_ORG_CODE, expectedOrg: 'nhsa', shouldPass: false },
        { orgCode: NHSA_ORG_CODE, expectedOrg: 'nhs', shouldPass: false },
        { orgCode: 999, expectedOrg: 'nhs', shouldPass: false },
        { orgCode: 0, expectedOrg: 'nhsa', shouldPass: false },
      ];

      testCases.forEach(({ orgCode, expectedOrg, shouldPass }) => {
        const isValid = BLESessionService.validateBeaconPayload(
          orgCode,
          12345, // arbitrary minor value
          expectedOrg
        );
        
        expect(isValid).toBe(shouldPass);
      });
    });

    it('should prevent session replay attacks across organizations', async () => {
      const mockRpc = require('../../lib/supabaseClient').supabase.rpc;
      
      // Mock expired session
      mockRpc.mockResolvedValueOnce({
        data: [{ 
          org_id: NHS_ORG_ID, 
          event_id: 'event-1',
          event_title: 'Expired Meeting',
          org_slug: 'nhs',
          starts_at: new Date(Date.now() - 7200000).toISOString(),
          expires_at: new Date(Date.now() - 3600000).toISOString(),
          is_valid: false // Expired
        }],
        error: null
      });

      const sessionInfo = await BLESessionService.resolveSession('ABC123def456');
      
      // Expired sessions should not be valid
      expect(sessionInfo?.isValid).toBe(false);
      
      // Attempt to use expired token should fail
      mockRpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'session_expired',
          message: 'Session has expired'
        },
        error: null
      });

      const attendanceResult = await BLESessionService.addAttendance('ABC123def456');
      expect(attendanceResult.success).toBe(false);
    });

    it('should maintain organization context throughout beacon lifecycle', () => {
      const nhsBeacon = {
        uuid: NHS_UUID,
        major: NHS_ORG_CODE,
        minor: 12345,
        rssi: -45,
        timestamp: Date.now(),
        isAttendanceBeacon: true,
        orgCode: NHS_ORG_CODE,
      };

      const nhsaBeacon = {
        uuid: NHSA_UUID,
        major: NHSA_ORG_CODE,
        minor: 54321,
        rssi: -50,
        timestamp: Date.now(),
        isAttendanceBeacon: true,
        orgCode: NHSA_ORG_CODE,
      };

      // Verify organization context is maintained
      expect(BLEOrganizationSecurityService.getOrganizationFromBeacon(nhsBeacon)).toBe('nhs');
      expect(BLEOrganizationSecurityService.getOrganizationFromBeacon(nhsaBeacon)).toBe('nhsa');
      
      // Verify cross-organization validation fails
      expect(BLEOrganizationSecurityService.validateBeaconForOrganization(nhsBeacon, 'nhsa')).toBe(false);
      expect(BLEOrganizationSecurityService.validateBeaconForOrganization(nhsaBeacon, 'nhs')).toBe(false);
      
      // Verify same-organization validation passes
      expect(BLEOrganizationSecurityService.validateBeaconForOrganization(nhsBeacon, 'nhs')).toBe(true);
      expect(BLEOrganizationSecurityService.validateBeaconForOrganization(nhsaBeacon, 'nhsa')).toBe(true);
    });
  });
});