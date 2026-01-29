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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@hooks/useAuth';
import { useAttendanceRecords, type DateFilter } from '@hooks/useAttendanceRecords';
import useCierres from '@hooks/useCierres';
import { AttendanceCard } from '@components/AttendanceCard';
import CierresList from '@components/cierres/CierresList';
import type { AttendanceRecord } from '@services/storage';
import type { NovedadInfo } from '@services/novedadesService';
import type { CierreResumen } from '@/types/cierres.types';
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
    dateFilter === 'cierres' ? 'month' : dateFilter, // Use 'month' when on cierres tab
    userCedula
  );

  // Cierres hook
  const {
    cierres,
    loading: cierresLoading,
    refreshing: cierresRefreshing,
    isOffline: cierresOffline,
    onRefresh: cierresOnRefresh,
  } = useCierres(userCedula);

  /**
   * Get novedad info for a record (id + estado)
   */
  const getNovedadInfo = useCallback((record: AttendanceRecord): NovedadInfo | undefined => {
    return novedadesInfo.get(record.timestamp);
  }, [novedadesInfo]);

  /**
   * Handle tap on attendance record
   * If novedad exists -> show detail
   * If no novedad -> navigate to adjustment request
   */
  const handleRecordPress = useCallback((record: AttendanceRecord) => {
    const novedadInfo = getNovedadInfo(record);

    if (novedadInfo) {
      // Novedad exists - navigate to detail view
      navigation.navigate('Novedades', {
        screen: 'DetalleNovedad',
        params: {
          novedadId: novedadInfo.id,
        },
      });
    } else {
      // No novedad - navigate to adjustment request form
      // Usar record.time (formato 24h HH:mm) en lugar de formattedTime (puede ser 12h)
      const horaActual = record.time;

      navigation.navigate('Novedades', {
        screen: 'SolicitarAjuste',
        params: {
          marcajeId: record.timestamp,
          fecha: record.date,
          tipo: record.attendanceType,
          horaActual,
        },
      });
    }
  }, [navigation, getNovedadInfo]);

  /**
   * Handle tap on cierre card
   */
  const handleCierrePress = useCallback((cierre: CierreResumen) => {
    navigation.navigate('Cierres', {
      screen: 'DetalleCierre',
      params: {
        cierreId: cierre.id,
      },
    });
  }, [navigation]);

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
        {renderFilterButton('cierres', 'Cierres')}
      </View>

      {/* List - conditional rendering based on filter */}
      <View style={styles.content}>
        {dateFilter === 'cierres' ? (
          <CierresList
            cierres={cierres}
            onCierrePress={handleCierrePress}
            loading={cierresLoading}
            refreshing={cierresRefreshing}
            isOffline={cierresOffline}
            onRefresh={cierresOnRefresh}
          />
        ) : (
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
        )}
      </View>
    </SafeAreaView>
  );
};
