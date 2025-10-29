/**
 * Attendance Service
 *
 * High-level service for attendance operations (clock in/out).
 * Coordinates between camera and local storage.
 */

import { Alert } from 'react-native';
import { attendanceRecordService } from '@services/storage';
import type { AttendanceType, AttendanceRecord } from '@services/storage';
import { useAuthStore } from '@store/authStore';
import { notifyRecordCreated } from '@services/sync';

/**
 * Clock in/out data
 */
export type ClockData = {
  userId: string;
  userCedula: string;
  userName: string;
  attendanceType: AttendanceType;
  photoUri: string;
  photoBase64: string;
  observations?: string;
  latitude?: number;
  longitude?: number;
};

/**
 * Attendance service result
 */
export type AttendanceResult = {
  success: boolean;
  record?: AttendanceRecord;
  error?: string;
};

/**
 * Attendance Service
 */
export const attendanceService = {
  /**
   * Clock in or out
   *
   * Creates local attendance record that will be synced automatically.
   */
  async clock(data: ClockData): Promise<AttendanceResult> {
    try {
      console.log('[AttendanceService] Clock:', data.attendanceType);

      // Validate required fields
      if (!data.userId || !data.userCedula || !data.userName) {
        throw new Error('Información de usuario incompleta');
      }

      if (!data.photoBase64) {
        throw new Error('Se requiere foto para el marcaje');
      }

      // Get kiosk PIN if in kiosk mode
      const authState = useAuthStore.getState();
      const kioskPin = authState.isKioskAuthenticated ? authState.kioskPin : undefined;

      // Create attendance record in local database
      const record = await attendanceRecordService.create({
        userId: data.userId,
        userCedula: data.userCedula,
        userName: data.userName,
        attendanceType: data.attendanceType,
        photoUri: data.photoUri,
        photoBase64: data.photoBase64,
        observations: data.observations,
        latitude: data.latitude,
        longitude: data.longitude,
        kioskPin, // Store PIN for later sync (will be used after logout)
      });

      console.log('[AttendanceService] Clock success:', record.id);

      // Notify sync system that a new record was created
      notifyRecordCreated(record.id);

      return {
        success: true,
        record,
      };
    } catch (error) {
      console.error('[AttendanceService] Clock error:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Error al guardar marcaje';

      return {
        success: false,
        error: errorMessage,
      };
    }
  },

  /**
   * Clock in
   */
  async clockIn(
    userId: string,
    userCedula: string,
    userName: string,
    photoUri: string,
    photoBase64: string,
    observations?: string,
    location?: { latitude: number; longitude: number }
  ): Promise<AttendanceResult> {
    return this.clock({
      userId,
      userCedula,
      userName,
      attendanceType: 'clock_in',
      photoUri,
      photoBase64,
      observations,
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
  },

  /**
   * Clock out
   */
  async clockOut(
    userId: string,
    userCedula: string,
    userName: string,
    photoUri: string,
    photoBase64: string,
    observations?: string,
    location?: { latitude: number; longitude: number }
  ): Promise<AttendanceResult> {
    return this.clock({
      userId,
      userCedula,
      userName,
      attendanceType: 'clock_out',
      photoUri,
      photoBase64,
      observations,
      latitude: location?.latitude,
      longitude: location?.longitude,
    });
  },

  /**
   * Get today's attendance records for user
   */
  async getTodayRecords(userId: string): Promise<AttendanceRecord[]> {
    try {
      const today = new Date();
      // IMPORTANT: Use local date, not UTC date
      // Match the format used when creating records: format(nowDate, 'yyyy-MM-dd')
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`; // Local date YYYY-MM-DD

      console.log('[AttendanceService] Getting today records for:', {
        userId,
        todayStr,
        todayFull: today.toISOString(),
        localTime: today.toLocaleString(),
      });

      const records = await attendanceRecordService.getByDateRange(todayStr, todayStr);

      console.log('[AttendanceService] Records from DB:', {
        total: records.length,
        records: records.map((r) => ({
          id: r.id,
          userId: r.userId,
          date: r.date,
          type: r.attendanceType,
          time: r.time,
        })),
      });

      // Filter by user
      const filtered = records.filter((r) => r.userId === userId);

      console.log('[AttendanceService] Filtered records for user:', {
        count: filtered.length,
        filtered: filtered.map((r) => ({
          id: r.id,
          type: r.attendanceType,
          time: r.time,
        })),
      });

      return filtered;
    } catch (error) {
      console.error('[AttendanceService] Get today records error:', error);
      return [];
    }
  },

  /**
   * Get last clock type for user today
   */
  async getLastClockType(userId: string): Promise<AttendanceType | null> {
    try {
      const todayRecords = await this.getTodayRecords(userId);

      if (todayRecords.length === 0) {
        return null;
      }

      // Get most recent
      const sorted = todayRecords.sort((a, b) => b.timestamp - a.timestamp);
      return sorted[0].attendanceType;
    } catch (error) {
      console.error('[AttendanceService] Get last clock type error:', error);
      return null;
    }
  },

  /**
   * Check if user can clock in
   */
  async canClockIn(userId: string): Promise<boolean> {
    const lastType = await this.getLastClockType(userId);
    // Can clock in if: never clocked today OR last was clock_out
    return lastType === null || lastType === 'clock_out';
  },

  /**
   * Check if user can clock out
   */
  async canClockOut(userId: string): Promise<boolean> {
    const lastType = await this.getLastClockType(userId);
    // Can clock out if: last was clock_in
    return lastType === 'clock_in';
  },

  /**
   * Get pending sync count
   */
  async getPendingSyncCount(): Promise<number> {
    try {
      return await attendanceRecordService.getPendingSyncCount();
    } catch (error) {
      console.error('[AttendanceService] Get pending sync count error:', error);
      return 0;
    }
  },

  /**
   * Validate clock action and show confirmation
   */
  validateAndConfirm(
    attendanceType: AttendanceType,
    onConfirm: () => void,
    onCancel: () => void
  ): void {
    const typeText = attendanceType === 'clock_in' ? 'entrada' : 'salida';

    Alert.alert(
      `Confirmar ${typeText}`,
      `¿Deseas marcar tu ${typeText}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Confirmar',
          onPress: onConfirm,
        },
      ],
      { cancelable: false }
    );
  },
};
