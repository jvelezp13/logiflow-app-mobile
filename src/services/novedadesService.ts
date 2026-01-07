import { supabase } from './supabase/client';
import * as Location from 'expo-location';

// =====================================================
// TIPOS
// =====================================================

export interface NovedadData {
  user_id: string;
  cedula: string;
  empleado: string;
  fecha: string; // YYYY-MM-DD
  tipo_novedad: TipoNovedad;
  motivo: string;
  latitud?: number;
  longitud?: number;
}

export type TipoNovedad = 'ajuste_marcaje';

export type EstadoNovedad = 'pendiente' | 'aprobada' | 'rechazada';

export interface NovedadInfo {
  id: string;
  estado: EstadoNovedad;
}

export interface Novedad {
  id: string;
  user_id: string;
  cedula: string;
  empleado: string;
  fecha: string;
  tipo_novedad: TipoNovedad;
  motivo: string;
  marcaje_id: number | null;
  hora_nueva: string | null;
  hora_real: string | null;
  estado: EstadoNovedad;
  revisado_por: string | null;
  fecha_revision: string | null;
  comentarios_revision: string | null;
  created_at: string;
  updated_at: string;
}

export interface AjusteMarcajeData {
  /** ID de Supabase del marcaje (si se conoce) */
  marcaje_id?: number;
  /** Timestamp del marcaje local (epoch ms) - usado para buscar en Supabase si no hay marcaje_id */
  timestamp_local?: number;
  fecha: string;
  hora_nueva: string;
  hora_real: string;
  motivo: string;
}

export const TIPOS_NOVEDAD_LABELS: Record<TipoNovedad, string> = {
  ajuste_marcaje: 'Ajuste de marcaje',
};

// =====================================================
// SERVICIO DE NOVEDADES
// =====================================================

class NovedadesService {
  /**
   * Obtiene la ubicación actual del dispositivo
   */
  async obtenerUbicacionActual(): Promise<{ latitud: number; longitud: number } | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        console.warn('Permiso de ubicación denegado');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      return {
        latitud: location.coords.latitude,
        longitud: location.coords.longitude
      };
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      return null;
    }
  }

  /**
   * Crea una solicitud de ajuste de marcaje
   * Si no se proporciona marcaje_id, busca el marcaje por timestamp_local
   */
  async crearAjusteMarcaje(data: AjusteMarcajeData): Promise<Novedad | null> {
    try {
      // Obtener usuario actual
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener datos del perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('cedula, nombre')
        .eq('user_id', user.id)
        .single() as { data: { cedula: string; nombre: string } | null; error: unknown };

      if (profileError || !profile) {
        throw new Error('No se pudo obtener información del perfil');
      }

      // Determinar marcaje_id
      let marcajeId = data.marcaje_id;

      // Si no hay marcaje_id pero hay timestamp, buscar en Supabase
      if (!marcajeId && data.timestamp_local) {
        const { data: marcaje, error: marcajeError } = await supabase
          .from('horarios_registros_diarios')
          .select('id')
          .eq('cedula', profile.cedula)
          .eq('timestamp_local', data.timestamp_local)
          .single() as { data: { id: number } | null; error: unknown };

        if (marcajeError || !marcaje) {
          console.warn('No se encontró el marcaje por timestamp, continuando sin marcaje_id');
        } else {
          marcajeId = marcaje.id;
        }
      }

      // Preparar datos para insertar
      const novedadData = {
        user_id: user.id,
        cedula: profile.cedula,
        empleado: profile.nombre,
        fecha: data.fecha,
        tipo_novedad: 'ajuste_marcaje' as TipoNovedad,
        motivo: data.motivo,
        marcaje_id: marcajeId || null,
        hora_nueva: data.hora_nueva,
        hora_real: data.hora_real,
      };

      // Insertar en la base de datos
      const { data: novedad, error } = await supabase
        .from('horarios_novedades')
        .insert(novedadData as never)
        .select()
        .single();

      if (error) {
        console.error('Error creando ajuste de marcaje:', error);
        throw error;
      }

      return novedad as Novedad;
    } catch (error) {
      console.error('Error en crearAjusteMarcaje:', error);
      return null;
    }
  }

  /**
   * Crea una nueva novedad (legacy - mantener por compatibilidad)
   * @deprecated Use crearAjusteMarcaje instead
   */
  async crearNovedad(data: Omit<NovedadData, 'user_id' | 'cedula' | 'empleado'>): Promise<Novedad | null> {
    try {
      // Obtener usuario actual
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Obtener datos del perfil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('cedula, nombre')
        .eq('user_id', user.id)
        .single() as { data: { cedula: string; nombre: string } | null; error: unknown };

      if (profileError || !profile) {
        throw new Error('No se pudo obtener información del perfil');
      }

      // Preparar datos completos
      const novedadCompleta: NovedadData = {
        user_id: user.id,
        cedula: profile.cedula,
        empleado: profile.nombre,
        ...data
      };

      // Insertar en la base de datos
      const { data: novedad, error } = await supabase
        .from('horarios_novedades')
        .insert(novedadCompleta as never)
        .select()
        .single();

      if (error) {
        console.error('Error creando novedad:', error);
        throw error;
      }

      return novedad as Novedad;
    } catch (error) {
      console.error('Error en crearNovedad:', error);
      return null;
    }
  }

  /**
   * Obtiene todas las novedades del usuario actual
   */
  async obtenerNovedades(filtroEstado?: EstadoNovedad): Promise<Novedad[]> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Usuario no autenticado');
      }

      let query = supabase
        .from('horarios_novedades')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filtroEstado) {
        query = query.eq('estado', filtroEstado);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error obteniendo novedades:', error);
        throw error;
      }

      return (data as Novedad[]) || [];
    } catch (error) {
      console.error('Error en obtenerNovedades:', error);
      return [];
    }
  }

  /**
   * Obtiene una novedad por ID
   */
  async obtenerNovedadPorId(id: string): Promise<Novedad | null> {
    try {
      const { data, error } = await supabase
        .from('horarios_novedades')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error obteniendo novedad:', error);
        return null;
      }

      return data as Novedad;
    } catch (error) {
      console.error('Error en obtenerNovedadPorId:', error);
      return null;
    }
  }

  /**
   * Obtiene estadísticas de novedades del usuario
   */
  async obtenerEstadisticas(): Promise<{
    pendientes: number;
    aprobadas: number;
    rechazadas: number;
    total: number;
  }> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase
        .from('horarios_novedades')
        .select('estado')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error obteniendo estadísticas:', error);
        return { pendientes: 0, aprobadas: 0, rechazadas: 0, total: 0 };
      }

      const novedadesData = data as { estado: EstadoNovedad }[];
      const stats = {
        pendientes: novedadesData.filter(n => n.estado === 'pendiente').length,
        aprobadas: novedadesData.filter(n => n.estado === 'aprobada').length,
        rechazadas: novedadesData.filter(n => n.estado === 'rechazada').length,
        total: novedadesData.length
      };

      return stats;
    } catch (error) {
      console.error('Error en obtenerEstadisticas:', error);
      return { pendientes: 0, aprobadas: 0, rechazadas: 0, total: 0 };
    }
  }

  /**
   * Suscripción a cambios en tiempo real de las novedades del usuario
   */
  suscribirACambios(userId: string, callback: (novedad: Novedad) => void) {
    const channel = supabase
      .channel('novedades_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'horarios_novedades',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Novedad);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  /**
   * Obtiene el usuario actual
   */
  async obtenerUsuarioActual() {
    return await supabase.auth.getUser();
  }

  /**
   * Info de novedad asociada a un marcaje
   */


  /**
   * Obtiene mapa de info de novedades por timestamp_local del marcaje
   * Útil para mostrar indicadores en el historial de marcajes
   * Hace join con horarios_registros_diarios para obtener el timestamp_local
   */
  async obtenerNovedadesPorTimestamp(): Promise<Map<number, NovedadInfo>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return new Map();
      }

      // Join novedades con registros para obtener timestamp_local
      const { data, error } = await supabase
        .from('horarios_novedades')
        .select(`
          id,
          estado,
          marcaje_id,
          horarios_registros_diarios!inner(timestamp_local)
        `)
        .eq('user_id', user.id)
        .not('marcaje_id', 'is', null) as {
          data: Array<{
            id: string;
            estado: string;
            marcaje_id: number;
            horarios_registros_diarios: { timestamp_local: number };
          }> | null;
          error: unknown;
        };

      if (error) {
        console.error('Error obteniendo novedades por timestamp:', error);
        return new Map();
      }

      const map = new Map<number, NovedadInfo>();
      for (const item of data || []) {
        if (item.horarios_registros_diarios?.timestamp_local) {
          map.set(item.horarios_registros_diarios.timestamp_local, {
            id: item.id,
            estado: item.estado as EstadoNovedad,
          });
        }
      }

      return map;
    } catch (error) {
      console.error('Error en obtenerNovedadesPorTimestamp:', error);
      return new Map();
    }
  }

  /**
   * @deprecated Use obtenerNovedadesPorTimestamp instead
   */
  async obtenerEstadosPorTimestamp(): Promise<Map<number, EstadoNovedad>> {
    const novedadesMap = await this.obtenerNovedadesPorTimestamp();
    const estadosMap = new Map<number, EstadoNovedad>();
    novedadesMap.forEach((info, timestamp) => {
      estadosMap.set(timestamp, info.estado);
    });
    return estadosMap;
  }
}

export default new NovedadesService();
