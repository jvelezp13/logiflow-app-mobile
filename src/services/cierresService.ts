/**
 * CierresService
 *
 * Service for managing employee weekly closures.
 * Includes operations for reading, confirming, and objecting closures.
 */

import { supabase } from './supabase/client';
import type {
  CierreSemanal,
  CierreResumen,
  EstadoCierre,
  ObjecionDia,
  EstadisticasCierres,
  DatosSemana,
} from '@/types/cierres.types';

// =====================================================
// TIPOS INTERNOS PARA SUPABASE
// =====================================================

/**
 * Row type for cierres_semanales table (not in generated types)
 */
interface CierreRow {
  id: string;
  cedula: string;
  semana_inicio: string;
  semana_fin: string;
  estado: string;
  datos_semana: DatosSemana;
  publicado_at: string | null;
  confirmado_at: string | null;
  objecion_dias: ObjecionDia[] | null;
  objecion_at: string | null;
  // Campos de respuesta del admin (B6)
  respuesta_admin: string | null;
  respondido_at: string | null;
  respondido_por: string | null;
  // Campos de evidencia de confirmación (B7)
  foto_confirmacion_url: string | null;
  vencido_at: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// SERVICIO DE CIERRES
// =====================================================

class CierresService {
  /**
   * Obtiene todos los cierres del empleado (excepto borradores)
   */
  async obtenerCierres(cedula: string): Promise<CierreResumen[]> {
    // Use type assertion since table is not in generated types
    const { data, error } = await (supabase
      .from('cierres_semanales' as never)
      .select(`
        id,
        semana_inicio,
        semana_fin,
        estado,
        datos_semana,
        publicado_at
      `)
      .eq('cedula', cedula)
      .neq('estado', 'borrador')
      .order('semana_inicio', { ascending: false }) as unknown as Promise<{
        data: CierreRow[] | null;
        error: Error | null;
      }>);

    if (error) {
      console.error('[CierresService] Error obteniendo cierres:', error);
      throw error;
    }

    return (data || []).map((cierre) => ({
      id: cierre.id,
      semana_inicio: cierre.semana_inicio,
      semana_fin: cierre.semana_fin,
      estado: cierre.estado as EstadoCierre,
      horas_trabajadas: cierre.datos_semana?.totales?.horas_trabajadas || 0,
      publicado_at: cierre.publicado_at,
    }));
  }

  /**
   * Obtiene un cierre por ID con todos los detalles
   */
  async obtenerCierrePorId(id: string): Promise<CierreSemanal | null> {
    const { data, error } = await (supabase
      .from('cierres_semanales' as never)
      .select('*')
      .eq('id', id)
      .single() as unknown as Promise<{
        data: CierreRow | null;
        error: Error | null;
      }>);

    if (error) {
      console.error('[CierresService] Error obteniendo cierre:', error);
      return null;
    }

    return data as CierreSemanal;
  }

  /**
   * Confirma un cierre semanal
   * Solo se puede confirmar si el estado es 'publicado'
   */
  async confirmarCierre(id: string): Promise<boolean> {
    const { error } = await (supabase
      .from('cierres_semanales' as never)
      .update({
        estado: 'confirmado',
        confirmado_at: new Date().toISOString(),
      } as never)
      .eq('id', id)
      .eq('estado', 'publicado') as unknown as Promise<{
        data: unknown;
        error: Error | null;
      }>);

    if (error) {
      console.error('[CierresService] Error confirmando cierre:', error);
      return false;
    }

    return true;
  }

  /**
   * Objeta un cierre semanal con comentarios por día
   * Solo se puede objetar si el estado es 'publicado'
   */
  async objetarCierre(id: string, objeciones: ObjecionDia[]): Promise<boolean> {
    const { error } = await (supabase
      .from('cierres_semanales' as never)
      .update({
        estado: 'objetado',
        objecion_dias: objeciones,
        objecion_at: new Date().toISOString(),
      } as never)
      .eq('id', id)
      .eq('estado', 'publicado') as unknown as Promise<{
        data: unknown;
        error: Error | null;
      }>);

    if (error) {
      console.error('[CierresService] Error objetando cierre:', error);
      return false;
    }

    return true;
  }

  /**
   * Obtiene estadísticas de cierres del empleado
   */
  async obtenerEstadisticas(cedula: string): Promise<EstadisticasCierres> {
    const { data, error } = await (supabase
      .from('cierres_semanales' as never)
      .select('estado')
      .eq('cedula', cedula)
      .neq('estado', 'borrador') as unknown as Promise<{
        data: { estado: string }[] | null;
        error: Error | null;
      }>);

    if (error) {
      console.error('[CierresService] Error obteniendo estadísticas:', error);
      return { pendientes: 0, confirmados: 0, objetados: 0, vencidos: 0 };
    }

    const cierres = (data || []) as { estado: EstadoCierre }[];
    return {
      pendientes: cierres.filter((c) => c.estado === 'publicado').length,
      confirmados: cierres.filter((c) => c.estado === 'confirmado').length,
      objetados: cierres.filter((c) => c.estado === 'objetado').length,
      vencidos: cierres.filter((c) => c.estado === 'vencido').length,
    };
  }

  /**
   * Sube foto de confirmación a Storage
   * Retorna URL pública o null si falla
   */
  async uploadFotoConfirmacion(
    cierreId: string,
    cedula: string,
    fotoBase64: string
  ): Promise<string | null> {
    try {
      const timestamp = Date.now();

      // Limpiar prefijo base64 si existe
      const fotoData = fotoBase64.replace(/^data:image\/\w+;base64,/, '');

      // Convertir base64 a Uint8Array
      const fotoBytes = Uint8Array.from(atob(fotoData), (c) => c.charCodeAt(0));

      // Subir foto
      const fotoFileName = `cierres/${cedula}/${cierreId}_foto_${timestamp}.jpg`;
      const { error: fotoError } = await supabase.storage
        .from('attendance_photos')
        .upload(fotoFileName, fotoBytes, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (fotoError) {
        console.error('[CierresService] Error subiendo foto:', fotoError);
        throw fotoError;
      }

      // Obtener URL pública
      const { data: fotoUrlData } = supabase.storage
        .from('attendance_photos')
        .getPublicUrl(fotoFileName);

      return fotoUrlData.publicUrl;
    } catch (error) {
      console.error('[CierresService] Error subiendo foto confirmación:', error);
      return null;
    }
  }

  /**
   * Confirma un cierre semanal con foto de evidencia
   * Solo se puede confirmar si el estado es 'publicado'
   */
  async confirmarCierreConFoto(
    id: string,
    fotoUrl: string
  ): Promise<boolean> {
    const { error } = await (supabase
      .from('cierres_semanales' as never)
      .update({
        estado: 'confirmado',
        confirmado_at: new Date().toISOString(),
        foto_confirmacion_url: fotoUrl,
      } as never)
      .eq('id', id)
      .eq('estado', 'publicado') as unknown as Promise<{
        data: unknown;
        error: Error | null;
      }>);

    if (error) {
      console.error('[CierresService] Error confirmando cierre con foto:', error);
      return false;
    }

    return true;
  }
}

export const cierresService = new CierresService();
export default cierresService;
