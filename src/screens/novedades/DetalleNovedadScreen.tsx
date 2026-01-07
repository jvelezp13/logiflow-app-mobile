import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import NovedadStatusBadge from '../../components/novedades/NovedadStatusBadge';
import { TIPOS_NOVEDAD_LABELS } from '../../services/novedadesService';
import useNovedades from '../../hooks/useNovedades';
import type { Novedad } from '../../services/novedadesService';

type RouteParams = {
  DetalleNovedad: {
    novedadId: string;
  };
};

const DetalleNovedadScreen: React.FC = () => {
  const route = useRoute<RouteProp<RouteParams, 'DetalleNovedad'>>();
  const { novedadId } = route.params;
  const { obtenerNovedadPorId } = useNovedades();

  const [novedad, setNovedad] = useState<Novedad | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarNovedad();
  }, [novedadId]);

  const cargarNovedad = async () => {
    try {
      setLoading(true);
      const data = await obtenerNovedadPorId(novedadId);
      setNovedad(data);
    } catch (error) {
      console.error('Error cargando novedad:', error);
    } finally {
      setLoading(false);
    }
  };

  // Location tracking removed from novedades

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Cargando detalle...</Text>
      </View>
    );
  }

  if (!novedad) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>No se pudo cargar la novedad</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header con estado */}
      <View style={styles.header}>
        <NovedadStatusBadge estado={novedad.estado} size="large" />
        <Text style={styles.fecha}>
          {format(parseISO(novedad.fecha), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
        </Text>
      </View>

      {/* Información básica */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="information" size={20} color="#059669" />
          <Text style={styles.sectionTitle}>Información</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Empleado:</Text>
          <Text style={styles.infoValue}>{novedad.empleado}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Cédula:</Text>
          <Text style={styles.infoValue}>{novedad.cedula}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tipo:</Text>
          <Text style={styles.infoValue}>{TIPOS_NOVEDAD_LABELS[novedad.tipo_novedad]}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Reportada:</Text>
          <Text style={styles.infoValue}>
            {format(parseISO(novedad.created_at), "d MMM yyyy, HH:mm", { locale: es })}
          </Text>
        </View>
      </View>

      {/* Solicitud de Ajuste - solo si hay hora_nueva */}
      {novedad.hora_nueva && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="clock-edit-outline" size={20} color="#059669" />
            <Text style={styles.sectionTitle}>Solicitud de Ajuste</Text>
          </View>

          <View style={styles.horasContainer}>
            <View style={styles.horaBox}>
              <Text style={styles.horaLabel}>Hora registrada</Text>
              <Text style={styles.horaValue}>{novedad.hora_real || '--:--'}</Text>
            </View>
            <MaterialCommunityIcons name="arrow-right" size={24} color="#9CA3AF" />
            <View style={styles.horaBox}>
              <Text style={styles.horaLabel}>Hora solicitada</Text>
              <Text style={[styles.horaValue, styles.horaNueva]}>{novedad.hora_nueva}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Motivo */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="text" size={20} color="#059669" />
          <Text style={styles.sectionTitle}>Motivo</Text>
        </View>
        <Text style={styles.motivoText}>{novedad.motivo}</Text>
      </View>

      {/* Respuesta del administrador */}
      {novedad.estado !== 'pendiente' && (
        <View style={[
          styles.section,
          novedad.estado === 'aprobada' ? styles.sectionAprobada : styles.sectionRechazada
        ]}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name={novedad.estado === 'aprobada' ? 'check-circle' : 'close-circle'}
              size={20}
              color={novedad.estado === 'aprobada' ? '#059669' : '#EF4444'}
            />
            <Text style={styles.sectionTitle}>
              {novedad.estado === 'aprobada' ? 'Novedad Aprobada' : 'Novedad Rechazada'}
            </Text>
          </View>

          {novedad.fecha_revision && (
            <Text style={styles.fechaRevision}>
              Revisada el {format(parseISO(novedad.fecha_revision), "d MMM yyyy 'a las' HH:mm", { locale: es })}
            </Text>
          )}

          {novedad.comentarios_revision && (
            <View style={styles.comentariosBox}>
              <Text style={styles.comentariosLabel}>Comentarios del administrador:</Text>
              <Text style={styles.comentariosText}>{novedad.comentarios_revision}</Text>
            </View>
          )}
        </View>
      )}

      {/* Mensaje de estado pendiente */}
      {novedad.estado === 'pendiente' && (
        <View style={styles.pendienteBox}>
          <MaterialCommunityIcons name="clock-alert" size={24} color="#F59E0B" />
          <Text style={styles.pendienteText}>
            Tu novedad está pendiente de revisión. Recibirás una notificación cuando sea procesada.
          </Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  fecha: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  motivoText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  horasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  horaBox: {
    alignItems: 'center',
  },
  horaLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  horaValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },
  horaNueva: {
    color: '#059669',
  },
  ubicacionContainer: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  coordenadasLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  coordenadasValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  abrirMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  abrirMapsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  sectionAprobada: {
    backgroundColor: '#F0FDF4',
  },
  sectionRechazada: {
    backgroundColor: '#FEF2F2',
  },
  fechaRevision: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  comentariosBox: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  comentariosLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  comentariosText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  pendienteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  pendienteText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});

export default DetalleNovedadScreen;
