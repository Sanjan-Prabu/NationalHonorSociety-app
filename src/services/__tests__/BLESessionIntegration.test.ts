/**
 * BLE Session Integration Tests
 * Tests the complete session management flow including database functions
 */

// Mock the supabase client
const mockRpc = jest.fn();
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

// Import after mocking
import BLESessionService from '../BLESessionService';

describe('BLE Session Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Creation Flow', () => {
    it('should create a session and return a valid token', async () => {
      const mockToken = 'ABC123def456';
      mockRpc.mockResolvedValueOnce({ data: mockToken, error: null });

      const token = await BLESessionService.createSession(
        'test-org-id',
        'Test Session',
        3600
      );

      expect(token).toBe(mockToken);
      expect(mockRpc).toHaveBeenCalledWith('create_session', {
        p_org_id: 'test-org-id',
        p_title: 'Test Session',
        p_starts_at: expect.any(String),
        p_ttl_seconds: 3600,
      });
    });

    it('should validate input parameters', async () => {
      await expect(
        BLESessionService.createSession('', 'Test Session', 3600)
      ).rejects.toThrow('Organization ID and title are required');

      await expect(
        BLESessionService.createSession('test-org-id', '', 3600)
      ).rejects.toThrow('Organization ID and title are required');

      await expect(
        BLESessionService.createSession('test-org-id', 'Test Session', 0)
      ).rejects.toThrow('TTL must be between 1 and 86400 seconds');

      await expect(
        BLESessionService.createSession('test-org-id', 'Test Session', 90000)
      ).rejects.toThrow('TTL must be between 1 and 86400 seconds');
    });
  });

  describe('Session Resolution Flow', () => {
    it('should resolve a valid session', async () => {
      const mockSessionData = [{
        org_id: 'test-org-id',
        event_id: 'test-event-id',
        event_title: 'Test Session',
        is_valid: true,
        expires_at: '2025-10-16T22:00:00Z',
        org_slug: 'test-nhs',
      }];
      
      mockRpc.mockResolvedValueOnce({ data: mockSessionData, error: null });

      const session = await BLESessionService.resolveSession('ABC123def456');

      expect(session).toEqual({
        sessionToken: 'ABC123def456',
        eventId: 'test-event-id',
        eventTitle: 'Test Session',
        orgId: 'test-org-id',
        orgSlug: 'test-nhs',
        startsAt: expect.any(Date),
        endsAt: expect.any(Date),
        isValid: true,
        attendeeCount: 0,
        orgCode: 1, // test-nhs maps to code 1
      });
    });

    it('should return null for invalid session token', async () => {
      const session = await BLESessionService.resolveSession('invalid');
      expect(session).toBeNull();
    });

    it('should return null when session not found', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });

      const session = await BLESessionService.resolveSession('ABC123def456');
      expect(session).toBeNull();
    });
  });

  describe('Attendance Recording Flow', () => {
    it('should record attendance successfully', async () => {
      const mockResult = {
        success: true,
        attendance_id: 'attendance-123',
        event_id: 'event-123',
        event_title: 'Test Session',
        org_slug: 'test-nhs',
        recorded_at: '2025-10-16T20:00:00Z',
      };

      mockRpc.mockResolvedValueOnce({ data: mockResult, error: null });

      const result = await BLESessionService.addAttendance('ABC123def456');

      expect(result.success).toBe(true);
      expect(result.attendanceId).toBe('attendance-123');
      expect(result.recordedAt).toBeInstanceOf(Date);
    });

    it('should handle attendance errors', async () => {
      const mockResult = {
        success: false,
        error: 'session_expired',
        message: 'Session has expired',
      };

      mockRpc.mockResolvedValueOnce({ data: mockResult, error: null });

      const result = await BLESessionService.addAttendance('ABC123def456');

      expect(result.success).toBe(false);
      expect(result.error).toBe('session_expired');
    });

    it('should validate token format before making request', async () => {
      const result = await BLESessionService.addAttendance('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('invalid_token');
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('Active Sessions Flow', () => {
    it('should get active sessions for organization', async () => {
      const mockSessions = [
        {
          session_token: 'ABC123def456',
          event_id: 'event-1',
          event_title: 'Session 1',
          starts_at: '2025-10-16T19:00:00Z',
          ends_at: '2025-10-16T21:00:00Z',
          attendee_count: 5,
          org_code: 1,
        },
        {
          session_token: 'XYZ789ghi012',
          event_id: 'event-2',
          event_title: 'Session 2',
          starts_at: '2025-10-16T20:00:00Z',
          ends_at: '2025-10-16T22:00:00Z',
          attendee_count: 3,
          org_code: 1,
        },
      ];

      mockRpc.mockResolvedValueOnce({ data: mockSessions, error: null });

      const sessions = await BLESessionService.getActiveSessions('test-org-id');

      expect(sessions).toHaveLength(2);
      expect(sessions[0].sessionToken).toBe('ABC123def456');
      expect(sessions[0].attendeeCount).toBe(5);
      expect(sessions[1].sessionToken).toBe('XYZ789ghi012');
      expect(sessions[1].attendeeCount).toBe(3);
    });

    it('should return empty array when no active sessions', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });

      const sessions = await BLESessionService.getActiveSessions('test-org-id');

      expect(sessions).toEqual([]);
    });
  });

  describe('Beacon Session Lookup Flow', () => {
    it('should find session by beacon payload', async () => {
      const mockSessions = [
        {
          session_token: 'ABC123def456',
          event_id: 'event-1',
          event_title: 'Session 1',
          starts_at: '2025-10-16T19:00:00Z',
          ends_at: '2025-10-16T21:00:00Z',
          attendee_count: 0,
          org_code: 1,
        },
      ];

      mockRpc.mockResolvedValueOnce({ data: mockSessions, error: null });

      const expectedHash = BLESessionService.encodeSessionToken('ABC123def456');
      const session = await BLESessionService.findSessionByBeacon(
        1, // major (org code)
        expectedHash, // minor (token hash)
        'test-org-id'
      );

      expect(session).not.toBeNull();
      expect(session?.sessionToken).toBe('ABC123def456');
    });

    it('should return null when no matching session found', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });

      const session = await BLESessionService.findSessionByBeacon(
        1,
        12345,
        'test-org-id'
      );

      expect(session).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockRpc.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Network error' } 
      });

      await expect(
        BLESessionService.createSession('test-org-id', 'Test Session', 3600)
      ).rejects.toThrow('Failed to create session: Network error');
    });

    it('should handle invalid server responses', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: null });

      await expect(
        BLESessionService.createSession('test-org-id', 'Test Session', 3600)
      ).rejects.toThrow('Invalid session token received from server');
    });
  });
});