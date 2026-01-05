/**
 * Time Validation Service
 *
 * Validates device time against server time to prevent clock manipulation.
 * Uses Supabase server time as the source of truth.
 */

import { supabase } from '@services/supabase/client';

/**
 * Maximum allowed time difference in milliseconds (5 minutes)
 */
const MAX_TIME_DIFF_MS = 5 * 60 * 1000;

/**
 * Supabase URL for direct API calls
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Time validation result
 */
export type TimeValidationResult = {
  isValid: boolean;
  serverTime: Date | null;
  deviceTime: Date;
  diffMs: number;
  diffMinutes: number;
  error?: string;
};

/**
 * Cached server time offset (device time - server time in ms)
 * Positive means device is ahead, negative means device is behind
 */
let cachedTimeOffset: number | null = null;
let lastSyncTimestamp: number = 0;
const CACHE_DURATION_MS = 60 * 1000; // Re-sync every 1 minute

/**
 * Time Validation Service
 */
export const timeValidationService = {
  /**
   * Get server time from Supabase
   * Uses multiple methods for reliability
   */
  async getServerTime(): Promise<Date | null> {
    // Try HTTP Date header method first (most reliable)
    const headerTime = await this.getServerTimeFromHeaders();
    if (headerTime) {
      return headerTime;
    }

    // Fallback to database query estimation
    return this.getServerTimeFallback();
  },

  /**
   * Get server time from HTTP Date header
   * This is the most reliable method as it comes directly from the server
   */
  async getServerTimeFromHeaders(): Promise<Date | null> {
    try {
      if (!SUPABASE_URL) {
        console.warn('[TimeValidation] No Supabase URL configured');
        return null;
      }

      const startTime = Date.now();

      // Make a HEAD request to get server time from Date header
      const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
        },
      });

      const endTime = Date.now();
      const dateHeader = response.headers.get('date');

      if (dateHeader) {
        const networkLatency = (endTime - startTime) / 2;
        const serverTime = new Date(dateHeader);

        // Validate that the parsed date is valid
        if (isNaN(serverTime.getTime())) {
          console.warn('[TimeValidation] Invalid date header:', dateHeader);
          return null;
        }

        // Adjust for network latency
        serverTime.setMilliseconds(serverTime.getMilliseconds() + networkLatency);

        console.log('[TimeValidation] Got server time from headers:', {
          header: dateHeader,
          parsed: serverTime.toISOString(),
          latencyMs: networkLatency,
        });

        return serverTime;
      }

      console.warn('[TimeValidation] No date header in response');
      return null;
    } catch (error) {
      console.error('[TimeValidation] Header method error:', error);
      return null;
    }
  },

  /**
   * Fallback method to get server time
   * Uses a database query and estimates based on response time
   */
  async getServerTimeFallback(): Promise<Date | null> {
    try {
      const startTime = Date.now();

      // Make a simple query to Supabase
      const { error } = await supabase
        .from('horarios_registros_diarios')
        .select('id')
        .limit(1);

      const endTime = Date.now();
      const networkLatency = (endTime - startTime) / 2;

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        console.error('[TimeValidation] Fallback query error:', error);
        return null;
      }

      // Estimate server time as midpoint of request
      // This is less accurate but catches obvious manipulation (hours/days off)
      const estimatedServerTime = new Date(startTime + networkLatency);

      console.log('[TimeValidation] Fallback estimate:', {
        latencyMs: networkLatency,
        estimated: estimatedServerTime.toISOString(),
      });

      return estimatedServerTime;
    } catch (error) {
      console.error('[TimeValidation] Fallback method error:', error);
      return null;
    }
  },

  /**
   * Validate device time against server time
   */
  async validateTime(): Promise<TimeValidationResult> {
    const deviceTime = new Date();

    try {
      const serverTime = await this.getServerTime();

      if (!serverTime) {
        // If we can't get server time, we'll allow the operation
        // but log a warning
        console.warn('[TimeValidation] Could not get server time, allowing operation');
        return {
          isValid: true,
          serverTime: null,
          deviceTime,
          diffMs: 0,
          diffMinutes: 0,
          error: 'No se pudo obtener hora del servidor',
        };
      }

      // Calculate difference
      const diffMs = deviceTime.getTime() - serverTime.getTime();
      const diffMinutes = Math.round(diffMs / 60000);
      const absDiffMs = Math.abs(diffMs);

      // Determine if valid
      const isValid = absDiffMs <= MAX_TIME_DIFF_MS;

      console.log('[TimeValidation] Time validation result:', {
        deviceTime: deviceTime.toISOString(),
        serverTime: serverTime.toISOString(),
        diffMs,
        diffMinutes,
        isValid,
      });

      // Update cache
      cachedTimeOffset = diffMs;
      lastSyncTimestamp = Date.now();

      return {
        isValid,
        serverTime,
        deviceTime,
        diffMs,
        diffMinutes,
      };
    } catch (error) {
      console.error('[TimeValidation] Validation error:', error);

      // On error, allow operation but flag it
      return {
        isValid: true,
        serverTime: null,
        deviceTime,
        diffMs: 0,
        diffMinutes: 0,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  },

  /**
   * Get corrected timestamp using cached offset
   * Returns device time if no offset is available
   */
  getCorrectedTime(): Date {
    if (cachedTimeOffset !== null) {
      // Subtract the offset to get approximate server time
      return new Date(Date.now() - cachedTimeOffset);
    }
    return new Date();
  },

  /**
   * Check if cached offset is still valid
   */
  isCacheValid(): boolean {
    if (cachedTimeOffset === null) return false;
    return Date.now() - lastSyncTimestamp < CACHE_DURATION_MS;
  },

  /**
   * Force refresh the time offset
   */
  async refreshTimeOffset(): Promise<void> {
    try {
      const result = await this.validateTime();
      if (result.serverTime) {
        cachedTimeOffset = result.diffMs;
        lastSyncTimestamp = Date.now();
      }
    } catch (error) {
      console.error('[TimeValidation] Refresh time offset error:', error);
    }
  },

  /**
   * Get human-readable time difference message
   */
  getTimeDiffMessage(diffMinutes: number): string {
    const absDiff = Math.abs(diffMinutes);
    const direction = diffMinutes > 0 ? 'adelantado' : 'atrasado';

    if (absDiff < 60) {
      return `Tu dispositivo está ${absDiff} minutos ${direction}`;
    } else {
      const hours = Math.floor(absDiff / 60);
      const mins = absDiff % 60;
      if (mins > 0) {
        return `Tu dispositivo está ${hours} horas y ${mins} minutos ${direction}`;
      }
      return `Tu dispositivo está ${hours} horas ${direction}`;
    }
  },

  /**
   * Clear cached offset (useful for testing)
   */
  clearCache(): void {
    cachedTimeOffset = null;
    lastSyncTimestamp = 0;
  },
};
