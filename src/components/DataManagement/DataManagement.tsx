/**
 * DataManagement Component
 *
 * Manage local data (force sync).
 * Note: Reset database and clear notifications options removed for safety (A7).
 */

import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { syncService } from '@services/sync';
import { Button } from '@components/ui/Button';
import { styles } from './DataManagement.styles';

export const DataManagement: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Force sync now
   */
  const handleForceSync = async () => {
    try {
      setIsProcessing(true);

      const result = await syncService.syncPendingRecords();

      if (result.total === 0) {
        Alert.alert(
          'Todo sincronizado',
          'No hay marcajes pendientes de sincronización.\n\nTodos tus marcajes están sincronizados con el servidor.'
        );
      } else if (result.synced > 0) {
        Alert.alert(
          'Sincronización Completa',
          `Se sincronizaron ${result.synced} de ${result.total} marcajes exitosamente.${
            result.failed > 0 ? `\n\n${result.failed} marcajes fallaron. Se reintentarán automáticamente.` : ''
          }`
        );
      } else if (result.failed > 0) {
        Alert.alert(
          'Error de Sincronización',
          `No se pudieron sincronizar ${result.failed} marcajes.\n\nVerifica tu conexión a internet e intenta nuevamente.`
        );
      }
    } catch (error) {
      console.error('[DataManagement] Force sync error:', error);
      Alert.alert('Error', 'No se pudo sincronizar. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Warning Card */}
      <View style={styles.warningCard}>
        <Text style={styles.warningText}>
          <Text style={styles.warningBold}>Importante:</Text> Los datos locales se sincronizan
          automáticamente. Solo usa estas opciones si es necesario.
        </Text>
      </View>

      {/* Force Sync */}
      <Button
        title="Forzar Sincronización Ahora"
        icon="🔄"
        onPress={handleForceSync}
        loading={isProcessing}
        disabled={isProcessing}
        variant="outline"
        style={styles.actionButton}
      />
    </View>
  );
};
