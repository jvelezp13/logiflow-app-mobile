/**
 * StatsSection Component
 *
 * Display app statistics in Settings.
 */

import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAppStats } from '@hooks/useAppStats';
import { Button } from '@components/ui/Button';
import { styles } from './StatsSection.styles';

export const StatsSection: React.FC = () => {
  const { stats, isLoading, refresh } = useAppStats();

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Total Records */}
        <View style={styles.row}>
          <Text style={styles.label}>Total de marcajes:</Text>
          <Text style={styles.value}>{stats.totalRecords}</Text>
        </View>

        {/* Synced Records */}
        <View style={styles.row}>
          <Text style={styles.label}>Sincronizados:</Text>
          <Text style={[styles.value, styles.valueSuccess]}>{stats.syncedRecords}</Text>
        </View>

        {/* Pending Records */}
        <View style={styles.row}>
          <Text style={styles.label}>Pendientes de sync:</Text>
          <Text
            style={[
              styles.value,
              stats.pendingRecords > 0 ? styles.valueWarning : styles.valueSuccess,
            ]}
          >
            {stats.pendingRecords}
          </Text>
        </View>

        {/* Network Status */}
        <View style={styles.row}>
          <Text style={styles.label}>Estado de red:</Text>
          <View style={styles.networkStatus}>
            <View
              style={[
                styles.networkIndicator,
                stats.hasNetwork ? styles.networkOnline : styles.networkOffline,
              ]}
            />
            <Text style={styles.value}>{stats.hasNetwork ? 'Conectado' : 'Sin conexión'}</Text>
          </View>
        </View>
      </View>

      {/* Refresh Button */}
      <Button
        title="Actualizar Estadísticas"
        icon="📊"
        onPress={refresh}
        variant="outline"
        style={styles.refreshButton}
      />
    </View>
  );
};
