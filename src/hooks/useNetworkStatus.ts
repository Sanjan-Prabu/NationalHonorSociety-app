import { useState, useEffect } from 'react';

export interface NetworkStatus {
  isConnected: boolean;
  lastChecked: Date;
}

/**
 * Simple network status hook that uses fetch to test connectivity
 * Note: Install @react-native-community/netinfo for more robust network detection
 */
export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true, // Assume connected initially
    lastChecked: new Date(),
  });

  const checkConnectivity = async () => {
    try {
      // Try to fetch a small resource to test connectivity
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);

      setNetworkStatus({
        isConnected: response.ok,
        lastChecked: new Date(),
      });

      return response.ok;
    } catch (error) {
      console.warn('Network connectivity check failed:', error);
      setNetworkStatus({
        isConnected: false,
        lastChecked: new Date(),
      });
      return false;
    }
  };

  useEffect(() => {
    // Check connectivity on mount
    checkConnectivity();

    // Set up periodic connectivity checks (every 30 seconds)
    const interval = setInterval(checkConnectivity, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    ...networkStatus,
    isOnline: networkStatus.isConnected,
    checkConnectivity,
  };
};