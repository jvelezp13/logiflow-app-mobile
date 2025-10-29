/**
 * useNetworkStatus Hook
 *
 * Monitor network connectivity status.
 */

import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

/**
 * Network status type
 */
export type NetworkStatus = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
};

/**
 * Hook to monitor network connectivity
 *
 * @returns NetworkStatus
 *
 * @example
 * const { isConnected, isInternetReachable } = useNetworkStatus();
 *
 * if (isConnected && isInternetReachable) {
 *   // Perform network operations
 * }
 */
export const useNetworkStatus = (): NetworkStatus => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: false,
    isInternetReachable: null,
    type: null,
  });

  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });
    });

    // Cleanup subscription
    return () => {
      unsubscribe();
    };
  }, []);

  return networkStatus;
};

/**
 * Check if network is available (one-time check)
 */
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected === true && state.isInternetReachable === true;
  } catch (error) {
    console.error('[NetworkStatus] Check error:', error);
    return false;
  }
};
