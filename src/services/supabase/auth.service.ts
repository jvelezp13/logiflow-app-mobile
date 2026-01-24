/**
 * Authentication Service
 *
 * Handles all authentication operations with Supabase.
 * Includes login, logout, session management, and user profile fetching.
 */

import { supabase } from './client';
import type { Database } from './types';

type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Authentication result type
 */
export type AuthResult = {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    profile: Profile;
    cedula?: string;
    tenantId?: string; // Multi-tenant
  };
};

/**
 * User data type
 */
export type UserData = {
  id: string;
  email: string;
  profile: Profile;
  cedula?: string; // Shortcut accessor for profile.cedula
  tenantId?: string; // Multi-tenant: ID del tenant al que pertenece el usuario
};

/**
 * Sign in with email and password
 *
 * @param email - User email
 * @param password - User password
 * @returns AuthResult with user data or error
 */
export const signIn = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  try {
    // Validate inputs
    if (!email || !password) {
      return {
        success: false,
        error: 'Email y contraseña son requeridos',
      };
    }

    // Attempt sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      // Handle specific Supabase errors
      if (error.message.includes('Invalid login credentials')) {
        return {
          success: false,
          error: 'Email o contraseña incorrectos',
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Error al iniciar sesión',
      };
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.log('[Auth] Profile error:', profileError);
      return {
        success: false,
        error: 'Error al cargar perfil de usuario',
      };
    }

    // Debug: Log profile data
    console.log('[Auth] Profile loaded:', {
      id: profile.id,
      user_id: profile.user_id,
      nombre: profile.nombre,
      cedula: profile.cedula,
      cedulaType: typeof profile.cedula,
      cedulaLength: profile.cedula?.length,
      activo: profile.activo,
    });

    // Check if user is active
    if (!profile.activo) {
      await signOut(); // Sign out inactive user
      return {
        success: false,
        error: 'Usuario inactivo. Contacte al administrador.',
      };
    }

    // Validate cedula exists (required for attendance)
    if (!profile.cedula) {
      await signOut();
      return {
        success: false,
        error: 'Usuario sin cédula asignada. Contacte al administrador.',
      };
    }

    // Validate tenant_id exists (required for multi-tenant)
    if (!profile.tenant_id) {
      await signOut();
      return {
        success: false,
        error: 'Usuario sin empresa asignada. Contacte al administrador.',
      };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email!,
        profile,
        cedula: profile.cedula || undefined,
        tenantId: profile.tenant_id || undefined,
      },
    };
  } catch (error) {
    console.error('[Auth] Sign in error:', error);
    return {
      success: false,
      error: 'Error de conexión. Intente nuevamente.',
    };
  }
};

/**
 * Sign out current user
 *
 * @returns Promise<void>
 */
export const signOut = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[Auth] Sign out error:', error);
    }
  } catch (error) {
    console.error('[Auth] Sign out error:', error);
  }
};

/**
 * Get current session
 *
 * @returns Current session or null
 */
export const getCurrentSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[Auth] Get session error:', error);
      return null;
    }
    return data.session;
  } catch (error) {
    console.error('[Auth] Get session error:', error);
    return null;
  }
};

/**
 * Get current user with profile
 *
 * @returns UserData or null
 */
export const getCurrentUser = async (): Promise<UserData | null> => {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return null;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single<Profile>();

    if (error || !profile) {
      console.error('[Auth] Get profile error:', error);
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email!,
      profile,
      cedula: profile.cedula || undefined,
      tenantId: profile.tenant_id || undefined,
    };
  } catch (error) {
    console.error('[Auth] Get current user error:', error);
    return null;
  }
};

/**
 * Check if user is authenticated
 *
 * @returns boolean
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getCurrentSession();
  return !!session?.user;
};
