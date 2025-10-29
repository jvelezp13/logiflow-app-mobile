import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import TipoNovedadPicker from './TipoNovedadPicker';
import type { TipoNovedad } from '../../services/novedadesService';

interface NovedadFormData {
  fecha: Date;
  tipo_novedad: TipoNovedad | null;
  motivo: string;
  descripcion: string;
  foto_uri: string | null;
}

interface NovedadFormProps {
  onSubmit: (data: {
    fecha: string;
    tipo_novedad: TipoNovedad;
    motivo: string;
    descripcion?: string;
    foto_uri?: string;
  }) => Promise<void>;
  loading?: boolean;
}

const NovedadForm: React.FC<NovedadFormProps> = ({ onSubmit, loading = false }) => {
  const [formData, setFormData] = useState<NovedadFormData>({
    fecha: new Date(),
    tipo_novedad: null,
    motivo: '',
    descripcion: '',
    foto_uri: null,
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
        fecha: formData.fecha.toISOString().split('T')[0], // YYYY-MM-DD
        tipo_novedad: formData.tipo_novedad!,
        motivo: formData.motivo.trim(),
        descripcion: formData.descripcion.trim() || undefined,
        foto_uri: formData.foto_uri || undefined,
      });
    } catch (error) {
      console.error('Error en submit:', error);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu galería para seleccionar una foto'
        );
        return;
      }

      const result = await ImagePicker.launchImagePickerAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, foto_uri: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permiso requerido',
          'Necesitamos acceso a tu cámara para tomar una foto'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets[0]) {
        setFormData(prev => ({ ...prev, foto_uri: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Agregar foto de evidencia',
      'Selecciona una opción',
      [
        { text: 'Tomar foto', onPress: takePhoto },
        { text: 'Seleccionar de galería', onPress: pickImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, foto_uri: null }));
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

      {/* Descripción adicional */}
      <View style={styles.field}>
        <Text style={styles.label}>Descripción adicional (opcional)</Text>
        <TextInput
          style={styles.textArea}
          value={formData.descripcion}
          onChangeText={(text) => setFormData(prev => ({ ...prev, descripcion: text }))}
          placeholder="Agrega detalles adicionales si es necesario"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
          maxLength={500}
          editable={!loading}
          textAlignVertical="top"
        />
        <Text style={styles.helperText}>Opcional, pero puede ayudar en la revisión</Text>
      </View>

      {/* Foto de evidencia */}
      <View style={styles.field}>
        <Text style={styles.label}>Foto de evidencia (opcional)</Text>

        {formData.foto_uri ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: formData.foto_uri }} style={styles.photoPreview} />
            <TouchableOpacity
              style={styles.removePhotoButton}
              onPress={removePhoto}
              disabled={loading}
            >
              <MaterialCommunityIcons name="close-circle" size={28} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.photoButton}
            onPress={showImageOptions}
            disabled={loading}
          >
            <MaterialCommunityIcons name="camera-plus" size={32} color="#059669" />
            <Text style={styles.photoButtonText}>Agregar foto</Text>
            <Text style={styles.photoButtonSubtext}>Toca para tomar o seleccionar</Text>
          </TouchableOpacity>
        )}
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
  photoButton: {
    backgroundColor: '#F0FDF4',
    borderWidth: 2,
    borderColor: '#059669',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  photoButtonSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  photoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
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
