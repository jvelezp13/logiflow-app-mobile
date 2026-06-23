/**
 * ReportarMarcajeFaltanteScreen
 *
 * Form to report a clock in/out that was never registered (full forgot).
 * Unlike SolicitarAjuste (edits an existing marcaje), this creates a
 * 'marcaje_faltante' novedad that the admin turns into a real marcaje on approval.
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
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import {
  COLORS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SPACING,
  BORDER_RADIUS,
} from '@constants/theme';
import { Button } from '@components/ui/Button';
import type { RootStackParamList } from '@/types/navigation.types';
import novedadesService from '@services/novedadesService';

type ReportarMarcajeFaltanteRouteProp = RouteProp<
  RootStackParamList,
  'ReportarMarcajeFaltante'
>;

type MarcajeTipo = 'clock_in' | 'clock_out';

export const ReportarMarcajeFaltanteScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ReportarMarcajeFaltanteRouteProp>();
  const params = route.params ?? {};

  // Salida es el default: es el caso seguro que destraba una jornada abierta
  // (el trigger nunca rechaza un clock_out faltante).
  const [tipo, setTipo] = useState<MarcajeTipo>(params.tipoSugerido ?? 'clock_out');
  const [fecha, setFecha] = useState<Date>(() =>
    params.fechaSugerida ? new Date(`${params.fechaSugerida}T00:00:00`) : new Date()
  );
  const [hora, setHora] = useState<Date>(new Date());
  const [motivo, setMotivo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatFecha = (date: Date): string =>
    date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const formatHora = (date: Date): string => {
    const display12h = date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${display12h} (${h}:${m})`;
  };

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setFecha(selectedDate);
  };

  const handleTimeChange = (_event: unknown, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) setHora(selectedDate);
  };

  const openDatePicker = useCallback(() => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fecha,
        mode: 'date',
        maximumDate: new Date(), // no futuro (espeja el constraint fecha <= hoy)
        onChange: (_event, selectedDate) => {
          if (selectedDate) setFecha(selectedDate);
        },
      });
    } else {
      setShowDatePicker(true);
    }
  }, [fecha]);

  const openTimePicker = useCallback(() => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: hora,
        mode: 'time',
        is24Hour: true,
        onChange: (_event, selectedDate) => {
          if (selectedDate) setHora(selectedDate);
        },
      });
    } else {
      setShowTimePicker(true);
    }
  }, [hora]);

  const handleSubmit = async () => {
    const trimmedMotivo = motivo.trim();
    if (trimmedMotivo.length < 10) {
      Alert.alert(
        'Motivo requerido',
        'Por favor describe el motivo del marcaje faltante (mínimo 10 caracteres).'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const fechaStr = format(fecha, 'yyyy-MM-dd');
      const horaStr = `${String(hora.getHours()).padStart(2, '0')}:${String(hora.getMinutes()).padStart(2, '0')}`;

      const result = await novedadesService.crearMarcajeFaltante({
        fecha: fechaStr,
        tipo_marcaje: tipo,
        hora_nueva: horaStr,
        motivo: trimmedMotivo,
      });

      if (result.success) {
        Alert.alert(
          'Solicitud enviada',
          'Tu solicitud de marcaje faltante ha sido enviada. Un administrador la revisará.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert(
          'Error',
          result.error || 'No se pudo enviar la solicitud. Por favor intenta nuevamente.'
        );
      }
    } catch (error) {
      console.error('Error submitting marcaje faltante:', error);
      Alert.alert('Error', 'Ocurrió un error al enviar la solicitud.');
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
          {/* Tipo de marcaje faltante */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ¿Qué marcaje olvidaste? <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.typeSelector}>
              {(['clock_in', 'clock_out'] as MarcajeTipo[]).map((t) => {
                const selected = tipo === t;
                const isIn = t === 'clock_in';
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeOption, selected && styles.typeOptionSelected]}
                    onPress={() => setTipo(t)}
                  >
                    <MaterialCommunityIcons
                      name={isIn ? 'login' : 'logout'}
                      size={22}
                      color={
                        selected
                          ? COLORS.textInverse
                          : isIn
                            ? COLORS.clockIn
                            : COLORS.clockOut
                      }
                    />
                    <Text
                      style={[
                        styles.typeOptionText,
                        selected && styles.typeOptionTextSelected,
                      ]}
                    >
                      {isIn ? 'Entrada' : 'Salida'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Fecha */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Día del marcaje <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity style={styles.selector} onPress={openDatePicker}>
              <MaterialCommunityIcons
                name="calendar"
                size={24}
                color={COLORS.primary}
              />
              <Text style={styles.selectorText}>{formatFecha(fecha)}</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            {showDatePicker && Platform.OS === 'ios' && (
              <DateTimePicker
                value={fecha}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Hora */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Hora {tipo === 'clock_in' ? 'de entrada' : 'de salida'}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity style={styles.selector} onPress={openTimePicker}>
              <MaterialCommunityIcons
                name="clock-edit-outline"
                size={24}
                color={COLORS.primary}
              />
              <Text style={styles.selectorText}>{formatHora(hora)}</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
            {showTimePicker && Platform.OS === 'ios' && (
              <DateTimePicker
                value={hora}
                mode="time"
                is24Hour={true}
                display="spinner"
                onChange={handleTimeChange}
              />
            )}
          </View>

          {/* Motivo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Motivo <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe por qué no quedó registrado este marcaje..."
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
  typeSelector: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  typeOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  typeOptionText: {
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.text,
  },
  typeOptionTextSelected: {
    color: COLORS.textInverse,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  selectorText: {
    flex: 1,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    color: COLORS.primary,
    textTransform: 'capitalize',
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

export default ReportarMarcajeFaltanteScreen;
