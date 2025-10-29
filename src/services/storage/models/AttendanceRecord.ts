/**
 * AttendanceRecord Model
 *
 * WatermelonDB model for local attendance records.
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';

/**
 * Attendance type enum
 */
export type AttendanceType = 'clock_in' | 'clock_out';

/**
 * Attendance sync status enum
 */
export type AttendanceSyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

/**
 * AttendanceRecord model class
 *
 * Represents a single attendance record (clock in or clock out event)
 */
export class AttendanceRecord extends Model {
  static table = 'attendance_records';

  // User Information
  @field('user_id') userId!: string;
  @field('user_cedula') userCedula!: string;
  @field('user_name') userName!: string;
  @field('kiosk_pin') kioskPin?: string; // Temporary PIN for kiosk mode uploads

  // Attendance Details
  @field('attendance_type') attendanceType!: AttendanceType;
  @field('timestamp') timestamp!: number;
  @field('date') date!: string; // YYYY-MM-DD
  @field('time') time!: string; // HH:mm:ss
  @field('time_decimal') timeDecimal!: number; // Decimal hours

  // Photo Information
  @field('photo_uri') photoUri?: string;
  @field('photo_base64') photoBase64?: string;
  @field('photo_uploaded') photoUploaded!: boolean;
  @field('photo_url') photoUrl?: string;

  // Additional Data
  @field('observations') observations?: string;
  @field('latitude') latitude?: number;
  @field('longitude') longitude?: number;

  // Sync Status
  @field('sync_status') attendanceSyncStatus!: AttendanceSyncStatus;
  @field('sync_error') syncError?: string;
  @field('sync_attempts') syncAttempts!: number;
  @field('synced_at') syncedAt?: number;

  // Timestamps
  @readonly @date('created_at') createdAt!: Date;
  @readonly @date('updated_at') updatedAt!: Date;

  /**
   * Check if record needs sync
   */
  get needsSync(): boolean {
    return (
      this.attendanceSyncStatus === 'pending' ||
      this.attendanceSyncStatus === 'error' ||
      this.attendanceSyncStatus === 'syncing'
    );
  }

  /**
   * Check if record is synced
   */
  get isSynced(): boolean {
    return this.attendanceSyncStatus === 'synced';
  }

  /**
   * Check if photo needs upload
   */
  get needsPhotoUpload(): boolean {
    return !this.photoUploaded && !!this.photoBase64;
  }

  /**
   * Get formatted date string
   */
  get formattedDate(): string {
    return new Date(this.timestamp).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Get formatted time string
   */
  get formattedTime(): string {
    return this.time;
  }

  /**
   * Get display text for attendance type
   */
  get attendanceTypeText(): string {
    return this.attendanceType === 'clock_in' ? 'Entrada' : 'Salida';
  }
}
