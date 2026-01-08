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
 * Sync result type
 */
export type SyncResult = {
  success: boolean;
  recordId: string;
  error?: string;
};

/**
 * Sync verification result
 */
export type SyncVerificationResult = {
  totalLocalSynced: number;
  totalInSupabase: number;
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

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('attendance_photos')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

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
   * Upload photo via Edge Function (for kiosk mode)
   * Uses PIN-based authentication instead of user session
   *
   * @param recordId - Attendance record ID
   * @param photoBase64 - Base64 encoded photo
   * @param userId - User ID
   * @param pin - 4-digit PIN code
   * @returns Photo URL or null
   */
  async uploadPhotoViaEdgeFunction(
    recordId: string,
    photoBase64: string,
    userId: string,
    pin: string
  ): Promise<string | null> {
    try {
      console.log('[SyncService] Uploading photo via Edge Function (kiosk mode)');

      // Get Supabase anon key for authorization
      const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

      // Call Edge Function with Authorization header
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          pin,
          photoBase64,
          userId,
          recordId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[SyncService] Edge Function error:', errorData);
        return null;
      }

      const result = await response.json();

      if (result.success && result.photoUrl) {
        console.log('[SyncService] Photo uploaded successfully via Edge Function');
        return result.photoUrl;
      } else {
        console.error('[SyncService] Edge Function returned no URL:', result);
        return null;
      }
    } catch (error) {
      console.error('[SyncService] Upload photo via Edge Function error:', error);
      return null;
    }
  },

  /**
   * Sync attendance record to Supabase
   *
   * @param record - Attendance record
   * @param photoUrl - Photo URL (after upload)
   * @returns Success boolean
   */
  async syncRecord(record: AttendanceRecord, photoUrl?: string): Promise<boolean> {
    try {
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
      };

      // Strategy: Check if THIS EXACT record exists (by timestamp_local), then UPDATE or INSERT
      // This allows multiple clock_in/clock_out per day (jornadas partidas)
      // Each attendance record from the app has a unique timestamp_local

      // Step 1: Check if THIS EXACT record already exists (same user, date, type AND timestamp)
      const { data: existingRecords, error: selectError } = await supabase
        .from('horarios_registros_diarios')
        .select('id')
        .eq('cedula', record.userCedula)
        .eq('fecha', record.date)
        .eq('timestamp_local', record.timestamp)
        .limit(1);

      if (selectError) {
        console.error('[SyncService] Select error:', selectError);
        return false;
      }

      // Step 2: UPDATE if this exact record exists (re-sync), INSERT if new
      if (existingRecords && existingRecords.length > 0) {
        // This exact record exists (same timestamp), update it
        const existingId = (existingRecords[0] as { id: number }).id;
        const { error: updateError } = await supabase
          .from('horarios_registros_diarios')
          // @ts-expect-error - Supabase type inference issue with complex table schemas
          .update(recordData)
          .eq('id', existingId);

        if (updateError) {
          console.error('[SyncService] Update error:', updateError);
          return false;
        }

        console.log('[SyncService] Record updated successfully (re-sync)');
      } else {
        // New record, insert it (allows multiple entries/exits per day)
        const { error: insertError } = await supabase
          .from('horarios_registros_diarios')
          // @ts-expect-error - Supabase type inference issue with complex table schemas
          .insert(recordData);

        if (insertError) {
          // Error 23505 = duplicate key, meaning the record already exists in Supabase
          // This can happen if two sync processes run in parallel
          // In this case, we consider it a success since the data is already there
          if (insertError.code === '23505') {
            console.log('[SyncService] Record already exists in Supabase (duplicate), marking as synced');
            return true;
          }

          console.error('[SyncService] Insert error:', insertError);
          return false;
        }

        console.log('[SyncService] Record inserted successfully');
      }

      return true;
    } catch (error) {
      console.error('[SyncService] Sync record error:', error);
      return false;
    }
  },

  /**
   * Process single attendance record (upload photo + sync)
   *
   * @param record - Attendance record
   * @returns Sync result
   */
  async processRecord(record: AttendanceRecord): Promise<SyncResult> {
    try {
      console.log('[SyncService] Processing record:', record.id);

      // Check network
      const hasNetwork = await checkNetworkStatus();
      if (!hasNetwork) {
        return {
          success: false,
          recordId: record.id,
          error: 'Sin conexión a Internet',
        };
      }

      let photoUrl: string | undefined;

      // Upload photo if needed
      if (record.needsPhotoUpload && record.photoBase64) {
        console.log('[SyncService] Uploading photo for record:', record.id);

        // Check if kiosk mode using PIN from record (persisted during creation)
        const hasKioskPin = !!record.kioskPin;

        console.log('[SyncService] Checking upload mode:', {
          hasKioskPin,
          recordId: record.id,
        });

        if (hasKioskPin && record.kioskPin) {
          // Use Edge Function for kiosk mode
          console.log('[SyncService] Using Edge Function for kiosk mode upload');
          photoUrl = (await this.uploadPhotoViaEdgeFunction(
            record.id,
            record.photoBase64,
            record.userId,
            record.kioskPin
          )) || undefined;
        } else {
          // Use direct upload for authenticated mode
          console.log('[SyncService] Using direct upload for authenticated mode');
          photoUrl = (await this.uploadPhoto(
            record.id,
            record.photoBase64,
            record.userId
          )) || undefined;
        }

        if (!photoUrl) {
          return {
            success: false,
            recordId: record.id,
            error: 'Error al subir foto',
          };
        }

        // Update record with photo URL
        await attendanceRecordService.update(record.id, {
          photoUrl,
          photoUploaded: true,
        });
      } else if (record.photoUrl) {
        photoUrl = record.photoUrl;
      }

      // Sync record to Supabase
      console.log('[SyncService] Syncing record to Supabase:', record.id);

      const syncSuccess = await this.syncRecord(record, photoUrl);

      if (!syncSuccess) {
        return {
          success: false,
          recordId: record.id,
          error: 'Error al sincronizar datos',
        };
      }

      // Mark as synced
      await attendanceRecordService.markAsSynced(record.id, photoUrl);

      console.log('[SyncService] Record synced successfully:', record.id);

      return {
        success: true,
        recordId: record.id,
      };
    } catch (error) {
      console.error('[SyncService] Process record error:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';

      // Mark as error
      await attendanceRecordService.markAsSyncError(record.id, errorMessage);

      return {
        success: false,
        recordId: record.id,
        error: errorMessage,
      };
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
      // Always release the lock
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

      // Check network
      const hasNetwork = await checkNetworkStatus();
      if (!hasNetwork) {
        throw new Error('Sin conexión a Internet');
      }

      // Get all local records marked as synced
      const localSyncedRecords = await attendanceRecordService.getSyncedRecords();
      console.log(`[SyncService] Found ${localSyncedRecords.length} local records marked as synced`);

      if (localSyncedRecords.length === 0) {
        return {
          totalLocalSynced: 0,
          totalInSupabase: 0,
          orphanedRecords: [],
          repairedCount: 0,
        };
      }

      // Get all timestamps from local synced records
      const localTimestamps = localSyncedRecords.map(r => r.timestamp);

      // Query Supabase for records matching these timestamps
      const { data: remoteRecords, error: queryError } = await supabase
        .from('horarios_registros_diarios')
        .select('timestamp_local')
        .in('timestamp_local', localTimestamps);

      if (queryError) {
        console.error('[SyncService] Supabase query error:', queryError);
        throw new Error('Error al consultar Supabase');
      }

      // Create set of timestamps that exist in Supabase
      const remoteTimestamps = new Set(
        (remoteRecords || []).map((r: { timestamp_local: number }) => r.timestamp_local)
      );

      console.log(`[SyncService] Found ${remoteTimestamps.size} matching records in Supabase`);

      // Find orphaned records (local synced but not in Supabase)
      const orphanedRecords = localSyncedRecords
        .filter(r => !remoteTimestamps.has(r.timestamp))
        .map(r => ({
          id: r.id,
          timestamp: r.timestamp,
          date: r.date,
          time: r.time,
          type: r.attendanceType,
        }));

      console.log(`[SyncService] Found ${orphanedRecords.length} orphaned records`);

      let repairedCount = 0;

      // Repair if requested
      if (repair && orphanedRecords.length > 0) {
        console.log('[SyncService] Repairing orphaned records...');
        for (const orphan of orphanedRecords) {
          try {
            await attendanceRecordService.markAsPending(orphan.id);
            repairedCount++;
          } catch (error) {
            console.error(`[SyncService] Failed to repair record ${orphan.id}:`, error);
          }
        }
        console.log(`[SyncService] Repaired ${repairedCount} records`);
      }

      return {
        totalLocalSynced: localSyncedRecords.length,
        totalInSupabase: remoteTimestamps.size,
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
      };

      // Calculate 90 days ago
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const minDate = ninetyDaysAgo.toISOString().split('T')[0]; // yyyy-MM-dd

      const { data: remoteRecords, error: queryError } = await supabase
        .from('horarios_registros_diarios')
        .select('cedula, empleado, fecha, tipo_marcaje, timestamp_local, hora_inicio_decimal, hora_fin_decimal, fuente, ajustado_at')
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
      if (deletedRecords && deletedRecords.length > 0) {
        console.log(`[SyncService] Found ${deletedRecords.length} deleted records in Supabase`);

        for (const deletedRecord of deletedRecords) {
          if (!deletedRecord.timestamp_local) continue;

          // Only delete if we have it locally
          if (localTimestampSet.has(deletedRecord.timestamp_local)) {
            try {
              const wasDeleted = await attendanceRecordService.deleteByTimestamp(deletedRecord.timestamp_local);
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

      console.log(`[SyncService] Pull complete: ${pulled} new, ${updated} updated, ${deleted} deleted`);

      return {
        success: true,
        pulled,
        updated: updated > 0 ? updated : undefined,
        deleted: deleted > 0 ? deleted : undefined,
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
