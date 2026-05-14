/**
 * HomeScreen
 *
 * Main screen for attendance clock in/out functionality.
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { checkNetworkStatus } from '@hooks/useNetworkStatus';
import { useProgresoSemanal } from '@hooks/useProgresoSemanal';
import { attendanceService } from '@services/attendance';
import { syncService } from '@services/sync/sync.service';
import { CameraCapture } from '@components/Camera/CameraCapture';
import { LocationStatusBanner } from '@components/LocationStatusBanner';
import { Button } from '@components/ui/Button';
import { SpecialHoursWarningModal, WarningType } from '@components/SpecialHoursWarning';
import {
  getConfigForUser,
  calculateNetHours,
  isNocturnalDecimalHour,
  type RoleConfig,
} from '@services/configuracion.service';
import type { AttendanceRecord, AttendanceType } from '@services/storage';
import { styles } from './HomeScreen.styles';
import { COLORS } from '@/constants/theme';

/**
 * Memoized Clock Component
 * Updates independently without causing parent re-renders.
 * OPTIMIZATION: Muestra segundos solo cuando esta trabajando (feedback de tiempo activo)
 * Cuando no trabaja, actualiza cada minuto para ahorrar recursos.
 */
type ClockDisplayProps = {
  isWorking?: boolean;
};

const ClockDisplay = memo(({ isWorking = false }: ClockDisplayProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Segundos solo cuando trabaja, minutos cuando no
    const intervalMs = isWorking ? 1000 : 60000;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, intervalMs);

    // Actualizar inmediatamente al cambiar de modo
    setCurrentTime(new Date());

    return () => clearInterval(interval);
  }, [isWorking]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      ...(isWorking && { second: '2-digit' }), // Segundos solo si trabaja
      hour12: true,
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={clockStyles.container}>
      <Text style={clockStyles.time}>{formatTime(currentTime)}</Text>
      <Text style={clockStyles.date}>{formatDate(currentTime)}</Text>
    </View>
  );
});

const clockStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 16,
  },
  time: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  date: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
    textTransform: 'capitalize',
  },
});

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

  const [roleConfig, setRoleConfig] = useState<RoleConfig | null>(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningType, setWarningType] = useState<WarningType>('tope_diario');

  const { progreso: progresoSemanal, refrescar: refrescarProgresoSemanal } = useProgresoSemanal(user?.cedula ?? null);

  // Refresca progreso semanal al volver al Home (cubre el caso de medianoche
  // cuando el usuario navega entre pantallas mientras la app sigue activa).
  useFocusEffect(
    useCallback(() => {
      refrescarProgresoSemanal();
    }, [refrescarProgresoSemanal]),
  );

  const mostrarWarning = useCallback((type: WarningType, attType: AttendanceType) => {
    setSelectedType(attType);
    setWarningType(type);
    setShowWarningModal(true);
  }, []);

  // Clock is now handled by ClockDisplay component (memoized)

  /**
   * Load initial data when user is available
   */
  useEffect(() => {
    if (user?.id && user?.cedula) {
      console.log('[HomeScreen] User available, loading data');
      loadData();
      loadRoleConfig();
    }
  }, [user?.id, user?.cedula]); // Re-run when user becomes available

  /**
   * Load role configuration for special hours warnings
   */
  const loadRoleConfig = async () => {
    if (!user?.id) return;

    try {
      const config = await getConfigForUser(user.id);
      setRoleConfig(config);
      console.log('[HomeScreen] Role config loaded:', config);
    } catch (error) {
      console.error('[HomeScreen] Failed to load role config:', error);
      // Continue without config - warnings will be skipped
    }
  };

  /**
   * Load today's records and check clock state
   * IMPORTANTE: Hace pull de Supabase primero para detectar marcajes de otros dispositivos
   */
  const loadData = async () => {
    if (!user?.id || !user?.cedula) {
      console.log('[HomeScreen] No user data, skipping loadData');
      return;
    }

    try {
      console.log('[HomeScreen] Loading data for user:', { id: user.id, cedula: user.cedula });
      setIsLoading(true);

      // 1. PULL de Supabase si hay conexión (detecta marcajes de otros dispositivos)
      const hasNetwork = await checkNetworkStatus();
      if (hasNetwork) {
        try {
          const pullResult = await syncService.pullFromSupabase(user.cedula);
          console.log('[HomeScreen] Pull from Supabase completed:', pullResult);
        } catch (pullError) {
          console.log('[HomeScreen] Pull failed, using local data:', pullError);
          // Continúa con datos locales si el pull falla
        }
      }

      // 2. Consultar por CÉDULA (no userId) para detectar marcajes de cualquier dispositivo
      const [canIn, canOut, records, syncCount] = await Promise.all([
        attendanceService.canClockInByCedula(user.cedula),
        attendanceService.canClockOutByCedula(user.cedula),
        attendanceService.getTodayRecordsByCedula(user.cedula),
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
    await Promise.all([loadData(), checkServicesStatus(), refrescarProgresoSemanal()]);
    setIsRefreshing(false);
  };

  // Cada invocacion evalua new Date() fresh para que el caso "in progress"
  // refleje el tiempo trabajado hasta el momento de llamarla, no hasta el
  // ultimo cambio de todayRecords. Un useMemo cacheaba el new Date() y
  // congelaba la cuenta durante toda la jornada.
  const calculateWorkedHours = useCallback((): { hours: number; isInProgress: boolean } => {
    if (todayRecords.length === 0) {
      return { hours: 0, isInProgress: false };
    }

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

    if (lastClockIn !== null) {
      const now = new Date();
      const currentTimeDecimal = now.getHours() + now.getMinutes() / 60;
      totalHours += currentTimeDecimal - lastClockIn;
      isInProgress = true;
    }

    return { hours: Math.max(0, totalHours), isInProgress };
  }, [todayRecords]);

  /**
   * Check if current time is in nocturnal hours
   */
  const checkNocturnalHours = useCallback((): boolean => {
    if (!roleConfig) return false;
    const now = new Date();
    const currentDecimalHour = now.getHours() + now.getMinutes() / 60;
    return isNocturnalDecimalHour(currentDecimalHour, roleConfig);
  }, [roleConfig]);

  const proyectarExcesoTopeDiario = useCallback((): number => {
    if (!roleConfig || todayRecords.length === 0) return 0;
    const { hours: grossHours } = calculateWorkedHours();
    const netHours = calculateNetHours(grossHours, roleConfig.minutosDescanso);
    return Math.max(0, netHours - roleConfig.maxHorasDia);
  }, [roleConfig, todayRecords, calculateWorkedHours]);

  /**
   * Handle clock in button
   * Checks for nocturnal hours and shows warning if needed
   */
  const handleClockIn = () => {
    if (!canClockIn || isProcessing) {
      Alert.alert('No disponible', 'Ya has marcado tu entrada');
      return;
    }

    if (roleConfig && checkNocturnalHours()) {
      mostrarWarning('nocturna', 'clock_in');
      return;
    }

    // No warning needed, proceed to camera
    setSelectedType('clock_in');
    setShowCamera(true);
  };

  /**
   * Handle clock out button
   * Checks for extra hours and nocturnal hours, shows warning if needed
   */
  const handleClockOut = () => {
    if (!canClockOut || isProcessing) {
      Alert.alert('No disponible', 'Debes marcar tu entrada primero');
      return;
    }

    if (roleConfig) {
      const excesoTope = proyectarExcesoTopeDiario();
      const isNocturnal = checkNocturnalHours();

      if (excesoTope > 0 && isNocturnal) {
        mostrarWarning('ambas', 'clock_out');
        return;
      }
      if (excesoTope > 0) {
        mostrarWarning('tope_diario', 'clock_out');
        return;
      }
      if (isNocturnal) {
        mostrarWarning('nocturna', 'clock_out');
        return;
      }
    }

    // No warning needed, proceed to camera
    setSelectedType('clock_out');
    setShowCamera(true);
  };

  /**
   * Handle warning modal confirmation
   * Proceeds to camera after user acknowledges warning
   */
  const handleWarningConfirm = () => {
    setShowWarningModal(false);
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

        await Promise.all([loadData(), refrescarProgresoSemanal()]);
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

        {progresoSemanal && (
          <View style={styles.progresoSemanalContainer}>
            <Text style={styles.progresoSemanalTitle}>Esta semana</Text>
            <Text style={styles.progresoSemanalValue}>
              {formatWorkedHours(progresoSemanal.horasTrabajadas)} / {formatWorkedHours(progresoSemanal.maxHorasSemana)}
            </Text>
            {progresoSemanal.horasRestantes > 0 && (
              <Text style={styles.progresoSemanalSubtext}>
                {formatWorkedHours(progresoSemanal.horasRestantes)} restantes
              </Text>
            )}
            {progresoSemanal.horasExtraSemanal > 0 && (
              <Text style={styles.progresoSemanalExtras}>
                {formatWorkedHours(progresoSemanal.horasExtraSemanal)} de extras esta semana
              </Text>
            )}
          </View>
        )}

        {/* Clock Section */}
        <View style={styles.clockSection}>
          {/* Current Time - Memoized component */}
          <ClockDisplay isWorking={canClockOut} />

          {/* Worked Hours Summary - only show if there are records */}
          {todayRecords.length > 0 && (() => {
            const { hours: grossHours, isInProgress } = calculateWorkedHours();
            // Calculate net hours (subtracting break time) if we have config
            const netHours = roleConfig
              ? calculateNetHours(grossHours, roleConfig.minutosDescanso)
              : grossHours;
            const showNetLabel = roleConfig && roleConfig.minutosDescanso > 0;

            return (
              <View style={[
                styles.workedHoursContainerTop,
                !isInProgress && styles.workedHoursContainerCompleted
              ]}>
                <Text style={[
                  styles.workedHoursLabelTop,
                  !isInProgress && styles.workedHoursLabelCompleted
                ]}>
                  {isInProgress
                    ? `Horas registradas${showNetLabel ? ' (netas)' : ''} - en curso`
                    : `Hoy registraste${showNetLabel ? ' (neto)' : ''}`
                  }
                </Text>
                <Text style={[
                  styles.workedHoursValueTop,
                  !isInProgress && styles.workedHoursValueCompleted
                ]}>
                  {formatWorkedHours(netHours)}
                </Text>
                {showNetLabel && isInProgress && (
                  <Text style={styles.workedHoursSubtext}>
                    Descanso: {roleConfig.minutosDescanso} min descontados
                  </Text>
                )}
              </View>
            );
          })()}

          {/* Estado Banner - Feedback visual claro */}
          {!isLoading && (
            <View style={[
              styles.statusBanner,
              canClockOut ? styles.statusBannerWorking : styles.statusBannerIdle
            ]}>
              <Text style={[
                styles.statusBannerIcon,
                canClockOut ? styles.statusBannerIconWorking : styles.statusBannerIconIdle
              ]}>
                {canClockOut ? '⏱️' : '☀️'}
              </Text>
              <View style={styles.statusBannerTextContainer}>
                <Text style={[
                  styles.statusBannerTitle,
                  canClockOut ? styles.statusBannerTitleWorking : styles.statusBannerTitleIdle
                ]}>
                  {canClockOut ? 'Trabajando' : 'Listo para iniciar'}
                </Text>
                {canClockOut && todayRecords.length > 0 && (() => {
                  // Buscar la ultima entrada
                  const lastClockIn = [...todayRecords]
                    .filter(r => r.attendanceType === 'clock_in')
                    .sort((a, b) => b.timestamp - a.timestamp)[0];
                  return lastClockIn ? (
                    <Text style={styles.statusBannerSubtitle}>
                      Desde las {lastClockIn.formattedTime}
                    </Text>
                  ) : null;
                })()}
                {!canClockOut && !canClockIn && (
                  <Text style={styles.statusBannerSubtitle}>
                    Jornada completada
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Boton principal - Solo el relevante */}
          {isLoading ? (
            <ActivityIndicator size="large" />
          ) : (
            <View style={styles.buttonsContainer}>
              {canClockIn && (
                <Button
                  title="Marcar Entrada"
                  onPress={handleClockIn}
                  disabled={isProcessing}
                  variant="clockIn"
                  style={styles.clockButtonMain}
                />
              )}
              {canClockOut && (
                <Button
                  title="Marcar Salida"
                  onPress={handleClockOut}
                  disabled={isProcessing}
                  variant="clockOut"
                  style={styles.clockButtonMain}
                />
              )}
              {!canClockIn && !canClockOut && (
                <View style={styles.dayCompleteContainer}>
                  <Text style={styles.dayCompleteText}>Jornada completada</Text>
                </View>
              )}
            </View>
          )}
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

      <SpecialHoursWarningModal
        visible={showWarningModal}
        type={warningType}
        isEntry={selectedType === 'clock_in'}
        onConfirm={handleWarningConfirm}
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
