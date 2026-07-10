/**
 * HomeScreen
 *
 * Main screen for attendance clock in/out functionality.
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation.types';
import { useAuth } from '@hooks/useAuth';
import { useLocation } from '@hooks/useLocation';
import { checkNetworkStatus } from '@hooks/useNetworkStatus';
import { attendanceService } from '@services/attendance';
import { attendanceRecordService } from '@services/storage';
import { syncService } from '@services/sync/sync.service';
import { syncEvents, SYNC_EVENTS, type SyncCompletedPayload } from '@services/sync';
import { CameraCapture } from '@components/Camera/CameraCapture';
import { LocationStatusBanner } from '@components/LocationStatusBanner';
import { Button } from '@components/ui/Button';
import { deleteLocalImage } from '@utils/imageUtils';
import {
  getConfigForUser,
  calculateNetHours,
  type RoleConfig,
} from '@services/configuracion.service';
import type { AttendanceRecord, AttendanceType } from '@services/storage';
import { decimalToAmPm, formatFechaCorta } from '@utils/dateUtils';
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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
  // Distingue bloqueo por pending local (sync sin terminar) del bloqueo
  // por estado normal de la jornada — habilita el mensaje correcto al user.
  const [hasBlockingPendingIn, setHasBlockingPendingIn] = useState(false);
  const [hasBlockingPendingOut, setHasBlockingPendingOut] = useState(false);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  // Marcajes que "necesitan atención": sin subir hace rato o esperando re-login.
  const [attentionCount, setAttentionCount] = useState(0);
  const [attentionIsAuth, setAttentionIsAuth] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  // clock_in preservado que el backend rechazó por jornada abierta anterior: NO es
  // "Trabajando" (la entrada no llegó al servidor); bloquea marcar salida para no
  // crear un clock_out huérfano, y ofrece reportar la salida faltante para destrabar.
  const [blockedEntry, setBlockedEntry] = useState<AttendanceRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Processing attendance record
  const [processingType, setProcessingType] = useState<AttendanceType | null>(null); // Type being processed

  const [roleConfig, setRoleConfig] = useState<RoleConfig | null>(null);

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

  // Refresca el Home al terminar un batch de sync (badge + records del día),
  // pero solo si efectivamente cambio algo — evita pulls inutiles al servidor.
  useEffect(() => {
    const handleSyncCompleted = (payload?: SyncCompletedPayload) => {
      if (!user?.id || !user?.cedula) return;
      if (payload && payload.synced === 0 && payload.failed === 0) return;
      loadData();
    };
    syncEvents.on(SYNC_EVENTS.SYNC_COMPLETED, handleSyncCompleted);
    return () => {
      syncEvents.off(SYNC_EVENTS.SYNC_COMPLETED, handleSyncCompleted);
    };
  }, [user?.id, user?.cedula]);

  // Aviso cuando el backend rechaza un marcaje por jornada abierta sin cerrar.
  // El registro local ya se borró en el sync (y el SYNC_COMPLETED ya refrescó el
  // estado "Trabajando"), así que acá solo notificamos al empleado. Es la red de
  // seguridad para los casos en que el pre-check de handleClockIn no disparó
  // (versión vieja, fail-open por red lenta, o marcaje en kiosko).
  useEffect(() => {
    const handleOpenJourneyRejected = async () => {
      // Consultamos la fecha de la jornada abierta para precargar el reporte de
      // salida faltante (el rechazo del sync no trae ese dato en el payload).
      let fechaSugerida: string | undefined;
      try {
        if (user?.cedula) {
          const open = await attendanceService.getOpenJourney(user.cedula);
          fechaSugerida = open?.fecha;
        }
      } catch (e) {
        console.warn('[HomeScreen] No se pudo obtener fecha de jornada abierta:', e);
      }
      Alert.alert(
        'No se pudo registrar tu entrada',
        'Tenés una jornada abierta sin cerrar de un día anterior. Reportá la salida que olvidaste marcar para destrabar tu jornada, o contactá a tu administrador.',
        [
          { text: 'Ahora no', style: 'cancel' },
          {
            text: 'Reportar salida faltante',
            onPress: () =>
              navigation.navigate('ReportarMarcajeFaltante', {
                tipoSugerido: 'clock_out',
                fechaSugerida,
              }),
          },
        ]
      );
    };
    syncEvents.on(SYNC_EVENTS.OPEN_JOURNEY_REJECTED, handleOpenJourneyRejected);
    return () => {
      syncEvents.off(SYNC_EVENTS.OPEN_JOURNEY_REJECTED, handleOpenJourneyRejected);
    };
  }, [user?.cedula]);

  // roleConfig se usa para descontar minutosDescanso del total de horas del dia.
  const loadRoleConfig = async () => {
    if (!user?.id) return;

    try {
      const config = await getConfigForUser(user.id);
      setRoleConfig(config);
      console.log('[HomeScreen] Role config loaded:', config);
    } catch (error) {
      console.error('[HomeScreen] Failed to load role config:', error);
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

      // 1.5. Force sync attempt antes del check: si el ack del último
      // marcaje se perdió, esto puede limpiar el pending local antes y
      // evita que el botón quede bloqueado por un pending atascado.
      if (await syncService.needsSync()) {
        try {
          await syncService.syncPendingRecords();
        } catch (syncErr) {
          console.warn('[HomeScreen] Force sync attempt failed (continuamos):', syncErr);
        }
      }

      // 2. Consultar por CÉDULA (no userId) para detectar marcajes de cualquier dispositivo
      // + chequeo de pending local con timeout (evita bloqueo perpetuo)
      const [canIn, canOut, records, syncCount, pendingIn, pendingOut, attentionRecords] = await Promise.all([
        attendanceService.canClockInByCedula(user.cedula),
        attendanceService.canClockOutByCedula(user.cedula),
        attendanceService.getTodayRecordsByCedula(user.cedula),
        attendanceService.getPendingSyncCount(),
        attendanceRecordService.hasBlockingPendingByType(user.cedula, 'clock_in'),
        attendanceRecordService.hasBlockingPendingByType(user.cedula, 'clock_out'),
        attendanceRecordService.getRecordsNeedingAttention(),
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

      // canClockIn/Out reflejan solo el estado de la jornada (cloud/local);
      // el bloqueo por pending se aplica en el handler para que el botón
      // siga visible y se pueda mostrar el Alert "Sincronizando".
      setCanClockIn(canIn);
      setCanClockOut(canOut);
      setHasBlockingPendingIn(pendingIn);
      setHasBlockingPendingOut(pendingOut);
      setTodayRecords(records);
      setPendingSyncCount(syncCount);
      setAttentionCount(attentionRecords.length);
      setAttentionIsAuth(
        attentionRecords.some((r) => (r.syncError || '').startsWith('WAITING_AUTH'))
      );
      // Entrada de hoy trabada por jornada abierta (preservada offline, rechazada
      // por el backend): no habilita "Trabajando" ni marcar salida.
      setBlockedEntry(
        records.find(
          (r) =>
            r.attendanceType === 'clock_in' &&
            r.attendanceSyncStatus === 'error' &&
            (r.syncError || '').startsWith('OPEN_JOURNEY')
        ) || null
      );

      console.log('[HomeScreen] State updated with records:', records.length);
    } catch (error) {
      console.error('[HomeScreen] Load data error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Reintento manual desde el banner de atención: recupera terminales atascados
   * y fuerza un ciclo de sync. Para el caso "esperando sesión", el sync resolverá
   * apenas el empleado vuelva a loguear; igual reintentamos por si ya hay sesión.
   */
  const handleRetrySync = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      // Destrabar AMBOS: terminales (reset attempts) y los que están descansando
      // en un escalón de backoff (limpiar next_retry_at), para que el reintento
      // manual sea efectivo también para el caso viejo-pero-no-terminal.
      await attendanceRecordService.recoverStuckRecords();
      await attendanceRecordService.resetBackoffForRetry();
      await syncService.syncPendingRecords();
      await loadData();
    } catch (error) {
      console.warn('[HomeScreen] Retry sync failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  /**
   * Reportar salida faltante desde el estado "entrada trabada". Precarga la fecha
   * de la jornada abierta para que, al crear la solicitud, se destrabe el marcaje
   * preservado y suba con su hora real.
   */
  const handleReportFromBlocked = async () => {
    let fechaSugerida: string | undefined;
    try {
      if (user?.cedula) {
        const open = await attendanceService.getOpenJourney(user.cedula);
        fechaSugerida = open?.fecha;
      }
    } catch (e) {
      console.warn('[HomeScreen] No se pudo obtener fecha de jornada abierta:', e);
    }
    navigation.navigate('ReportarMarcajeFaltante', {
      tipoSugerido: 'clock_out',
      fechaSugerida,
    });
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadData(), checkServicesStatus()]);
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

  const handleClockIn = async () => {
    if (isProcessing) return;
    if (hasBlockingPendingIn) {
      Alert.alert(
        'Sincronizando',
        'Tu marcaje anterior se está sincronizando. Esperá unos segundos.'
      );
      return;
    }
    if (!canClockIn) {
      Alert.alert('No disponible', 'Ya has marcado tu entrada');
      return;
    }

    // Pre-check de jornada abierta: muestra mensaje claro en lugar del error
    // crudo que devolvería el constraint del backend al sincronizar.
    if (user?.cedula) {
      setIsProcessing(true);
      try {
        const open = await attendanceService.getOpenJourney(user.cedula);
        if (open) {
          const tiempoStr = open.horasAbierta < 1 ? 'menos de 1 h' : `${Math.floor(open.horasAbierta)} h`;
          Alert.alert(
            'Tenés una jornada abierta',
            `Tu última entrada quedó sin cerrar (${formatFechaCorta(open.fecha)} a las ${decimalToAmPm(open.horaInicio)}, lleva ${tiempoStr}). Reportá la salida que olvidaste marcar ese día para destrabar tu jornada, o contactá a tu administrador.`,
            [
              { text: 'Ahora no', style: 'cancel' },
              {
                text: 'Reportar salida faltante',
                onPress: () =>
                  navigation.navigate('ReportarMarcajeFaltante', {
                    tipoSugerido: 'clock_out',
                    fechaSugerida: open.fecha,
                  }),
              },
            ]
          );
          return;
        }
      } finally {
        setIsProcessing(false);
      }
    }

    setSelectedType('clock_in');
    setShowCamera(true);
  };

  const handleClockOut = () => {
    if (isProcessing) return;
    if (blockedEntry) {
      Alert.alert(
        'Entrada sin registrar',
        'Tu entrada está trabada por una jornada abierta de un día anterior. Reportá la salida faltante para destrabarla.'
      );
      return;
    }
    if (hasBlockingPendingOut) {
      Alert.alert(
        'Sincronizando',
        'Tu marcaje anterior se está sincronizando. Esperá unos segundos.'
      );
      return;
    }
    if (!canClockOut) {
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
      await deleteLocalImage(photoUri);
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
                void deleteLocalImage(photoUri);
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
      await deleteLocalImage(photoUri);
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
      await deleteLocalImage(photoUri);
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

        await loadData();
      } else {
        Alert.alert('Error', result.error || 'Error al registrar marcaje');
        await deleteLocalImage(photoUri);
      }
    } catch (error) {
      console.error('[HomeScreen] Clock processing error:', error);
      Alert.alert('Error', 'Error al procesar marcaje');
      await deleteLocalImage(photoUri);
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
      {/* Location Status Banner */}
      <LocationStatusBanner
        servicesStatus={servicesStatus}
        onRequestPermission={requestPermission}
      />

      {/* Banner de atención: un marcaje lleva rato sin subir o espera re-login.
          Tiene prioridad sobre el badge tranquilo de "pendientes". */}
      {attentionCount > 0 ? (
        <TouchableOpacity
          style={styles.attentionBanner}
          onPress={handleRetrySync}
          disabled={isRetrying}
          activeOpacity={0.8}
        >
          <Text style={styles.attentionBannerTitle}>
            {attentionIsAuth
              ? 'Volvé a iniciar sesión para subir tus marcajes'
              : `${attentionCount} marcaje${attentionCount > 1 ? 's' : ''} sin sincronizar`}
          </Text>
          <Text style={styles.attentionBannerAction}>
            {isRetrying ? 'Reintentando…' : 'Tocá para reintentar'}
          </Text>
        </TouchableOpacity>
      ) : (
        pendingSyncCount > 0 && (
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>{pendingSyncCount} pendientes</Text>
          </View>
        )
      )}

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
            blockedEntry ? (
              <View style={[styles.statusBanner, styles.statusBannerBlocked]}>
                <Text style={styles.statusBannerIcon}>⚠️</Text>
                <View style={styles.statusBannerTextContainer}>
                  <Text style={[styles.statusBannerTitle, styles.statusBannerTitleBlocked]}>
                    Entrada sin registrar
                  </Text>
                  <Text style={styles.statusBannerSubtitle}>
                    Tu entrada de las {blockedEntry.formattedTime} está trabada por una
                    jornada abierta de un día anterior. Reportá la salida que olvidaste
                    marcar para destrabarla.
                  </Text>
                </View>
              </View>
            ) : (
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
            )
          )}

          {/* Boton principal - Solo el relevante */}
          {isLoading ? (
            <ActivityIndicator size="large" />
          ) : blockedEntry ? (
            <View style={styles.buttonsContainer}>
              <Button
                title="Reportar salida faltante"
                onPress={handleReportFromBlocked}
                disabled={isProcessing}
                variant="clockIn"
                style={styles.clockButtonMain}
              />
            </View>
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
