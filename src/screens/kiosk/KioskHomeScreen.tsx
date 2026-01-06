/**
 * Kiosk Home Screen
 *
 * Simplified home screen for kiosk mode.
 * Allows clock in/out with automatic logout after successful attendance.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useLocation } from '@hooks/useLocation';
import { attendanceService } from '@services/attendance';
import { CameraCapture } from '@components/Camera/CameraCapture';
import { LocationStatusBanner } from '@components/LocationStatusBanner';
import { Button } from '@components/ui/Button';
import type { AttendanceType } from '@services/storage';
import { COLORS, SPACING, FONT_SIZES } from '@/constants/theme';

const AUTO_LOGOUT_DELAY = 3000; // 3 seconds

export const KioskHomeScreen: React.FC = () => {
  const { kioskUser, logoutKiosk } = useAuthStore();
  const {
    getCurrentLocation,
    servicesStatus,
    requestPermission,
  } = useLocation();

  // State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCamera, setShowCamera] = useState(false);
  const [selectedType, setSelectedType] = useState<AttendanceType | null>(null);
  const [canClockIn, setCanClockIn] = useState(true);
  const [canClockOut, setCanClockOut] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingType, setProcessingType] = useState<AttendanceType | null>(null);

  const userFullName = kioskUser
    ? `${kioskUser.nombre}${kioskUser.apellido ? ' ' + kioskUser.apellido : ''}`
    : '';

  /**
   * Update clock every second
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Load attendance status
   */
  useEffect(() => {
    if (kioskUser?.user_id) {
      loadAttendanceStatus();
    }
  }, [kioskUser]);

  /**
   * Load today's attendance status from Supabase (cloud)
   * This ensures kiosk mode sees attendance from ANY device
   */
  const loadAttendanceStatus = async () => {
    if (!kioskUser?.cedula) return;

    try {
      setIsLoading(true);

      console.log('[KioskHomeScreen] Loading attendance status from cloud for:', kioskUser.cedula);

      // Query Supabase (cloud) to get status across all devices
      const [canIn, canOut] = await Promise.all([
        attendanceService.canClockInFromCloud(kioskUser.cedula),
        attendanceService.canClockOutFromCloud(kioskUser.cedula),
      ]);

      console.log('[KioskHomeScreen] Cloud status:', { canIn, canOut });

      setCanClockIn(canIn);
      setCanClockOut(canOut);
    } catch (error) {
      console.error('[KioskHomeScreen] Load attendance status error:', error);
      // On error, default to allowing clock in
      setCanClockIn(true);
      setCanClockOut(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle clock in button
   */
  const handleClockIn = () => {
    if (!canClockIn || isProcessing) {
      Alert.alert('No disponible', 'Ya has marcado tu entrada');
      return;
    }

    setSelectedType('clock_in');
    setShowCamera(true);
  };

  /**
   * Handle clock out button
   */
  const handleClockOut = () => {
    if (!canClockOut || isProcessing) {
      Alert.alert('No disponible', 'Debes marcar tu entrada primero');
      return;
    }

    setSelectedType('clock_out');
    setShowCamera(true);
  };

  /**
   * Handle photo capture
   */
  const handlePhotoCapture = async (photoUri: string, photoBase64: string) => {
    if (!kioskUser || !selectedType) {
      Alert.alert('Error', 'Información de usuario incompleta');
      return;
    }

    // Close camera and show processing
    setShowCamera(false);
    setProcessingType(selectedType);
    setIsProcessing(true);

    try {
      // Get location
      const locationData = await getCurrentLocation();

      if (!locationData) {
        // Ask user if they want to continue without location
        Alert.alert(
          'Ubicación no disponible',
          '¿Deseas continuar sin ubicación?',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => {
                setSelectedType(null);
                setProcessingType(null);
                setIsProcessing(false);
              },
            },
            {
              text: 'Continuar',
              onPress: () => processAttendance(photoUri, photoBase64, null),
            },
          ]
        );
        return;
      }

      // Process with location
      await processAttendance(photoUri, photoBase64, locationData);
    } catch (error) {
      console.error('[KioskHomeScreen] Photo capture error:', error);
      Alert.alert('Error', 'Error al procesar marcaje');
      setSelectedType(null);
      setProcessingType(null);
      setIsProcessing(false);
    }
  };

  /**
   * Process attendance with location
   */
  const processAttendance = async (
    photoUri: string,
    photoBase64: string,
    locationData: { latitude: number; longitude: number } | null
  ) => {
    if (!kioskUser || !selectedType) {
      Alert.alert('Error', 'Información de usuario incompleta');
      setProcessingType(null);
      setIsProcessing(false);
      return;
    }

    try {
      // Clock in or out
      const result =
        selectedType === 'clock_in'
          ? await attendanceService.clockIn(
              kioskUser.user_id,
              kioskUser.cedula,
              userFullName,
              photoUri,
              photoBase64,
              undefined,
              locationData ?? undefined
            )
          : await attendanceService.clockOut(
              kioskUser.user_id,
              kioskUser.cedula,
              userFullName,
              photoUri,
              photoBase64,
              undefined,
              locationData ?? undefined
            );

      if (result.success) {
        const typeText = selectedType === 'clock_in' ? 'Entrada' : 'Salida';
        const locationText = locationData
          ? '\n📍 Ubicación registrada'
          : '\n⚠️ Sin ubicación';

        Alert.alert(
          'Éxito',
          `${typeText} registrada correctamente${locationText}\n\nCerrando sesión...`,
          [
            {
              text: 'OK',
              onPress: () => handleAutoLogout(),
            },
          ]
        );

        // Auto-logout after delay
        setTimeout(handleAutoLogout, AUTO_LOGOUT_DELAY);
      } else {
        Alert.alert('Error', result.error || 'Error al registrar marcaje');
        setSelectedType(null);
        setProcessingType(null);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('[KioskHomeScreen] Process attendance error:', error);
      Alert.alert('Error', 'Error al procesar marcaje');
      setSelectedType(null);
      setProcessingType(null);
      setIsProcessing(false);
    }
  };

  /**
   * Handle auto-logout
   */
  const handleAutoLogout = () => {
    logoutKiosk();
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    Alert.alert(
      'Cancelar',
      '¿Deseas salir sin marcar asistencia?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí', onPress: logoutKiosk },
      ]
    );
  };

  /**
   * Format time
   */
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  /**
   * Format date
   */
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Location Status Banner */}
      <LocationStatusBanner
        servicesStatus={servicesStatus}
        onRequestPermission={requestPermission}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        scrollEnabled={!isProcessing}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola,</Text>
          <Text style={styles.userName}>{userFullName}</Text>
          <Text style={styles.kioskBadge}>Modo Kiosco</Text>
        </View>

        {/* Clock Section */}
        <View style={styles.clockSection}>
          {/* Current Time */}
          <View style={styles.clockTime}>
            <Text style={styles.currentTime}>{formatTime(currentTime)}</Text>
            <Text style={styles.currentDate}>{formatDate(currentTime)}</Text>
          </View>

          {/* Clock Buttons */}
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <View style={styles.buttonsContainer}>
              <Button
                title="Marcar Entrada"
                onPress={handleClockIn}
                disabled={!canClockIn || isProcessing}
                variant="clockIn"
                style={styles.clockButton}
              />
              <Button
                title="Marcar Salida"
                onPress={handleClockOut}
                disabled={!canClockOut || isProcessing}
                variant="clockOut"
                style={styles.clockButton}
              />
            </View>
          )}

          {/* Status */}
          <View style={styles.statusSection}>
            <Text style={styles.statusTitle}>Estado actual:</Text>
            <Text style={styles.statusText}>
              {canClockOut
                ? '✓ Entrada registrada'
                : canClockIn
                ? 'Pendiente de entrada'
                : 'Salida registrada'}
            </Text>
          </View>
        </View>

        {/* Cancel Button */}
        <Button
          title="Cancelar"
          onPress={handleCancel}
          variant="ghost"
          disabled={isProcessing}
          style={styles.cancelButton}
        />
      </ScrollView>

      {/* Camera Modal */}
      <CameraCapture
        visible={showCamera}
        onClose={() => {
          setShowCamera(false);
          setSelectedType(null);
        }}
        onCapture={handlePhotoCapture}
        title={selectedType === 'clock_in' ? 'Foto de Entrada' : 'Foto de Salida'}
      />

      {/* Processing Overlay */}
      <Modal visible={isProcessing} transparent animationType="fade" statusBarTranslucent>
        <View style={processingStyles.overlay}>
          <View style={processingStyles.container}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={processingStyles.text}>
              {processingType === 'clock_in' ? 'Registrando entrada...' : 'Registrando salida...'}
            </Text>
            <Text style={processingStyles.subtext}>Por favor espera</Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  greeting: {
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  kioskBadge: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    borderRadius: 12,
  },
  clockSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  clockTime: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  currentTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  currentDate: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textTransform: 'capitalize',
  },
  buttonsContainer: {
    width: '100%',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  clockButton: {
    minHeight: 56,
  },
  statusSection: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    width: '100%',
  },
  statusTitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  statusText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  cancelButton: {
    marginTop: SPACING.md,
  },
});

// Processing overlay styles
const processingStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  subtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
