/**
 * DataManagement Component
 *
 * Manage local data (force sync, verify sync integrity).
 * Note: Reset database and clear notifications options removed for safety (A7).
 */

import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { syncService } from '@services/sync';
import { Button } from '@components/ui/Button';
import { styles } from './DataManagement.styles';

export const DataManagement: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

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
   * Verify sync integrity
   * Checks if local "synced" records actually exist in Supabase
   */
  const handleVerifySync = async () => {
    try {
      setIsVerifying(true);

      const result = await syncService.verifySyncIntegrity(false);

      if (result.orphanedRecords.length === 0) {
        Alert.alert(
          'Verificación Completa',
          `✓ Todos los ${result.totalLocalSynced} registros locales están correctamente sincronizados con el servidor.`
        );
      } else {
        // Found orphaned records - ask if user wants to repair
        const orphanDetails = result.orphanedRecords
          .map(r => `• ${r.date} ${r.time} (${r.type === 'clock_in' ? 'Entrada' : 'Salida'})`)
          .join('\n');

        Alert.alert(
          'Problema Detectado',
          `Se encontraron ${result.orphanedRecords.length} registro(s) marcados como sincronizados pero que no existen en el servidor:\n\n${orphanDetails}\n\n¿Deseas repararlos? Esto los marcará para re-sincronización.`,
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'Reparar',
              style: 'default',
              onPress: handleRepairSync,
            },
          ]
        );
      }
    } catch (error) {
      console.error('[DataManagement] Verify sync error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `No se pudo verificar: ${errorMessage}`);
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Repair orphaned records
   */
  const handleRepairSync = async () => {
    try {
      setIsVerifying(true);

      const result = await syncService.verifySyncIntegrity(true);

      if (result.repairedCount > 0) {
        Alert.alert(
          'Reparación Completa',
          `Se marcaron ${result.repairedCount} registro(s) para re-sincronización.\n\nUsa "Forzar Sincronización" para enviarlos al servidor.`
        );
      } else {
        Alert.alert('Info', 'No hubo registros que reparar.');
      }
    } catch (error) {
      console.error('[DataManagement] Repair sync error:', error);
      Alert.alert('Error', 'No se pudo reparar. Intenta nuevamente.');
    } finally {
      setIsVerifying(false);
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

      {/* Verify Sync - first check if there are problems */}
      <Button
        title="Verificar Sincronización"
        icon="🔍"
        onPress={handleVerifySync}
        loading={isVerifying}
        disabled={isProcessing || isVerifying}
        variant="outline"
        style={styles.actionButton}
      />

      {/* Force Sync - then force if needed */}
      <Button
        title="Forzar Sincronización Ahora"
        icon="🔄"
        onPress={handleForceSync}
        loading={isProcessing}
        disabled={isProcessing || isVerifying}
        variant="outline"
        style={styles.actionButton}
      />
    </View>
  );
};
