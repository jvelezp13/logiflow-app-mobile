/**
 * SolicitarAjusteScreen
 *
 * Simple form to request a time adjustment for a clock in/out record.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING, BORDER_RADIUS } from '@constants/theme';
import { Button } from '@components/ui/Button';
import type { NovedadesStackParamList } from '@/types/navigation.types';
import novedadesService from '@services/novedadesService';

type SolicitarAjusteRouteProp = RouteProp<NovedadesStackParamList, 'SolicitarAjuste'>;

export const SolicitarAjusteScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<SolicitarAjusteRouteProp>();
  const { marcajeId, fecha, tipo, horaActual } = route.params;

  // Parse current time to Date object for picker
  const [hours, minutes] = horaActual.split(':').map(Number);
  const initialDate = new Date();
  initialDate.setHours(hours, minutes, 0, 0);

  const [horaNueva, setHoraNueva] = useState<Date>(initialDate);
  const [motivo, setMotivo] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tipoLabel = tipo === 'clock_in' ? 'Entrada' : 'Salida';

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleTimeChange = (_event: unknown, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setHoraNueva(selectedDate);
    }
  };

  /**
   * Open time picker - uses imperative API on Android for reliability
   */
  const openTimePicker = useCallback(() => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: horaNueva,
        mode: 'time',
        is24Hour: false,
        onChange: (_event, selectedDate) => {
          if (selectedDate) {
            setHoraNueva(selectedDate);
          }
        },
      });
    } else {
      setShowTimePicker(true);
    }
  }, [horaNueva]);

  const handleSubmit = async () => {
    // Validate motivo
    const trimmedMotivo = motivo.trim();
    if (trimmedMotivo.length < 10) {
      Alert.alert(
        'Motivo requerido',
        'Por favor describe el motivo del ajuste (mínimo 10 caracteres).'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Format hora_nueva as HH:MM:SS for database
      const horaFormateada = `${String(horaNueva.getHours()).padStart(2, '0')}:${String(horaNueva.getMinutes()).padStart(2, '0')}:00`;

      const result = await novedadesService.crearAjusteMarcaje({
        // marcajeId here is actually the timestamp - service will lookup the real ID
        timestamp_local: marcajeId,
        fecha,
        hora_nueva: horaFormateada,
        hora_real: `${horaActual}:00`,
        motivo: trimmedMotivo,
      });

      if (result) {
        Alert.alert(
          'Solicitud enviada',
          'Tu solicitud de ajuste ha sido enviada. Un administrador la revisará.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Error',
          'No se pudo enviar la solicitud. Por favor intenta nuevamente.'
        );
      }
    } catch (error) {
      console.error('Error submitting adjustment:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error al enviar la solicitud.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header info */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name={tipo === 'clock_in' ? 'login' : 'logout'}
                size={24}
                color={tipo === 'clock_in' ? COLORS.clockIn : COLORS.clockOut}
              />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Marcaje a ajustar</Text>
                <Text style={styles.infoValue}>
                  {tipoLabel} - {fecha}
                </Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={24}
                color={COLORS.textSecondary}
              />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>Hora registrada</Text>
                <Text style={styles.infoValue}>{horaActual}</Text>
              </View>
            </View>
          </View>

          {/* New time picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Hora correcta <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.timeSelector}
              onPress={openTimePicker}
            >
              <MaterialCommunityIcons
                name="clock-edit-outline"
                size={24}
                color={COLORS.primary}
              />
              <Text style={styles.timeText}>{formatTime(horaNueva)}</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            {/* iOS only - Android uses imperative DateTimePickerAndroid API */}
            {showTimePicker && Platform.OS === 'ios' && (
              <DateTimePicker
                value={horaNueva}
                mode="time"
                is24Hour={false}
                display="spinner"
                onChange={handleTimeChange}
              />
            )}
          </View>

          {/* Motivo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Motivo del ajuste <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe por qué necesitas este ajuste..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={motivo}
              onChangeText={setMotivo}
              maxLength={500}
            />
            <Text style={styles.charCount}>
              {motivo.length}/500 caracteres (mínimo 10)
            </Text>
          </View>
        </ScrollView>

        {/* Submit button */}
        <View style={styles.footer}>
          <Button
            title="Enviar solicitud"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting || motivo.trim().length < 10}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  required: {
    color: COLORS.error,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  timeText: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
  },
  textInput: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    minHeight: 120,
  },
  charCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  footer: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
});

export default SolicitarAjusteScreen;
