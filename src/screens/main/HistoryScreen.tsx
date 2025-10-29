/**
 * HistoryScreen
 *
 * Display attendance history with filters and statistics.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@hooks/useAuth';
import { useAttendanceRecords, type DateFilter } from '@hooks/useAttendanceRecords';
import { AttendanceCard } from '@components/AttendanceCard';
import type { AttendanceRecord } from '@services/storage';
import { styles } from './HistoryScreen.styles';

export const HistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { records, isLoading } = useAttendanceRecords(user?.id, dateFilter);

  /**
   * Calculate statistics
   */
  const stats = useMemo(() => {
    const total = records.length;
    const synced = records.filter((r) => r.isSynced).length;
    const pending = records.filter((r) => r.needsSync).length;

    return { total, synced, pending };
  }, [records]);

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Records are reactive, just wait a bit for effect
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  /**
   * Render filter button
   */
  const renderFilterButton = (
    filter: DateFilter,
    label: string
  ) => {
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
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
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

      {/* Statistics */}
      {records.length > 0 && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.synced}</Text>
              <Text style={styles.statLabel}>Sincronizados</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
          </View>
        </View>
      )}

      {/* List */}
      <View style={styles.content}>
        <FlatList
          data={records}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
};
