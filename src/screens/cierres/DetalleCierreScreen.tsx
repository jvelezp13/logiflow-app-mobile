/**
 * DetalleCierreScreen
 *
 * Detail screen for a weekly closure.
 * Shows days, totals, and allows confirming or objecting.
 */

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import CierreStatusBadge from '@/components/cierres/CierreStatusBadge';
import { ConfirmacionCierreFlow } from '@/components/cierres/ConfirmacionCierreFlow';
import useCierres from '@/hooks/useCierres';
import { useAuth } from '@/hooks/useAuth';
import type { CierreSemanal, DiaCierre, ObjecionDia } from '@/types/cierres.types';
import type { CierresStackParamList } from '@/types/navigation.types';
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from '@/constants/theme';

type RouteParams = RouteProp<CierresStackParamList, 'DetalleCierre'>;

export const DetalleCierreScreen: React.FC = () => {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { userCedula } = useAuth();
  const { obtenerCierrePorId, confirmarCierreConEvidencia, objetarCierre } = useCierres(userCedula);

  const [cierre, setCierre] = useState<CierreSemanal | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // State for objection modal
  const [showObjecionModal, setShowObjecionModal] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState<Set<string>>(new Set());
  const [comentarioObjecion, setComentarioObjecion] = useState('');

  // State for confirmation flow (B7)
  const [showConfirmacionFlow, setShowConfirmacionFlow] = useState(false);

  const cargarCierre = useCallback(async () => {
    try {
      setLoading(true);
      const data = await obtenerCierrePorId(route.params.cierreId);
      setCierre(data);
    } catch (error) {
      console.error('Error cargando cierre:', error);
    } finally {
      setLoading(false);
    }
  }, [route.params.cierreId, obtenerCierrePorId]);

  useEffect(() => {
    cargarCierre();
  }, [cargarCierre]);

  /**
   * Format decimal hours to "8h 30m"
   */
  const formatHoras = (horas: number): string => {
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  /**
   * Format decimal time to "HH:mm"
   */
  const formatTime = (decimalTime: number | null): string => {
    if (decimalTime === null) return '--:--';
    const hours = Math.floor(decimalTime);
    const minutes = Math.round((decimalTime - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  /**
   * Handle confirming the closure (B7: with selfie + signature)
   */
  const handleConfirmar = () => {
    Alert.alert(
      'Confirmar cierre',
      '¿Estas de acuerdo con las horas registradas para esta semana?\n\nSe te pedira una selfie y tu firma como evidencia.',
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
   * Handle confirmation with evidence (B7)
   */
  const handleConfirmWithEvidence = async (
    fotoBase64: string,
    firmaBase64: string
  ): Promise<boolean> => {
    if (!userCedula) {
      Alert.alert('Error', 'No se pudo obtener la cedula del usuario.');
      return false;
    }

    const success = await confirmarCierreConEvidencia(
      route.params.cierreId,
      fotoBase64,
      firmaBase64,
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

  /**
   * Render a day row
   */
  const renderDia = (dia: DiaCierre, index: number) => {
    const fechaDate = parseISO(dia.fecha);
    const isSeleccionado = diasSeleccionados.has(dia.fecha);
    const isDescanso = dia.observaciones?.includes('ausente') || dia.horas_netas === 0;

    return (
      <TouchableOpacity
        key={dia.fecha}
        style={[
          styles.diaRow,
          index % 2 === 0 && styles.diaRowAlt,
          isDescanso && styles.diaDescanso,
          showObjecionModal && isSeleccionado && styles.diaSeleccionado,
        ]}
        onPress={() => showObjecionModal && toggleDiaSeleccionado(dia.fecha)}
        disabled={!showObjecionModal}
        activeOpacity={showObjecionModal ? 0.7 : 1}
      >
        <View style={styles.diaInfo}>
          <Text style={[styles.diaNombre, isDescanso && styles.diaDescansoText]}>
            {dia.dia_semana}
          </Text>
          <Text style={styles.diaFecha}>
            {format(fechaDate, 'd MMM', { locale: es })}
          </Text>
        </View>
        <Text style={[styles.diaHora, isDescanso && styles.diaDescansoText]}>
          {formatTime(dia.entrada)}
        </Text>
        <Text style={[styles.diaHora, isDescanso && styles.diaDescansoText]}>
          {formatTime(dia.salida)}
        </Text>
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
  };

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
          <View style={styles.totalesGrid}>
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>
                {formatHoras(datos_semana.totales.horas_trabajadas)}
              </Text>
              <Text style={styles.totalLabel}>Trabajadas</Text>
            </View>
            {datos_semana.totales.horas_extra > 0 && (
              <View style={styles.totalItem}>
                <Text style={[styles.totalValue, styles.totalExtra]}>
                  {formatHoras(datos_semana.totales.horas_extra)}
                </Text>
                <Text style={styles.totalLabel}>Extras</Text>
              </View>
            )}
            {datos_semana.totales.horas_nocturnas > 0 && (
              <View style={styles.totalItem}>
                <Text style={styles.totalValue}>
                  {formatHoras(datos_semana.totales.horas_nocturnas)}
                </Text>
                <Text style={styles.totalLabel}>Nocturnas</Text>
              </View>
            )}
            <View style={styles.totalItem}>
              <Text style={styles.totalValue}>{datos_semana.totales.dias_trabajados || 0}</Text>
              <Text style={styles.totalLabel}>Dias</Text>
            </View>
          </View>
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
          {datos_semana.dias.map((dia, index) => renderDia(dia, index))}
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
                Respondido el {format(parseISO(cierre.respondido_at), "d 'de' MMMM, HH:mm", { locale: es })}
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Objetar cierre</Text>
            <Text style={styles.modalSubtitle}>
              Selecciona los dias con problemas y agrega un comentario
            </Text>

            <ScrollView style={styles.modalDias}>
              {datos_semana.dias.map((dia, index) => renderDia(dia, index))}
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
        </View>
      </Modal>

      {/* Confirmation Flow with Evidence (B7) */}
      <ConfirmacionCierreFlow
        visible={showConfirmacionFlow}
        cierreId={route.params.cierreId}
        cedula={userCedula || ''}
        onClose={() => setShowConfirmacionFlow(false)}
        onConfirm={handleConfirmWithEvidence}
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
  diaNombre: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.text,
  },
  diaFecha: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  diaHora: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.text,
    textAlign: 'center',
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
});

export default DetalleCierreScreen;
