/**
 * @deprecated Use useNetworkState from NetworkService instead
 * Legacy network status hook - maintained for backward compatibility
 */

import { useState, useEffect } from 'react';
import { useNetworkState } from '../services/NetworkService';

export interface NetworkStatus {
  isConnected: boolean;
  lastChecked: Date;
}

/**
 * @deprecated Use useNetworkState from NetworkService for enhanced functionality
 * Simple network status hook that uses fetch to test connectivity
 */
export const useNetworkStatus = () => {
  // Use new network service for better functionality
  const networkState = useNetworkState();
  
  // Convert to legacy format for backward compatibility
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: networkState.isConnected,
    lastChecked: new Date(networkState.lastChecked),
  });

  useEffect(() => {
    setNetworkStatus({
      isConnected: networkState.isConnected,
      lastChecked: new Date(networkState.lastChecked),
    });
  }, [networkState.isConnected, networkState.lastChecked]);

  const checkConnectivity = async () => {
    try {
      await networkState.refreshNetworkState();
      return networkState.isOnline;
    } catch (error) {
      console.warn('Network connectivity check failed:', error);
      return false;
    }
  };

  return {
    ...networkStatus,
    isOnline: networkState.isOnline,
    checkConnectivity,
  };
};