/**
 * BLE Organization Security Tests
 * Tests for organization isolation and RLS compliance in BLE attendance system
 */

// Mock supabase client
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    rpc: jest.fn(),
    auth: {
      uid: jest.fn()
    }
  }
}));

import { supabase } from '../../lib/supabaseClient';
import BLESessionService from '../BLESessionService';

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('BLE Organization Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authenticated user
    mockSupabase.auth.uid = jest.fn().mockReturnValue('user-123');
  });

  describe('Cross-organization session access prevention', () => {
    it('should prevent NHS member from accessing NHSA session', async () => {
      // Mock NHS member trying to access NHSA session
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'organization_mismatch',
          message: 'User is not a member of this organization'
        },
        error: null
      });

      const result = await BLESessionService.addAttendance('NHSATOKEN123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('organization_mismatch');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('add_attendance_secure', {
        p_session_token: 'NHSATOKEN123'
      });
    });

    it('should prevent NHSA member from accessing NHS session', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'organization_mismatch',
          message: 'User is not a member of this organization'
        },
        error: null
      });

      const result = await BLESessionService.addAttendance('NHSTOKEN1234');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('organization_mismatch');
    });
  });

  describe('RLS policy enforcement', () => {
    it('should enforce RLS policies for session creation', async () => {
      // Mock unauthorized access attempt
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'unauthorized',
          message: 'User not authorized to create sessions for this organization'
        },
        error: null
      });

      await expect(
        BLESessionService.createSession('unauthorized-org-id', 'Test Session')
      ).rejects.toThrow('Session creation failed');
    });

    it('should enforce RLS policies for attendance submission', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'unauthorized',
          message: 'User not authenticated'
        },
        error: null
      });

      const result = await BLESessionService.addAttendance('TESTTOKEN1234');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('unauthorized');
    });

    it('should allow authorized access within same organization', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: true,
          attendance_id: 'att-123',
          event_id: 'evt-123',
          event_title: 'Test Event',
          org_slug: 'nhs',
          recorded_at: new Date().toISOString(),
          session_expires_at: new Date(Date.now() + 3600000).toISOString(),
          time_remaining_seconds: 3600,
          token_security: { is_valid: true, entropy_bits: 65 }
        },
        error: null
      });

      const result = await BLESessionService.addAttendance('VALIDTOKEN123');
      
      expect(result.success).toBe(true);
      expect(result.attendanceId).toBe('att-123');
      expect(result.orgSlug).toBe('nhs');
    });
  });

  describe('Member organization membership validation', () => {
    it('should validate active membership before allowing attendance', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'organization_mismatch',
          message: 'User is not an active member of this organization'
        },
        error: null
      });

      const result = await BLESessionService.addAttendance('TESTTOKEN1234');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('organization_mismatch');
      expect(result.message).toContain('not an active member');
    });

    it('should reject inactive memberships', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'organization_mismatch',
          message: 'User membership is inactive'
        },
        error: null
      });

      const result = await BLESessionService.addAttendance('TESTTOKEN1234');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('organization_mismatch');
    });

    it('should validate organization is active', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'organization_inactive',
          message: 'Organization is not active'
        },
        error: null
      });

      const result = await BLESessionService.addAttendance('TESTTOKEN1234');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('organization_inactive');
    });
  });

  describe('Session token isolation', () => {
    it('should prevent token reuse across organizations', async () => {
      // Test that a token from one org cannot be used in another
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'session_not_found',
          message: 'Session not found'
        },
        error: null
      });

      const result = await BLESessionService.addAttendance('CROSSORGTKN1');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('session_not_found');
    });

    it('should validate session belongs to user organization', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            org_id: 'nhs-org-id',
            event_id: 'evt-123',
            event_title: 'NHS Meeting',
            is_valid: true,
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            org_slug: 'nhs'
          }
        ],
        error: null
      });

      const session = await BLESessionService.resolveSession('NHSTOKEN1234');
      
      expect(session).toBeTruthy();
      expect(session?.orgSlug).toBe('nhs');
      expect(session?.isValid).toBe(true);
    });

    it('should return null for cross-organization token resolution', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      const session = await BLESessionService.resolveSession('INVALIDTOKEN1');
      
      expect(session).toBeNull();
    });
  });

  describe('Database security validation', () => {
    it('should handle database RLS violations gracefully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          code: '42501',
          message: 'insufficient_privilege: permission denied for table events'
        }
      });

      await expect(
        BLESessionService.createSession('protected-org-id', 'Test Session')
      ).rejects.toThrow('Failed to create session');
    });

    it('should validate foreign key constraints', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          code: '23503',
          message: 'foreign key violation'
        }
      });

      await expect(
        BLESessionService.createSession('nonexistent-org-id', 'Test Session')
      ).rejects.toThrow('Failed to create session');
    });

    it('should enforce unique constraints', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: {
          success: false,
          error: 'duplicate_entry',
          message: 'Attendance already recorded'
        },
        error: null
      });

      const result = await BLESessionService.addAttendance('DUPLICATE1234');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('duplicate_entry');
    });
  });

  describe('Security audit logging', () => {
    it('should log security violations for monitoring', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: {
          code: '42501',
          message: 'permission denied'
        }
      });

      await expect(
        BLESessionService.createSession('unauthorized-org', 'Test')
      ).rejects.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create secure BLE session:',
        expect.objectContaining({
          code: '42501',
          message: 'permission denied'
        })
      );

      consoleSpy.mockRestore();
    });
  });
});