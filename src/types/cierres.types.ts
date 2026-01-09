/**
 * Cierres Types
 *
 * Type definitions for weekly closures (cierres semanales).
 */

/**
 * Estado del cierre semanal
 */
export type EstadoCierre = 'borrador' | 'publicado' | 'confirmado' | 'objetado' | 'vencido';

/**
 * Detalle de un día dentro del cierre
 */
export interface DiaCierre {
  fecha: string; // YYYY-MM-DD
  dia_semana: string; // 'Lunes', 'Martes', etc.
  entrada: number | null; // Hora decimal (e.g., 9.5 = 9:30 AM)
  salida: number | null; // Hora decimal
  horas_brutas: number;
  horas_netas: number;
  horas_exceso: number;
  horas_nocturnas: number;
  observaciones: string[]; // ['ausente', 'exceso', 'nocturno', 'ajustado']
}

/**
 * Totales del cierre semanal
 */
export interface TotalesCierre {
  horas_trabajadas: number;
  horas_ordinarias: number;
  horas_extra: number;
  horas_nocturnas: number;
  novedades_aplicadas: number;
  dias_ausente: number;
  dias_trabajados: number;
  // Estado de aprobación de horas especiales
  horas_extra_aprobadas: number;
  horas_extra_pendientes: number;
  horas_extra_rechazadas: number;
  horas_nocturnas_aprobadas: number;
  horas_nocturnas_pendientes: number;
  horas_nocturnas_rechazadas: number;
}

/**
 * Snapshot de configuración al momento del cierre
 */
export interface ConfigSnapshot {
  max_horas_semana: number;
  max_horas_dia: number;
  minutos_descanso: number;
}

/**
 * Datos completos de la semana
 */
export interface DatosSemana {
  dias: DiaCierre[];
  totales: TotalesCierre;
  config_snapshot: ConfigSnapshot;
}

/**
 * Objeción de un día específico
 */
export interface ObjecionDia {
  fecha: string; // YYYY-MM-DD
  comentario: string;
}

/**
 * Cierre semanal completo
 */
export interface CierreSemanal {
  id: string;
  cedula: string;
  semana_inicio: string; // YYYY-MM-DD
  semana_fin: string; // YYYY-MM-DD
  datos_semana: DatosSemana;
  estado: EstadoCierre;
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
  firma_confirmacion_url: string | null;
  vencido_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Resumen de cierre para la lista
 */
export interface CierreResumen {
  id: string;
  semana_inicio: string;
  semana_fin: string;
  estado: EstadoCierre;
  horas_trabajadas: number;
  publicado_at: string | null;
}

/**
 * Estadísticas de cierres del empleado
 */
export interface EstadisticasCierres {
  pendientes: number;
  confirmados: number;
  objetados: number;
  vencidos: number;
}
