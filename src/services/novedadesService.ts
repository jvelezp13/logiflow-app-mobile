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
  descripcion?: string;
  foto_url?: string;
  latitud?: number;
  longitud?: number;
}

export type TipoNovedad =
  | 'entrada_tardia'
  | 'salida_temprana'
  | 'ausencia'
  | 'permiso'
  | 'otro';

export type EstadoNovedad = 'pendiente' | 'aprobada' | 'rechazada';

export interface Novedad {
  id: string;
  user_id: string;
  cedula: string;
  empleado: string;
  fecha: string;
  tipo_novedad: TipoNovedad;
  motivo: string;
  descripcion: string | null;
  foto_url: string | null;
  latitud: number | null;
  longitud: number | null;
  estado: EstadoNovedad;
  revisado_por: string | null;
  fecha_revision: string | null;
  comentarios_revision: string | null;
  created_at: string;
  updated_at: string;
}

export const TIPOS_NOVEDAD_LABELS: Record<TipoNovedad, string> = {
  entrada_tardia: 'Ajuste de entrada',
  salida_temprana: 'Ajuste de salida',
  ausencia: 'Ausencia',
  permiso: 'Permiso',
  otro: 'Otro'
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
   * Sube una foto de evidencia a Supabase Storage
   * Uses base64 encoding for React Native compatibility
   */
  async subirFotoEvidencia(userId: string, fotoUri: string): Promise<string | null> {
    try {
      const timestamp = Date.now();
      const filename = `novedades/${userId}/${timestamp}_evidencia.jpg`;

      // React Native: Read file as base64 and convert to ArrayBuffer
      const response = await fetch(fotoUri);
      const arrayBuffer = await response.arrayBuffer();

      const { data, error } = await supabase.storage
        .from('attendance_photos')
        .upload(filename, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) {
        console.error('Error subiendo foto:', error);
        return null;
      }

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('attendance_photos')
        .getPublicUrl(filename);

      return publicUrl;
    } catch (error) {
      console.error('Error en subirFotoEvidencia:', error);
      return null;
    }
  }

  /**
   * Crea una nueva novedad
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
        .single();

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
        .insert(novedadCompleta)
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

      const stats = {
        pendientes: data.filter(n => n.estado === 'pendiente').length,
        aprobadas: data.filter(n => n.estado === 'aprobada').length,
        rechazadas: data.filter(n => n.estado === 'rechazada').length,
        total: data.length
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
}

export default new NovedadesService();
