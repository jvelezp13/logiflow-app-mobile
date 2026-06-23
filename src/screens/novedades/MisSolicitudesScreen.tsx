/**
 * MisSolicitudesScreen
 *
 * Lista autocontenida de las novedades propias del empleado (ajustes y marcajes
 * faltantes) con su estado y el feedback del admin. Cierra el loop de visibilidad:
 * el empleado puede seguir una solicitud pendiente hasta su aprobación/rechazo.
 *
 * Es autocontenida a propósito (no navega a DetalleNovedad) para mostrar toda la
 * info en la card y soportar bien el tipo marcaje_faltante.
 */

import React, { useCallback, useRef } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNovedades } from '@hooks/useNovedades';
import NovedadStatusBadge from '@components/novedades/NovedadStatusBadge';
import { TIPOS_NOVEDAD_LABELS, type Novedad } from '@services/novedadesService';
import { formatTimeAmPm } from '@utils/dateUtils';
import { COLORS } from '@constants/theme';
import { styles } from './MisSolicitudesScreen.styles';

const formatFecha = (fecha: string): string => {
  try {
    const t = format(parseISO(fecha), "EEEE d 'de' MMMM", { locale: es });
    return t.charAt(0).toUpperCase() + t.slice(1);
  } catch {
    return fecha;
  }
};

// hora_nueva / hora_real vienen como 'HH:MM:SS' (columna time); mostramos 12h.
const formatHora = (hora: string | null): string =>
  hora ? formatTimeAmPm(hora.slice(0, 5)) : '--:--';

const renderDetalle = (n: Novedad): string | null => {
  if (n.tipo_novedad === 'marcaje_faltante') {
    const tipo = n.tipo_marcaje === 'clock_in' ? 'Entrada' : 'Salida';
    return `${tipo} faltante · ${formatHora(n.hora_nueva)}`;
  }
  if (n.tipo_novedad === 'ajuste_marcaje') {
    return `Ajuste · ${formatHora(n.hora_real)} → ${formatHora(n.hora_nueva)}`;
  }
  return null;
};

export const MisSolicitudesScreen: React.FC = () => {
  const { novedades, loading, isOffline, cargarNovedades } = useNovedades();

  // El hook ya carga al montar; saltamos el primer focus para no duplicar el
  // fetch inicial, y recargamos en focos posteriores (ej. al volver de crear una
  // solicitud, que entra como INSERT y no lo cubre el realtime de solo-UPDATE).
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      cargarNovedades();
    }, [cargarNovedades])
  );

  const renderItem = ({ item }: { item: Novedad }) => {
    const detalle = renderDetalle(item);
    const revisada = item.estado !== 'pendiente' && !!item.comentarios_revision;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.tipoLabel}>
            {TIPOS_NOVEDAD_LABELS[item.tipo_novedad] ?? item.tipo_novedad}
          </Text>
          <NovedadStatusBadge estado={item.estado} size="small" />
        </View>
        <Text style={styles.fecha}>{formatFecha(item.fecha)}</Text>
        {detalle && <Text style={styles.detalle}>{detalle}</Text>}
        {!!item.motivo && <Text style={styles.motivo}>{item.motivo}</Text>}
        {revisada && (
          <View style={styles.revisionBox}>
            <Text style={styles.revisionLabel}>Respuesta del administrador</Text>
            <Text style={styles.revisionText}>{item.comentarios_revision}</Text>
            {item.fecha_revision && (
              <Text style={styles.revisionFecha}>
                {formatFecha(item.fecha_revision.slice(0, 10))}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>Sin solicitudes</Text>
        <Text style={styles.emptySubtext}>
          Acá vas a ver el estado de tus ajustes de marcaje y marcajes faltantes.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Sin conexión — mostrando lo último cargado</Text>
        </View>
      )}
      <FlatList
        data={novedades}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          loading || novedades.length === 0 ? styles.loadingContainer : styles.list
        }
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => cargarNovedades()} />
        }
      />
    </SafeAreaView>
  );
};

export default MisSolicitudesScreen;
