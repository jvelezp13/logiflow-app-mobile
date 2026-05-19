/**
 * DataManagement Component
 *
 * Una sola accion: "Diagnosticar y Reparar Sincronización".
 * Detecta los tres tipos de problemas (pendientes en cola, huerfanos por exceso
 * de intentos, sincronizados huerfanos sin contraparte en Supabase) y los
 * resuelve en un flujo unico. Reemplaza los antiguos botones "Verificar" +
 * "Forzar Sincronización" + "Recuperar Atrapados" que se solapaban.
 *
 * El sync automatico corre cada 30s (useAutoSync) — este boton solo es necesario
 * cuando algo se quedo trabado o el usuario quiere ver el estado.
 */

import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { syncService } from '@services/sync';
import { Button } from '@components/ui/Button';
import { styles } from './DataManagement.styles';

export const DataManagement: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Diagnostica + repara en un solo flujo.
   *
   * Plan:
   *   1. Verifica el estado completo (orphans, stuck, processable).
   *   2. Si TODO esta OK → mensaje de confirmación.
   *   3. Si hay solo procesables → corre sync ahora.
   *   4. Si hay huerfanos/atrapados → pide confirmacion y repara + sync.
   */
  const handleDiagnoseAndRepair = async () => {
    try {
      setIsProcessing(true);

      const status = await syncService.verifySyncIntegrity(false);
      const hasOrphans = status.orphanedRecords.length > 0;
      const hasStuck = status.stuckRecords.length > 0;
      const hasProcessable = status.processableCount > 0;

      // Caso 1: todo OK.
      if (!hasOrphans && !hasStuck && !hasProcessable) {
        Alert.alert(
          '✓ Todo sincronizado',
          `${status.totalLocalSynced} marcaje(s) en este dispositivo, todos en el servidor.`
        );
        return;
      }

      // Construir mensaje de diagnostico.
      const lines: string[] = [];
      if (hasProcessable) {
        lines.push(`• ${status.processableCount} marcaje(s) en cola (se sincronizarán)`);
      }
      if (hasStuck) {
        lines.push(`• ${status.stuckRecords.length} marcaje(s) atrapado(s) (se reintentarán)`);
      }
      if (hasOrphans) {
        const previewLines = status.orphanedRecords
          .slice(0, 3)
          .map((r) => `   - ${r.date} ${r.time} (${r.type === 'clock_in' ? 'Entrada' : 'Salida'})`)
          .join('\n');
        const overflow =
          status.orphanedRecords.length > 3
            ? `\n   …y ${status.orphanedRecords.length - 3} más`
            : '';
        lines.push(
          `• ${status.orphanedRecords.length} marcaje(s) marcado(s) como sincronizado pero no están en el servidor:\n${previewLines}${overflow}`
        );
      }

      const diagnosis = lines.join('\n\n');

      // Caso 2: solo procesables (nada huerfano) → sincronizar directo, sin confirmar.
      if (hasProcessable && !hasOrphans && !hasStuck) {
        Alert.alert(
          'Sincronizando',
          `${diagnosis}\n\nSincronizando ahora...`,
          [
            {
              text: 'Sincronizar',
              style: 'default',
              onPress: () => runRepair(false, false),
            },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
        return;
      }

      // Caso 3: huerfanos y/o atrapados → pedir confirmacion explicita para reparar.
      Alert.alert(
        'Problemas detectados',
        `${diagnosis}\n\n¿Reparar y sincronizar?`,
        [
          {
            text: 'Reparar y sincronizar',
            style: 'default',
            onPress: () => runRepair(hasOrphans || hasStuck, hasProcessable || hasOrphans || hasStuck),
          },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    } catch (error) {
      console.error('[DataManagement] Diagnose error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Alert.alert('Error', `No se pudo verificar: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Ejecuta la reparacion + sync segun flags. Se llama desde el Alert de confirmación.
   *
   * @param repair - llamar verifySyncIntegrity(true) para marcar orphans/stuck como pending
   * @param sync - correr syncPendingRecords despues de la reparacion
   */
  const runRepair = async (repair: boolean, sync: boolean) => {
    try {
      setIsProcessing(true);

      let repairedCount = 0;
      if (repair) {
        const result = await syncService.verifySyncIntegrity(true);
        repairedCount = result.repairedCount;
      }

      let syncedCount = 0;
      let failedCount = 0;
      if (sync) {
        const syncResult = await syncService.syncPendingRecords();
        syncedCount = syncResult.synced;
        failedCount = syncResult.failed;
      }

      const summaryLines: string[] = [];
      if (repair) summaryLines.push(`Reparados: ${repairedCount}`);
      if (sync) summaryLines.push(`Sincronizados ahora: ${syncedCount}`);
      if (sync && failedCount > 0) summaryLines.push(`Fallaron: ${failedCount} (se reintentarán)`);

      Alert.alert('Listo', summaryLines.join('\n') || 'Operación completada.');
    } catch (error) {
      console.error('[DataManagement] Repair error:', error);
      Alert.alert('Error', 'No se pudo completar la operación. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.warningCard}>
        <Text style={styles.warningText}>
          <Text style={styles.warningBold}>Sincronización:</Text> los marcajes se envían
          al servidor automáticamente cuando hay conexión. Usá esta opción solo si
          el contador de pendientes no baja o sospechás un problema.
        </Text>
      </View>

      <Button
        title="Diagnosticar y Reparar Sincronización"
        icon="🩺"
        onPress={handleDiagnoseAndRepair}
        loading={isProcessing}
        disabled={isProcessing}
        variant="outline"
        style={styles.actionButton}
      />
    </View>
  );
};
