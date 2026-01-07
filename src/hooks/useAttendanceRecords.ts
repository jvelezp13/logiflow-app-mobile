/**
 * useAttendanceRecords Hook
 *
 * Reactive hook for attendance records using WatermelonDB observables.
 * Automatically pulls records from Supabase on first load.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@services/storage';
import type { AttendanceRecord } from '@services/storage';
import { syncService } from '@services/sync/sync.service';
import novedadesService, { type NovedadInfo } from '@services/novedadesService';
import { format } from 'date-fns';

/**
 * Date filter options
 */
export type DateFilter = 'today' | 'week' | 'month';

/**
 * Map of timestamp -> novedad info (id + estado)
 */
export type NovedadInfoMap = Map<number, NovedadInfo>;

/**
 * Hook to get attendance records with reactive updates
 * Now also pulls records from Supabase that don't exist locally
 *
 * @param userId - User ID (for local DB query)
 * @param dateFilter - Date filter option
 * @param userCedula - User cedula (for pulling from Supabase)
 * @returns Attendance records array and pull status
 */
export const useAttendanceRecords = (
  userId: string | undefined,
  dateFilter: DateFilter = 'month',
  userCedula?: string | null
) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullResult, setPullResult] = useState<{ pulled: number } | null>(null);
  const [novedadesInfo, setNovedadesInfo] = useState<NovedadInfoMap>(new Map());
  const hasPulled = useRef(false);

  /**
   * Refresh novedades info from Supabase
   */
  const refreshNovedades = useCallback(async () => {
    try {
      const info = await novedadesService.obtenerNovedadesPorTimestamp();
      setNovedadesInfo(info);
    } catch (error) {
      console.error('[useAttendanceRecords] Refresh novedades error:', error);
    }
  }, []);

  /**
   * Pull-to-refresh handler
   */
  const onRefresh = useCallback(async () => {
    if (!userCedula) return;

    setIsRefreshing(true);
    try {
      // Pull new records from Supabase
      const result = await syncService.pullFromSupabase(userCedula);
      if (result.success && result.pulled > 0) {
        console.log(`[useAttendanceRecords] Refreshed ${result.pulled} records from Supabase`);
      }

      // Refresh novedades info
      await refreshNovedades();
    } catch (error) {
      console.error('[useAttendanceRecords] Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [userCedula, refreshNovedades]);

  // Pull records from Supabase on first load (if cedula provided)
  useEffect(() => {
    if (!userCedula || hasPulled.current) return;

    const pullRecords = async () => {
      setIsPulling(true);
      try {
        const result = await syncService.pullFromSupabase(userCedula);
        if (result.success && result.pulled > 0) {
          console.log(`[useAttendanceRecords] Pulled ${result.pulled} records from Supabase`);
          setPullResult({ pulled: result.pulled });
        }

        // Also load novedades info (id + estado)
        await refreshNovedades();
      } catch (error) {
        console.error('[useAttendanceRecords] Pull error:', error);
      } finally {
        setIsPulling(false);
        hasPulled.current = true;
      }
    };

    pullRecords();
  }, [userCedula, refreshNovedades]);

  // Subscribe to local records (reactive)
  useEffect(() => {
    if (!userId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Build query based on date filter
    const buildQuery = () => {
      const collection = database.get<AttendanceRecord>('attendance_records');
      const now = new Date();

      // For records pulled from Supabase, userId = cedula
      // So we need to query by both userId OR userCedula matching the userId
      let queries: any[] = [Q.where('user_id', userId)];

      switch (dateFilter) {
        case 'today': {
          const todayStr = format(now, 'yyyy-MM-dd');
          queries.push(Q.where('date', todayStr));
          break;
        }
        case 'week': {
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          const weekAgoStr = format(weekAgo, 'yyyy-MM-dd');
          queries.push(Q.where('date', Q.gte(weekAgoStr)));
          break;
        }
        case 'month':
        default: {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          const monthAgoStr = format(monthAgo, 'yyyy-MM-dd');
          queries.push(Q.where('date', Q.gte(monthAgoStr)));
          break;
        }
      }

      // Sort by timestamp descending (newest first)
      queries.push(Q.sortBy('timestamp', Q.desc));

      return collection.query(...queries);
    };

    const query = buildQuery();

    // Subscribe to query (reactive)
    const subscription = query.observe().subscribe((attendanceRecords) => {
      setRecords(attendanceRecords);
      setIsLoading(false);
    });

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [userId, dateFilter]);

  return {
    records,
    isLoading,
    isPulling,
    isRefreshing,
    pullResult,
    novedadesInfo,
    onRefresh,
  };
};

/**
 * Hook to get single attendance record
 */
export const useAttendanceRecord = (recordId: string | undefined) => {
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!recordId) {
      setRecord(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const loadRecord = async () => {
      try {
        const attendanceRecord = await database
          .get<AttendanceRecord>('attendance_records')
          .find(recordId);

        setRecord(attendanceRecord);
      } catch (error) {
        console.error('[useAttendanceRecord] Error:', error);
        setRecord(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecord();
  }, [recordId]);

  return {
    record,
    isLoading,
  };
};
