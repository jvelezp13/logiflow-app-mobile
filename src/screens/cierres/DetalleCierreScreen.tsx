/**
 * DetalleCierreScreen
 *
 * Detail screen for a weekly closure.
 * Shows days, totals, and allows confirming or objecting.
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect, type RouteProp } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import CierreStatusBadge from '@/components/cierres/CierreStatusBadge';
import { ConfirmacionCierreFlow } from '@/components/cierres/ConfirmacionCierreFlow';
import useCierres from '@/hooks/useCierres';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/services/supabase/client';
import type { CierreSemanal, DiaCierre, ObjecionDia } from '@/types/cierres.types';
import type { CierresStackParamList } from '@/types/navigation.types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '@/constants/theme';

type RouteParams = RouteProp<CierresStackParamList, 'DetalleCierre'>;

/**
 * Format decimal hours to "8h 30m" or "15m" when hours is 0
 */
const formatHoras = (horas: number): string => {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  if (h === 0 && m > 0) return `${m}m`;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  return `${h}h`;
};

/**
 * Format decimal time to "h:mm AM/PM"
 */
const formatTime = (decimalTime: number | null): string => {
  if (decimalTime === null) return '--:--';
  const hours = Math.floor(decimalTime);
  const minutes = Math.round((decimalTime - hours) * 60);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

/**
 * Get modification badge info for a day
 */
const getModificacionInfo = (observaciones: string[] | undefined) => {
  if (!observaciones) return null;
  if (observaciones.includes('manual')) {
    return { icon: 'pencil-plus' as const, color: '#D97706', label: 'Manual' };
  }
  if (observaciones.includes('editado')) {
    return { icon: 'pencil' as const, color: '#6B7280', label: 'Editado' };
  }
  if (observaciones.includes('ajustado')) {
    return { icon: 'clock-edit-outline' as const, color: '#2563EB', label: 'Ajustado' };
  }
  return null;
};

/**
 * Memoized component for approval row
 * OPTIMIZATION: Prevents re-render when parent updates
 */
const AprobacionRow = memo(({
  tipo,
  aprobadas,
  rechazadas,
}: {
  tipo: string;
  aprobadas: number;
  rechazadas: number;
}) => (
  <View style={styles.aprobacionRow}>
    <Text style={styles.aprobacionTipo}>{tipo}</Text>
    <View style={styles.aprobacionBadges}>
      {aprobadas > 0 && (
        <View style={[styles.badge, styles.badgeAprobada]}>
          <Text style={styles.badgeTextAprobada}>✓ {formatHoras(aprobadas)}</Text>
        </View>
      )}
      {rechazadas > 0 && (
        <View style={[styles.badge, styles.badgeRechazada]}>
          <Text style={styles.badgeTextRechazada}>✗ {formatHoras(rechazadas)}</Text>
        </View>
      )}
    </View>
  </View>
));

/**
 * Memoized component for day row
 * OPTIMIZATION: Prevents re-render of all 7 days when only one changes
 */
const DiaCierreRow = memo(({
  dia,
  index,
  isSeleccionado,
  showObjecionModal,
  onToggle,
}: {
  dia: DiaCierre;
  index: number;
  isSeleccionado: boolean;
  showObjecionModal: boolean;
  onToggle: (fecha: string) => void;
}) => {
  const fechaDate = parseISO(dia.fecha);
  const isDescanso = dia.observaciones?.includes('ausente') || dia.horas_netas === 0;
  const modificacion = getModificacionInfo(dia.observaciones);

  return (
    <TouchableOpacity
      style={[
        styles.diaRow,
        index % 2 === 0 && styles.diaRowAlt,
        isDescanso && styles.diaDescanso,
        showObjecionModal && isSeleccionado && styles.diaSeleccionado,
      ]}
      onPress={() => showObjecionModal && onToggle(dia.fecha)}
      disabled={!showObjecionModal}
      activeOpacity={showObjecionModal ? 0.7 : 1}
    >
      <View style={styles.diaInfo}>
        <View style={styles.diaNombreRow}>
          <Text style={[styles.diaNombre, isDescanso && styles.diaDescansoText]}>
            {dia.dia_semana}
          </Text>
          {modificacion && (
            <View style={[styles.modificacionBadge, { backgroundColor: modificacion.color + '20' }]}>
              <MaterialCommunityIcons
                name={modificacion.icon}
                size={12}
                color={modificacion.color}
              />
            </View>
          )}
        </View>
        <Text style={styles.diaFecha}>
          {format(fechaDate, 'd MMM', { locale: es })}
        </Text>
      </View>
      <View style={styles.diaHoraContainer}>
        <Text style={[styles.diaHora, isDescanso && styles.diaDescansoText]}>
          {formatTime(dia.entrada)}
        </Text>
        {dia.jornadas && dia.jornadas > 1 && (
          <Text style={styles.jornadasIndicator}>
            ({dia.jornadas} jornadas)
          </Text>
        )}
      </View>
      <View style={styles.diaHoraContainer}>
        <Text style={[styles.diaHora, isDescanso && styles.diaDescansoText]}>
          {formatTime(dia.salida)}
        </Text>
      </View>
      <Text style={[styles.diaTotal, isDescanso && styles.diaDescansoText]}>
        {formatHoras(dia.horas_netas)}
      </Text>
      {showObjecionModal && (
        <MaterialCommunityIcons
          name={isSeleccionado ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={24}
          color={isSeleccionado ? COLORS.error : COLORS.textSecondary}
        />
      )}
    </TouchableOpacity>
  );
});

export const DetalleCierreScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { userCedula } = useAuth();
  const { obtenerCierrePorId, confirmarCierreConFoto, objetarCierre } = useCierres(userCedula);

  const [cierre, setCierre] = useState<CierreSemanal | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // State for objection modal
  const [showObjecionModal, setShowObjecionModal] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState<Set<string>>(new Set());
  const [comentarioObjecion, setComentarioObjecion] = useState('');

  // State for confirmation flow (B7)
  const [showConfirmacionFlow, setShowConfirmacionFlow] = useState(false);

  // State for rejection comments
  const [comentariosRechazo, setComentariosRechazo] = useState<string[]>([]);

  // Helper para traducir tipo de novedad
  const traducirTipo = useCallback((tipo: string): string => {
    const traducciones: Record<string, string> = {
      'horas_extra': 'Extra diarias',
      'horas_extra_nocturna': 'Extra nocturnas',
      'horas_extra_semanal': 'Extra semanales',
      'horas_nocturnas': 'Nocturnas',
    };
    return traducciones[tipo] || tipo;
  }, []);

  // Cargar comentarios de rechazo cuando hay horas rechazadas
  const cargarComentariosRechazo = useCallback(async (cierreData: CierreSemanal) => {
    const totales = cierreData.datos_semana.totales;
    const tieneRechazadas =
      (totales.horas_extra_rechazadas ?? 0) > 0 ||
      (totales.horas_extra_nocturna_rechazadas ?? 0) > 0 ||
      (totales.horas_extra_semanal_rechazadas ?? 0) > 0 ||
      (totales.horas_nocturnas_rechazadas ?? 0) > 0;

    if (!tieneRechazadas) {
      setComentariosRechazo([]);
      return;
    }

    try {
      const { data } = await supabase
        .from('horarios_novedades')
        .select('tipo_novedad, comentarios_revision')
        .eq('cedula', cierreData.cedula)
        .gte('fecha', cierreData.semana_inicio)
        .lte('fecha', cierreData.semana_fin)
        .eq('estado', 'rechazada')
        .not('comentarios_revision', 'is', null) as { data: { tipo_novedad: string; comentarios_revision: string }[] | null };

      if (data && data.length > 0) {
        setComentariosRechazo(
          data.map(n => `${traducirTipo(n.tipo_novedad)}: ${n.comentarios_revision}`)
        );
      } else {
        setComentariosRechazo([]);
      }
    } catch (error) {
      console.error('Error cargando comentarios de rechazo:', error);
      setComentariosRechazo([]);
    }
  }, [traducirTipo]);

  const cargarCierre = useCallback(async () => {
    try {
      setLoading(true);
      const data = await obtenerCierrePorId(route.params.cierreId);
      setCierre(data);
      if (data) {
        cargarComentariosRechazo(data);
      }
    } catch (error) {
      console.error('Error cargando cierre:', error);
    } finally {
      setLoading(false);
    }
  }, [route.params.cierreId, obtenerCierrePorId, cargarComentariosRechazo]);

  // Reload data every time screen is focused (not just on mount)
  useFocusEffect(
    useCallback(() => {
      cargarCierre();
    }, [cargarCierre])
  );

  // formatHoras, formatTime, and getModificacionInfo moved outside component for optimization

  /**
   * Handle confirming the closure (B7: with selfie)
   */
  const handleConfirmar = () => {
    Alert.alert(
      'Confirmar cierre',
      '¿Estas de acuerdo con las horas registradas para esta semana?\n\nSe te pedira una selfie como evidencia.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: () => setShowConfirmacionFlow(true),
        },
      ]
    );
  };

  /**
   * Handle confirmation with photo (B7)
   */
  const handleConfirmWithPhoto = async (fotoBase64: string): Promise<boolean> => {
    if (!userCedula) {
      Alert.alert('Error', 'No se pudo obtener la cedula del usuario.');
      return false;
    }

    const success = await confirmarCierreConFoto(
      route.params.cierreId,
      fotoBase64,
      userCedula
    );

    if (success) {
      Alert.alert('Confirmado', 'El cierre ha sido confirmado exitosamente.');
      navigation.goBack();
    } else {
      Alert.alert('Error', 'No se pudo confirmar el cierre. Intenta nuevamente.');
    }

    return success;
  };

  /**
   * Open objection modal
   */
  const handleObjetar = () => {
    setShowObjecionModal(true);
  };

  /**
   * Toggle day selection for objection
   */
  const toggleDiaSeleccionado = (fecha: string) => {
    const newSet = new Set(diasSeleccionados);
    if (newSet.has(fecha)) {
      newSet.delete(fecha);
    } else {
      newSet.add(fecha);
    }
    setDiasSeleccionados(newSet);
  };

  /**
   * Submit objection
   */
  const enviarObjecion = async () => {
    if (diasSeleccionados.size === 0) {
      Alert.alert('Error', 'Debes seleccionar al menos un dia para objetar.');
      return;
    }
    if (!comentarioObjecion.trim()) {
      Alert.alert('Error', 'Debes agregar un comentario explicando la objecion.');
      return;
    }
    if (comentarioObjecion.trim().length < 10) {
      Alert.alert('Error', 'El comentario debe tener al menos 10 caracteres.');
      return;
    }

    const objeciones: ObjecionDia[] = Array.from(diasSeleccionados).map((fecha) => ({
      fecha,
      comentario: comentarioObjecion.trim(),
    }));

    setProcesando(true);
    const success = await objetarCierre(route.params.cierreId, objeciones);
    setProcesando(false);

    if (success) {
      setShowObjecionModal(false);
      setDiasSeleccionados(new Set());
      setComentarioObjecion('');
      navigation.goBack();
    }
  };

  /**
   * Close objection modal
   */
  const cerrarModalObjecion = () => {
    setShowObjecionModal(false);
    setDiasSeleccionados(new Set());
    setComentarioObjecion('');
  };

  // renderDia replaced by DiaCierreRow memoized component

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando detalle...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (!cierre) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>No se pudo cargar el cierre</Text>
          <TouchableOpacity style={styles.retryButton} onPress={cargarCierre}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { datos_semana } = cierre;
  const puedeResponder = cierre.estado === 'publicado';

  // Variables auxiliares para sección de aprobación
  // Usar valores de novedades (aprobadas/rechazadas) para determinar si hay horas especiales
  const tieneHorasEspeciales =
    (datos_semana.totales.horas_extra_aprobadas ?? 0) > 0 ||
    (datos_semana.totales.horas_extra_rechazadas ?? 0) > 0 ||
    (datos_semana.totales.horas_extra_nocturna_aprobadas ?? 0) > 0 ||
    (datos_semana.totales.horas_extra_nocturna_rechazadas ?? 0) > 0 ||
    (datos_semana.totales.horas_extra_semanal_aprobadas ?? 0) > 0 ||
    (datos_semana.totales.horas_extra_semanal_rechazadas ?? 0) > 0 ||
    (datos_semana.totales.horas_nocturnas_aprobadas ?? 0) > 0 ||
    (datos_semana.totales.horas_nocturnas_rechazadas ?? 0) > 0;

  const tieneHorasRechazadas =
    (datos_semana.totales.horas_extra_rechazadas ?? 0) > 0 ||
    (datos_semana.totales.horas_extra_nocturna_rechazadas ?? 0) > 0 ||
    (datos_semana.totales.horas_extra_semanal_rechazadas ?? 0) > 0 ||
    (datos_semana.totales.horas_nocturnas_rechazadas ?? 0) > 0;

  // AprobacionRow moved outside component for optimization (memoized)

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <CierreStatusBadge estado={cierre.estado} size="large" />
          <Text style={styles.semana}>
            {format(parseISO(cierre.semana_inicio), 'd MMM', { locale: es })} -{' '}
            {format(parseISO(cierre.semana_fin), "d MMM yyyy", { locale: es })}
          </Text>
          {cierre.estado === 'publicado' && (
            <Text style={styles.headerHint}>
              Revisa las horas y confirma o reporta una discrepancia
            </Text>
          )}
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen de la semana</Text>

          {/* Total de horas registradas */}
          <View style={styles.horasRegistradasContainer}>
            <Text style={styles.horasRegistradasValue}>
              {formatHoras(datos_semana.totales.horas_trabajadas)}
            </Text>
            <Text style={styles.horasRegistradasLabel}>Registradas</Text>
          </View>

          {/* Horas especiales con badges inline */}
          {tieneHorasEspeciales && (
            <View style={styles.horasEspecialesCompacto}>
              {/* Extra diarias - mostrar si hay aprobadas o rechazadas */}
              {((datos_semana.totales.horas_extra_aprobadas ?? 0) > 0 ||
                (datos_semana.totales.horas_extra_rechazadas ?? 0) > 0) && (
                <AprobacionRow
                  tipo="Extra diarias"
                  aprobadas={datos_semana.totales.horas_extra_aprobadas ?? 0}
                  rechazadas={datos_semana.totales.horas_extra_rechazadas ?? 0}
                />
              )}

              {/* Extra nocturnas */}
              {((datos_semana.totales.horas_extra_nocturna_aprobadas ?? 0) > 0 ||
                (datos_semana.totales.horas_extra_nocturna_rechazadas ?? 0) > 0) && (
                <AprobacionRow
                  tipo="Extra nocturnas"
                  aprobadas={datos_semana.totales.horas_extra_nocturna_aprobadas ?? 0}
                  rechazadas={datos_semana.totales.horas_extra_nocturna_rechazadas ?? 0}
                />
              )}

              {/* Extra semanales */}
              {((datos_semana.totales.horas_extra_semanal_aprobadas ?? 0) > 0 ||
                (datos_semana.totales.horas_extra_semanal_rechazadas ?? 0) > 0) && (
                <AprobacionRow
                  tipo="Extra semanales"
                  aprobadas={datos_semana.totales.horas_extra_semanal_aprobadas ?? 0}
                  rechazadas={datos_semana.totales.horas_extra_semanal_rechazadas ?? 0}
                />
              )}

              {/* Nocturnas ordinarias */}
              {((datos_semana.totales.horas_nocturnas_aprobadas ?? 0) > 0 ||
                (datos_semana.totales.horas_nocturnas_rechazadas ?? 0) > 0) && (
                <AprobacionRow
                  tipo="Nocturnas"
                  aprobadas={datos_semana.totales.horas_nocturnas_aprobadas ?? 0}
                  rechazadas={datos_semana.totales.horas_nocturnas_rechazadas ?? 0}
                />
              )}

              {/* Comentarios de rechazo (si existen) */}
              {tieneHorasRechazadas && comentariosRechazo.length > 0 && (
                <View style={styles.comentariosRechazo}>
                  <Text style={styles.comentariosTitle}>Motivo del rechazo:</Text>
                  {comentariosRechazo.map((comentario, idx) => (
                    <Text key={idx} style={styles.comentarioRechazoText}>
                      • {comentario}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Day detail */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle por dia</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Dia</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Entrada</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Salida</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>Horas</Text>
          </View>
          {datos_semana.dias.map((dia, index) => (
            <DiaCierreRow
              key={dia.fecha}
              dia={dia}
              index={index}
              isSeleccionado={diasSeleccionados.has(dia.fecha)}
              showObjecionModal={showObjecionModal}
              onToggle={toggleDiaSeleccionado}
            />
          ))}
        </View>

        {/* Admin response (B6) - Shows when admin has responded to previous objection */}
        {cierre.respuesta_admin && (
          <View style={[styles.section, styles.respuestaSection]}>
            <View style={styles.respuestaHeader}>
              <MaterialCommunityIcons
                name="message-reply-text"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.sectionTitle}>Respuesta del administrador</Text>
            </View>
            <Text style={styles.respuestaTexto}>{cierre.respuesta_admin}</Text>
            {cierre.respondido_at && (
              <Text style={styles.respuestaFecha}>
                Respondido el {format(parseISO(cierre.respondido_at), "d 'de' MMMM, h:mm a", { locale: es })}
              </Text>
            )}
            {cierre.estado === 'publicado' && (
              <Text style={styles.respuestaHint}>
                El administrador ha revisado tu objeción. Por favor revisa los ajustes y confirma o vuelve a objetar.
              </Text>
            )}
          </View>
        )}

        {/* Existing objections */}
        {cierre.objecion_dias && cierre.objecion_dias.length > 0 && (
          <View style={[styles.section, styles.objecionSection]}>
            <Text style={styles.sectionTitle}>
              {cierre.respuesta_admin ? 'Tu objeción anterior' : 'Dias objetados'}
            </Text>
            {cierre.objecion_dias.map((obj, index) => (
              <View key={index} style={styles.objecionItem}>
                <Text style={styles.objecionFecha}>
                  {format(parseISO(obj.fecha), "EEEE d 'de' MMM", { locale: es })}
                </Text>
                <Text style={styles.objecionComentario}>{obj.comentario}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action buttons */}
      {puedeResponder && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.objetarButton]}
            onPress={handleObjetar}
            disabled={procesando}
          >
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color={COLORS.error}
            />
            <Text style={styles.objetarText}>Objetar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmarButton]}
            onPress={handleConfirmar}
            disabled={procesando}
          >
            {procesando ? (
              <ActivityIndicator size="small" color={COLORS.textInverse} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={20}
                  color={COLORS.textInverse}
                />
                <Text style={styles.confirmarText}>Confirmar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Objection Modal */}
      <Modal
        visible={showObjecionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={cerrarModalObjecion}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Objetar cierre</Text>
            <Text style={styles.modalSubtitle}>
              Selecciona los dias con problemas y agrega un comentario
            </Text>

            <ScrollView style={styles.modalDias}>
              {datos_semana.dias.map((dia, index) => (
                <DiaCierreRow
                  key={dia.fecha}
                  dia={dia}
                  index={index}
                  isSeleccionado={diasSeleccionados.has(dia.fecha)}
                  showObjecionModal={showObjecionModal}
                  onToggle={toggleDiaSeleccionado}
                />
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>
              Comentario ({diasSeleccionados.size} dias seleccionados)
            </Text>
            <TextInput
              style={styles.comentarioInput}
              placeholder="Describe el problema con los dias seleccionados (min. 10 caracteres)..."
              value={comentarioObjecion}
              onChangeText={setComentarioObjecion}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={cerrarModalObjecion}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmit,
                  (diasSeleccionados.size === 0 || comentarioObjecion.length < 10) &&
                    styles.modalSubmitDisabled,
                ]}
                onPress={enviarObjecion}
                disabled={procesando || diasSeleccionados.size === 0}
              >
                {procesando ? (
                  <ActivityIndicator size="small" color={COLORS.textInverse} />
                ) : (
                  <Text style={styles.modalSubmitText}>Enviar objecion</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Confirmation Flow with Selfie (B7) */}
      <ConfirmacionCierreFlow
        visible={showConfirmacionFlow}
        cierreId={route.params.cierreId}
        cedula={userCedula || ''}
        onClose={() => setShowConfirmacionFlow(false)}
        onConfirm={handleConfirmWithPhoto}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    marginTop: SPACING.md,
    color: COLORS.error,
    fontSize: FONT_SIZES.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  retryText: {
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  header: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  semana: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  headerHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  section: {
    backgroundColor: COLORS.surface,
    marginTop: SPACING.sm,
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.md,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  // Estilos para diseño compacto de horas registradas
  horasRegistradasContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  horasRegistradasValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.text,
  },
  horasRegistradasLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  horasEspecialesCompacto: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  totalesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  totalItem: {
    minWidth: 80,
    alignItems: 'center',
    padding: SPACING.sm,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
  },
  totalValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalExtra: {
    color: COLORS.success,
  },
  totalExtraNocturna: {
    color: '#7C3AED', // Violeta - consistente con Web Admin
  },
  totalExtraSemanal: {
    color: '#EA580C', // Orange for weekly extra hours
  },
  totalLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableHeaderText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  diaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  diaRowAlt: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  diaDescanso: {
    opacity: 0.6,
  },
  diaSeleccionado: {
    backgroundColor: '#FEE2E2',
  },
  diaInfo: {
    flex: 1.5,
  },
  diaNombreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  diaNombre: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.text,
  },
  modificacionBadge: {
    padding: 2,
    borderRadius: 4,
  },
  diaFecha: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  diaHoraContainer: {
    flex: 1,
    alignItems: 'center',
  },
  diaHora: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textAlign: 'center',
  },
  jornadasIndicator: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  diaTotal: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  diaDescansoText: {
    color: COLORS.textTertiary,
  },
  respuestaSection: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  respuestaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  respuestaTexto: {
    fontSize: FONT_SIZES.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  respuestaFecha: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  respuestaHint: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  objecionSection: {
    backgroundColor: '#FEF2F2',
  },
  objecionItem: {
    padding: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.xs,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  objecionFecha: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.error,
    textTransform: 'capitalize',
  },
  objecionComentario: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  objetarButton: {
    backgroundColor: '#FEE2E2',
  },
  confirmarButton: {
    backgroundColor: COLORS.success,
  },
  objetarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.error,
  },
  confirmarText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textInverse,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  modalDias: {
    maxHeight: 250,
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  comentarioInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    minHeight: 80,
    fontSize: FONT_SIZES.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundSecondary,
  },
  modalCancelText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  modalSubmit: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.error,
  },
  modalSubmitDisabled: {
    opacity: 0.5,
  },
  modalSubmitText: {
    fontSize: FONT_SIZES.md,
    fontWeight: '600',
    color: COLORS.textInverse,
  },
  // Estilos para sección de aprobación de horas especiales
  aprobacionSection: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: BORDER_RADIUS.md,
  },
  aprobacionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  aprobacionTipo: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    flex: 1,
  },
  aprobacionBadges: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  badgeAprobada: {
    backgroundColor: '#DCFCE7', // Verde claro
  },
  badgeRechazada: {
    backgroundColor: '#FEE2E2', // Rojo claro
  },
  badgeTextAprobada: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: '#166534', // Verde oscuro
  },
  badgeTextRechazada: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: '#991B1B', // Rojo oscuro
  },
  // Estilos para comentarios de rechazo
  comentariosRechazo: {
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: '#FEF2F2', // Rojo muy claro
    borderRadius: BORDER_RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  comentariosTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: SPACING.xs,
  },
  comentarioRechazoText: {
    fontSize: FONT_SIZES.sm,
    color: '#7F1D1D',
    marginLeft: SPACING.xs,
    marginTop: 2,
  },
});

export default DetalleCierreScreen;
