import React from 'react';
import { FlatList, View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import NovedadCard from './NovedadCard';
import type { Novedad, EstadoNovedad } from '../../services/novedadesService';

interface NovedadesListProps {
  novedades: Novedad[];
  onNovedadPress: (novedad: Novedad) => void;
  filtroEstado?: EstadoNovedad;
  refreshing?: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  isOffline?: boolean;
}

const NovedadesList: React.FC<NovedadesListProps> = ({
  novedades,
  onNovedadPress,
  filtroEstado,
  refreshing = false,
  onRefresh,
  loading = false,
  isOffline = false,
}) => {
  const novedadesFiltradas = filtroEstado
    ? novedades.filter(n => n.estado === filtroEstado)
    : novedades;

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.emptyText}>Cargando novedades...</Text>
        </View>
      );
    }

    // Mensaje especial cuando está offline
    if (isOffline) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons
            name="wifi-off"
            size={64}
            color="#D1D5DB"
          />
          <Text style={styles.emptyText}>Sin conexión</Text>
          <Text style={styles.emptySubtext}>
            Las novedades requieren conexión a internet.{'\n'}
            Intenta de nuevo cuando tengas conexión.
          </Text>
        </View>
      );
    }

    const mensaje = filtroEstado
      ? getEmptyMessageForEstado(filtroEstado)
      : '¡No has reportado ninguna novedad todavía!';

    const submensaje = filtroEstado
      ? ''
      : 'Presiona el botón + para reportar tu primera novedad.';

    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons
          name="file-document-alert-outline"
          size={64}
          color="#D1D5DB"
        />
        <Text style={styles.emptyText}>{mensaje}</Text>
        {submensaje && <Text style={styles.emptySubtext}>{submensaje}</Text>}
      </View>
    );
  };

  const getEmptyMessageForEstado = (estado: EstadoNovedad): string => {
    switch (estado) {
      case 'pendiente':
        return 'No tienes novedades pendientes de revisión';
      case 'aprobada':
        return 'No tienes novedades aprobadas';
      case 'rechazada':
        return 'No tienes novedades rechazadas';
      default:
        return 'No hay novedades para mostrar';
    }
  };

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
            <View style={[styles.skeletonLine, { width: '80%' }]} />
          </View>
        ))}
      </View>
    );
  };

  return (
    <FlatList
      data={novedadesFiltradas}
      renderItem={({ item }) => (
        <NovedadCard novedad={item} onPress={() => onNovedadPress(item)} />
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        styles.listContent,
        novedadesFiltradas.length === 0 && styles.listContentEmpty,
      ]}
      ListEmptyComponent={renderEmpty}
      ListHeaderComponent={loading ? renderSkeleton : null}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#059669']}
            tintColor="#059669"
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
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
  },
  // Skeleton styles
  skeletonContainer: {
    paddingHorizontal: 16,
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

export default NovedadesList;
