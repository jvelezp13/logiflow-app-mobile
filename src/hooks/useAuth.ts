/**
 * useAuth Hook
 *
 * Convenient hook to access auth state and actions.
 * Wraps the Zustand store for easier consumption.
 */

import { useAuthStore } from '@store/authStore';

/**
 * Auth hook return type
 */
import type { UserData } from '@services/supabase/auth.service';

export type UseAuthReturn = {
  // State
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;

  // User data helpers
  userId: string | null;
  userEmail: string | null;
  userCedula: string | null;
  userFullName: string;
};

/**
 * Hook to access authentication state and actions
 *
 * @returns UseAuthReturn
 *
 * @example
 * const { login, isLoading, error } = useAuth();
 *
 * const handleLogin = async () => {
 *   const success = await login(email, password);
 *   if (success) {
 *     // Navigate to main screen
 *   }
 * };
 */
export const useAuth = (): UseAuthReturn => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const clearError = useAuthStore((state) => state.clearError);

  // Derived values
  const userId = user?.id || null;
  const userEmail = user?.email || null;
  const userCedula = user?.profile.cedula || null;
  const userFullName = user?.profile
    ? `${user.profile.nombre}${user.profile.apellido ? ' ' + user.profile.apellido : ''}`
    : '';

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitializing,
    error,
    login,
    logout,
    clearError,
    userId,
    userEmail,
    userCedula,
    userFullName,
  };
};
