/**
 * TipoNovedadPicker - DEPRECATED
 *
 * This component is no longer used since the novedades system was simplified
 * to only support 'ajuste_marcaje' type.
 *
 * The new flow: History -> tap record -> SolicitarAjusteScreen
 * No type selection needed.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { TipoNovedad } from '../../services/novedadesService';

interface TipoNovedadPickerProps {
  value: TipoNovedad | null;
  onChange: (tipo: TipoNovedad) => void;
  error?: string;
}

/**
 * @deprecated This component is no longer used.
 * The novedades system now only supports 'ajuste_marcaje'.
 * Use SolicitarAjusteScreen directly from History.
 */
const TipoNovedadPicker: React.FC<TipoNovedadPickerProps> = ({ value, onChange, error }) => {
  // Auto-select the only available type
  React.useEffect(() => {
    if (!value) {
      onChange('ajuste_marcaje');
    }
  }, [value, onChange]);

  return (
    <View style={styles.container}>
      <View style={styles.selector}>
        <MaterialCommunityIcons
          name="clock-edit-outline"
          size={24}
          color="#059669"
        />
        <View style={styles.selectedText}>
          <Text style={styles.selectedLabel}>Ajuste de marcaje</Text>
          <Text style={styles.selectedDescription}>Corregir hora de entrada o salida</Text>
        </View>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    padding: 12,
  },
  selectedText: {
    marginLeft: 12,
    flex: 1,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  selectedDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});

export default TipoNovedadPicker;
