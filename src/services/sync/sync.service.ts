/**
 * Sync Service
 *
 * Handles synchronization of local attendance records to Supabase.
 * Includes photo upload and data sync with retry logic.
 */

import { supabase } from '@services/supabase/client';
import { attendanceRecordService } from '@services/storage';
import { checkNetworkStatus } from '@hooks/useNetworkStatus';
import type { AttendanceRecord } from '@services/storage';
import { decode } from 'base64-arraybuffer';
import { getTenantId } from '@store/authStore';
import { fetchWithRetry, withRetry } from '@utils/network.utils';
import { syncEvents, SYNC_EVENTS } from './syncEvents';

/**
 * Edge Function URL for kiosk photo uploads
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/upload-kiosk-photo`;

/**
 * Sync lock to prevent concurrent sync operations
 * This prevents the "duplicate key" errors when multiple syncs run in parallel
 */
let isSyncInProgress = false;

/**
 * Códigos de error compartidos con el backend para el invariante "jornada abierta".
 * - OPEN_JOURNEY_EF_CODE: campo `code` del body 409 de la Edge Function kiosko.
 * - PG_CHECK_VIOLATION + OPEN_JOURNEY_DETAIL: error de Postgres del constraint
 *   en modo normal (sync directo via supabase-js).
 */
const OPEN_JOURNEY_EF_CODE = 'OPEN_JOURNEY';
const PG_CHECK_VIOLATION = '23514';
const PG_UNIQUE_VIOLATION = '23505';
const OPEN_JOURNEY_DETAIL = 'OPEN_JOURNEY_EXISTS';

/**
 * Sync result type
 */
export type SyncResult = {
  success: boolean;
  recordId: string;
  error?: string;
  // Discrimina el rechazo por jornada abierta del backend para que el batch
  // pueda emitir OPEN_JOURNEY_REJECTED y avisar al empleado.
  reason?: 'open_journey';
};

/**
 * Resultado del diagnóstico completo de sincronización.
 *
 * Tres dimensiones del estado:
 * - processableCount: registros que el sync automatico procesa cada 30s (attempts<10)
 * - stuckRecords: registros huerfanos (attempts>=10) que necesitan recuperacion manual
 * - orphanedRecords: registros marcados 'synced' localmente pero ausentes en Supabase
 *
 * Las tres dimensiones son disjuntas; el total de "problemas" es:
 *   processableCount + stuckRecords.length + orphanedRecords.length
 */
export type SyncVerificationResult = {
  // Locales marcados 'synced' (terminaron OK) — base para calcular orphans.
  totalLocalSynced: number;
  // Cuántos de esos están en Supabase. Si < totalLocalSynced → hay orphans.
  totalInSupabase: number;
  // Pendientes que el batch automatico ya esta procesando (no requiere accion).
  processableCount: number;
  // Atrapados (attempts >= 10) que el batch ya descarto — necesitan recuperacion manual.
  stuckRecords: Array<{
    id: string;
    timestamp: number;
    date: string;
    time: string;
    type: string;
    syncAttempts: number;
    syncError?: string;
  }>;
  // Locales 'synced' que NO existen en Supabase.
  orphanedRecords: Array<{
    id: string;
    timestamp: number;
    date: string;
    time: string;
    type: string;
  }>;
  repairedCount: number;
};

/**
 * Pull from Supabase result type
 */
export type PullResult = {
  success: boolean;
  pulled: number;
  updated?: number; // Records updated from admin edits
  deleted?: number; // Records deleted (synced from Web Admin deletion)
  cleaned?: number; // Old local records cleaned up
  alreadyLocal: number;
  error?: string;
};

/**
 * Batch sync result
 */
export type BatchSyncResult = {
  total: number;
  synced: number;
  failed: number;
  results: SyncResult[];
};

/**
 * Sync Service
 */
export const syncService = {
  /**
   * Upload photo to Supabase Storage
   *
   * @param recordId - Attendance record ID
   * @param photoBase64 - Base64 encoded photo
   * @param userId - User ID
   * @returns Photo URL or null
   */
  async uploadPhoto(
    recordId: string,
    photoBase64: string,
    userId: string
  ): Promise<string | null> {
    try {
      // Remove data:image/jpeg;base64, prefix if exists
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, '');

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${userId}/${timestamp}_${recordId}.jpg`;

      // Convert base64 to ArrayBuffer
      const arrayBuffer = decode(base64Data);

      // Upload to Supabase Storage con retry
      const { data, error } = await withRetry(
        async () =>
          await supabase.storage.from('attendance_photos').upload(fileName, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: false,
          }),
        {
          onRetry: (attempt) =>
            console.log(`[SyncService] Retry upload foto (${attempt})`),
        }
      );

      if (error) {
        console.error('[SyncService] Photo upload error:', error);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('attendance_photos')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('[SyncService] Upload photo error:', error);
      return null;
    }
  },

  /**
   * Llama al Edge Function de kiosko. photoBase64 dispara upload+insert;
   * solo photoUrl dispara insert-only (retry post-fallo).
   */
  async callKioskEdgeFunction(
    record: AttendanceRecord,
    pin: string
  ): Promise<
    | { kind: 'success'; photoUrl: string; recordInserted: boolean }
    | {
        kind: 'open_journey';
        // En el path race-condition de la EF, los campos de contexto pueden venir
        // null si la consulta de enriquecimiento del constraint falló. El caller
        // debe mostrar mensaje genérico cuando fecha es null.
        fecha: string | null;
        horaInicio: number | null;
        horasAbierta: number | null;
      }
    | null
  > {
    try {
      const mode = record.photoBase64 ? 'upload+insert' : 'insert-only';
      console.log(`[SyncService] Calling kiosk Edge Function (${mode})`);

      const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

      const tenantId = record.tenantId || getTenantId();
      if (!tenantId) {
        console.error('[SyncService] Cannot sync kiosk record without tenant_id');
        return null;
      }

      if (!record.photoBase64 && !record.photoUrl) {
        console.error('[SyncService] Cannot sync kiosk record: no photoBase64 nor photoUrl');
        return null;
      }

      const recordData = {
        empleado: record.userName,
        cedula: record.userCedula,
        fecha: record.date,
        hora_inicio_decimal:
          record.attendanceType === 'clock_in' ? record.timeDecimal : null,
        hora_fin_decimal:
          record.attendanceType === 'clock_out' ? record.timeDecimal : null,
        observaciones: record.observations || null,
        latitud: record.latitude || null,
        longitud: record.longitude || null,
        tipo_marcaje: record.attendanceType,
        timestamp_local: record.timestamp,
        tenant_id: tenantId,
      };

      // PRIORIDAD: photoUrl > photoBase64.
      // Si ya tenemos photoUrl persistida (de un intento previo), nunca re-subir la foto:
      // mandamos esa URL y la Edge Function hace solo el INSERT.
      // Esto evita duplicar archivos en Storage cuando hay retries.
      const photoPayload = record.photoUrl
        ? { photoUrl: record.photoUrl }
        : { photoBase64: record.photoBase64 };

      const response = await fetchWithRetry(
        EDGE_FUNCTION_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            pin,
            ...photoPayload,
            userId: record.userId,
            recordId: record.id,
            tenantId, // Scopea el PIN lookup multi-tenant (evita colisiones de PIN entre tenants).
            recordData,
          }),
        },
        {
          onRetry: (attempt) =>
            console.log(`[SyncService] Retry kiosk EF (${attempt})`),
        }
      );

      // 409 OPEN_JOURNEY: empleado con jornada abierta sin cerrar (constraint backend).
      if (response.status === 409) {
        const body = await response.json().catch(() => ({}));
        if (body?.code === OPEN_JOURNEY_EF_CODE) {
          console.warn('[SyncService] Kiosk EF rechazado por jornada abierta:', body);
          return {
            kind: 'open_journey',
            fecha: typeof body.fecha === 'string' ? body.fecha : null,
            horaInicio: typeof body.hora_inicio_decimal === 'number' ? body.hora_inicio_decimal : null,
            horasAbierta: typeof body.horas_abierta === 'number' ? body.horas_abierta : null,
          };
        }
        console.error('[SyncService] Kiosk EF 409 sin code OPEN_JOURNEY:', body);
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[SyncService] Edge Function error:', errorData);
        return null;
      }

      const result = await response.json();

      if (result.success && result.photoUrl) {
        console.log('[SyncService] Kiosk EF success:', {
          photoUrl: result.photoUrl,
          recordInserted: result.recordInserted,
        });
        return {
          kind: 'success',
          photoUrl: result.photoUrl,
          recordInserted: result.recordInserted === true,
        };
      }

      console.error('[SyncService] Edge Function returned no URL:', result);
      return null;
    } catch (error) {
      console.error('[SyncService] Kiosk EF exception:', error);
      return null;
    }
  },

  /**
   * Sync attendance record to Supabase
   * Discrimina el resultado:
   *   - 'success'       → INSERT/UPDATE OK
   *   - 'open_journey'  → constraint backend rechazó por jornada abierta existente
   *   - 'error'         → cualquier otro fallo
   */
  async syncRecord(
    record: AttendanceRecord,
    photoUrl?: string
  ): Promise<'success' | 'open_journey' | 'error'> {
    try {
      // Obtener tenant_id: primero del registro local, luego del store
      const tenantId = record.tenantId || getTenantId();

      if (!tenantId) {
        console.error('[SyncService] Cannot sync without tenant_id');
        return 'error';
      }

      // Prepare data for horarios_registros_diarios table
      // Only raw data is stored - calculations are done in reports/Web Admin
      const recordData = {
        // Employee identification
        empleado: record.userName,
        cedula: record.userCedula,
        fecha: record.date,

        // Time data (raw)
        hora_inicio_decimal:
          record.attendanceType === 'clock_in' ? record.timeDecimal : null,
        hora_fin_decimal:
          record.attendanceType === 'clock_out' ? record.timeDecimal : null,

        // Mobile-specific fields
        foto_url: photoUrl || null,
        observaciones: record.observations || null,
        latitud: record.latitude || null,
        longitud: record.longitude || null,
        tipo_marcaje: record.attendanceType,
        timestamp_local: record.timestamp,
        fuente: 'mobile',

        // Processing metadata
        timestamp_procesamiento: new Date().toISOString(),

        // Multi-tenant: OBLIGATORIO para RLS
        tenant_id: tenantId,
      };

      // Strategy: Check if THIS EXACT record exists (by timestamp_local), then UPDATE or INSERT
      // This allows multiple clock_in/clock_out per day (jornadas partidas)
      // Each attendance record from the app has a unique timestamp_local

      // Step 1: Check if THIS EXACT record already exists (same user, date, type AND timestamp)
      const { data: existingRecords, error: selectError } = await withRetry(
        async () =>
          await supabase
            .from('horarios_registros_diarios')
            .select('id')
            .eq('cedula', record.userCedula)
            .eq('fecha', record.date)
            .eq('timestamp_local', record.timestamp)
            .limit(1),
        {
          onRetry: (attempt) =>
            console.log(`[SyncService] Retry SELECT (${attempt})`),
        }
      );

      if (selectError) {
        console.error('[SyncService] Select error:', selectError);
        return 'error';
      }

      // Step 2: UPDATE if this exact record exists (re-sync), INSERT if new
      if (existingRecords && existingRecords.length > 0) {
        // This exact record exists (same timestamp), update it
        const existingId = (existingRecords[0] as { id: number }).id;
        const { error: updateError } = await withRetry(
          async () =>
            await supabase
              .from('horarios_registros_diarios')
              // @ts-expect-error - Supabase type inference issue with complex table schemas
              .update(recordData)
              .eq('id', existingId),
          {
            onRetry: (attempt) =>
              console.log(`[SyncService] Retry UPDATE (${attempt})`),
          }
        );

        if (updateError) {
          console.error('[SyncService] Update error:', updateError);
          return 'error';
        }

        console.log('[SyncService] Record updated successfully (re-sync)');
      } else {
        // New record, insert it (allows multiple entries/exits per day)
        const { error: insertError } = await withRetry(
          async () =>
            await supabase
              .from('horarios_registros_diarios')
              // @ts-expect-error - Supabase type inference issue with complex table schemas
              .insert(recordData),
          {
            onRetry: (attempt) =>
              console.log(`[SyncService] Retry INSERT (${attempt})`),
          }
        );

        if (insertError) {
          // 23514 + OPEN_JOURNEY_EXISTS: constraint backend rechazó por jornada abierta.
          if (
            insertError.code === PG_CHECK_VIOLATION &&
            insertError.details === OPEN_JOURNEY_DETAIL
          ) {
            console.warn('[SyncService] INSERT rechazado por jornada abierta:', insertError);
            return 'open_journey';
          }
          // 23505 = duplicate key, el registro ya existe en Supabase (race condition
          // entre dos sync paralelos). Tratamos como éxito porque los datos ya están.
          if (insertError.code === PG_UNIQUE_VIOLATION) {
            console.log('[SyncService] Record already exists in Supabase (duplicate), marking as synced');
            return 'success';
          }

          console.error('[SyncService] Insert error:', insertError);
          return 'error';
        }

        console.log('[SyncService] Record inserted successfully');
      }

      return 'success';
    } catch (error) {
      console.error('[SyncService] Sync record error:', error);
      return 'error';
    }
  },

  /**
   * Procesa un registro: sube foto (si aún no la tiene) + INSERT en BD.
   *
   * Contrato de estado al terminar:
   *   - Éxito        → markAsSynced (status='synced', photoUploaded=true, base64 limpio).
   *   - Sin red      → markAsPending (sin incrementar attempts).
   *   - Sin creds    → markAsOrphan (attempts=999).
   *   - Otro fallo   → markAsSyncError (status='error', attempts++).
   *
   * Invariantes: el registro nunca queda en 'syncing' al salir, y photoUrl/base64
   * se persisten en un orden que mantiene el registro recuperable si el INSERT falla.
   */
  async processRecord(record: AttendanceRecord): Promise<SyncResult> {
    // Fail común para los paths de error dentro del try: garantiza markAsSyncError
    // y que sync_attempts se incremente (falta de red se maneja aparte).
    const fail = async (errorMsg: string): Promise<SyncResult> => {
      try {
        await attendanceRecordService.markAsSyncError(record.id, errorMsg);
      } catch (markErr) {
        console.error('[SyncService] markAsSyncError failed:', markErr);
      }
      return { success: false, recordId: record.id, error: errorMsg };
    };

    // Jornada abierta sin cerrar: el backend SIEMPRE rechazará este marcaje hasta
    // que el admin cierre la jornada anterior. A diferencia de un orphan sin
    // credenciales (recuperable), este registro NO es válido ni reintentable, así
    // que lo borramos del local para no dejar un estado "Trabajando" fantasma ni
    // reintentar en bucle. El empleado recibe aviso vía OPEN_JOURNEY_REJECTED.
    const failAsOpenJourney = async (detail: string): Promise<SyncResult> => {
      try {
        await attendanceRecordService.delete(record.id);
      } catch (delErr) {
        console.error('[SyncService] Failed to delete open-journey record:', delErr);
        // Fallback: si no pudimos borrar, lo marcamos huérfano permanente
        // (attempts=999) para que NO vuelva a getPendingSync — si no, quedaría
        // en 'syncing' y el batch lo reprocesaría en bucle cada 30s (rechazo +
        // alert repetido). markAsOrphan además lo hace visible en getStuckRecords
        // para recuperación manual desde DataManagement.
        try {
          await attendanceRecordService.markAsOrphan(record.id);
        } catch (orphanErr) {
          console.error('[SyncService] Fallback markAsOrphan also failed:', orphanErr);
        }
      }
      return {
        success: false,
        recordId: record.id,
        error: `${OPEN_JOURNEY_EF_CODE}: ${detail}`,
        reason: 'open_journey',
      };
    };

    try {
      console.log('[SyncService] Processing record:', record.id);

      // 1. Network: si no hay red, revertimos a 'pending' y no penalizamos attempts —
      //    no es culpa del registro y queremos que reintente en el próximo trigger.
      const hasNetwork = await checkNetworkStatus();
      if (!hasNetwork) {
        try {
          await attendanceRecordService.markAsPending(record.id);
        } catch (revertErr) {
          console.error('[SyncService] Revert to pending failed:', revertErr);
        }
        return {
          success: false,
          recordId: record.id,
          error: 'Sin conexión a Internet',
        };
      }

      // 2. Credenciales: modo normal necesita sesión Supabase; modo kiosko necesita PIN.
      const supabaseSession = await supabase.auth.getSession();
      const hasActiveSession = !!supabaseSession.data.session;
      const hasKioskPin = !!record.kioskPin;

      if (!hasActiveSession && !hasKioskPin) {
        console.error('[SyncService] Registro huérfano: sin sesión ni PIN', {
          recordId: record.id,
          date: record.date,
          time: record.time,
          syncAttempts: record.syncAttempts,
        });
        await attendanceRecordService.markAsOrphan(record.id);
        return {
          success: false,
          recordId: record.id,
          error: 'ORPHAN: Sin credenciales válidas para sincronizar',
        };
      }

      const isKiosko = hasKioskPin && !!record.kioskPin;
      let photoUrl: string | undefined = record.photoUrl || undefined;

      // 3. Camino kiosko: una sola llamada a la Edge Function por ejecución.
      //    La EF decide automáticamente entre "upload+insert" (foto base64) o
      //    "insert-only" (foto URL ya existente) según lo que persistamos en el record.
      //    Si el INSERT falla, retornamos error con la photoUrl ya persistida —
      //    el siguiente trigger del sync (30s) llamará la EF en modo insert-only.
      if (isKiosko) {
        if (!record.photoBase64 && !photoUrl) {
          return fail('Kiosko sin foto local ni URL subida — irrecuperable');
        }

        const edgeResult = await this.callKioskEdgeFunction(record, record.kioskPin!);
        if (!edgeResult) {
          return fail('Edge Function (kiosko) falló');
        }

        if (edgeResult.kind === 'open_journey') {
          // Si la EF devolvió contexto enriquecido lo incluimos; en path race-condition
          // los campos vienen null y caemos a un mensaje genérico.
          const detail =
            edgeResult.fecha && edgeResult.horasAbierta !== null
              ? `jornada abierta del ${edgeResult.fecha} sin cerrar (${edgeResult.horasAbierta.toFixed(1)}h)`
              : 'el empleado tiene una jornada abierta sin cerrar';
          return failAsOpenJourney(detail);
        }

        if (edgeResult.photoUrl && edgeResult.photoUrl !== record.photoUrl) {
          await attendanceRecordService.update(record.id, { photoUrl: edgeResult.photoUrl });
        }
        photoUrl = edgeResult.photoUrl;

        if (!edgeResult.recordInserted) {
          // Foto subida pero INSERT no se hizo. La photoUrl quedó persistida,
          // el siguiente trigger reintentará en modo insert-only.
          return fail('Edge Function reportó INSERT no realizado');
        }
      } else {
        // 4. Camino normal (sesión Supabase activa): upload de foto + INSERT separados.
        if (!photoUrl && record.photoBase64) {
          const uploadedUrl = await this.uploadPhoto(
            record.id,
            record.photoBase64,
            record.userId
          );
          if (!uploadedUrl) {
            return fail('Error al subir foto');
          }
          photoUrl = uploadedUrl;
          // Persistir photoUrl ANTES de intentar el INSERT — así si el INSERT falla,
          // el retry no re-sube la foto.
          await attendanceRecordService.update(record.id, { photoUrl });
        }

        const syncResult = await this.syncRecord(record, photoUrl);
        if (syncResult === 'open_journey') {
          return failAsOpenJourney('el empleado tiene una jornada abierta sin cerrar');
        }
        if (syncResult === 'error') {
          return fail('Error al sincronizar datos');
        }
      }

      // 5. Confirmar éxito: status='synced', photoUploaded=true, syncedAt, base64 liberado.
      //    Solo llegamos acá si TODO el flujo (upload + INSERT) fue exitoso.
      await attendanceRecordService.markAsSynced(record.id, photoUrl);
      if (record.photoBase64) {
        await attendanceRecordService.clearPhotoBase64(record.id);
      }

      console.log('[SyncService] Record synced successfully:', record.id);
      return { success: true, recordId: record.id };
    } catch (error) {
      console.error('[SyncService] Process record exception:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return fail(errorMessage);
    }
  },

  /**
   * Sync all pending records
   * Uses a lock to prevent concurrent sync operations that cause duplicate key errors
   *
   * @returns Batch sync result
   */
  async syncPendingRecords(): Promise<BatchSyncResult> {
    // Prevent concurrent sync operations
    if (isSyncInProgress) {
      console.log('[SyncService] Sync already in progress, skipping...');
      return {
        total: 0,
        synced: 0,
        failed: 0,
        results: [],
      };
    }

    isSyncInProgress = true;

    try {
      console.log('[SyncService] Starting batch sync...');

      // Check network
      const hasNetwork = await checkNetworkStatus();
      if (!hasNetwork) {
        console.log('[SyncService] No network available, skipping sync');
        return {
          total: 0,
          synced: 0,
          failed: 0,
          results: [],
        };
      }

      // Get pending records
      const pendingRecords = await attendanceRecordService.getPendingSync();

      if (pendingRecords.length === 0) {
        console.log('[SyncService] No pending records to sync');
        return {
          total: 0,
          synced: 0,
          failed: 0,
          results: [],
        };
      }

      console.log(`[SyncService] Found ${pendingRecords.length} pending records`);

      // Process each record
      const results: SyncResult[] = [];

      for (const record of pendingRecords) {
        // Mark as syncing
        await attendanceRecordService.update(record.id, {
          syncStatus: 'syncing',
        });

        // Process record
        const result = await this.processRecord(record);
        results.push(result);

        // Small delay between records
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Calculate stats
      const synced = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      console.log(
        `[SyncService] Batch sync complete: ${synced} synced, ${failed} failed`
      );

      // Notificar solo cuando hubo trabajo real: evita pulls innecesarios en los
      // listeners (HomeScreen llama pullFromSupabase en cada refresh).
      syncEvents.emit(SYNC_EVENTS.SYNC_COMPLETED, {
        synced,
        failed,
        total: pendingRecords.length,
      });

      // Si algún marcaje fue rechazado por jornada abierta, avisar al empleado.
      // El registro local ya fue borrado en processRecord, por lo que el
      // SYNC_COMPLETED de arriba ya disparó el loadData que limpia "Trabajando".
      if (results.some((r) => r.reason === 'open_journey')) {
        syncEvents.emit(SYNC_EVENTS.OPEN_JOURNEY_REJECTED);
      }

      return {
        total: pendingRecords.length,
        synced,
        failed,
        results,
      };
    } catch (error) {
      console.error('[SyncService] Batch sync error:', error);
      return {
        total: 0,
        synced: 0,
        failed: 0,
        results: [],
      };
    } finally {
      isSyncInProgress = false;
    }
  },

  /**
   * Check if sync is needed
   *
   * @returns Boolean indicating if there are pending records
   */
  async needsSync(): Promise<boolean> {
    try {
      const count = await attendanceRecordService.getPendingSyncCount();
      return count > 0;
    } catch (error) {
      console.error('[SyncService] Needs sync check error:', error);
      return false;
    }
  },

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    pendingCount: number;
    hasNetwork: boolean;
  }> {
    try {
      const [pendingCount, hasNetwork] = await Promise.all([
        attendanceRecordService.getPendingSyncCount(),
        checkNetworkStatus(),
      ]);

      return {
        pendingCount,
        hasNetwork,
      };
    } catch (error) {
      console.error('[SyncService] Get sync status error:', error);
      return {
        pendingCount: 0,
        hasNetwork: false,
      };
    }
  },

  /**
   * Verify sync integrity
   * Compares local "synced" records against Supabase to find orphaned records
   * Optionally repairs by marking orphaned records as pending
   *
   * @param repair - If true, marks orphaned records as pending for re-sync
   * @returns Verification result
   */
  async verifySyncIntegrity(repair: boolean = false): Promise<SyncVerificationResult> {
    try {
      console.log('[SyncService] Starting sync integrity verification...');

      // Sin red no podemos comparar contra Supabase para detectar orphans.
      const hasNetwork = await checkNetworkStatus();
      if (!hasNetwork) {
        throw new Error('Sin conexión a Internet');
      }

      // Las 3 lecturas son independientes — paralelas.
      const [processableCount, stuck, localSyncedRecords] = await Promise.all([
        attendanceRecordService.getPendingSyncCount(),
        attendanceRecordService.getStuckRecords(),
        attendanceRecordService.getSyncedRecords(),
      ]);

      const stuckRecords = stuck.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        date: r.date,
        time: r.time,
        type: r.attendanceType,
        syncAttempts: r.syncAttempts,
        syncError: r.syncError,
      }));

      console.log(`[SyncService] Found ${localSyncedRecords.length} local records marked as synced`);

      let totalInSupabase = 0;
      let orphanedRecords: SyncVerificationResult['orphanedRecords'] = [];

      if (localSyncedRecords.length > 0) {
        const localTimestamps = localSyncedRecords.map((r) => r.timestamp);

        const { data: remoteRecords, error: queryError } = await supabase
          .from('horarios_registros_diarios')
          .select('timestamp_local')
          .in('timestamp_local', localTimestamps);

        if (queryError) {
          console.error('[SyncService] Supabase query error:', queryError);
          throw new Error('Error al consultar Supabase');
        }

        const remoteTimestamps = new Set(
          (remoteRecords || []).map((r: { timestamp_local: number }) => r.timestamp_local)
        );
        totalInSupabase = remoteTimestamps.size;

        orphanedRecords = localSyncedRecords
          .filter((r) => !remoteTimestamps.has(r.timestamp))
          .map((r) => ({
            id: r.id,
            timestamp: r.timestamp,
            date: r.date,
            time: r.time,
            type: r.attendanceType,
          }));
      }

      console.log('[SyncService] Verification result:', {
        processableCount,
        stuckCount: stuckRecords.length,
        orphanedCount: orphanedRecords.length,
      });

      let repairedCount = 0;

      // Si se pidio reparar, manejamos los DOS recovery paths:
      //   a) Orphans → markAsPending (volveran al batch via getPendingSync).
      //   b) Stuck → recoverStuckRecords (resetea attempts a 0 + status pending).
      if (repair) {
        if (orphanedRecords.length > 0) {
          console.log('[SyncService] Repairing orphaned records...');
          for (const orphan of orphanedRecords) {
            try {
              await attendanceRecordService.markAsPending(orphan.id);
              repairedCount++;
            } catch (error) {
              console.error(`[SyncService] Failed to repair record ${orphan.id}:`, error);
            }
          }
        }
        if (stuckRecords.length > 0) {
          const recoveredStuck = await attendanceRecordService.recoverStuckRecords();
          repairedCount += recoveredStuck;
        }
        console.log(`[SyncService] Repaired ${repairedCount} records total`);
      }

      return {
        totalLocalSynced: localSyncedRecords.length,
        totalInSupabase,
        processableCount,
        stuckRecords,
        orphanedRecords,
        repairedCount,
      };
    } catch (error) {
      console.error('[SyncService] Verify sync integrity error:', error);
      throw error;
    }
  },

  /**
   * Pull records from Supabase that don't exist locally
   * Used to sync history from other devices or after reinstall
   *
   * @param userCedula - User's cedula to fetch records for
   * @returns Pull result
   */
  async pullFromSupabase(userCedula: string): Promise<PullResult> {
    try {
      console.log('[SyncService] Starting pull from Supabase for cedula:', userCedula);

      // Check network
      const hasNetwork = await checkNetworkStatus();
      if (!hasNetwork) {
        return {
          success: false,
          pulled: 0,
          alreadyLocal: 0,
          error: 'Sin conexión a Internet',
        };
      }

      // Get all local timestamps to compare
      const localTimestamps = await attendanceRecordService.getAllTimestamps();
      const localTimestampSet = new Set(localTimestamps);

      console.log(`[SyncService] Found ${localTimestamps.length} local records`);

      // Fetch records from Supabase for this user
      // Includes all sources (mobile + admin-created) for complete history
      // Optimized: only last 90 days, includes fuente and ajustado_at for edit detection
      type RemoteRecord = {
        cedula: string;
        empleado: string;
        fecha: string;
        tipo_marcaje: string;
        timestamp_local: number;
        hora_inicio_decimal: number | null;
        hora_fin_decimal: number | null;
        fuente: string | null;
        ajustado_at: string | null;
        tenant_id: string | null;
      };

      // Calculate 30 days ago (matches UI month filter, optimized for low-capacity devices)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const minDate = thirtyDaysAgo.toISOString().split('T')[0]; // yyyy-MM-dd

      const { data: remoteRecords, error: queryError } = await supabase
        .from('horarios_registros_diarios')
        .select('cedula, empleado, fecha, tipo_marcaje, timestamp_local, hora_inicio_decimal, hora_fin_decimal, fuente, ajustado_at, tenant_id')
        .eq('cedula', userCedula)
        .gte('fecha', minDate)
        .not('timestamp_local', 'is', null)
        .is('deleted_at', null)
        .order('timestamp_local', { ascending: false }) as { data: RemoteRecord[] | null; error: unknown };

      if (queryError) {
        console.error('[SyncService] Supabase query error:', queryError);
        return {
          success: false,
          pulled: 0,
          alreadyLocal: 0,
          error: 'Error al consultar Supabase',
        };
      }

      // Also fetch deleted records to sync deletions from Web Admin
      type DeletedRecord = {
        timestamp_local: number;
      };

      const { data: deletedRecords, error: deletedQueryError } = await supabase
        .from('horarios_registros_diarios')
        .select('timestamp_local')
        .eq('cedula', userCedula)
        .gte('fecha', minDate)
        .not('timestamp_local', 'is', null)
        .not('deleted_at', 'is', null) // Only deleted records
        .order('timestamp_local', { ascending: false }) as { data: DeletedRecord[] | null; error: unknown };

      if (deletedQueryError) {
        console.error('[SyncService] Error fetching deleted records:', deletedQueryError);
        // Continue anyway, deletion sync is not critical
      }

      // Process deleted records - remove local copies
      let deleted = 0;
      const currentTenantId = getTenantId();

      if (deletedRecords && deletedRecords.length > 0) {
        console.log(`[SyncService] Found ${deletedRecords.length} deleted records in Supabase`);

        for (const deletedRecord of deletedRecords) {
          if (!deletedRecord.timestamp_local) continue;

          // Only delete if we have it locally
          if (localTimestampSet.has(deletedRecord.timestamp_local)) {
            try {
              const wasDeleted = await attendanceRecordService.deleteByTimestamp(deletedRecord.timestamp_local, {
                userCedula,
                currentTenantId,
              });
              if (wasDeleted) {
                deleted++;
                // Remove from local set so we don't try to process it again
                localTimestampSet.delete(deletedRecord.timestamp_local);
              }
            } catch (error) {
              console.error('[SyncService] Error deleting local record:', error);
            }
          }
        }

        if (deleted > 0) {
          console.log(`[SyncService] Deleted ${deleted} local records that were removed from server`);
        }
      }

      if (!remoteRecords || remoteRecords.length === 0) {
        console.log('[SyncService] No remote records found');
        return {
          success: true,
          pulled: 0,
          deleted: deleted > 0 ? deleted : undefined,
          alreadyLocal: localTimestamps.length - deleted,
        };
      }

      console.log(`[SyncService] Found ${remoteRecords.length} remote records`);

      const activeRemoteTimestamps = remoteRecords
        .map((record) => record.timestamp_local)
        .filter((timestamp): timestamp is number => !!timestamp);
      const deletedRemoteTimestamps = (deletedRecords || [])
        .map((record) => record.timestamp_local)
        .filter((timestamp): timestamp is number => !!timestamp);
      const remoteTenantIds = Array.from(new Set(
        remoteRecords
          .map((record) => record.tenant_id)
          .filter((tenantId): tenantId is string => !!tenantId),
      ));

      // Get local records with their remote_updated_at timestamps
      const localRecordsMap = await attendanceRecordService.getLocalRecordsWithRemoteUpdate();

      // Separate new records from potentially updated records
      const newRecords: typeof remoteRecords = [];
      const updatedRecords: typeof remoteRecords = [];

      for (const remote of remoteRecords) {
        if (!remote.timestamp_local) continue;

        if (!localTimestampSet.has(remote.timestamp_local)) {
          // New record
          newRecords.push(remote);
        } else if (remote.ajustado_at) {
          // Existing record - check if it was updated remotely
          const remoteUpdatedAt = new Date(remote.ajustado_at).getTime();
          const localUpdatedAt = localRecordsMap.get(remote.timestamp_local);

          // Update if remote is newer than local (or local has no update timestamp)
          if (!localUpdatedAt || remoteUpdatedAt > localUpdatedAt) {
            updatedRecords.push(remote);
          }
        }
      }

      console.log(`[SyncService] ${newRecords.length} new records, ${updatedRecords.length} updated records to sync`);

      let pulled = 0;
      let updated = 0;

      // Create local records for each new remote record
      for (const remote of newRecords) {
        try {
          const result = await attendanceRecordService.createFromRemote({
            cedula: remote.cedula,
            empleado: remote.empleado,
            fecha: remote.fecha,
            tipo_marcaje: remote.tipo_marcaje as 'clock_in' | 'clock_out',
            timestamp_local: remote.timestamp_local,
            hora_inicio_decimal: remote.hora_inicio_decimal,
            hora_fin_decimal: remote.hora_fin_decimal,
            fuente: remote.fuente,
            ajustado_at: remote.ajustado_at,
            tenant_id: remote.tenant_id,
          });

          if (result) {
            pulled++;
          }
        } catch (error) {
          console.error('[SyncService] Error creating local record:', error);
        }
      }

      // Update existing records that were edited remotely
      for (const remote of updatedRecords) {
        try {
          const result = await attendanceRecordService.updateFromRemote({
            timestamp_local: remote.timestamp_local,
            hora_inicio_decimal: remote.hora_inicio_decimal,
            hora_fin_decimal: remote.hora_fin_decimal,
            fuente: remote.fuente || 'admin_edit',
            ajustado_at: remote.ajustado_at!,
          });

          if (result) {
            updated++;
          }
        } catch (error) {
          console.error('[SyncService] Error updating local record:', error);
        }
      }

      // Defensive reconciliation: if an admin adjustment changed timestamp_local,
      // the adjusted row arrives as new and the old synced local timestamp becomes
      // a ghost unless the server also exposes it as a soft-deleted row.
      const staleDeleted = await attendanceRecordService.deleteSyncedMissingFromRemote({
        userCedula,
        minDate,
        remoteTimestamps: activeRemoteTimestamps,
        deletedRemoteTimestamps,
        tenantIds: remoteTenantIds,
        currentTenantId,
      });

      const totalDeleted = deleted + staleDeleted;

      console.log(`[SyncService] Pull complete: ${pulled} new, ${updated} updated, ${totalDeleted} deleted (${staleDeleted} stale)`);

      // Cleanup old synced records to keep local DB light (optimized for low-capacity devices)
      const cleaned = await attendanceRecordService.cleanupOldRecords(30);
      if (cleaned > 0) {
        console.log(`[SyncService] Cleaned up ${cleaned} old local records`);
      }

      // Backfill: libera photo_base64 acumulado en registros ya sincronizados
      // por versiones previas que no limpiaban tras el upload.
      const photosCleared = await attendanceRecordService.clearAllUploadedPhotos();
      if (photosCleared > 0) {
        console.log(`[SyncService] Backfilled photo_base64 cleanup for ${photosCleared} records`);
      }

      return {
        success: true,
        pulled,
        updated: updated > 0 ? updated : undefined,
        deleted: totalDeleted > 0 ? totalDeleted : undefined,
        cleaned: cleaned > 0 ? cleaned : undefined,
        alreadyLocal: remoteRecords.length - newRecords.length - updatedRecords.length,
      };
    } catch (error) {
      console.error('[SyncService] Pull from Supabase error:', error);
      return {
        success: false,
        pulled: 0,
        updated: 0,
        deleted: 0,
        alreadyLocal: 0,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },
};
