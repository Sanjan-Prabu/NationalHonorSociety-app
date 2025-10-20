/**
 * VerificationRequestService Tests
 * Basic tests to validate the service functionality
 */

// Mock the dependencies first, before any imports
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

jest.mock('../BaseDataService');

import { VerificationRequestService } from '../VerificationRequestService';

describe('VerificationRequestService', () => {
  let verificationRequestService: VerificationRequestService;

  beforeEach(() => {
    verificationRequestService = new VerificationRequestService();
  });

  describe('constructor', () => {
    it('should create an instance with correct service name', () => {
      expect(verificationRequestService).toBeInstanceOf(VerificationRequestService);
      expect((verificationRequestService as any).serviceName).toBe('VerificationRequestService');
    });
  });

  describe('CRUD operations', () => {
    it('should have required CRUD methods', () => {
      expect(typeof verificationRequestService.createRequest).toBe('function');
      expect(typeof verificationRequestService.getRequestsByMember).toBe('function');
      expect(typeof verificationRequestService.getRequestsByOrganization).toBe('function');
      expect(typeof verificationRequestService.deleteRequest).toBe('function');
    });
  });

  describe('status update operations', () => {
    it('should have status update methods', () => {
      expect(typeof verificationRequestService.updateRequestStatus).toBe('function');
    });
  });

  describe('hours calculation methods', () => {
    it('should have hours calculation methods', () => {
      expect(typeof verificationRequestService.calculateMemberHours).toBe('function');
      expect(typeof verificationRequestService.getOrganizationEventHours).toBe('function');
    });
  });

  describe('validation', () => {
    it('should validate request data correctly', () => {
      // Test validation logic
      const service = verificationRequestService as any;
      
      // Test valid data
      expect(() => {
        service.validateVerificationRequest({ hours: 5, description: 'Test' });
      }).not.toThrow();

      // Test invalid hours
      expect(() => {
        service.validateVerificationRequest({ hours: -1 });
      }).toThrow('Hours must be a positive number');

      expect(() => {
        service.validateVerificationRequest({ hours: 25 });
      }).toThrow('Hours cannot exceed 24 per day');
    });
  });
});