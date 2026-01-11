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
   * OPTIMIZED: Query only pending/error/syncing records directly (no debug fetch)
   */
  async getPendingSync(): Promise<AttendanceRecord[]> {
    try {
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

  /**
   * Get records marked as synced
   */
  async getSyncedRecords(): Promise<AttendanceRecord[]> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.where('sync_status', 'synced'),
          Q.sortBy('timestamp', Q.asc)
        )
        .fetch();
      return records;
    } catch (error) {
      console.error('[AttendanceRecordService] Get synced records error:', error);
      return [];
    }
  },

  /**
   * Mark record as pending (for re-sync)
   */
  async markAsPending(recordId: string): Promise<void> {
    try {
      await this.update(recordId, {
        syncStatus: 'pending',
        syncError: undefined,
        syncAttempts: 0,
      });
      console.log('[AttendanceRecordService] Record marked as pending for re-sync:', recordId);
    } catch (error) {
      console.error('[AttendanceRecordService] Mark as pending error:', error);
      throw error;
    }
  },

  /**
   * Create record from remote data (pulled from Supabase)
   * Used to populate local DB with records from other devices
   * Optimized: only requires essential fields, optional fields for backwards compat
   */
  async createFromRemote(data: {
    cedula: string;
    empleado: string;
    fecha: string;
    tipo_marcaje: AttendanceType;
    timestamp_local: number;
    hora_inicio_decimal: number | null;
    hora_fin_decimal: number | null;
    fuente?: string | null;
    ajustado_at?: string | null;
    // Optional fields (not fetched in optimized pull)
    foto_url?: string | null;
    observaciones?: string | null;
    latitud?: number | null;
    longitud?: number | null;
  }): Promise<AttendanceRecord | null> {
    try {
      // Check if record already exists locally by timestamp
      const existing = await database
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('timestamp', data.timestamp_local))
        .fetch();

      if (existing.length > 0) {
        console.log('[AttendanceRecordService] Record already exists locally:', data.timestamp_local);
        return existing[0];
      }

      // Calculate time from decimal
      const timeDecimal = data.hora_inicio_decimal || data.hora_fin_decimal || 0;
      const hours = Math.floor(timeDecimal);
      const minutes = Math.round((timeDecimal - hours) * 60);
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

      // Parse ajustado_at to timestamp
      const remoteUpdatedAt = data.ajustado_at ? new Date(data.ajustado_at).getTime() : undefined;

      const record = await database.write(async () => {
        return await database.get<AttendanceRecord>('attendance_records').create((rec) => {
          // We don't have userId from remote, use cedula as identifier
          rec.userId = data.cedula;
          rec.userCedula = data.cedula;
          rec.userName = data.empleado;
          rec.attendanceType = data.tipo_marcaje;
          rec.timestamp = data.timestamp_local;
          rec.date = data.fecha;
          rec.time = timeStr;
          rec.timeDecimal = timeDecimal;
          rec.photoUrl = data.foto_url || undefined;
          rec.photoUploaded = !!data.foto_url;
          rec.observations = data.observaciones || undefined;
          rec.latitude = data.latitud || undefined;
          rec.longitude = data.longitud || undefined;
          // Mark as synced since it came from server
          rec.attendanceSyncStatus = 'synced';
          rec.syncedAt = Date.now();
          rec.syncAttempts = 0;
          // Track source and remote update time
          rec.fuente = data.fuente || 'mobile';
          rec.remoteUpdatedAt = remoteUpdatedAt;
        });
      });

      console.log('[AttendanceRecordService] Created record from remote:', {
        id: record.id,
        timestamp: data.timestamp_local,
        date: data.fecha,
        fuente: data.fuente,
      });

      return record;
    } catch (error) {
      console.error('[AttendanceRecordService] Create from remote error:', error);
      return null;
    }
  },

  /**
   * Update existing record from remote data (for admin edits)
   * Only updates time-related fields and fuente, preserves local data
   */
  async updateFromRemote(data: {
    timestamp_local: number;
    hora_inicio_decimal: number | null;
    hora_fin_decimal: number | null;
    fuente: string;
    ajustado_at: string;
  }): Promise<AttendanceRecord | null> {
    try {
      // Find existing record by timestamp
      const existing = await database
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('timestamp', data.timestamp_local))
        .fetch();

      if (existing.length === 0) {
        console.log('[AttendanceRecordService] Record not found for update:', data.timestamp_local);
        return null;
      }

      const record = existing[0];
      const remoteUpdatedAt = new Date(data.ajustado_at).getTime();

      // Calculate new time from decimal
      const timeDecimal = data.hora_inicio_decimal || data.hora_fin_decimal || record.timeDecimal;
      const hours = Math.floor(timeDecimal);
      const minutes = Math.round((timeDecimal - hours) * 60);
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

      const updated = await database.write(async () => {
        return await record.update((rec) => {
          rec.time = timeStr;
          rec.timeDecimal = timeDecimal;
          rec.fuente = data.fuente;
          rec.remoteUpdatedAt = remoteUpdatedAt;
        });
      });

      console.log('[AttendanceRecordService] Updated record from remote:', {
        id: updated.id,
        timestamp: data.timestamp_local,
        newTime: timeStr,
        fuente: data.fuente,
      });

      return updated;
    } catch (error) {
      console.error('[AttendanceRecordService] Update from remote error:', error);
      return null;
    }
  },

  /**
   * Get record by timestamp
   */
  async getByTimestamp(timestamp: number): Promise<AttendanceRecord | null> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('timestamp', timestamp))
        .fetch();
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      console.error('[AttendanceRecordService] Get by timestamp error:', error);
      return null;
    }
  },

  /**
   * Get local record with remote_updated_at for comparison
   */
  async getLocalRecordsWithRemoteUpdate(): Promise<Map<number, number | undefined>> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query()
        .fetch();
      const map = new Map<number, number | undefined>();
      records.forEach(r => map.set(r.timestamp, r.remoteUpdatedAt));
      return map;
    } catch (error) {
      console.error('[AttendanceRecordService] Get local records error:', error);
      return new Map();
    }
  },

  /**
   * Get all local timestamps (for comparison with remote)
   */
  async getAllTimestamps(): Promise<number[]> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query()
        .fetch();
      return records.map(r => r.timestamp);
    } catch (error) {
      console.error('[AttendanceRecordService] Get all timestamps error:', error);
      return [];
    }
  },

  /**
   * Delete record by timestamp
   * Used to sync deletions from Web Admin
   */
  async deleteByTimestamp(timestamp: number): Promise<boolean> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('timestamp', timestamp))
        .fetch();

      if (records.length === 0) {
        console.log('[AttendanceRecordService] No record found with timestamp:', timestamp);
        return false;
      }

      await database.write(async () => {
        await records[0].markAsDeleted();
      });

      console.log('[AttendanceRecordService] Record deleted by timestamp:', timestamp);
      return true;
    } catch (error) {
      console.error('[AttendanceRecordService] Delete by timestamp error:', error);
      return false;
    }
  },

  /**
   * Cleanup old synced records to keep local DB light
   * Only deletes records that are already synced (not pending)
   * Optimized for low-capacity devices
   */
  async cleanupOldRecords(retentionDays: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0]; // yyyy-MM-dd

      // Find old synced records (not pending sync)
      const oldRecords = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.where('date', Q.lt(cutoffDateStr)),
          Q.where('sync_status', 'synced')
        )
        .fetch();

      if (oldRecords.length === 0) {
        return 0;
      }

      console.log(`[AttendanceRecordService] Cleaning up ${oldRecords.length} old synced records`);

      await database.write(async () => {
        await Promise.all(oldRecords.map((record) => record.markAsDeleted()));
      });

      console.log(`[AttendanceRecordService] Cleanup complete: ${oldRecords.length} records removed`);
      return oldRecords.length;
    } catch (error) {
      console.error('[AttendanceRecordService] Cleanup error:', error);
      return 0;
    }
  },
};
