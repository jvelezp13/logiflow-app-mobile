/**
 * useAutoSync Hook
 *
 * Automatic background synchronization with network detection.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { syncService, syncEvents, SYNC_EVENTS } from '@services/sync';
import { useNetworkStatus } from './useNetworkStatus';
import { SYNC_CONFIG } from '@constants/config';

/**
 * Auto sync status
 */
export type AutoSyncStatus = {
  isSyncing: boolean;
  lastSyncAt: number | null;
  pendingCount: number;
  error: string | null;
};

/**
 * Hook for automatic background synchronization
 *
 * @returns Auto sync controls and status
 *
 * @example
 * const { syncNow, isSyncing, pendingCount } = useAutoSync();
 *
 * // Manual sync
 * await syncNow();
 */
export const useAutoSync = () => {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const [status, setStatus] = useState<AutoSyncStatus>({
    isSyncing: false,
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
  });

  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  /**
   * Perform sync
   */
  const performSync = useCallback(async () => {
    // Skip if already syncing
    if (status.isSyncing) {
      console.log('[AutoSync] Already syncing, skipping...');
      return;
    }

    // Skip if no network
    if (!isConnected || isInternetReachable === false) {
      console.log('[AutoSync] No network, skipping sync');
      return;
    }

    try {
      // Check if there are pending records before syncing
      const needsSync = await syncService.needsSync();

      if (!needsSync) {
        console.log('[AutoSync] No pending records to sync, skipping...');

        // Update pending count to 0
        setStatus((prev) => ({
          ...prev,
          pendingCount: 0,
        }));

        return;
      }

      console.log('[AutoSync] Starting sync...');

      setStatus((prev) => ({
        ...prev,
        isSyncing: true,
        error: null,
      }));

      // Sync pending records
      const result = await syncService.syncPendingRecords();

      // Update pending count
      const syncStatus = await syncService.getSyncStatus();

      setStatus({
        isSyncing: false,
        lastSyncAt: Date.now(),
        pendingCount: syncStatus.pendingCount,
        error: result.failed > 0 ? `${result.failed} registros fallaron` : null,
      });

      console.log(
        `[AutoSync] Sync complete: ${result.synced} synced, ${result.failed} failed`
      );
    } catch (error) {
      console.error('[AutoSync] Sync error:', error);

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Error de sincronización',
      }));
    }
  }, [isConnected, isInternetReachable, status.isSyncing]);

  /**
   * Manual sync trigger
   */
  const syncNow = useCallback(async () => {
    await performSync();
  }, [performSync]);

  /**
   * Update pending count
   */
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await syncService.getSyncStatus();
      setStatus((prev) => ({
        ...prev,
        pendingCount: count.pendingCount,
      }));
    } catch (error) {
      console.error('[AutoSync] Update pending count error:', error);
    }
  }, []);

  /**
   * Setup automatic sync interval
   * Uses different intervals based on pending records:
   * - 30 seconds if there are pending records
   * - 1 hour if there are no pending records
   */
  useEffect(() => {
    // Update pending count
    updatePendingCount();
  }, [updatePendingCount]);

  /**
   * Setup auto-sync interval (adjusts based on pending count)
   */
  useEffect(() => {
    // Clear any existing interval
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    // Setup interval if network is available
    if (isConnected && isInternetReachable) {
      // Determine interval based on pending count
      const interval = status.pendingCount > 0
        ? SYNC_CONFIG.autoSyncInterval  // 30 seconds with pending records
        : SYNC_CONFIG.idleSyncInterval;  // 1 hour without pending records

      // Perform initial sync
      performSync();

      // Setup periodic sync with dynamic interval
      syncIntervalRef.current = setInterval(() => {
        performSync();
      }, interval);

      console.log(
        `[AutoSync] Auto-sync enabled (every ${interval / 1000}s, pending: ${status.pendingCount})`
      );
    } else {
      console.log('[AutoSync] Auto-sync disabled (no network)');
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isConnected, isInternetReachable, performSync, status.pendingCount]);

  /**
   * Handle app state changes (sync when app comes to foreground)
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // App came to foreground
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[AutoSync] App came to foreground, checking for sync...');
        updatePendingCount();

        if (isConnected && isInternetReachable) {
          performSync();
        }
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isConnected, isInternetReachable, performSync, updatePendingCount]);

  /**
   * Sync when network becomes available
   */
  useEffect(() => {
    if (isConnected && isInternetReachable && status.pendingCount > 0) {
      console.log('[AutoSync] Network available, syncing pending records...');
      performSync();
    }
  }, [isConnected, isInternetReachable]);

  /**
   * Listen for sync events (when records are created)
   */
  useEffect(() => {
    const handleRecordCreated = () => {
      console.log('[AutoSync] Record created event received, triggering sync...');
      // Update pending count immediately
      updatePendingCount().then(() => {
        // Then trigger sync
        performSync();
      });
    };

    const handleSyncRequested = () => {
      console.log('[AutoSync] Manual sync requested');
      performSync();
    };

    // Listen to events
    syncEvents.on(SYNC_EVENTS.RECORD_CREATED, handleRecordCreated);
    syncEvents.on(SYNC_EVENTS.SYNC_REQUESTED, handleSyncRequested);

    return () => {
      syncEvents.off(SYNC_EVENTS.RECORD_CREATED, handleRecordCreated);
      syncEvents.off(SYNC_EVENTS.SYNC_REQUESTED, handleSyncRequested);
    };
  }, [performSync, updatePendingCount]);

  return {
    ...status,
    syncNow,
    hasNetwork: isConnected && isInternetReachable === true,
  };
};
