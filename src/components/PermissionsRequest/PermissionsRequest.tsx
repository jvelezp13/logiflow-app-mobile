/**
 * PermissionsRequest Component
 *
 * Requests location permissions when the app starts.
 * Ensures permissions are granted before user tries to clock in/out.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Button } from '@components/ui/Button';
import { styles } from './PermissionsRequest.styles';

interface PermissionsRequestProps {
  onPermissionsGranted: () => void;
}

export const PermissionsRequest: React.FC<PermissionsRequestProps> = ({
  onPermissionsGranted,
}) => {
  const [isChecking, setIsChecking] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    checkInitialPermissions();
  }, []);

  /**
   * Check if permissions are already granted
   */
  const checkInitialPermissions = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status === 'granted') {
        setHasPermission(true);
        setIsChecking(false);
        onPermissionsGranted();
      } else {
        setIsChecking(false);
        // Auto-request on first load
        setTimeout(() => {
          requestPermissions();
        }, 500);
      }
    } catch (error) {
      console.error('[PermissionsRequest] Check error:', error);
      setIsChecking(false);
    }
  };

  /**
   * Request location permissions
   */
  const requestPermissions = async () => {
    try {
      console.log('[PermissionsRequest] Requesting location permission...');

      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        Alert.alert(
          'GPS desactivado',
          'Por favor, activa el GPS en la configuración de tu dispositivo.',
          [
            {
              text: 'Reintentar',
              onPress: requestPermissions,
            },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
        return;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === 'granted') {
        console.log('[PermissionsRequest] Permission granted!');
        setHasPermission(true);
        setPermissionDenied(false);
        onPermissionsGranted();
      } else {
        console.log('[PermissionsRequest] Permission denied, status:', status);
        setPermissionDenied(true);

        Alert.alert(
          'Permiso requerido',
          'Esta app necesita acceso a tu ubicación para registrar tus marcajes.\n\n' +
            'Por favor, ve a:\nConfiguración > Aplicaciones > Control Horario > Permisos\n' +
            'Y habilita "Ubicación".',
          [
            {
              text: 'Reintentar',
              onPress: requestPermissions,
            },
            {
              text: 'Continuar sin ubicación',
              style: 'cancel',
              onPress: () => {
                setPermissionDenied(false);
                onPermissionsGranted();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('[PermissionsRequest] Request error:', error);

      Alert.alert(
        'Error',
        'Error al solicitar permisos. Por favor, intenta nuevamente.',
        [
          {
            text: 'Reintentar',
            onPress: requestPermissions,
          },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    }
  };

  // If checking, show loading
  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0066CC" />
        <Text style={styles.text}>Verificando permisos...</Text>
      </View>
    );
  }

  // If permission granted, don't show anything
  if (hasPermission) {
    return null;
  }

  // Show permission request UI
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>📍</Text>
        <Text style={styles.title}>Permiso de ubicación</Text>
        <Text style={styles.description}>
          Esta app necesita acceso a tu ubicación para registrar tus marcajes de entrada y
          salida.
        </Text>
        <Text style={styles.note}>
          📌 La ubicación se captura solo cuando marcas entrada/salida
        </Text>

        <Button
          title="Conceder permiso"
          onPress={requestPermissions}
          style={styles.button}
        />

        {permissionDenied && (
          <Button
            title="Continuar sin ubicación"
            onPress={() => {
              setPermissionDenied(false);
              onPermissionsGranted();
            }}
            variant="outline"
            style={styles.skipButton}
          />
        )}
      </View>
    </View>
  );
};
