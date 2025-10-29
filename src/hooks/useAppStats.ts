/**
 * useAppStats Hook
 *
 * Get app statistics (records count, sync status, database info).
 */

import { useState, useEffect, useCallback } from 'react';
import { attendanceRecordService } from '@services/storage';
import { syncService } from '@services/sync';

/**
 * App statistics type
 */
export type AppStats = {
  totalRecords: number;
  syncedRecords: number;
  pendingRecords: number;
  hasNetwork: boolean;
};

/**
 * Hook to get app statistics
 *
 * @returns App stats and refresh function
 */
export const useAppStats = () => {
  const [stats, setStats] = useState<AppStats>({
    totalRecords: 0,
    syncedRecords: 0,
    pendingRecords: 0,
    hasNetwork: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load statistics
   */
  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);

      const [syncStatus, allRecords] = await Promise.all([
        syncService.getSyncStatus(),
        attendanceRecordService.getAll(),
      ]);

      const synced = allRecords.filter((r) => r.isSynced).length;

      setStats({
        totalRecords: allRecords.length,
        syncedRecords: synced,
        pendingRecords: syncStatus.pendingCount,
        hasNetwork: syncStatus.hasNetwork,
      });
    } catch (error) {
      console.error('[useAppStats] Load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Load on mount
   */
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    isLoading,
    refresh: loadStats,
  };
};
