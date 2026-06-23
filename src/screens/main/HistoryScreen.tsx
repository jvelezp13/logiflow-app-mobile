/**
 * HistoryScreen
 *
 * Display attendance history grouped by date with statistics.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '@hooks/useAuth';
import { useAttendanceRecords, type DateFilter } from '@hooks/useAttendanceRecords';
import { AttendanceCard } from '@components/AttendanceCard';
import type { AttendanceRecord } from '@services/storage';
import type { NovedadInfo } from '@services/novedadesService';
import type { RootStackParamList } from '@/types/navigation.types';
import { styles } from './HistoryScreen.styles';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type Section = {
  title: string;
  data: AttendanceRecord[];
};

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, userCedula } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');

  // Pass userCedula to enable pulling records from Supabase
  const { records, isLoading, isPulling, isRefreshing, novedadesInfo, refreshNovedades, onRefresh } = useAttendanceRecords(
    user?.id,
    dateFilter,
    userCedula
  );

  // Refresca el indicador de novedades al volver de SolicitarAjuste/DetalleNovedad.
  useFocusEffect(
    useCallback(() => {
      refreshNovedades();
    }, [refreshNovedades])
  );

  /**
   * Get novedad info for a record (id + estado)
   */
  const getNovedadInfo = useCallback((record: AttendanceRecord): NovedadInfo | undefined => {
    return novedadesInfo.get(record.timestamp);
  }, [novedadesInfo]);

  // Flujo por estado: sin novedad → solicitar; pendiente → detalle;
  // aprobada → bloqueado (1 ajuste aprobado activo por marcaje); rechazada → alert con opciones.
  const handleRecordPress = useCallback((record: AttendanceRecord) => {
    const novedadInfo = getNovedadInfo(record);
    const horaActual = record.time.slice(0, 5);

    const irASolicitar = () => {
      navigation.navigate('SolicitarAjuste', {
        marcajeId: record.timestamp,
        fecha: record.date,
        tipo: record.attendanceType,
        horaActual,
      });
    };

    const irADetalle = (novedadId: string) => {
      navigation.navigate('DetalleNovedad', { novedadId });
    };

    if (!novedadInfo) {
      irASolicitar();
      return;
    }

    if (novedadInfo.estado === 'pendiente') {
      irADetalle(novedadInfo.id);
      return;
    }

    if (novedadInfo.estado === 'aprobada') {
      Alert.alert(
        'Marcaje ya ajustado',
        'Este marcaje ya tiene un ajuste aprobado. Si necesitás corregirlo de nuevo, contactá al administrador para que primero revierta el ajuste anterior.',
        [
          { text: 'Ver detalle', onPress: () => irADetalle(novedadInfo.id) },
          { text: 'Cerrar', style: 'cancel' },
        ],
      );
      return;
    }

    Alert.alert(
      'Solicitud rechazada',
      'Tu solicitud anterior para este marcaje fue rechazada. ¿Qué querés hacer?',
      [
        { text: 'Ver detalle', onPress: () => irADetalle(novedadInfo.id) },
        { text: 'Solicitar nuevo ajuste', onPress: irASolicitar },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  }, [navigation, getNovedadInfo]);

  /**
   * Group records by date for SectionList
   */
  const sections = useMemo((): Section[] => {
    const grouped: Record<string, AttendanceRecord[]> = {};

    records.forEach((record) => {
      const dateKey = record.date; // yyyy-MM-dd format
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(record);
    });

    // Convert to sections array and format titles
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a)) // Sort by date descending
      .map(([dateKey, data]) => {
        const date = parseISO(dateKey);
        let title: string;

        if (isToday(date)) {
          title = 'Hoy';
        } else if (isYesterday(date)) {
          title = 'Ayer';
        } else {
          // "Lunes 6 de enero"
          title = format(date, "EEEE d 'de' MMMM", { locale: es });
          // Capitalize first letter
          title = title.charAt(0).toUpperCase() + title.slice(1);
        }

        return { title, data };
      });
  }, [records]);

  /**
   * Render filter button
   */
  const renderFilterButton = (filter: DateFilter, label: string) => {
    const isActive = dateFilter === filter;

    return (
      <TouchableOpacity
        style={[
          styles.filterButton,
          isActive && styles.filterButtonActive,
        ]}
        onPress={() => setDateFilter(filter)}
      >
        <Text
          style={[
            styles.filterButtonText,
            isActive && styles.filterButtonTextActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmpty = () => {
    if (isLoading || isPulling) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          {isPulling && (
            <Text style={styles.emptySubtext}>Sincronizando historial...</Text>
          )}
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>Sin registros</Text>
        <Text style={styles.emptySubtext}>
          No hay marcajes en el período seleccionado
        </Text>
      </View>
    );
  };

  /**
   * Render section header
   */
  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  /**
   * Render item
   */
  const renderItem = ({ item }: { item: AttendanceRecord }) => (
    <AttendanceCard
      record={item}
      adjustmentStatus={getNovedadInfo(item)?.estado}
      onPress={handleRecordPress}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Acceso a Mis solicitudes (el título "Historial" ya lo pone el header del tab) */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.misSolicitudesLink}
          onPress={() => navigation.navigate('MisSolicitudes')}
          accessibilityLabel="Ver mis solicitudes"
        >
          <MaterialCommunityIcons name="file-document-outline" size={18} color={COLORS.primary} />
          <Text style={styles.misSolicitudesLinkText}>Mis solicitudes</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {renderFilterButton('today', 'Hoy')}
        {renderFilterButton('week', 'Semana')}
        {renderFilterButton('month', 'Mes')}
      </View>

      <View style={styles.content}>
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: 96 }]}
          ListEmptyComponent={renderEmpty}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              title="Actualizando..."
            />
          }
        />
      </View>

      {/* FAB: reportar un marcaje que nunca se registró (olvido total de entrada/salida) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ReportarMarcajeFaltante')}
        activeOpacity={0.85}
        accessibilityLabel="Reportar marcaje faltante"
      >
        <MaterialCommunityIcons name="clock-plus-outline" size={22} color={COLORS.textInverse} />
        <Text style={styles.fabText}>Marcaje faltante</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};
