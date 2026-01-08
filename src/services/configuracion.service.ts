/**
 * Configuracion Service
 *
 * Fetches role-based configuration from Supabase for special hours warnings.
 * Includes caching to avoid repeated queries.
 *
 * Used by:
 * - HomeScreen to calculate net hours (subtracting break time)
 * - Attendance service to show warnings on clock-in/out
 */

import { supabase } from './supabase/client';

/**
 * Configuration data from the `configuracion` table
 */
export type RoleConfig = {
  rol: string | null;
  maxHorasDia: number;
  minutosDescanso: number;
  horaInicioNocturno: string; // Format: "HH:MM:SS"
  horaFinNocturno: string; // Format: "HH:MM:SS"
};

/**
 * Default configuration when offline or no config found
 */
const DEFAULT_CONFIG: RoleConfig = {
  rol: null,
  maxHorasDia: 8,
  minutosDescanso: 60,
  horaInicioNocturno: '19:00:00',
  horaFinNocturno: '06:00:00',
};

// In-memory cache
let cachedConfig: RoleConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Supabase response types (not in generated types)
 */
type UserRoleRow = {
  role: string;
};

type ConfiguracionRow = {
  rol: string | null;
  max_horas_dia: string | number;
  minutos_descanso: number;
  hora_inicio_nocturno: string;
  hora_fin_nocturno: string;
};

/**
 * Get user's role from user_roles table
 */
async function getUserRole(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single() as { data: UserRoleRow | null; error: unknown };

    if (error || !data) {
      console.log('[ConfigService] No role found for user:', userId);
      return null;
    }

    return data.role;
  } catch (error) {
    console.error('[ConfigService] Error fetching user role:', error);
    return null;
  }
}

/**
 * Get configuration for a specific role
 * Falls back to global config (rol = null) if role-specific not found
 */
async function getConfigForRole(role: string | null): Promise<RoleConfig | null> {
  try {
    // First try role-specific config
    if (role) {
      const { data: roleData, error: roleError } = await supabase
        .from('configuracion')
        .select('rol, max_horas_dia, minutos_descanso, hora_inicio_nocturno, hora_fin_nocturno')
        .eq('rol', role)
        .eq('activo', true)
        .single() as { data: ConfiguracionRow | null; error: unknown };

      if (!roleError && roleData) {
        return {
          rol: roleData.rol,
          maxHorasDia: Number(roleData.max_horas_dia),
          minutosDescanso: roleData.minutos_descanso,
          horaInicioNocturno: roleData.hora_inicio_nocturno,
          horaFinNocturno: roleData.hora_fin_nocturno,
        };
      }
    }

    // Fall back to global config (rol = null)
    const { data: globalData, error: globalError } = await supabase
      .from('configuracion')
      .select('rol, max_horas_dia, minutos_descanso, hora_inicio_nocturno, hora_fin_nocturno')
      .is('rol', null)
      .eq('activo', true)
      .single() as { data: ConfiguracionRow | null; error: unknown };

    if (!globalError && globalData) {
      return {
        rol: globalData.rol,
        maxHorasDia: Number(globalData.max_horas_dia),
        minutosDescanso: globalData.minutos_descanso,
        horaInicioNocturno: globalData.hora_inicio_nocturno,
        horaFinNocturno: globalData.hora_fin_nocturno,
      };
    }

    return null;
  } catch (error) {
    console.error('[ConfigService] Error fetching config:', error);
    return null;
  }
}

/**
 * Get configuration for the current user
 * Uses cache when available and valid
 *
 * @param userId - User ID to fetch role and config for
 * @param forceRefresh - Force refresh from database
 * @returns Role configuration or defaults
 */
export async function getConfigForUser(
  userId: string,
  forceRefresh = false
): Promise<RoleConfig> {
  // Check cache
  const now = Date.now();
  if (!forceRefresh && cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    console.log('[ConfigService] Using cached config');
    return cachedConfig;
  }

  try {
    // Get user's role
    const role = await getUserRole(userId);
    console.log('[ConfigService] User role:', role);

    // Get config for that role
    const config = await getConfigForRole(role);

    if (config) {
      console.log('[ConfigService] Config fetched:', config);
      cachedConfig = config;
      cacheTimestamp = now;
      return config;
    }

    console.log('[ConfigService] No config found, using defaults');
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error('[ConfigService] Error:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * Clear the configuration cache
 * Call this on logout or when config might have changed
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
  console.log('[ConfigService] Cache cleared');
}

/**
 * Check if a given time is within nocturnal hours
 *
 * @param time - Time in HH:MM or HH:MM:SS format
 * @param config - Role configuration
 * @returns true if time is in nocturnal range
 */
export function isNocturnalHour(time: string, config: RoleConfig): boolean {
  // Extract hours and minutes from time strings
  const parseTime = (t: string): number => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const currentMinutes = parseTime(time);
  const startMinutes = parseTime(config.horaInicioNocturno);
  const endMinutes = parseTime(config.horaFinNocturno);

  // Nocturnal range wraps around midnight (e.g., 19:00 - 06:00)
  if (startMinutes > endMinutes) {
    // Check if current time is after start OR before end
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  // Normal range (doesn't wrap)
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if a decimal hour is within nocturnal hours
 *
 * @param decimalHour - Hour in decimal format (e.g., 19.5 for 7:30 PM)
 * @param config - Role configuration
 * @returns true if hour is in nocturnal range
 */
export function isNocturnalDecimalHour(decimalHour: number, config: RoleConfig): boolean {
  const hours = Math.floor(decimalHour);
  const minutes = Math.round((decimalHour - hours) * 60);
  const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  return isNocturnalHour(timeStr, config);
}

/**
 * Calculate net hours worked (subtracting break time)
 *
 * @param grossHours - Total hours worked
 * @param minutosDescanso - Break minutes to subtract
 * @returns Net hours worked
 */
export function calculateNetHours(grossHours: number, minutosDescanso: number): number {
  const breakHours = minutosDescanso / 60;
  const netHours = grossHours - breakHours;
  return Math.max(0, netHours); // Never return negative
}

/**
 * Check if hours exceed the maximum allowed
 *
 * @param netHours - Net hours worked
 * @param maxHorasDia - Maximum allowed hours
 * @returns Number of extra hours (0 if within limit)
 */
export function getExtraHours(netHours: number, maxHorasDia: number): number {
  const extraHours = netHours - maxHorasDia;
  return Math.max(0, extraHours);
}
