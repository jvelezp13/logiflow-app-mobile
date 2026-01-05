/**
 * SyncProvider Component
 *
 * Global sync provider that handles automatic background synchronization.
 * Should be placed at root level in App.tsx.
 */

import React, { useEffect } from 'react';
import { useAutoSync } from '@hooks/useAutoSync';

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
 *
 * IMPORTANT: Sync runs ALWAYS, regardless of authentication state.
 * This ensures kiosk mode records are synced even after the user logs out.
 * The sync service uses the kioskPin stored in each record for authentication.
 */
export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const { isSyncing, pendingCount, hasNetwork, error } = useAutoSync();

  /**
   * Log sync status changes
   */
  useEffect(() => {
    if (isSyncing) {
      console.log('[SyncProvider] Syncing...');
    } else if (error) {
      console.error('[SyncProvider] Sync error:', error);
    } else if (pendingCount > 0) {
      console.log(`[SyncProvider] ${pendingCount} records pending sync`);
    }
  }, [isSyncing, pendingCount, error]);

  /**
   * Log network status
   */
  useEffect(() => {
    if (hasNetwork) {
      console.log('[SyncProvider] Network available');
    } else {
      console.log('[SyncProvider] Network unavailable');
    }
  }, [hasNetwork]);

  return <>{children}</>;
};
