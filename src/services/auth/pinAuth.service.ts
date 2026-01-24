/**
 * PIN Authentication Service
 *
 * Provides PIN-based authentication for kiosk mode.
 * Does NOT create persistent sessions - authentication is temporary per transaction.
 */

import { supabase } from '@services/supabase/client';

/**
 * User data returned from PIN authentication
 */
export interface PinUserData {
  user_id: string;
  profile_id: string;
  cedula: string;
  nombre: string;
  apellido: string | null;
  email: string | null;
  tenant_id: string; // Multi-tenant: ID del tenant al que pertenece el usuario
}

/**
 * Authentication result
 */
export interface PinAuthResult {
  success: boolean;
  user?: PinUserData;
  error?: string;
}

/**
 * Authenticate user with PIN code
 *
 * @param pin - 4-digit PIN code
 * @returns Authentication result with user data if successful
 */
export async function authenticateWithPin(pin: string): Promise<PinAuthResult> {
  try {
    console.log('[PinAuthService] Attempting authentication with PIN');

    // Validate PIN format
    if (!pin || !/^\d{4}$/.test(pin)) {
      return {
        success: false,
        error: 'El PIN debe contener exactamente 4 dígitos',
      };
    }

    // Call RPC function to authenticate
    const { data, error } = await supabase.rpc('authenticate_with_pin', {
      pin_input: pin,
    } as never) as { data: PinUserData[] | null; error: { message: string } | null };

    if (error) {
      console.error('[PinAuthService] Authentication error:', error);

      // Handle specific errors
      if (error.message.includes('PIN incorrecto') || error.message.includes('usuario inactivo')) {
        return {
          success: false,
          error: 'PIN incorrecto o usuario inactivo',
        };
      }

      return {
        success: false,
        error: 'Error al autenticar con PIN',
      };
    }

    // Check if data was returned
    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'PIN incorrecto',
      };
    }

    // Extract user data (RPC returns array)
    const userData = data[0];

    // Validate required fields
    if (!userData.user_id || !userData.cedula) {
      console.error('[PinAuthService] Invalid user data:', userData);
      return {
        success: false,
        error: 'Datos de usuario incompletos',
      };
    }

    // Validate tenant_id (required for multi-tenant)
    if (!userData.tenant_id) {
      console.error('[PinAuthService] User without tenant_id:', userData.cedula);
      return {
        success: false,
        error: 'Usuario sin empresa asignada. Contacte al administrador.',
      };
    }

    console.log('[PinAuthService] Authentication successful for user:', userData.nombre);

    return {
      success: true,
      user: userData,
    };
  } catch (error) {
    console.error('[PinAuthService] Unexpected error:', error);
    return {
      success: false,
      error: 'Error de conexión. Verifica tu internet',
    };
  }
}

/**
 * Format user full name
 *
 * @param user - User data
 * @returns Full name
 */
export function getUserFullName(user: PinUserData): string {
  if (!user) return '';
  return `${user.nombre}${user.apellido ? ' ' + user.apellido : ''}`;
}

/**
 * Validate PIN format (client-side)
 *
 * @param pin - PIN to validate
 * @returns True if valid format
 */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}
