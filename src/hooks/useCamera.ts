/**
 * useCamera Hook
 *
 * Custom hook for camera operations including permissions and image capture.
 */

import { useState, useEffect } from 'react';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export type CameraPermissionStatus = 'undetermined' | 'granted' | 'denied';

/**
 * Hook return type
 */
export type UseCameraReturn = {
  // Permission state
  hasPermission: boolean;
  permissionStatus: CameraPermissionStatus;
  isRequestingPermission: boolean;

  // Actions
  requestPermission: () => Promise<boolean>;
  takePhoto: () => Promise<string | null>;
  pickFromGallery: () => Promise<string | null>;
};

/**
 * Hook to manage camera permissions and photo capture
 *
 * @returns UseCameraReturn
 *
 * @example
 * const { hasPermission, takePhoto, requestPermission } = useCamera();
 *
 * if (!hasPermission) {
 *   await requestPermission();
 * }
 *
 * const photoUri = await takePhoto();
 */
export const useCamera = (): UseCameraReturn => {
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<CameraPermissionStatus>('undetermined');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  /**
   * Check initial permission status
   */
  useEffect(() => {
    (async () => {
      const { status } = await Camera.getCameraPermissionsAsync();
      setPermissionStatus(status as CameraPermissionStatus);
      setHasPermission(status === 'granted');
    })();
  }, []);

  /**
   * Request camera permission
   *
   * @returns Promise<boolean> - True if permission granted
   */
  const requestPermission = async (): Promise<boolean> => {
    try {
      setIsRequestingPermission(true);

      const { status } = await Camera.requestCameraPermissionsAsync();
      setPermissionStatus(status as CameraPermissionStatus);
      setHasPermission(status === 'granted');

      if (status !== 'granted') {
        Alert.alert(
          'Permiso Requerido',
          'Necesitamos acceso a la cámara para tomar fotos de asistencia. Por favor habilita el permiso en Configuración.',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'Ir a Configuración',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  // On iOS, direct to app settings
                  Alert.alert(
                    'Instrucciones',
                    'Ve a Configuración > Control Horarios > Cámara y habilita el acceso.'
                  );
                }
              },
            },
          ]
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('[useCamera] Permission request error:', error);
      Alert.alert('Error', 'Error al solicitar permisos de cámara');
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  };

  /**
   * Take photo with camera
   *
   * @returns Promise<string | null> - Photo URI or null
   */
  const takePhoto = async (): Promise<string | null> => {
    try {
      // Check permission first
      if (!hasPermission) {
        const granted = await requestPermission();
        if (!granted) return null;
      }

      // Launch camera (front-facing for selfie attendance photos)
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        exif: false,
        cameraType: ImagePicker.CameraType.front,
      });

      if (result.canceled) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      console.error('[useCamera] Take photo error:', error);
      Alert.alert('Error', 'Error al tomar la foto. Intenta nuevamente.');
      return null;
    }
  };

  /**
   * Pick image from gallery (fallback)
   *
   * @returns Promise<string | null> - Image URI or null
   */
  const pickFromGallery = async (): Promise<string | null> => {
    try {
      // Request media library permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permiso Requerido',
          'Necesitamos acceso a tu galería para seleccionar fotos.'
        );
        return null;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
        exif: false,
      });

      if (result.canceled) {
        return null;
      }

      return result.assets[0].uri;
    } catch (error) {
      console.error('[useCamera] Pick from gallery error:', error);
      Alert.alert('Error', 'Error al seleccionar imagen');
      return null;
    }
  };

  return {
    hasPermission,
    permissionStatus,
    isRequestingPermission,
    requestPermission,
    takePhoto,
    pickFromGallery,
  };
};
