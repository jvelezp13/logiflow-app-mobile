/**
 * useAttendanceRecords Hook
 *
 * Reactive hook for attendance records using WatermelonDB observables.
 */

import { useState, useEffect } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@services/storage';
import type { AttendanceRecord } from '@services/storage';
import { format, startOfDay, endOfDay } from 'date-fns';

/**
 * Date filter options
 */
export type DateFilter = 'today' | 'week' | 'month' | 'all';

/**
 * Hook to get attendance records with reactive updates
 *
 * @param userId - User ID
 * @param dateFilter - Date filter option
 * @returns Attendance records array
 */
export const useAttendanceRecords = (
  userId: string | undefined,
  dateFilter: DateFilter = 'all'
) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        case 'month': {
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          const monthAgoStr = format(monthAgo, 'yyyy-MM-dd');
          queries.push(Q.where('date', Q.gte(monthAgoStr)));
          break;
        }
        case 'all':
        default:
          // No additional date filter
          break;
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
