/**
 * Authentication Store
 *
 * Global state management for authentication using Zustand.
 * Handles login, logout, session persistence, and user data.
 * Supports kiosk mode for PIN-based authentication.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthService from '@services/supabase/auth.service';
import * as PinAuthService from '@services/auth/pinAuth.service';
import type { UserData } from '@services/supabase/auth.service';
import type { PinUserData } from '@services/auth/pinAuth.service';
import { STORAGE_KEYS } from '@constants/config';

/**
 * Kiosk mode storage key
 */
const KIOSK_MODE_KEY = 'kiosk_mode_enabled';

/**
 * Auth store state
 */
type AuthState = {
  // Normal Auth State
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  // Kiosk Mode State
  kioskMode: boolean;
  kioskUser: PinUserData | null;
  isKioskAuthenticated: boolean;
  kioskPin: string | null; // Temporary PIN (in-memory only, for photo uploads)

  // Normal Auth Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  clearError: () => void;

  // Kiosk Mode Actions
  enableKioskMode: () => Promise<void>;
  disableKioskMode: () => Promise<void>;
  loginWithPin: (pin: string) => Promise<boolean>;
  logoutKiosk: () => void;
};

/**
 * Auth store
 */
export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,
  error: null,

  // Kiosk initial state
  kioskMode: false,
  kioskUser: null,
  isKioskAuthenticated: false,
  kioskPin: null,

  /**
   * Initialize auth state from persisted session
   * Called on app startup
   *
   * OFFLINE SUPPORT: If offline, uses cached user data from AsyncStorage
   * to allow employees to continue working without internet connection.
   */
  initialize: async () => {
    try {
      set({ isInitializing: true });

      // Check if kiosk mode is enabled
      const kioskModeEnabled = await AsyncStorage.getItem(KIOSK_MODE_KEY);
      const isKioskMode = kioskModeEnabled === 'true';

      if (isKioskMode) {
        // Kiosk mode - no persistent session
        console.log('[AuthStore] Kiosk mode enabled');
        set({
          kioskMode: true,
          user: null,
          isAuthenticated: false,
          isInitializing: false,
        });
        return;
      }

      // First, get cached user data from AsyncStorage
      const cachedUserData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      const cachedUser: UserData | null = cachedUserData
        ? JSON.parse(cachedUserData)
        : null;

      // Check network connectivity first
      const NetInfo = await import('@react-native-community/netinfo');
      const netState = await NetInfo.default.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable;

      if (!isOnline) {
        // OFFLINE MODE: Use cached data if available
        console.log('[AuthStore] Device is offline, checking cache...');

        if (cachedUser) {
          console.log('[AuthStore] Using cached session for offline mode');
          set({
            user: cachedUser,
            isAuthenticated: true,
            kioskMode: false,
            isInitializing: false,
          });
        } else {
          console.log('[AuthStore] Offline and no cached session, login required when online');
          set({
            user: null,
            isAuthenticated: false,
            kioskMode: false,
            isInitializing: false,
          });
        }
        return;
      }

      // ONLINE MODE: Validate session with Supabase
      console.log('[AuthStore] Device is online, validating session...');
      const user = await AuthService.getCurrentUser();

      if (user) {
        // User has valid session - update cache
        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
        set({
          user,
          isAuthenticated: true,
          kioskMode: false,
          isInitializing: false,
        });
        console.log('[AuthStore] Session validated online');
      } else {
        // No valid session from Supabase - clear cache
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
        set({
          user: null,
          isAuthenticated: false,
          kioskMode: false,
          isInitializing: false,
        });
        console.log('[AuthStore] No valid session');
      }
    } catch (error) {
      console.error('[AuthStore] Initialize error:', error);

      // On any error: try to use cached data as fallback
      try {
        const cachedUserData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (cachedUserData) {
          const cachedUser: UserData = JSON.parse(cachedUserData);
          console.log('[AuthStore] Recovered session from cache after error');
          set({
            user: cachedUser,
            isAuthenticated: true,
            kioskMode: false,
            isInitializing: false,
          });
          return;
        }
      } catch {
        // Ignore cache read errors
      }

      set({
        user: null,
        isAuthenticated: false,
        kioskMode: false,
        isInitializing: false,
      });
    }
  },

  /**
   * Login with email and password
   *
   * @param email - User email
   * @param password - User password
   * @returns Success boolean
   */
  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const result = await AuthService.signIn(email, password);

      if (result.success && result.user) {
        // Save user data to AsyncStorage
        await AsyncStorage.setItem(
          STORAGE_KEYS.USER_DATA,
          JSON.stringify(result.user)
        );

        set({
          user: result.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        return true;
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: result.error || 'Error al iniciar sesión',
        });

        return false;
      }
    } catch (error) {
      console.error('[AuthStore] Login error:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Error de conexión',
      });

      return false;
    }
  },

  /**
   * Logout current user
   */
  logout: async () => {
    try {
      set({ isLoading: true });

      // Sign out from Supabase
      await AuthService.signOut();

      // Clear AsyncStorage
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);

      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('[AuthStore] Logout error:', error);
      // Force logout even on error
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Enable kiosk mode
   * Logs out current user and switches to kiosk mode
   */
  enableKioskMode: async () => {
    try {
      console.log('[AuthStore] Enabling kiosk mode');

      // Logout current user if authenticated
      if (get().isAuthenticated) {
        await AuthService.signOut();
        await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
        await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      }

      // Enable kiosk mode
      await AsyncStorage.setItem(KIOSK_MODE_KEY, 'true');

      set({
        kioskMode: true,
        user: null,
        isAuthenticated: false,
        kioskUser: null,
        isKioskAuthenticated: false,
        kioskPin: null,
        error: null,
      });

      console.log('[AuthStore] Kiosk mode enabled');
    } catch (error) {
      console.error('[AuthStore] Error enabling kiosk mode:', error);
      set({ error: 'Error al activar modo kiosco' });
    }
  },

  /**
   * Disable kiosk mode
   * Returns to normal authentication mode
   */
  disableKioskMode: async () => {
    try {
      console.log('[AuthStore] Disabling kiosk mode');

      // Remove kiosk mode flag
      await AsyncStorage.removeItem(KIOSK_MODE_KEY);

      // Clear kiosk user
      set({
        kioskMode: false,
        kioskUser: null,
        isKioskAuthenticated: false,
        kioskPin: null,
        error: null,
      });

      console.log('[AuthStore] Kiosk mode disabled');
    } catch (error) {
      console.error('[AuthStore] Error disabling kiosk mode:', error);
      set({ error: 'Error al desactivar modo kiosco' });
    }
  },

  /**
   * Login with PIN (kiosk mode)
   *
   * @param pin - 4-digit PIN code
   * @returns Success boolean
   */
  loginWithPin: async (pin: string) => {
    try {
      set({ isLoading: true, error: null });

      console.log('[AuthStore] Logging in with PIN');

      const result = await PinAuthService.authenticateWithPin(pin);

      if (result.success && result.user) {
        // Set kiosk user (temporary, not persisted)
        // Store PIN temporarily in memory for Edge Function authentication
        set({
          kioskUser: result.user,
          isKioskAuthenticated: true,
          kioskPin: pin, // Store PIN in memory for photo uploads
          isLoading: false,
          error: null,
        });

        console.log('[AuthStore] PIN login successful');
        return true;
      } else {
        set({
          kioskUser: null,
          isKioskAuthenticated: false,
          kioskPin: null,
          isLoading: false,
          error: result.error || 'Error al iniciar sesión con PIN',
        });

        return false;
      }
    } catch (error) {
      console.error('[AuthStore] PIN login error:', error);
      set({
        kioskUser: null,
        isKioskAuthenticated: false,
        kioskPin: null,
        isLoading: false,
        error: 'Error de conexión',
      });

      return false;
    }
  },

  /**
   * Logout kiosk user
   * Clears temporary kiosk user data
   */
  logoutKiosk: () => {
    console.log('[AuthStore] Logging out kiosk user');
    set({
      kioskUser: null,
      isKioskAuthenticated: false,
      kioskPin: null, // Clear PIN from memory
      error: null,
    });
  },
}));

/**
 * Hook to get user profile
 * Returns normal user or kiosk user profile
 */
export const useUserProfile = () => {
  const user = useAuthStore((state) => state.user);
  const kioskUser = useAuthStore((state) => state.kioskUser);
  const kioskMode = useAuthStore((state) => state.kioskMode);

  if (kioskMode && kioskUser) {
    // Return kiosk user as profile format
    return {
      nombre: kioskUser.nombre,
      apellido: kioskUser.apellido,
      cedula: kioskUser.cedula,
    };
  }

  return user?.profile || null;
};

/**
 * Hook to get user ID
 * Returns normal user ID or kiosk user ID
 */
export const useUserId = () => {
  const user = useAuthStore((state) => state.user);
  const kioskUser = useAuthStore((state) => state.kioskUser);
  const kioskMode = useAuthStore((state) => state.kioskMode);

  if (kioskMode && kioskUser) {
    return kioskUser.user_id;
  }

  return user?.id || null;
};

/**
 * Hook to get user cedula
 * Returns normal user or kiosk user cedula
 */
export const useUserCedula = () => {
  const user = useAuthStore((state) => state.user);
  const kioskUser = useAuthStore((state) => state.kioskUser);
  const kioskMode = useAuthStore((state) => state.kioskMode);

  if (kioskMode && kioskUser) {
    return kioskUser.cedula;
  }

  return user?.profile.cedula || null;
};

/**
 * Hook to get full user name
 * Returns normal user or kiosk user full name
 */
export const useUserFullName = () => {
  const user = useAuthStore((state) => state.user);
  const kioskUser = useAuthStore((state) => state.kioskUser);
  const kioskMode = useAuthStore((state) => state.kioskMode);

  if (kioskMode && kioskUser) {
    return `${kioskUser.nombre}${kioskUser.apellido ? ' ' + kioskUser.apellido : ''}`;
  }

  if (!user?.profile) return '';
  const { nombre, apellido } = user.profile;
  return `${nombre}${apellido ? ' ' + apellido : ''}`;
};
