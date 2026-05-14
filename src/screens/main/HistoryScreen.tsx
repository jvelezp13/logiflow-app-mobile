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
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useAuth } from '@hooks/useAuth';
import { useAttendanceRecords, type DateFilter } from '@hooks/useAttendanceRecords';
import { AttendanceCard } from '@components/AttendanceCard';
import type { AttendanceRecord } from '@services/storage';
import type { NovedadInfo } from '@services/novedadesService';
import { styles } from './HistoryScreen.styles';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type Section = {
  title: string;
  data: AttendanceRecord[];
};

export const HistoryScreen: React.FC = () => {
  // Use any for navigation to handle nested navigator params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const { user, userCedula } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');

  // Pass userCedula to enable pulling records from Supabase
  const { records, isLoading, isPulling, isRefreshing, novedadesInfo, onRefresh } = useAttendanceRecords(
    user?.id,
    dateFilter,
    userCedula
  );

  /**
   * Get novedad info for a record (id + estado)
   */
  const getNovedadInfo = useCallback((record: AttendanceRecord): NovedadInfo | undefined => {
    return novedadesInfo.get(record.timestamp);
  }, [novedadesInfo]);

  // Flujo por estado de novedad del marcaje:
  //   sin novedad        → SolicitarAjuste directo
  //   pendiente          → DetalleNovedad (no se puede crear otra, lo bloquea la
  //                        UNIQUE constraint en DB y se traduce al usuario)
  //   aprobada/rechazada → Alert con opciones (ver detalle vs nuevo ajuste)
  //
  // Cada navigate hace reset del stack interno de Novedades para que el back
  // siempre vuelva al Historial. popToTopOnBlur en el tab no era suficiente:
  // si el user entraba a SolicitarAjuste y despues volvia a Historial sin que
  // el blur disparara (caso con tab oculto), la stack quedaba residual y el
  // siguiente navigate apilaba encima.
  const navegarLimpio = (screen: string, params: Record<string, unknown>) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Novedades',
        params: {
          screen,
          params,
          // initial: false fuerza que el navigate empiece una pila nueva con
          // la screen indicada como root.
          initial: false,
        },
      }),
    );
  };

  const handleRecordPress = useCallback((record: AttendanceRecord) => {
    const novedadInfo = getNovedadInfo(record);
    const horaActual = record.time.slice(0, 5);

    const irASolicitar = () => {
      navegarLimpio('SolicitarAjuste', {
        marcajeId: record.timestamp,
        fecha: record.date,
        tipo: record.attendanceType,
        horaActual,
      });
    };

    const irADetalle = (novedadId: string) => {
      navegarLimpio('DetalleNovedad', { novedadId });
    };

    if (!novedadInfo) {
      irASolicitar();
      return;
    }

    if (novedadInfo.estado === 'pendiente') {
      irADetalle(novedadInfo.id);
      return;
    }

    Alert.alert(
      'Marcaje con ajuste',
      novedadInfo.estado === 'aprobada'
        ? 'Este marcaje ya tiene un ajuste aprobado. ¿Qué querés hacer?'
        : 'Tu solicitud anterior para este marcaje fue rechazada. ¿Qué querés hacer?',
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
          contentContainerStyle={styles.list}
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
    </SafeAreaView>
  );
};
