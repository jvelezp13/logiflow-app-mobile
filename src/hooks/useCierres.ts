/**
 * useCierres Hook
 *
 * Hook for managing employee weekly closures.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import cierresService from '@/services/cierresService';
import type {
  CierreResumen,
  CierreSemanal,
  ObjecionDia,
  EstadisticasCierres,
} from '@/types/cierres.types';

// =====================================================
// HOOK USECIERRES
// =====================================================

export const useCierres = (cedula: string | null) => {
  const [cierres, setCierres] = useState<CierreResumen[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [estadisticas, setEstadisticas] = useState<EstadisticasCierres>({
    pendientes: 0,
    confirmados: 0,
    objetados: 0,
    vencidos: 0,
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
   * Carga los cierres del empleado
   */
  const cargarCierres = useCallback(async () => {
    if (!cedula) return;

    try {
      setLoading(true);
      const hasConnection = await checkConnection();
      if (!hasConnection) {
        setCierres([]);
        return;
      }

      const data = await cierresService.obtenerCierres(cedula);
      setCierres(data);
    } catch (err) {
      const isNetworkError =
        err instanceof Error &&
        (err.message.includes('network') ||
          err.message.includes('Network') ||
          err.message.includes('fetch'));

      if (!isNetworkError) {
        console.error('[useCierres] Error cargando cierres:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [cedula]);

  /**
   * Carga las estadísticas de cierres
   */
  const cargarEstadisticas = useCallback(async () => {
    if (!cedula) return;

    try {
      const hasConnection = await checkConnection();
      if (!hasConnection) return;

      const stats = await cierresService.obtenerEstadisticas(cedula);
      setEstadisticas(stats);
    } catch (err) {
      const isNetworkError =
        err instanceof Error &&
        (err.message.includes('network') ||
          err.message.includes('Network') ||
          err.message.includes('fetch'));

      if (!isNetworkError) {
        console.error('[useCierres] Error cargando estadísticas:', err);
      }
    }
  }, [cedula]);

  /**
   * Refresca los datos (pull-to-refresh)
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([cargarCierres(), cargarEstadisticas()]);
    setRefreshing(false);
  }, [cargarCierres, cargarEstadisticas]);

  /**
   * Obtiene un cierre por ID
   */
  const obtenerCierrePorId = useCallback(
    async (id: string): Promise<CierreSemanal | null> => {
      return cierresService.obtenerCierrePorId(id);
    },
    []
  );

  /**
   * Confirma un cierre semanal
   */
  const confirmarCierre = useCallback(
    async (id: string): Promise<boolean> => {
      const hasConnection = await checkConnection();
      if (!hasConnection) {
        Alert.alert(
          'Sin conexión',
          'Necesitas conexión a internet para confirmar el cierre.'
        );
        return false;
      }

      const success = await cierresService.confirmarCierre(id);
      if (success) {
        await onRefresh();
        Alert.alert('Confirmado', 'El cierre ha sido confirmado exitosamente.');
      } else {
        Alert.alert('Error', 'No se pudo confirmar el cierre. Intenta nuevamente.');
      }
      return success;
    },
    [onRefresh]
  );

  /**
   * Objeta un cierre semanal con comentarios por día
   */
  const objetarCierre = useCallback(
    async (id: string, objeciones: ObjecionDia[]): Promise<boolean> => {
      const hasConnection = await checkConnection();
      if (!hasConnection) {
        Alert.alert(
          'Sin conexión',
          'Necesitas conexión a internet para objetar el cierre.'
        );
        return false;
      }

      const success = await cierresService.objetarCierre(id, objeciones);
      if (success) {
        await onRefresh();
        Alert.alert(
          'Objeción enviada',
          'Tu objeción ha sido registrada y será revisada por el administrador.'
        );
      } else {
        Alert.alert('Error', 'No se pudo registrar la objeción. Intenta nuevamente.');
      }
      return success;
    },
    [onRefresh]
  );

  /**
   * Confirma un cierre semanal con foto de evidencia
   */
  const confirmarCierreConFoto = useCallback(
    async (
      id: string,
      fotoBase64: string,
      cedulaEmpleado: string
    ): Promise<boolean> => {
      const hasConnection = await checkConnection();
      if (!hasConnection) {
        Alert.alert(
          'Sin conexión',
          'Necesitas conexión a internet para confirmar el cierre.'
        );
        return false;
      }

      // 1. Subir foto a Storage
      const fotoUrl = await cierresService.uploadFotoConfirmacion(
        id,
        cedulaEmpleado,
        fotoBase64
      );

      if (!fotoUrl) {
        Alert.alert('Error', 'No se pudo subir la foto. Intenta nuevamente.');
        return false;
      }

      // 2. Confirmar cierre con URL
      const success = await cierresService.confirmarCierreConFoto(id, fotoUrl);

      if (success) {
        await onRefresh();
      }

      return success;
    },
    [onRefresh]
  );

  // Cargar datos al montar o cuando cambie la cédula
  useEffect(() => {
    if (cedula) {
      cargarCierres();
      cargarEstadisticas();
    }
  }, [cedula, cargarCierres, cargarEstadisticas]);

  return {
    cierres,
    loading,
    refreshing,
    isOffline,
    estadisticas,
    onRefresh,
    obtenerCierrePorId,
    confirmarCierre,
    confirmarCierreConFoto,
    objetarCierre,
  };
};

export default useCierres;
