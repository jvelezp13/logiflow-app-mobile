/**
 * Attendance Types
 *
 * Types for attendance/clock-in/clock-out functionality
 */

/**
 * Type of attendance action
 */
export type AttendanceType = 'clock_in' | 'clock_out';

/**
 * Sync status of an attendance record
 */
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';

/**
 * Local attendance record (stored in WatermelonDB)
 */
export interface LocalAttendanceRecord {
  id: string; // Local UUID
  userId: string; // Supabase user ID
  cedula: string; // Employee ID number
  employeeName: string; // Employee full name
  type: AttendanceType; // Clock in or out
  timestamp: number; // Unix timestamp (milliseconds)
  photoUri: string; // Local file URI
  photoBase64?: string; // Photo as base64 (for sync)
  observations: string; // Optional notes
  syncStatus: SyncStatus; // Sync state
  syncedAt?: number; // When synced (Unix timestamp)
  syncError?: string; // Error message if sync failed
  remoteId?: number; // ID in Supabase after sync
  createdAt: number; // Local creation time
  updatedAt: number; // Last update time
}

/**
 * Attendance record ready for Supabase insertion
 */
export interface RemoteAttendanceRecord {
  cedula: string;
  empleado: string; // Full name
  fecha: string; // YYYY-MM-DD
  hora_inicio_decimal?: number; // Clock in time (decimal hours)
  hora_fin_decimal?: number; // Clock out time (decimal hours)
  tipo_marcaje?: string; // 'clock_in' | 'clock_out'
  observaciones?: string; // Notes/observations
}

/**
 * Photo upload data
 */
export interface PhotoUpload {
  attendanceId: string; // Local record ID
  photoUri: string; // Local URI
  photoBase64: string; // Base64 encoded
  fileName: string; // File name for storage
  timestamp: number; // When photo was taken
}
