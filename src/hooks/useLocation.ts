/**
 * useLocation Hook
 *
 * Hook for capturing GPS location for attendance records.
 * Works even without internet connection (GPS is independent).
 */

import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';

/**
 * Location coordinates
 */
export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

/**
 * Location services status
 */
export interface LocationServicesStatus {
  isEnabled: boolean; // GPS/Location services enabled
  hasPermission: boolean; // App has permission
  isReady: boolean; // Both enabled and has permission
}

/**
 * Location hook result
 */
export interface UseLocationResult {
  location: LocationCoords | null;
  isLoading: boolean;
  error: string | null;
  hasPermission: boolean;
  servicesStatus: LocationServicesStatus;
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<LocationCoords | null>;
  clearLocation: () => void;
  checkServicesStatus: () => Promise<LocationServicesStatus>;
}

/**
 * useLocation Hook
 *
 * Manages GPS location capture and permissions.
 */
export const useLocation = (): UseLocationResult => {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [servicesStatus, setServicesStatus] = useState<LocationServicesStatus>({
    isEnabled: false,
    hasPermission: false,
    isReady: false,
  });

  /**
   * Check permission and services status on mount
   */
  useEffect(() => {
    checkPermission();
    checkServicesStatus();
  }, []);

  /**
   * Check if location permission is granted
   */
  const checkPermission = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      const granted = status === 'granted';
      setHasPermission(granted);

      if (granted) {
        // Also check if location services are enabled
        const isEnabled = await Location.hasServicesEnabledAsync();
        if (!isEnabled) {
          console.warn('[useLocation] Location services are disabled');
          setError('Los servicios de ubicación están desactivados');
        }
      }

      return granted;
    } catch (err) {
      console.error('[useLocation] Check permission error:', err);
      setHasPermission(false);
      return false;
    }
  };

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[useLocation] Requesting permission...');

      // First check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        const errorMsg = 'Los servicios de ubicación están desactivados en el dispositivo';
        setError(errorMsg);
        console.error('[useLocation]', errorMsg);

        Alert.alert(
          'GPS desactivado',
          'Por favor, activa el GPS en la configuración de tu dispositivo para poder registrar tu ubicación.',
          [{ text: 'Entendido' }]
        );

        return false;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        setHasPermission(true);
        setError(null);
        console.log('[useLocation] Permission granted');
        return true;
      } else {
        setHasPermission(false);
        const errorMsg = 'Se requiere permiso de ubicación para marcar asistencia';
        setError(errorMsg);
        console.log('[useLocation] Permission denied, status:', status);

        // Show alert to user
        Alert.alert(
          'Permiso requerido',
          'Esta app necesita acceso a tu ubicación para registrar tus marcajes.\n\nPor favor, ve a Configuración > Aplicaciones > Control Horario > Permisos y habilita "Ubicación".',
          [
            { text: 'Entendido' }
          ]
        );

        return false;
      }
    } catch (err) {
      console.error('[useLocation] Request permission error:', err);
      setError('Error al solicitar permisos de ubicación');
      setHasPermission(false);
      return false;
    }
  }, []);

  /**
   * Get current GPS location
   *
   * This works OFFLINE because GPS doesn't require internet.
   * Only requires GPS satellites (or WiFi/cell tower triangulation).
   */
  const getCurrentLocation = useCallback(async (): Promise<LocationCoords | null> => {
    try {
      console.log('[useLocation] Getting current location...');
      setIsLoading(true);
      setError(null);

      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        setError('GPS desactivado');
        setIsLoading(false);

        Alert.alert(
          'GPS desactivado',
          'Por favor, activa el GPS en la configuración de tu dispositivo.',
          [{ text: 'Entendido' }]
        );

        return null;
      }

      // Check permission first
      const { status } = await Location.getForegroundPermissionsAsync();
      const hasPermissionNow = status === 'granted';

      if (!hasPermissionNow) {
        console.log('[useLocation] Permission not granted, requesting...');
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          return null;
        }
      }

      console.log('[useLocation] Fetching GPS coordinates...');

      // Get current position with increased timeout
      // This works even without internet connection!
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // Balance between accuracy and speed
        timeInterval: 10000, // Max time to wait (10 seconds)
        distanceInterval: 0, // Always get new location
      });

      const coords: LocationCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? undefined,
        timestamp: position.timestamp,
      };

      console.log('[useLocation] Location obtained successfully:', {
        lat: coords.latitude.toFixed(6),
        lon: coords.longitude.toFixed(6),
        accuracy: coords.accuracy?.toFixed(2) + 'm'
      });

      setLocation(coords);
      setIsLoading(false);

      return coords;
    } catch (err) {
      console.error('[useLocation] Get location error:', err);

      const errorMessage =
        err instanceof Error
          ? err.message.includes('timed out')
            ? 'No se pudo obtener la ubicación. El GPS está tardando mucho. Intenta nuevamente.'
            : err.message.includes('unavailable')
            ? 'Ubicación no disponible. Verifica que el GPS esté activado.'
            : `Error al obtener ubicación: ${err.message}`
          : 'Error al obtener ubicación';

      setError(errorMessage);
      setIsLoading(false);

      // Show user-friendly error
      Alert.alert(
        'Error de ubicación',
        errorMessage + '\n\nAsegúrate de que:\n• El GPS esté activado\n• La app tenga permisos de ubicación\n• Estés en un lugar con buena señal GPS',
        [{ text: 'Entendido' }]
      );

      return null;
    }
  }, [requestPermission]);

  /**
   * Check location services status
   * Detects if GPS is enabled and if app has permission
   */
  const checkServicesStatus = useCallback(async (): Promise<LocationServicesStatus> => {
    try {
      const [isEnabled, { status }] = await Promise.all([
        Location.hasServicesEnabledAsync(),
        Location.getForegroundPermissionsAsync(),
      ]);

      const hasPermissionNow = status === 'granted';
      const isReady = isEnabled && hasPermissionNow;

      const statusResult: LocationServicesStatus = {
        isEnabled,
        hasPermission: hasPermissionNow,
        isReady,
      };

      setServicesStatus(statusResult);

      console.log('[useLocation] Services status:', {
        gpsEnabled: isEnabled,
        hasPermission: hasPermissionNow,
        ready: isReady,
      });

      return statusResult;
    } catch (err) {
      console.error('[useLocation] Check services status error:', err);

      const errorStatus: LocationServicesStatus = {
        isEnabled: false,
        hasPermission: false,
        isReady: false,
      };

      setServicesStatus(errorStatus);
      return errorStatus;
    }
  }, []);

  /**
   * Clear current location
   */
  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
  }, []);

  return {
    location,
    isLoading,
    error,
    hasPermission,
    servicesStatus,
    requestPermission,
    getCurrentLocation,
    clearLocation,
    checkServicesStatus,
  };
};
