import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import novedadesService, {
  type Novedad,
  type TipoNovedad,
  type EstadoNovedad,
  type EstadisticasNovedades,
} from '../services/novedadesService';

// =====================================================
// HOOK USENOVEDADES
// =====================================================

export const useNovedades = () => {
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [estadisticas, setEstadisticas] = useState<EstadisticasNovedades>({
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
    abiertas: 0,
    revisadas: 0,
    total: 0,
  });

  /**
   * Verifica si hay conexión a internet
   */
  const checkConnection = async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    const offline = !state.isConnected || !state.isInternetReachable;
    setIsOffline(offline);
    return !offline;
  };

  /**
   * Carga las novedades del usuario
   */
  const cargarNovedades = async (
    filtroEstado?: EstadoNovedad,
    filtroTipo?: TipoNovedad,
  ) => {
    try {
      setLoading(true);
      setError(null);

      const hasConnection = await checkConnection();
      if (!hasConnection) {
        setNovedades([]);
        return;
      }

      const data = await novedadesService.obtenerNovedades(filtroEstado, filtroTipo);
      setNovedades(data);
    } catch (err) {
      // Solo loguear si no es error de conexión
      const isNetworkError = err instanceof Error &&
        (err.message.includes('network') || err.message.includes('Network') || err.message.includes('fetch'));

      if (!isNetworkError) {
        const mensaje = err instanceof Error ? err.message : 'Error al cargar novedades';
        setError(mensaje);
        console.error('Error cargando novedades:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Carga las estadísticas del usuario
   */
  const cargarEstadisticas = async () => {
    try {
      // No cargar si estamos offline
      const hasConnection = await checkConnection();
      if (!hasConnection) return;

      const stats = await novedadesService.obtenerEstadisticas();
      setEstadisticas(stats);
    } catch (err) {
      // Silenciar errores de red (son esperados offline)
      const isNetworkError = err instanceof Error &&
        (err.message.includes('network') || err.message.includes('Network') || err.message.includes('fetch'));

      if (!isNetworkError) {
        console.error('Error cargando estadísticas:', err);
      }
    }
  };

  /**
   * Crea una nueva novedad
   */
  const crearNovedad = async (data: {
    fecha: string;
    tipo_novedad: TipoNovedad;
    motivo: string;
  }): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // Verificar conexión antes de intentar crear
      const hasConnection = await checkConnection();
      if (!hasConnection) {
        Alert.alert(
          'Sin conexión',
          'No puedes crear novedades sin conexión a internet. Intenta cuando tengas conexión.',
          [{ text: 'OK' }]
        );
        return false;
      }

      // Obtener ubicación
      const ubicacion = await novedadesService.obtenerUbicacionActual();

      // Crear novedad
      const novedad = await novedadesService.crearNovedad({
        fecha: data.fecha,
        tipo_novedad: data.tipo_novedad,
        motivo: data.motivo,
        latitud: ubicacion?.latitud,
        longitud: ubicacion?.longitud
      });

      if (!novedad) {
        throw new Error('No se pudo crear la novedad');
      }

      // Recargar listas
      await cargarNovedades();
      await cargarEstadisticas();

      Alert.alert(
        'Éxito',
        'Tu novedad ha sido reportada exitosamente. Recibirás una notificación cuando sea revisada.',
        [{ text: 'OK' }]
      );

      return true;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al crear novedad';
      setError(mensaje);
      Alert.alert(
        'Error',
        `No se pudo crear la novedad: ${mensaje}`,
        [{ text: 'OK' }]
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Obtiene una novedad por ID
   */
  const obtenerNovedadPorId = async (id: string): Promise<Novedad | null> => {
    try {
      return await novedadesService.obtenerNovedadPorId(id);
    } catch (err) {
      console.error('Error obteniendo novedad:', err);
      return null;
    }
  };

  /**
   * Filtra novedades por estado
   */
  const filtrarPorEstado = (estado?: EstadoNovedad) => {
    if (!estado) {
      return novedades;
    }
    return novedades.filter(n => n.estado === estado);
  };

  useEffect(() => {
    let isMounted = true;
    let unsubscribeFunc: (() => void) | undefined;

    const inicializar = async () => {
      const { data: { user } } = await novedadesService.obtenerUsuarioActual();

      if (!user || !isMounted) return;

      await cargarNovedades();
      await cargarEstadisticas();

      const unsub = novedadesService.suscribirACambios(user.id, (novedadActualizada) => {
        setNovedades(prev =>
          prev.map(n => n.id === novedadActualizada.id ? novedadActualizada : n)
        );

        if (novedadActualizada.estado !== 'pendiente') {
          Alert.alert(
            'Novedad actualizada',
            `Tu novedad ha sido ${novedadActualizada.estado}${
              novedadActualizada.comentarios_revision
                ? `\n\nComentarios: ${novedadActualizada.comentarios_revision}`
                : ''
            }`,
            [{ text: 'OK' }]
          );
        }

        cargarEstadisticas();
      });

      // Si el hook se desmonta entre el await y este punto, limpiar inmediatamente.
      if (!isMounted) {
        unsub();
        return;
      }

      unsubscribeFunc = unsub;
    };

    inicializar();

    return () => {
      isMounted = false;
      if (unsubscribeFunc) {
        unsubscribeFunc();
      }
    };
  }, []);

  return {
    // Estado
    novedades,
    loading,
    error,
    isOffline,
    estadisticas,

    // Funciones
    cargarNovedades,
    cargarEstadisticas,
    crearNovedad,
    obtenerNovedadPorId,
    filtrarPorEstado
  };
};

export default useNovedades;
