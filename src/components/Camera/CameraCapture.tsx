/**
 * CameraCapture Component
 *
 * Modal component for capturing photos with camera or picking from gallery.
 * Includes image compression and preview.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCamera } from '@hooks/useCamera';
import { compressImage } from '@utils/imageUtils';
import { Button } from '@components/ui/Button';
import { styles } from './CameraCapture.styles';

export type CameraCaptureProps = {
  visible: boolean;
  onClose: () => void;
  onCapture: (photoUri: string, photoBase64: string) => void;
  title?: string;
};

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  visible,
  onClose,
  onCapture,
  title = 'Tomar Foto',
}) => {
  const { takePhoto, hasPermission, requestPermission } = useCamera();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Handle take photo action
   */
  const handleTakePhoto = async () => {
    try {
      setIsProcessing(true);

      // Take photo
      const uri = await takePhoto();

      if (uri) {
        setPhotoUri(uri);
      }
    } catch (error) {
      console.error('[CameraCapture] Take photo error:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle confirm photo
   */
  const handleConfirm = async () => {
    if (!photoUri) return;

    try {
      setIsProcessing(true);

      // Compress image
      const { base64 } = await compressImage(photoUri);

      if (!base64) {
        throw new Error('Error al procesar imagen');
      }

      // Call onCapture callback
      onCapture(photoUri, base64);

      // Reset and close
      setPhotoUri(null);
      onClose();
    } catch (error) {
      console.error('[CameraCapture] Confirm error:', error);
      Alert.alert('Error', 'No se pudo procesar la imagen');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle retake photo
   */
  const handleRetake = () => {
    setPhotoUri(null);
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    setPhotoUri(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {photoUri ? (
            /* Photo Preview */
            <>
              <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="contain" />

              <View style={styles.previewActions}>
                <Button
                  title="Reintentar"
                  onPress={handleRetake}
                  variant="outline"
                  disabled={isProcessing}
                  style={styles.actionButton}
                />
                <Button
                  title="Confirmar"
                  onPress={handleConfirm}
                  loading={isProcessing}
                  disabled={isProcessing}
                  style={styles.actionButton}
                />
              </View>
            </>
          ) : (
            /* Camera Options */
            <>
              <View style={styles.placeholder}>
                <Text style={styles.placeholderIcon}>📸</Text>
                <Text style={styles.placeholderText}>
                  Toma una foto para registrar tu asistencia
                </Text>
              </View>

              <View style={styles.actions}>
                <Button
                  title="Obtener Foto"
                  onPress={handleTakePhoto}
                  loading={isProcessing}
                  disabled={isProcessing}
                  style={styles.actionButton}
                />
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};
