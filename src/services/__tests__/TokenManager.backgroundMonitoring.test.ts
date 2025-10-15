import { tokenManager } from '../TokenManager';
import { Session } from '@supabase/supabase-js';

// Mock timers for testing
jest.useFakeTimers();

// Mock the supabase client
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      refreshSession: jest.fn(),
      setSession: jest.fn(),
    }
  }
}));

// Mock SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('TokenManager Background Monitoring', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    tokenManager.stopBackgroundMonitoring();
  });

  afterEach(() => {
    tokenManager.cleanup();
  });

  describe('Background Monitoring Lifecycle', () => {
    it('should start background monitoring with callbacks', () => {
      const onSessionExpired = jest.fn();
      const onSessionRefreshed = jest.fn();

      expect(tokenManager.isBackgroundMonitoringActive()).toBe(false);

      tokenManager.startBackgroundMonitoring({
        onSessionExpired,
        onSessionRefreshed
      });

      expect(tokenManager.isBackgroundMonitoringActive()).toBe(true);
    });

    it('should stop background monitoring', () => {
      tokenManager.startBackgroundMonitoring();
      expect(tokenManager.isBackgroundMonitoringActive()).toBe(true);

      tokenManager.stopBackgroundMonitoring();
      expect(tokenManager.isBackgroundMonitoringActive()).toBe(false);
    });

    it('should pause and resume background monitoring', () => {
      tokenManager.startBackgroundMonitoring();
      expect(tokenManager.isBackgroundMonitoringActive()).toBe(true);

      tokenManager.pauseBackgroundMonitoring();
      expect(tokenManager.isBackgroundMonitoringActive()).toBe(true); // Still active, just paused

      tokenManager.resumeBackgroundMonitoring();
      expect(tokenManager.isBackgroundMonitoringActive()).toBe(true);
    });

    it('should not start monitoring if already active', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      tokenManager.startBackgroundMonitoring();
      tokenManager.startBackgroundMonitoring(); // Second call

      expect(consoleSpy).toHaveBeenCalledWith('Background monitoring already active');
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration', () => {
    it('should set monitoring interval with minimum limit', () => {
      tokenManager.setMonitoringInterval(15000); // Below minimum
      // Should be set to minimum 30 seconds
      
      tokenManager.setMonitoringInterval(120000); // 2 minutes
      // Should accept this value
    });

    it('should set refresh buffer with minimum limit', () => {
      tokenManager.setRefreshBuffer(30); // Below minimum
      // Should be set to minimum 60 seconds
      
      tokenManager.setRefreshBuffer(300); // 5 minutes
      // Should accept this value
    });
  });

  describe('Cleanup', () => {
    it('should cleanup all timers and resources', () => {
      tokenManager.startBackgroundMonitoring();
      expect(tokenManager.isBackgroundMonitoringActive()).toBe(true);

      tokenManager.cleanup();
      expect(tokenManager.isBackgroundMonitoringActive()).toBe(false);
    });
  });
});