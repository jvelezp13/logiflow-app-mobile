/**
 * Attendance Record Service
 *
 * CRUD operations for attendance records in WatermelonDB.
 */

import { Q } from '@nozbe/watermelondb';
import { database } from './database';
import { AttendanceRecord, AttendanceType, AttendanceSyncStatus } from './models';
import { format } from 'date-fns';
import { deleteLocalImage } from '@utils/imageUtils';

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
  tenantId?: string; // Multi-tenant: ID del tenant
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
  nextRetryAt: number;
  syncedAt: number;
}>;

/**
 * Escalera de backoff para reintentos de sync. Índice = (intentos - 1), con tope
 * en el último valor. Evita quemar todos los reintentos en minutos y deja que un
 * error transitorio se resuelva solo cuando mejoran las condiciones.
 */
const RETRY_BACKOFF_MS = [
  30 * 1000,          // intento 1 → 30s
  2 * 60 * 1000,      // intento 2 → 2min
  10 * 60 * 1000,     // intento 3 → 10min
  30 * 60 * 1000,     // intento 4 → 30min
  60 * 60 * 1000,     // intento 5 → 1h
  3 * 60 * 60 * 1000, // intento 6+ → 3h (tope)
];

/**
 * Sentinela de intentos para registros terminales: irrecuperables sin acción
 * manual (p.ej. kiosko sin PIN guardado). Se excluyen del pipeline automático y
 * se reportan como "atascados" para recuperación manual. El backoff normal nunca
 * llega a este valor por acumulación (con tope de 3h tardaría años).
 */
const ORPHAN_ATTEMPTS = 999;

/** Un marcaje sin subir pasa a "necesita atención" del empleado tras este tiempo. */
const ATTENTION_AGE_MS = 60 * 60 * 1000; // 1h

/** Descanso cuando falta sesión/credenciales (no penaliza intentos). */
const WAITING_CREDENTIALS_DELAY_MS = 5 * 60 * 1000; // 5min

/** Delay de backoff para el intento N (1-indexed, con tope). */
function backoffDelayMs(attempts: number): number {
  const idx = Math.min(Math.max(attempts, 1) - 1, RETRY_BACKOFF_MS.length - 1);
  return RETRY_BACKOFF_MS[idx];
}

/**
 * Attendance Record Service
 */
export const attendanceRecordService = {
  /**
   * Create a new attendance record
   */
  async create(data: CreateAttendanceRecordData): Promise<AttendanceRecord> {
    try {
      // Validar tenant_id obligatorio (previene fallos silenciosos en sync)
      if (!data.tenantId) {
        throw new Error('tenant_id requerido para crear registro de asistencia');
      }

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
          rec.tenantId = data.tenantId; // Multi-tenant
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
        tenantId: record.tenantId,
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
          if (data.nextRetryAt !== undefined) rec.nextRetryAt = data.nextRetryAt;
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

  // Libera datos locales de foto de un registro ya subido a Storage. La foto
  // sigue accesible via photoUrl en Supabase; lo que se borra es la copia local
  // en SQLite y el archivo cacheado que inflan la app data partition (critico
  // en handhelds tipo Zebra con /data chico).
  async clearPhotoBase64(recordId: string): Promise<void> {
    try {
      const record = await database
        .get<AttendanceRecord>('attendance_records')
        .find(recordId);

      const photoUri = record.photoUri;

      await database.write(async () => {
        await record.update((rec) => {
          rec.photoBase64 = '';
          rec.photoUri = '';
        });
      });

      await deleteLocalImage(photoUri);
    } catch (error) {
      console.error('[AttendanceRecordService] clearPhotoBase64 error:', error);
    }
  },

  // Backfill: limpia photo_base64 de TODOS los registros ya sincronizados que
  // todavia tienen la copia local. Util en devices que llevan tiempo usando
  // versiones previas sin el fix.
  async clearAllUploadedPhotos(): Promise<number> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.where('photo_uploaded', true),
        )
        .fetch();

      if (records.length === 0) {
        return 0;
      }

      const withLocalPhotoData = records.filter((r) => !!r.photoBase64 || !!r.photoUri);
      if (withLocalPhotoData.length === 0) {
        return 0;
      }

      const localPhotoUris = withLocalPhotoData
        .map((record) => record.photoUri)
        .filter((uri): uri is string => !!uri);

      console.log(`[AttendanceRecordService] Backfilling local photo cleanup for ${withLocalPhotoData.length} records`);

      await database.write(async () => {
        await Promise.all(
          withLocalPhotoData.map((record) =>
            record.update((rec) => {
              rec.photoBase64 = '';
              rec.photoUri = '';
            }),
          ),
        );
      });

      await Promise.all(localPhotoUris.map((uri) => deleteLocalImage(uri)));

      return withLocalPhotoData.length;
    } catch (error) {
      console.error('[AttendanceRecordService] clearAllUploadedPhotos error:', error);
      return 0;
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
   * Get pending sync records ELIGIBLES para procesar ahora.
   * OPTIMIZED: Query only pending/error/syncing records directly (no debug fetch)
   * - Excluye terminales (attempts >= ORPHAN_ATTEMPTS): irrecuperables sin acción manual.
   * - Respeta el backoff: solo trae registros cuyo next_retry_at ya venció
   *   (o es null/0, p.ej. legacy o recién marcados pending).
   */
  async getPendingSync(): Promise<AttendanceRecord[]> {
    try {
      const now = Date.now();
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.and(
            Q.or(
              Q.where('sync_status', 'pending'),
              Q.where('sync_status', 'error'),
              Q.where('sync_status', 'syncing')
            ),
            Q.where('sync_attempts', Q.lt(ORPHAN_ATTEMPTS)),
            Q.or(
              Q.where('next_retry_at', Q.lte(now)),
              Q.where('next_retry_at', null) // legacy: sin backoff previo → elegible
            )
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
        nextRetryAt: 0, // limpiar backoff
        photoUrl,
        photoUploaded: !!photoUrl,
      });
    } catch (error) {
      console.error('[AttendanceRecordService] Mark as synced error:', error);
      throw error;
    }
  },

  /**
   * Mark record as sync error, aplicando backoff exponencial.
   * El registro NO se abandona: sigue en cola y se reintentará cuando venza
   * next_retry_at. Solo los terminales (markAsOrphan, attempts=999) salen del loop.
   */
  async markAsSyncError(recordId: string, errorMessage: string): Promise<void> {
    try {
      const record = await this.getById(recordId);
      if (!record) return;

      const attempts = record.syncAttempts + 1;
      await this.update(recordId, {
        syncStatus: 'error',
        syncError: errorMessage,
        syncAttempts: attempts,
        nextRetryAt: Date.now() + backoffDelayMs(attempts),
      });
    } catch (error) {
      console.error('[AttendanceRecordService] Mark as sync error:', error);
      throw error;
    }
  },

  /**
   * Marca un registro que no pudo sincronizar por falta de credenciales
   * (modo normal sin sesión Supabase activa). A diferencia de markAsOrphan, esto
   * es RECUPERABLE: cuando el empleado vuelve a iniciar sesión, sube. No penaliza
   * intentos; solo aplica un descanso corto para no reprocesar en bucle cada 30s.
   */
  async markAsWaitingCredentials(recordId: string): Promise<void> {
    try {
      await this.update(recordId, {
        syncStatus: 'pending',
        syncError: 'WAITING_AUTH: esperando sesión para sincronizar',
        nextRetryAt: Date.now() + WAITING_CREDENTIALS_DELAY_MS,
      });
      console.log('[AttendanceRecordService] Registro esperando credenciales:', recordId);
    } catch (error) {
      console.error('[AttendanceRecordService] Mark as waiting credentials error:', error);
      throw error;
    }
  },

  /**
   * Marca un registro como huérfano (sin credenciales válidas para sincronizar)
   * Estos registros no se reintentan automáticamente
   */
  async markAsOrphan(recordId: string): Promise<void> {
    try {
      await this.update(recordId, {
        syncStatus: 'error',
        syncError: 'ORPHAN: Sin credenciales válidas para sincronizar',
        syncAttempts: 999, // Marca máxima para no reintentar
      });
      console.log('[AttendanceRecordService] Registro marcado como huérfano:', recordId);
    } catch (error) {
      console.error('[AttendanceRecordService] Mark as orphan error:', error);
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
   * Detecta si hay un marcaje del mismo tipo todavía sincronizando que debe
   * bloquear que el usuario marque de nuevo. Solo bloquea pending recientes
   * (<= maxAgeMinutes) para evitar bloqueo perpetuo si un sync queda atascado.
   */
  async hasBlockingPendingByType(
    userCedula: string,
    type: AttendanceType,
    maxAgeMinutes: number = 10
  ): Promise<boolean> {
    try {
      const cutoff = Date.now() - maxAgeMinutes * 60 * 1000;
      const count = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.and(
            Q.where('user_cedula', userCedula),
            Q.where('attendance_type', type),
            Q.where('timestamp', Q.gte(cutoff)),
            Q.where('sync_attempts', Q.lt(ORPHAN_ATTEMPTS)),
            Q.or(
              Q.where('sync_status', 'pending'),
              Q.where('sync_status', 'syncing'),
              Q.where('sync_status', 'error')
            )
          )
        )
        .fetchCount();
      return count > 0;
    } catch (error) {
      console.error('[AttendanceRecordService] hasBlockingPendingByType error:', error);
      return false;
    }
  },

  /**
   * Cuenta los registros no sincronizados que el pipeline aun procesara
   * (no terminales). Incluye los que estan "descansando" por backoff, porque
   * siguen pendientes de subir — el badge "X pendientes" debe ser honesto.
   */
  async getPendingSyncCount(): Promise<number> {
    try {
      const count = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.and(
            Q.or(
              Q.where('sync_status', 'pending'),
              Q.where('sync_status', 'error'),
              Q.where('sync_status', 'syncing')
            ),
            Q.where('sync_attempts', Q.lt(ORPHAN_ATTEMPTS))
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
   * Cuenta los registros terminales (attempts >= ORPHAN_ATTEMPTS) que el pipeline
   * automatico descarto. Necesitan recuperacion manual via recoverStuckRecords().
   */
  async getStuckRecordsCount(): Promise<number> {
    try {
      const count = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.and(
            Q.or(
              Q.where('sync_status', 'pending'),
              Q.where('sync_status', 'error'),
              Q.where('sync_status', 'syncing')
            ),
            Q.where('sync_attempts', Q.gte(ORPHAN_ATTEMPTS))
          )
        )
        .fetchCount();
      return count;
    } catch (error) {
      console.error('[AttendanceRecordService] Get stuck records count error:', error);
      return 0;
    }
  },

  /**
   * Trae los terminales (attempts >= ORPHAN_ATTEMPTS) para reporting/recuperacion.
   */
  async getStuckRecords(): Promise<AttendanceRecord[]> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.and(
            Q.or(
              Q.where('sync_status', 'pending'),
              Q.where('sync_status', 'error'),
              Q.where('sync_status', 'syncing')
            ),
            Q.where('sync_attempts', Q.gte(ORPHAN_ATTEMPTS))
          ),
          Q.sortBy('timestamp', Q.asc)
        )
        .fetch();
      return records;
    } catch (error) {
      console.error('[AttendanceRecordService] Get stuck records error:', error);
      return [];
    }
  },

  /**
   * Trae los marcajes que "necesitan atención" del empleado: no sincronizados y
   * o bien viejos (> ATTENTION_AGE_MS sin subir) o bien terminales. Alimenta el
   * banner accionable del Home (a diferencia del badge, que cuenta todo lo pendiente).
   */
  async getRecordsNeedingAttention(): Promise<AttendanceRecord[]> {
    try {
      const cutoff = Date.now() - ATTENTION_AGE_MS;
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.and(
            Q.or(
              Q.where('sync_status', 'pending'),
              Q.where('sync_status', 'error'),
              Q.where('sync_status', 'syncing')
            ),
            Q.or(
              Q.where('created_at', Q.lt(cutoff)),
              Q.where('sync_attempts', Q.gte(ORPHAN_ATTEMPTS))
            )
          ),
          Q.sortBy('timestamp', Q.asc)
        )
        .fetch();
      return records;
    } catch (error) {
      console.error('[AttendanceRecordService] Get records needing attention error:', error);
      return [];
    }
  },

  /**
   * Resetea registros huerfanos a 'pending' con attempts=0 para que vuelvan al
   * pipeline de sync. Usado por el boton de "Diagnosticar y Reparar" en Settings.
   * Devuelve la cantidad reseteada.
   */
  async recoverStuckRecords(): Promise<number> {
    try {
      const stuck = await this.getStuckRecords();
      if (stuck.length === 0) {
        return 0;
      }

      console.log(`[AttendanceRecordService] Recovering ${stuck.length} stuck records`);

      await database.write(async () => {
        await database.batch(
          ...stuck.map((record) =>
            record.prepareUpdate((rec) => {
              rec.attendanceSyncStatus = 'pending';
              rec.syncAttempts = 0;
              rec.syncError = undefined;
              rec.nextRetryAt = 0; // elegible de inmediato
            })
          )
        );
      });

      return stuck.length;
    } catch (error) {
      console.error('[AttendanceRecordService] recoverStuckRecords error:', error);
      return 0;
    }
  },

  /**
   * Fuerza la elegibilidad inmediata de los pendientes NO terminales que están
   * "descansando" por backoff (limpia next_retry_at sin tocar attempts). Lo usa el
   * botón "reintentar ahora" del banner para que un marcaje en medio de un escalón
   * largo (1h/3h) o de la espera de credenciales se intente YA. No resetea attempts:
   * si vuelve a fallar, el backoff sigue escalando desde donde iba.
   * Devuelve la cantidad de registros destrabados.
   */
  async resetBackoffForRetry(): Promise<number> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.and(
            Q.or(
              Q.where('sync_status', 'pending'),
              Q.where('sync_status', 'error'),
              Q.where('sync_status', 'syncing')
            ),
            Q.where('sync_attempts', Q.lt(ORPHAN_ATTEMPTS)),
            Q.where('next_retry_at', Q.gt(0)) // solo los que están descansando
          )
        )
        .fetch();

      if (records.length === 0) {
        return 0;
      }

      await database.write(async () => {
        await database.batch(
          ...records.map((record) =>
            record.prepareUpdate((rec) => {
              rec.nextRetryAt = 0;
            })
          )
        );
      });

      return records.length;
    } catch (error) {
      console.error('[AttendanceRecordService] resetBackoffForRetry error:', error);
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
        nextRetryAt: 0, // limpiar backoff → elegible de inmediato
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
    tenant_id?: string | null; // Multi-tenant
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
          // Multi-tenant
          rec.tenantId = data.tenant_id || undefined;
        });
      });

      console.log('[AttendanceRecordService] Created record from remote:', {
        id: record.id,
        timestamp: data.timestamp_local,
        date: data.fecha,
        fuente: data.fuente,
        tenantId: data.tenant_id,
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
  async deleteByTimestamp(
    timestamp: number,
    options?: { userCedula?: string; currentTenantId?: string | null }
  ): Promise<boolean> {
    try {
      const records = await database
        .get<AttendanceRecord>('attendance_records')
        .query(Q.where('timestamp', timestamp))
        .fetch();

      const matchingRecords = records.filter((record) => {
        if (record.attendanceSyncStatus !== 'synced') {
          return false;
        }
        if (options?.userCedula && record.userCedula !== options.userCedula) {
          return false;
        }
        if (options?.currentTenantId) {
          return record.tenantId === options.currentTenantId;
        }
        return true;
      });

      if (matchingRecords.length === 0) {
        console.log('[AttendanceRecordService] No synced matching record found with timestamp:', timestamp);
        return false;
      }

      await database.write(async () => {
        await matchingRecords[0].markAsDeleted();
      });

      console.log('[AttendanceRecordService] Record deleted by timestamp:', timestamp);
      return true;
    } catch (error) {
      console.error('[AttendanceRecordService] Delete by timestamp error:', error);
      return false;
    }
  },

  /**
   * Delete synced local records that are no longer present in the remote pull window.
   *
   * This is a defensive reconciliation for admin edits that may change
   * `timestamp_local` in Supabase. The mobile app historically used timestamp as
   * the local identity, so a changed remote timestamp can otherwise leave the old
   * synced timestamp as a ghost record and create a second adjusted record.
   *
   * Never deletes pending/error/syncing records, because those are not yet safely
   * represented by the remote authoritative set.
   */
  async deleteSyncedMissingFromRemote(params: {
    userCedula: string;
    minDate: string;
    remoteTimestamps: number[];
    deletedRemoteTimestamps?: number[];
    tenantIds?: string[];
    currentTenantId?: string | null;
  }): Promise<number> {
    try {
      const authoritativeTimestamps = new Set([
        ...params.remoteTimestamps,
        ...(params.deletedRemoteTimestamps || []),
      ]);
      const tenantIdSet = new Set((params.tenantIds || []).filter(Boolean));
      if (params.currentTenantId) {
        tenantIdSet.add(params.currentTenantId);
      }

      const candidates = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.where('user_cedula', params.userCedula),
          Q.where('date', Q.gte(params.minDate)),
          Q.where('sync_status', 'synced'),
        )
        .fetch();

      const staleRecords = candidates.filter((record) => {
        if (authoritativeTimestamps.has(record.timestamp)) {
          return false;
        }

        // If tenant information is available, only delete records confidently
        // belonging to this tenant. Missing local tenant_id is intentionally
        // treated as unsafe on shared devices where cedula can overlap.
        if (tenantIdSet.size > 0) {
          return !!record.tenantId && tenantIdSet.has(record.tenantId);
        }

        return true;
      });

      if (staleRecords.length === 0) {
        return 0;
      }

      console.log(`[AttendanceRecordService] Removing ${staleRecords.length} stale synced records missing from remote`);

      await database.write(async () => {
        await Promise.all(staleRecords.map((record) => record.markAsDeleted()));
      });

      return staleRecords.length;
    } catch (error) {
      console.error('[AttendanceRecordService] deleteSyncedMissingFromRemote error:', error);
      return 0;
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

  /**
   * Limpia registros huérfanos terminales (sin credenciales válidas para
   * sincronizar). Tienen sync_attempts >= ORPHAN_ATTEMPTS y no pueden recuperarse.
   */
  async cleanupOrphanedRecords(): Promise<number> {
    try {
      const orphaned = await database
        .get<AttendanceRecord>('attendance_records')
        .query(
          Q.where('sync_status', 'error'),
          Q.where('sync_attempts', Q.gte(ORPHAN_ATTEMPTS))
        )
        .fetch();

      if (orphaned.length === 0) {
        return 0;
      }

      console.log(`[AttendanceRecordService] Eliminando ${orphaned.length} registros huérfanos`);

      await database.write(async () => {
        await Promise.all(orphaned.map((record) => record.markAsDeleted()));
      });

      console.log(`[AttendanceRecordService] Limpieza de huérfanos completada: ${orphaned.length} eliminados`);
      return orphaned.length;
    } catch (error) {
      console.error('[AttendanceRecordService] Cleanup orphaned error:', error);
      return 0;
    }
  },
};
