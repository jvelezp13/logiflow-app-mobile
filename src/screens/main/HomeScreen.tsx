/**
 * HomeScreen
 *
 * Main screen for attendance clock in/out functionality.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@hooks/useAuth';
import { useLocation } from '@hooks/useLocation';
import { attendanceService } from '@services/attendance';
import { CameraCapture } from '@components/Camera/CameraCapture';
import { LocationStatusBanner } from '@components/LocationStatusBanner';
import { Button } from '@components/ui/Button';
import type { AttendanceRecord, AttendanceType } from '@services/storage';
import { styles } from './HomeScreen.styles';

export const HomeScreen: React.FC = () => {
  const { user, userFullName } = useAuth();
  const {
    getCurrentLocation,
    isLoading: isLocationLoading,
    hasPermission,
    servicesStatus,
    requestPermission,
    checkServicesStatus,
  } = useLocation();

  // State
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showCamera, setShowCamera] = useState(false);
  const [selectedType, setSelectedType] = useState<AttendanceType | null>(null);
  const [canClockIn, setCanClockIn] = useState(true);
  const [canClockOut, setCanClockOut] = useState(false);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Processing attendance record
  const [processingType, setProcessingType] = useState<AttendanceType | null>(null); // Type being processed

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
   * Load initial data when user is available
   */
  useEffect(() => {
    if (user?.id) {
      console.log('[HomeScreen] User available, loading data');
      loadData();
    }
  }, [user?.id]); // Re-run when user becomes available

  /**
   * Load today's records and check clock state
   */
  const loadData = async () => {
    if (!user?.id) {
      console.log('[HomeScreen] No user ID, skipping loadData');
      return;
    }

    try {
      console.log('[HomeScreen] Loading data for user:', user.id);
      setIsLoading(true);

      // Check what actions are available
      const [canIn, canOut, records, syncCount] = await Promise.all([
        attendanceService.canClockIn(user.id),
        attendanceService.canClockOut(user.id),
        attendanceService.getTodayRecords(user.id),
        attendanceService.getPendingSyncCount(),
      ]);

      console.log('[HomeScreen] Data loaded:', {
        canIn,
        canOut,
        recordsCount: records.length,
        records: records.map((r) => ({
          id: r.id,
          type: r.attendanceType,
          time: r.time,
          formattedTime: r.formattedTime,
          typeText: r.attendanceTypeText,
        })),
        syncCount,
      });

      setCanClockIn(canIn);
      setCanClockOut(canOut);
      setTodayRecords(records);
      setPendingSyncCount(syncCount);

      console.log('[HomeScreen] State updated with records:', records.length);
    } catch (error) {
      console.error('[HomeScreen] Load data error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadData(), checkServicesStatus()]);
    setIsRefreshing(false);
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
    if (!user?.id || !user.cedula || !selectedType) {
      Alert.alert('Error', 'Información de usuario incompleta');
      return;
    }

    // Close camera immediately and show processing spinner
    setShowCamera(false);
    setProcessingType(selectedType); // Save the type before any state changes
    setIsProcessing(true);

    try {
      console.log('[HomeScreen] Capturing location...');

      // IMPORTANT: Capture location - works even without internet!
      // GPS doesn't require internet connection, only satellites
      const locationData = await getCurrentLocation();

      if (!locationData) {
        // Location failed, but we can still allow the attendance
        Alert.alert(
          'Ubicación no disponible',
          'No se pudo obtener tu ubicación. ¿Deseas continuar sin ella?',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => {
                setSelectedType(null);
                setProcessingType(null);
                setIsProcessing(false);
              }
            },
            {
              text: 'Continuar',
              onPress: () => processClockWithLocation(photoUri, photoBase64, null)
            },
          ]
        );
        return;
      }

      // Process with location
      await processClockWithLocation(photoUri, photoBase64, locationData);
    } catch (error) {
      console.error('[HomeScreen] Clock error:', error);
      Alert.alert('Error', 'Error al procesar marcaje');
      setSelectedType(null);
      setProcessingType(null);
      setIsProcessing(false);
    }
  };

  /**
   * Process clock in/out with location data
   */
  const processClockWithLocation = async (
    photoUri: string,
    photoBase64: string,
    locationData: { latitude: number; longitude: number } | null
  ) => {
    if (!user?.id || !user.cedula || !selectedType) {
      Alert.alert('Error', 'Información de usuario incompleta');
      setProcessingType(null);
      setIsProcessing(false);
      return;
    }

    try {
      console.log('[HomeScreen] Processing clock with location:', locationData);

      // Clock in or out with location
      const result =
        selectedType === 'clock_in'
          ? await attendanceService.clockIn(
              user.id,
              user.cedula,
              userFullName,
              photoUri,
              photoBase64,
              undefined, // observations
              locationData ?? undefined
            )
          : await attendanceService.clockOut(
              user.id,
              user.cedula,
              userFullName,
              photoUri,
              photoBase64,
              undefined, // observations
              locationData ?? undefined
            );

      if (result.success) {
        const typeText = selectedType === 'clock_in' ? 'entrada' : 'salida';
        const locationText = locationData
          ? `\n📍 Ubicación registrada`
          : '\n⚠️ Sin ubicación';

        Alert.alert('Éxito', `${typeText} registrada correctamente${locationText}`);

        // Reload data
        await loadData();
      } else {
        Alert.alert('Error', result.error || 'Error al registrar marcaje');
      }
    } catch (error) {
      console.error('[HomeScreen] Clock processing error:', error);
      Alert.alert('Error', 'Error al procesar marcaje');
    } finally {
      setSelectedType(null);
      setProcessingType(null);
      setIsProcessing(false);
    }
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

  /**
   * Calculate worked hours from today's records
   * Pairs each clock_in with its corresponding clock_out
   * If currently clocked in (no clock_out), calculates time until now
   */
  const calculateWorkedHours = (): { hours: number; isInProgress: boolean } => {
    if (todayRecords.length === 0) {
      return { hours: 0, isInProgress: false };
    }

    // Sort records by timestamp
    const sortedRecords = [...todayRecords].sort((a, b) => a.timestamp - b.timestamp);

    let totalHours = 0;
    let isInProgress = false;
    let lastClockIn: number | null = null;

    for (const record of sortedRecords) {
      if (record.attendanceType === 'clock_in') {
        lastClockIn = record.timeDecimal;
      } else if (record.attendanceType === 'clock_out' && lastClockIn !== null) {
        totalHours += record.timeDecimal - lastClockIn;
        lastClockIn = null;
      }
    }

    // If there's an open clock_in (no clock_out yet), calculate time until now
    if (lastClockIn !== null) {
      const now = new Date();
      const currentTimeDecimal = now.getHours() + now.getMinutes() / 60;
      totalHours += currentTimeDecimal - lastClockIn;
      isInProgress = true;
    }

    return { hours: Math.max(0, totalHours), isInProgress };
  };

  /**
   * Format hours as HH:MM
   */
  const formatWorkedHours = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Sync Badge */}
      {pendingSyncCount > 0 && (
        <View style={styles.syncBadge}>
          <Text style={styles.syncBadgeText}>{pendingSyncCount} pendientes</Text>
        </View>
      )}

      {/* Location Status Banner */}
      <LocationStatusBanner
        servicesStatus={servicesStatus}
        onRequestPermission={requestPermission}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        scrollEnabled={!isProcessing}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola,</Text>
          <Text style={styles.userName}>{userFullName}</Text>
        </View>

        {/* Clock Section */}
        <View style={styles.clockSection}>
          {/* Current Time */}
          <View style={styles.clockTime}>
            <Text style={styles.currentTime}>{formatTime(currentTime)}</Text>
            <Text style={styles.currentDate}>{formatDate(currentTime)}</Text>
          </View>

          {/* Worked Hours Summary - only show if there are records */}
          {todayRecords.length > 0 && (() => {
            const { hours, isInProgress } = calculateWorkedHours();
            return (
              <View style={styles.workedHoursContainerTop}>
                <Text style={styles.workedHoursLabelTop}>
                  Horas trabajadas{isInProgress ? ' (en curso)' : ''}
                </Text>
                <Text style={styles.workedHoursValueTop}>
                  {formatWorkedHours(hours)}
                </Text>
              </View>
            );
          })()}

          {/* Clock Buttons */}
          {isLoading ? (
            <ActivityIndicator size="large" />
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

        {/* Today's Records */}
        <View style={styles.todayRecords}>
          <Text style={styles.recordsTitle}>Marcajes de hoy</Text>

          {todayRecords.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No hay marcajes registrados hoy</Text>
            </View>
          ) : (
            todayRecords.map((record) => (
              <View key={record.id} style={styles.recordItem}>
                <Text style={styles.recordType}>{record.attendanceTypeText}</Text>
                <Text style={styles.recordTime}>{record.formattedTime}</Text>
              </View>
            ))
          )}
        </View>
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
      <Modal
        visible={isProcessing}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={processingStyles.overlay}>
          <View style={processingStyles.container}>
            <ActivityIndicator size="large" color="#007AFF" />
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
    color: '#1F2937',
    textAlign: 'center',
  },
  subtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
