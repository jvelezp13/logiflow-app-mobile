/**
 * HistoryScreen
 *
 * Display attendance history grouped by date with statistics.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@hooks/useAuth';
import { useAttendanceRecords, type DateFilter } from '@hooks/useAttendanceRecords';
import { AttendanceCard } from '@components/AttendanceCard';
import type { AttendanceRecord } from '@services/storage';
import { styles } from './HistoryScreen.styles';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

type Section = {
  title: string;
  data: AttendanceRecord[];
};

export const HistoryScreen: React.FC = () => {
  const { user, userCedula } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Pass userCedula to enable pulling records from Supabase
  const { records, isLoading, isPulling } = useAttendanceRecords(
    user?.id,
    dateFilter,
    userCedula
  );

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
    <AttendanceCard record={item} />
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        {renderFilterButton('today', 'Hoy')}
        {renderFilterButton('week', 'Semana')}
        {renderFilterButton('month', 'Mes')}
        {renderFilterButton('all', 'Todos')}
      </View>

      {/* List */}
      <View style={styles.content}>
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          stickySectionHeadersEnabled={false}
        />
      </View>
    </SafeAreaView>
  );
};
