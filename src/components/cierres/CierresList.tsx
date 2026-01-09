/**
 * CierresList
 *
 * List of weekly closures with empty and offline states.
 */

import React, { useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ListRenderItem,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import CierreCard from './CierreCard';
import type { CierreResumen } from '@/types/cierres.types';

interface CierresListProps {
  cierres: CierreResumen[];
  onCierrePress: (cierre: CierreResumen) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  isOffline?: boolean;
}

const CierresList: React.FC<CierresListProps> = ({
  cierres,
  onCierrePress,
  refreshing = false,
  onRefresh,
  loading = false,
  isOffline = false,
}) => {
  /**
   * Render empty state based on loading/offline status
   */
  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.emptyText}>Cargando cierres...</Text>
        </View>
      );
    }

    if (isOffline) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="wifi-off" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Sin conexion</Text>
          <Text style={styles.emptySubtext}>
            Los cierres semanales requieren conexion a internet.{'\n'}
            Intenta de nuevo cuando tengas conexion.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="calendar-check-outline"
          size={64}
          color="#D1D5DB"
        />
        <Text style={styles.emptyText}>Sin cierres</Text>
        <Text style={styles.emptySubtext}>
          No tienes cierres semanales publicados aun.{'\n'}
          Cuando tu administrador publique un cierre, aparecera aqui.
        </Text>
      </View>
    );
  };

  /**
   * Render skeleton loading cards
   */
  const renderSkeleton = () => {
    if (!loading) return null;

    return (
      <View style={styles.skeletonContainer}>
        {[1, 2, 3].map((key) => (
          <View key={key} style={styles.skeletonCard}>
            <View style={styles.skeletonHeader}>
              <View style={styles.skeletonCircle} />
              <View style={styles.skeletonTextBlock}>
                <View style={styles.skeletonLine} />
                <View style={[styles.skeletonLine, { width: '60%' }]} />
              </View>
            </View>
            <View style={[styles.skeletonLine, { marginTop: 12 }]} />
          </View>
        ))}
      </View>
    );
  };

  // Memoized renderItem to prevent recreation on each render
  const renderItem: ListRenderItem<CierreResumen> = useCallback(
    ({ item }) => <CierreCard cierre={item} onPress={onCierrePress} />,
    [onCierrePress]
  );

  // Stable keyExtractor
  const keyExtractor = useCallback((item: CierreResumen) => item.id, []);

  return (
    <FlatList
      data={cierres}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={[
        styles.listContent,
        cierres.length === 0 && styles.listContentEmpty,
      ]}
      ListEmptyComponent={renderEmpty}
      ListHeaderComponent={loading ? renderSkeleton : null}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2563eb']}
            tintColor="#2563eb"
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  // Skeleton styles
  skeletonContainer: {
    paddingHorizontal: 0,
  },
  skeletonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  skeletonTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginBottom: 8,
  },
});

export default CierresList;
