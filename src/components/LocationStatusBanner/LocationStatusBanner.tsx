/**
 * LocationStatusBanner Component
 *
 * Shows a warning banner when:
 * - GPS/Location services are disabled
 * - App doesn't have location permission
 * - Device is in airplane mode (detected via network status)
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type { LocationServicesStatus } from '@hooks/useLocation';
import { styles } from './LocationStatusBanner.styles';

interface LocationStatusBannerProps {
  servicesStatus: LocationServicesStatus;
  onRequestPermission?: () => void;
}

export const LocationStatusBanner: React.FC<LocationStatusBannerProps> = ({
  servicesStatus,
  onRequestPermission,
}) => {
  const [isOffline, setIsOffline] = useState(false);

  /**
   * Monitor network connectivity
   */
  useEffect(() => {
    // Subscribe to network state
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected || !state.isInternetReachable;
      setIsOffline(offline);

      if (offline) {
        console.log('[LocationStatus] Device is offline');
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Show detailed info about location requirements
   */
  const showLocationInfo = () => {
    Alert.alert(
      '📍 Ubicación requerida',
      'Esta app necesita tu ubicación para:\n\n' +
        '• Registrar dónde marcas entrada/salida\n' +
        '• Cumplir con políticas de la empresa\n' +
        '• Verificar asistencia en el lugar correcto\n\n' +
        '💡 Nota: El GPS funciona sin internet, solo necesita satélites.',
      [{ text: 'Entendido' }]
    );
  };

  /**
   * Show offline info
   */
  const showOfflineInfo = () => {
    Alert.alert(
      '📡 Sin conexión',
      'No tienes conexión a internet en este momento.\n\n' +
        '💡 Puedes seguir marcando entrada y salida normalmente. ' +
        'Tus marcajes se guardarán localmente y se sincronizarán automáticamente cuando recuperes conexión.',
      [{ text: 'Entendido' }]
    );
  };

  // Don't show anything if everything is ready
  if (servicesStatus.isReady && !isOffline) {
    return null;
  }

  // Priority 1: GPS disabled
  if (!servicesStatus.isEnabled) {
    return (
      <View style={[styles.banner, styles.bannerError]}>
        <Text style={styles.icon}>📍</Text>
        <View style={styles.content}>
          <Text style={styles.title}>GPS desactivado</Text>
          <Text style={styles.message}>
            Activa el GPS para registrar tu ubicación
          </Text>
        </View>
        <TouchableOpacity onPress={showLocationInfo} style={styles.button}>
          <Text style={styles.buttonText}>ℹ️</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Priority 2: No permission
  if (!servicesStatus.hasPermission) {
    return (
      <View style={[styles.banner, styles.bannerWarning]}>
        <Text style={styles.icon}>⚠️</Text>
        <View style={styles.content}>
          <Text style={styles.title}>Permiso requerido</Text>
          <Text style={styles.message}>
            Necesitas conceder permiso de ubicación
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (onRequestPermission) {
              onRequestPermission();
            } else {
              showLocationInfo();
            }
          }}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Activar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Priority 3: Offline (info only, not blocking)
  if (isOffline) {
    return (
      <View style={[styles.banner, styles.bannerInfo]}>
        <Text style={styles.icon}>📡</Text>
        <View style={styles.content}>
          <Text style={styles.title}>Sin conexión</Text>
          <Text style={styles.message}>
            Tus marcajes se guardan localmente
          </Text>
        </View>
        <TouchableOpacity onPress={showOfflineInfo} style={styles.button}>
          <Text style={styles.buttonText}>ℹ️</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};
