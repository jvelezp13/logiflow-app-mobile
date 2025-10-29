/**
 * WatermelonDB Database Configuration
 *
 * Initializes and exports the WatermelonDB database instance.
 */

import { Database, Q } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { schema } from './schema';
import { migrations } from './migrations';
import { AttendanceRecord, SyncQueue } from './models';

/**
 * SQLite Adapter Configuration
 */
const adapter = new SQLiteAdapter({
  schema,
  migrations,
  // (You might want to comment it out for production)
  jsi: true, // Use JSI for better performance (React Native 0.68+)
  onSetUpError: (error) => {
    console.error('[Database] Setup error:', error);
  },
});

/**
 * Database instance
 */
export const database = new Database({
  adapter,
  modelClasses: [AttendanceRecord, SyncQueue],
});

/**
 * Database utilities
 */
export const dbUtils = {
  /**
   * Reset database (delete all data)
   * ⚠️ Use with caution! This will delete all local data.
   */
  async resetDatabase(): Promise<void> {
    try {
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
      console.log('[Database] Database reset successfully');
    } catch (error) {
      console.error('[Database] Reset error:', error);
      throw error;
    }
  },

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    attendanceRecords: number;
    syncQueueItems: number;
    pendingSyncs: number;
  }> {
    try {
      const attendanceRecords = await database
        .get<AttendanceRecord>('attendance_records')
        .query()
        .fetchCount();

      const syncQueueItems = await database
        .get<SyncQueue>('sync_queue')
        .query()
        .fetchCount();

      const pendingSyncs = await database
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('sync_status', 'pending'))
        .fetchCount();

      return {
        attendanceRecords,
        syncQueueItems,
        pendingSyncs,
      };
    } catch (error) {
      console.error('[Database] Stats error:', error);
      throw error;
    }
  },

  /**
   * Check database health
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Try to query each table
      await database.get<AttendanceRecord>('attendance_records').query().fetch();
      await database.get<SyncQueue>('sync_queue').query().fetch();
      return true;
    } catch (error) {
      console.error('[Database] Health check failed:', error);
      return false;
    }
  },
};
