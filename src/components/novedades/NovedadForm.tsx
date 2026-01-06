import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import TipoNovedadPicker from './TipoNovedadPicker';
import type { TipoNovedad } from '../../services/novedadesService';

interface NovedadFormData {
  fecha: Date;
  tipo_novedad: TipoNovedad | null;
  motivo: string;
}

interface NovedadFormProps {
  onSubmit: (data: {
    fecha: string;
    tipo_novedad: TipoNovedad;
    motivo: string;
  }) => Promise<void>;
  loading?: boolean;
}

const NovedadForm: React.FC<NovedadFormProps> = ({ onSubmit, loading = false }) => {
  const [formData, setFormData] = useState<NovedadFormData>({
    fecha: new Date(),
    tipo_novedad: null,
    motivo: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validar fecha (no puede ser futura)
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    if (formData.fecha > hoy) {
      newErrors.fecha = 'La fecha no puede ser futura';
    }

    // Validar tipo de novedad
    if (!formData.tipo_novedad) {
      newErrors.tipo_novedad = 'Debe seleccionar un tipo de novedad';
    }

    // Validar motivo (10-500 caracteres)
    const motivoTrim = formData.motivo.trim();
    if (motivoTrim.length < 10) {
      newErrors.motivo = 'El motivo debe tener al menos 10 caracteres';
    } else if (motivoTrim.length > 500) {
      newErrors.motivo = 'El motivo no puede exceder 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Formulario incompleto', 'Por favor completa todos los campos requeridos');
      return;
    }

    try {
      await onSubmit({
        fecha: format(formData.fecha, 'yyyy-MM-dd'), // Usa timezone local, no UTC
        tipo_novedad: formData.tipo_novedad!,
        motivo: formData.motivo.trim(),
      });
    } catch (error) {
      console.error('Error en submit:', error);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Fecha */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Fecha de la novedad <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.dateButton, errors.fecha && styles.inputError]}
          onPress={() => setShowDatePicker(true)}
          disabled={loading}
        >
          <MaterialCommunityIcons name="calendar" size={20} color="#059669" />
          <Text style={styles.dateText}>
            {formData.fecha.toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </TouchableOpacity>
        {errors.fecha && <Text style={styles.errorText}>{errors.fecha}</Text>}

        {showDatePicker && (
          <DateTimePicker
            value={formData.fecha}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setFormData(prev => ({ ...prev, fecha: selectedDate }));
                setErrors(prev => ({ ...prev, fecha: '' }));
              }
            }}
            maximumDate={new Date()}
          />
        )}
      </View>

      {/* Tipo de novedad */}
      <TipoNovedadPicker
        value={formData.tipo_novedad}
        onChange={(tipo) => {
          setFormData(prev => ({ ...prev, tipo_novedad: tipo }));
          setErrors(prev => ({ ...prev, tipo_novedad: '' }));
        }}
        error={errors.tipo_novedad}
      />

      {/* Motivo */}
      <View style={styles.field}>
        <Text style={styles.label}>
          Motivo de la novedad <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.textArea, errors.motivo && styles.inputError]}
          value={formData.motivo}
          onChangeText={(text) => {
            setFormData(prev => ({ ...prev, motivo: text }));
            setCharCount(text.length);
            setErrors(prev => ({ ...prev, motivo: '' }));
          }}
          placeholder="Describe el motivo de tu novedad (mínimo 10 caracteres)"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          maxLength={500}
          editable={!loading}
          textAlignVertical="top"
        />
        <View style={styles.helperRow}>
          {errors.motivo ? (
            <Text style={styles.errorText}>{errors.motivo}</Text>
          ) : (
            <Text style={styles.helperText}>Mínimo 10 caracteres</Text>
          )}
          <Text style={[
            styles.charCount,
            charCount < 10 && styles.charCountWarning,
            charCount > 500 && styles.charCountError
          ]}>
            {charCount}/500
          </Text>
        </View>
      </View>

      {/* Información de geolocalización */}
      <View style={styles.infoBox}>
        <MaterialCommunityIcons name="map-marker-check" size={20} color="#059669" />
        <Text style={styles.infoText}>
          Tu ubicación será capturada automáticamente al enviar la novedad
        </Text>
      </View>

      {/* Botón de envío */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <Text style={styles.submitButtonText}>Enviando...</Text>
        ) : (
          <>
            <MaterialCommunityIcons name="send" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Reportar Novedad</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  field: {
    marginBottom: 20,
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#111827',
    textTransform: 'capitalize',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
  },
  charCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  charCountWarning: {
    color: '#F59E0B',
  },
  charCountError: {
    color: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#059669',
  },
  submitButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default NovedadForm;
