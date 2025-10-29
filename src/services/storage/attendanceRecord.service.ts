/**
 * Attendance Record Service
 *
 * CRUD operations for attendance records in WatermelonDB.
 */

import { Q } from '@nozbe/watermelondb';
import { database } from './database';
import { AttendanceRecord, AttendanceType, AttendanceSyncStatus } from './models';
import { format } from 'date-fns';

/**
 * Create attendance record data
 */
export type CreateAttendanceRecordData = {
  userId: string;
  userCedula: string;
  userName: string;
  attendanceType: AttendanceType;
  photoUri?: string;
  photoBase64?: string;
  observations?: string;
  latitude?: number;
  longitude?: number;
  kioskPin?: string; // For kiosk mode uploads
};

/**
 * Update attendance record data
 */
export type UpdateAttendanceRecordData = Partial<{
  photoUrl: string;
  photoUploaded: boolean;
  syncStatus: AttendanceSyncStatus;
  syncError: string;
  syncAttempts: number;
  syncedAt: number;
}>;

/**
 * Attendance Record Service
 */
export const attendanceRecordService = {
  /**
   * Create a new attendance record
   */
  async create(data: CreateAttendanceRecordData): Promise<AttendanceRecord> {
    try {
      const now = Date.now();
      const nowDate = new Date(now);

      // Calculate time decimal (hours.minutes as decimal)
      const hours = nowDate.getHours();
      const minutes = nowDate.getMinutes();
      const timeDecimal = hours + minutes / 60;

      const dateStr = format(nowDate, 'yyyy-MM-dd');
      const timeStr = format(nowDate, 'HH:mm:ss');

      console.log('[AttendanceRecordService] Creating record:', {
        userId: data.userId,
        type: data.attendanceType,
        date: dateStr,
        time: timeStr,
        timestamp: now,
      });

      const record = await database.write(async () => {
        return await database.get<AttendanceRecord>('attendance_records').create((rec) => {
          rec.userId = data.userId;
          rec.userCedula = data.userCedula;
          rec.userName = data.userName;
          rec.kioskPin = data.kioskPin; // Store PIN for kiosk mode sync
          rec.attendanceType = data.attendanceType;
          rec.timestamp = now;
          rec.date = dateStr;
          rec.time = timeStr;
          rec.timeDecimal = timeDecimal;
          rec.photoUri = data.photoUri;
          rec.photoBase64 = data.photoBase64;
          rec.photoUploaded = false;
          rec.observations = data.observations;
          rec.latitude = data.latitude;
          rec.longitude = data.longitude;
          rec.attendanceSyncStatus = 'pending';
          rec.syncAttempts = 0;
        });
      });

      console.log('[AttendanceRecordService] Record created successfully:', {
        id: record.id,
        userId: record.userId,
        kioskPin: record.kioskPin,
        syncStatus: record.attendanceSyncStatus,
        date: record.date,
        time: record.time,
        type: record.attendanceType,
      });

      return record;
    } catch (error) {
      console.error('[AttendanceRecordService] Create error:', error);
      throw error;
    }
  },

  /**
   * Update an attendance record
   */
  async update(
    recordId: string,
    data: UpdateAttendanceRecordData
  ): Promise<AttendanceRecord> {
    try {
      const record = await database
        .get<AttendanceRecord>('attendance_records')
        .find(recordId);

      const updated = await database.write(async () => {
        return await record.update((rec) => {
          if (data.photoUrl !== undefined) rec.photoUrl = data.photoUrl;
          if (data.photoUploaded !== undefined) rec.photoUploaded = data.photoUploaded;
          if (data.syncStatus !== undefined) rec.attendanceSyncStatus = data.syncStatus;
          if (data.syncError !== undefined) rec.syncError = data.syncError;
          if (data.syncAttempts !== undefined) rec.syncAttempts = data.syncAttempts;
          if (data.syncedAt !== undefined) rec.syncedAt = data.syncedAt;
        });
      });

      console.log('[AttendanceRecordService] Record updated:', recordId);
      return updated;
    } catch (error) {
      console.error('[AttendanceRecordService] Update error:', error);
      throw error;
    }
  },

  /**
   * Delete an attendance record
   */
  async delete(recordId: string): Promise<void> {
    try {
      const record = await database
        .get<AttendanceRecord>('attendance_records')
        .find(recordId);

      await database.write(async () => {
        await record.markAsDeleted();
      });

      console.log('[AttendanceRecordService] Record deleted:', recordId);
    } catch (error) {
      console.error('[AttendanceRecordService] Delete error:', error);
      throw error;
    }
  },

  /**
   * Get attendance record by ID
   */
  async getById(recordId: string): Promise<AttendanceRecord | null> {
    try {
      const record = await database
        .get<AttendanceRecord>('attendance_records')
        .find(recordId);
      return record;
    } catch (error) {
      console.error('[AttendanceRecordService] Get by ID error:', error);
      return null;
    }
  },

  /**
   * Get all attendance records
   */
  async getAll(): Promise<AttendanceRecord[]> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query()
        .fetch();
      return records;
    } catch (error) {
      console.error('[AttendanceRecordService] Get all error:', error);
      return [];
    }
  },

  /**
   * Get attendance records by user ID
   */
  async getByUserId(userId: string): Promise<AttendanceRecord[]> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('user_id', userId), Q.sortBy('timestamp', Q.desc))
        .fetch();
      return records;
    } catch (error) {
      console.error('[AttendanceRecordService] Get by user error:', error);
      return [];
    }
  },

  /**
   * Get attendance records by date range
   */
  async getByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    try {
      console.log('[AttendanceRecordService] Querying date range:', {
        startDate,
        endDate,
      });

      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.where('date', Q.gte(startDate)),
          Q.where('date', Q.lte(endDate)),
          Q.sortBy('timestamp', Q.desc)
        )
        .fetch();

      console.log('[AttendanceRecordService] Query result:', {
        count: records.length,
        records: records.map((r) => ({
          id: r.id,
          userId: r.userId,
          date: r.date,
          time: r.time,
          type: r.attendanceType,
        })),
      });

      return records;
    } catch (error) {
      console.error('[AttendanceRecordService] Get by date range error:', error);
      return [];
    }
  },

  /**
   * Get pending sync records
   */
  async getPendingSync(): Promise<AttendanceRecord[]> {
    try {
      // Debug: Get all records first
      const allRecords = await database
        .get<AttendanceRecord>('attendance_records')
        .query()
        .fetch();

      console.log('[AttendanceRecordService] All records in DB:', {
        total: allRecords.length,
        records: allRecords.map(r => ({
          id: r.id,
          syncStatus: r.attendanceSyncStatus,
          hasPin: !!r.kioskPin,
        })),
      });

      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.or(
            Q.where('sync_status', 'pending'),
            Q.where('sync_status', 'error'),
            Q.where('sync_status', 'syncing')
          ),
          Q.sortBy('timestamp', Q.asc)
        )
        .fetch();

      console.log('[AttendanceRecordService] Pending sync records:', {
        count: records.length,
        ids: records.map(r => r.id),
      });

      return records;
    } catch (error) {
      console.error('[AttendanceRecordService] Get pending sync error:', error);
      return [];
    }
  },

  /**
   * Get records that need photo upload
   */
  async getNeedPhotoUpload(): Promise<AttendanceRecord[]> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('photo_uploaded', false), Q.sortBy('timestamp', Q.asc))
        .fetch();

      // Filter records that have photo_base64
      return records.filter((r) => r.photoBase64);
    } catch (error) {
      console.error('[AttendanceRecordService] Get need photo upload error:', error);
      return [];
    }
  },

  /**
   * Mark record as synced
   */
  async markAsSynced(recordId: string, photoUrl?: string): Promise<void> {
    try {
      await this.update(recordId, {
        syncStatus: 'synced',
        syncedAt: Date.now(),
        syncError: undefined,
        photoUrl,
        photoUploaded: !!photoUrl,
      });
    } catch (error) {
      console.error('[AttendanceRecordService] Mark as synced error:', error);
      throw error;
    }
  },

  /**
   * Mark record as sync error
   */
  async markAsSyncError(recordId: string, errorMessage: string): Promise<void> {
    try {
      const record = await this.getById(recordId);
      if (!record) return;

      await this.update(recordId, {
        syncStatus: 'error',
        syncError: errorMessage,
        syncAttempts: record.syncAttempts + 1,
      });
    } catch (error) {
      console.error('[AttendanceRecordService] Mark as sync error:', error);
      throw error;
    }
  },

  /**
   * Get count of records
   */
  async getCount(): Promise<number> {
    try {
      const count = await database
        .get<AttendanceRecord>('attendance_records')
        .query()
        .fetchCount();
      return count;
    } catch (error) {
      console.error('[AttendanceRecordService] Get count error:', error);
      return 0;
    }
  },

  /**
   * Get count of pending sync records
   */
  async getPendingSyncCount(): Promise<number> {
    try {
      const count = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.or(
            Q.where('sync_status', 'pending'),
            Q.where('sync_status', 'error'),
            Q.where('sync_status', 'syncing')
          )
        )
        .fetchCount();
      return count;
    } catch (error) {
      console.error('[AttendanceRecordService] Get pending sync count error:', error);
      return 0;
    }
  },
};
