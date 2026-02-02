/**
 * Attendance Service
 *
 * High-level service for attendance operations (clock in/out).
 * Coordinates between camera and local storage.
 */

import { Alert } from 'react-native';
import { attendanceRecordService } from '@services/storage';
import type { AttendanceType, AttendanceRecord } from '@services/storage';
import { useAuthStore, getTenantId } from '@store/authStore';
import { notifyRecordCreated } from '@services/sync';
import { supabase } from '@services/supabase/client';
import { format } from 'date-fns';
import { timeValidationService, type TimeValidationResult } from '@services/time';

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
  timeValidation?: TimeValidationResult;
};

/**
 * Attendance Service
 */
export const attendanceService = {
  /**
   * Clock in or out
   *
   * Creates local attendance record that will be synced automatically.
   * Validates device time against server time before creating record.
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

      // Validate device time against server
      console.log('[AttendanceService] Validating device time...');
      const timeValidation = await timeValidationService.validateTime();

      if (!timeValidation.isValid) {
        const errorMessage = timeValidationService.getTimeDiffMessage(timeValidation.diffMinutes);
        console.warn('[AttendanceService] Time validation failed:', {
          diffMinutes: timeValidation.diffMinutes,
          message: errorMessage,
        });

        return {
          success: false,
          error: `${errorMessage}. Por favor ajusta la hora de tu dispositivo.`,
          timeValidation,
        };
      }

      console.log('[AttendanceService] Time validation passed');

      // Get kiosk PIN if in kiosk mode
      const authState = useAuthStore.getState();
      const kioskPin = authState.isKioskAuthenticated ? (authState.kioskPin ?? undefined) : undefined;

      // Get tenant_id (OBLIGATORIO para multi-tenant)
      const tenantId = getTenantId();
      if (!tenantId) {
        console.error('[AttendanceService] No tenant_id found in auth state');
        throw new Error('Usuario sin empresa asignada. Contacte al administrador.');
      }

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
        tenantId, // Multi-tenant: OBLIGATORIO
      });

      console.log('[AttendanceService] Clock success:', record.id);

      // Notify sync system that a new record was created
      notifyRecordCreated(record.id);

      return {
        success: true,
        record,
        timeValidation,
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

  // ============================================================
  // Funciones por Cédula - Para sincronización multi-dispositivo
  // ============================================================

  /**
   * Get today's attendance records by cédula
   * Usado para detectar marcajes hechos en otros dispositivos (ej: kiosco)
   */
  async getTodayRecordsByCedula(userCedula: string): Promise<AttendanceRecord[]> {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;

      console.log('[AttendanceService] Getting today records by cedula:', {
        userCedula,
        todayStr,
      });

      const records = await attendanceRecordService.getByDateRange(todayStr, todayStr);

      // Filtrar por cédula (no por userId)
      const filtered = records.filter((r) => r.userCedula === userCedula);

      console.log('[AttendanceService] Records filtered by cedula:', {
        total: records.length,
        filtered: filtered.length,
      });

      return filtered;
    } catch (error) {
      console.error('[AttendanceService] Get today records by cedula error:', error);
      return [];
    }
  },

  /**
   * Get last clock type by cédula
   * Detecta el último marcaje sin importar en qué dispositivo se hizo
   */
  async getLastClockTypeByCedula(userCedula: string): Promise<AttendanceType | null> {
    try {
      const todayRecords = await this.getTodayRecordsByCedula(userCedula);

      if (todayRecords.length === 0) {
        return null;
      }

      // Ordenar por timestamp descendente y tomar el primero
      const sorted = todayRecords.sort((a, b) => b.timestamp - a.timestamp);
      return sorted[0].attendanceType;
    } catch (error) {
      console.error('[AttendanceService] Get last clock type by cedula error:', error);
      return null;
    }
  },

  /**
   * Check if user can clock in by cédula
   * Considera marcajes de todos los dispositivos
   */
  async canClockInByCedula(userCedula: string): Promise<boolean> {
    const lastType = await this.getLastClockTypeByCedula(userCedula);
    // Puede marcar entrada si: nunca marcó hoy O el último fue salida
    return lastType === null || lastType === 'clock_out';
  },

  /**
   * Check if user can clock out by cédula
   * Considera marcajes de todos los dispositivos
   */
  async canClockOutByCedula(userCedula: string): Promise<boolean> {
    const lastType = await this.getLastClockTypeByCedula(userCedula);
    // Puede marcar salida si: el último fue entrada
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

  /**
   * Get last clock type from Supabase (cloud)
   * Used by kiosk mode to check status across devices
   *
   * @param userCedula - Cedula del usuario
   * @param tenantId - (Opcional) Tenant ID para modo kiosco. Si se pasa, usa RPC SECURITY DEFINER
   */
  async getLastClockTypeFromCloud(
    userCedula: string,
    tenantId?: string
  ): Promise<AttendanceType | null> {
    try {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      // Si tenemos tenant_id, usar la RPC (modo kiosco sin sesion autenticada)
      if (tenantId) {
        console.log('[AttendanceService] Using RPC for kiosk mode:', {
          userCedula,
          todayStr,
          tenantId,
        });

        // Tipo para el resultado de la RPC
        type RpcResult = { tipo_marcaje: string; timestamp_local: number };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await (supabase.rpc as any)('get_attendance_status_by_cedula', {
          p_cedula: userCedula,
          p_fecha: todayStr,
          p_tenant_id: tenantId,
        });

        const rpcData = result.data as RpcResult[] | null;
        const rpcError = result.error;

        if (rpcError) {
          console.error('[AttendanceService] RPC error:', rpcError);
          return null;
        }

        if (!rpcData || rpcData.length === 0) {
          console.log('[AttendanceService] No records from RPC');
          return null;
        }

        console.log('[AttendanceService] RPC result:', rpcData[0]);
        return rpcData[0].tipo_marcaje as AttendanceType;
      }

      // Fallback: consulta directa (modo normal con sesion autenticada)
      console.log('[AttendanceService] Checking cloud status for:', { userCedula, todayStr });

      const { data, error } = await supabase
        .from('horarios_registros_diarios')
        .select('tipo_marcaje, timestamp_local')
        .eq('cedula', userCedula)
        .eq('fecha', todayStr)
        .order('timestamp_local', { ascending: false })
        .limit(1);

      if (error) {
        console.error('[AttendanceService] Cloud query error:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.log('[AttendanceService] No cloud records for today');
        return null;
      }

      const lastRecord = data[0] as { tipo_marcaje: string; timestamp_local: number };
      console.log('[AttendanceService] Last cloud record:', lastRecord);

      return lastRecord.tipo_marcaje as AttendanceType;
    } catch (error) {
      console.error('[AttendanceService] Get cloud status error:', error);
      return null;
    }
  },

  /**
   * Check if user can clock in (from cloud)
   * Used by kiosk mode
   *
   * @param userCedula - Cedula del usuario
   * @param tenantId - (Opcional) Tenant ID para modo kiosco
   */
  async canClockInFromCloud(userCedula: string, tenantId?: string): Promise<boolean> {
    const lastType = await this.getLastClockTypeFromCloud(userCedula, tenantId);
    // Can clock in if: never clocked today OR last was clock_out
    return lastType === null || lastType === 'clock_out';
  },

  /**
   * Check if user can clock out (from cloud)
   * Used by kiosk mode
   *
   * @param userCedula - Cedula del usuario
   * @param tenantId - (Opcional) Tenant ID para modo kiosco
   */
  async canClockOutFromCloud(userCedula: string, tenantId?: string): Promise<boolean> {
    const lastType = await this.getLastClockTypeFromCloud(userCedula, tenantId);
    // Can clock out if: last was clock_in
    return lastType === 'clock_in';
  },
};
