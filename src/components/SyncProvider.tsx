/**
 * SyncProvider Component
 *
 * Global sync provider that handles automatic background synchronization.
 * Should be placed at root level in App.tsx.
 */

import React, { useEffect } from 'react';
import { useAutoSync } from '@hooks/useAutoSync';
import { useAuthStore } from '@store/authStore';

/**
 * SyncProvider props
 */
type SyncProviderProps = {
  children: React.ReactNode;
};

/**
 * Sync Provider Component
 *
 * Automatically syncs attendance records in the background when:
 * - Network is available
 * - App comes to foreground
 * - At regular intervals (configured in SYNC_CONFIG)
 * - Works in both normal and kiosk mode
 */
export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isKioskAuthenticated = useAuthStore((state) => state.isKioskAuthenticated);

  // User is authenticated in either normal or kiosk mode
  const isAnyAuthenticated = isAuthenticated || isKioskAuthenticated;

  const { isSyncing, pendingCount, hasNetwork, error } = useAutoSync();

  /**
   * Log sync status changes
   */
  useEffect(() => {
    if (isAnyAuthenticated) {
      if (isSyncing) {
        console.log('[SyncProvider] Syncing...');
      } else if (error) {
        console.error('[SyncProvider] Sync error:', error);
      } else if (pendingCount > 0) {
        console.log(`[SyncProvider] ${pendingCount} records pending sync`);
      }
    }
  }, [isSyncing, pendingCount, error, isAnyAuthenticated]);

  /**
   * Log network status
   */
  useEffect(() => {
    if (isAnyAuthenticated) {
      if (hasNetwork) {
        console.log('[SyncProvider] Network available');
      } else {
        console.log('[SyncProvider] Network unavailable');
      }
    }
  }, [hasNetwork, isAnyAuthenticated]);

  // Don't run sync logic if not authenticated (neither normal nor kiosk)
  if (!isAnyAuthenticated) {
    return <>{children}</>;
  }

  return <>{children}</>;
};
