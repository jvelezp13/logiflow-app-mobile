/**
 * DataManagement Component
 *
 * Manage local data (clear cache, reset database).
 */

import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { dbUtils } from '@services/storage';
import { notificationsService } from '@services/notifications';
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

  /**
   * Clear all notifications
   */
  const handleClearNotifications = () => {
    Alert.alert(
      'Limpiar Notificaciones',
      '¿Deseas cancelar todas las notificaciones programadas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await notificationsService.cancelAllNotifications();
              Alert.alert('Éxito', 'Todas las notificaciones han sido canceladas.');
            } catch (error) {
              console.error('[DataManagement] Clear notifications error:', error);
              Alert.alert('Error', 'No se pudieron cancelar las notificaciones.');
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  /**
   * Reset database (DANGEROUS)
   */
  const handleResetDatabase = () => {
    Alert.alert(
      '⚠️ Resetear Base de Datos',
      'ADVERTENCIA: Esto eliminará TODOS los datos locales de forma permanente.\n\n' +
        '• Todos los marcajes no sincronizados se perderán\n' +
        '• Esta acción NO se puede deshacer\n\n' +
        '¿Estás completamente seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear',
          style: 'destructive',
          onPress: () => {
            // Double confirmation
            Alert.alert(
              'Última Confirmación',
              '¿REALMENTE deseas eliminar todos los datos locales?',
              [
                { text: 'No, cancelar', style: 'cancel' },
                {
                  text: 'Sí, eliminar todo',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setIsProcessing(true);
                      await dbUtils.resetDatabase();
                      Alert.alert(
                        'Base de Datos Reseteada',
                        'Todos los datos locales han sido eliminados.'
                      );
                    } catch (error) {
                      console.error('[DataManagement] Reset database error:', error);
                      Alert.alert('Error', 'No se pudo resetear la base de datos.');
                    } finally {
                      setIsProcessing(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
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

      {/* Clear Notifications */}
      <Button
        title="Cancelar Todas las Notificaciones"
        icon="🔕"
        onPress={handleClearNotifications}
        loading={isProcessing}
        disabled={isProcessing}
        variant="outline"
        style={styles.actionButton}
      />

      {/* Reset Database */}
      <Button
        title="Resetear Base de Datos Local"
        icon="⚠️"
        onPress={handleResetDatabase}
        loading={isProcessing}
        disabled={isProcessing}
        variant="danger"
        style={styles.actionButton}
      />
    </View>
  );
};
