/**
 * UserDataService Tests
 * Basic tests to validate the service functionality
 */

import { UserDataService } from '../UserDataService';

// Mock the dependencies
jest.mock('../BaseDataService');
jest.mock('../../lib/supabaseClient');
jest.mock('../OrganizationService');

describe('UserDataService', () => {
  let userDataService: UserDataService;

  beforeEach(() => {
    userDataService = new UserDataService();
  });

  describe('constructor', () => {
    it('should create an instance with correct service name', () => {
      expect(userDataService).toBeInstanceOf(UserDataService);
      expect((userDataService as any).serviceName).toBe('UserDataService');
    });
  });

  describe('validation methods', () => {
    it('should have required methods', () => {
      expect(typeof userDataService.getCurrentUserProfile).toBe('function');
      expect(typeof userDataService.updateUserProfile).toBe('function');
      expect(typeof userDataService.validateUserRole).toBe('function');
      expect(typeof userDataService.hasRole).toBe('function');
      expect(typeof userDataService.isOfficer).toBe('function');
      expect(typeof userDataService.getUserMemberships).toBe('function');
    });
  });
});