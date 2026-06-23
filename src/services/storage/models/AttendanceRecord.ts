/**
 * AttendanceRecord Model
 *
 * WatermelonDB model for local attendance records.
 */

import { Model } from '@nozbe/watermelondb';
import { field, readonly, date } from '@nozbe/watermelondb/decorators';
import { formatTimeAmPm } from '@utils/dateUtils';

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

  // Source tracking (for admin edits)
  @field('fuente') fuente?: string; // 'mobile' | 'admin_manual' | 'admin_edit' | 'ajuste_aprobado'
  @field('remote_updated_at') remoteUpdatedAt?: number; // Timestamp of last remote update

  // Multi-tenant
  @field('tenant_id') tenantId?: string; // ID del tenant al que pertenece el registro

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
   * Hora del marcaje en formato 12h con AM/PM.
   */
  get formattedTime(): string {
    return formatTimeAmPm(this.time);
  }

  /**
   * Get display text for attendance type
   */
  get attendanceTypeText(): string {
    return this.attendanceType === 'clock_in' ? 'Entrada' : 'Salida';
  }

  /**
   * Check if record was created by admin
   */
  get isAdminCreated(): boolean {
    return this.fuente === 'admin_manual';
  }

  /**
   * Check if record was edited by admin
   */
  get isAdminEdited(): boolean {
    return this.fuente === 'admin_edit';
  }

  /**
   * Check if record was created by the admin approving a novedad
   * (ajuste_marcaje o marcaje_faltante aprobados por el empleado).
   */
  get isApprovedFromNovedad(): boolean {
    return this.fuente === 'ajuste_aprobado';
  }

  /**
   * Check if record has any admin modification
   */
  get hasAdminModification(): boolean {
    return (
      this.fuente === 'admin_manual' ||
      this.fuente === 'admin_edit' ||
      this.fuente === 'ajuste_aprobado'
    );
  }
}
