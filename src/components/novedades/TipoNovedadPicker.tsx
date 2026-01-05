import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TIPOS_NOVEDAD_LABELS, type TipoNovedad } from '../../services/novedadesService';

interface TipoNovedadPickerProps {
  value: TipoNovedad | null;
  onChange: (tipo: TipoNovedad) => void;
  error?: string;
}

const TIPOS_OPTIONS: Array<{
  value: TipoNovedad;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  description: string;
}> = [
  {
    value: 'entrada_tardia',
    label: 'Entrada tardía',
    icon: 'clock-alert',
    description: 'Llegué tarde a mi jornada laboral'
  },
  {
    value: 'salida_temprana',
    label: 'Salida temprana',
    icon: 'clock-fast',
    description: 'Necesité salir antes de tiempo'
  },
  {
    value: 'ausencia',
    label: 'Ausencia',
    icon: 'account-cancel',
    description: 'No pude asistir a trabajar'
  },
  {
    value: 'permiso',
    label: 'Permiso',
    icon: 'file-check',
    description: 'Permiso autorizado previamente'
  },
  {
    value: 'otro',
    label: 'Otro',
    icon: 'file-question',
    description: 'Otra situación no listada'
  }
];

const TipoNovedadPicker: React.FC<TipoNovedadPickerProps> = ({ value, onChange, error }) => {
  const [modalVisible, setModalVisible] = React.useState(false);

  const selectedOption = TIPOS_OPTIONS.find(opt => opt.value === value);

  const handleSelect = (tipo: TipoNovedad) => {
    onChange(tipo);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        Tipo de novedad <Text style={styles.required}>*</Text>
      </Text>

      <TouchableOpacity
        style={[styles.selector, error && styles.selectorError]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        {selectedOption ? (
          <View style={styles.selectedContent}>
            <MaterialCommunityIcons
              name={selectedOption.icon}
              size={24}
              color="#059669"
            />
            <View style={styles.selectedText}>
              <Text style={styles.selectedLabel}>{selectedOption.label}</Text>
              <Text style={styles.selectedDescription}>{selectedOption.description}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.placeholder}>Selecciona el tipo de novedad</Text>
        )}
        <MaterialCommunityIcons name="chevron-down" size={24} color="#6B7280" />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona el tipo</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={TIPOS_OPTIONS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && styles.optionSelected
                  ]}
                  onPress={() => handleSelect(item.value)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={32}
                    color={item.value === value ? '#059669' : '#6B7280'}
                  />
                  <View style={styles.optionText}>
                    <Text style={[
                      styles.optionLabel,
                      item.value === value && styles.optionLabelSelected
                    ]}>
                      {item.label}
                    </Text>
                    <Text style={styles.optionDescription}>{item.description}</Text>
                  </View>
                  {item.value === value && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={24}
                      color="#059669"
                    />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    minHeight: 56,
  },
  selectorError: {
    borderColor: '#EF4444',
  },
  placeholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  selectedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  optionSelected: {
    backgroundColor: '#F0FDF4',
  },
  optionText: {
    marginLeft: 16,
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  optionLabelSelected: {
    color: '#059669',
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
});

export default TipoNovedadPicker;
