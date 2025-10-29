/**
 * Supabase Database Types
 *
 * These types are generated from the Supabase schema.
 * They match the schema used in logiflow-control-horarios web app.
 *
 * Main tables used by mobile app:
 * - profiles: User/employee information
 * - horarios_registros_diarios: Attendance records
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          activo: boolean;
          apellido: string | null;
          cedula: string | null;
          created_at: string;
          email: string | null;
          id: string;
          nombre: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          activo?: boolean;
          apellido?: string | null;
          cedula?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          nombre: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          activo?: boolean;
          apellido?: string | null;
          cedula?: string | null;
          created_at?: string;
          email?: string | null;
          id?: string;
          nombre?: string;
          updated_at?: string;
          user_id?: string;
        };
      };
      horarios_registros_diarios: {
        Row: {
          cedula: string;
          centro_trabajo: string | null;
          cif: string | null;
          created_at: string | null;
          created_by: string | null;
          empleado: string;
          empresa: string | null;
          fecha: string;
          fecha_procesamiento: string | null;
          hora_fin_decimal: number | null;
          hora_fin_original: string | null;
          hora_inicio_decimal: number | null;
          hora_inicio_original: string | null;
          horas_descanso: number | null;
          horas_descanso_original: string | null;
          horas_extras: number | null;
          horas_extras_original: string | null;
          horas_jornada_original: string | null;
          horas_trabajadas: number | null;
          id: number;
          jornada_completa: boolean | null;
          periodo_original: string | null;
          tiene_extras: boolean | null;
          timestamp_procesamiento: string | null;
          tipo_dia: string | null;
          updated_at: string | null;
          updated_by: string | null;
          // Mobile app columns (added 2025-10-11)
          foto_url: string | null;
          observaciones: string | null;
          latitud: number | null;
          longitud: number | null;
          tipo_marcaje: string | null; // 'clock_in' | 'clock_out'
          timestamp_local: number | null;
          fuente: string | null; // 'etl' | 'mobile'
        };
        Insert: {
          cedula: string;
          centro_trabajo?: string | null;
          cif?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          empleado: string;
          empresa?: string | null;
          fecha: string;
          fecha_procesamiento?: string | null;
          hora_fin_decimal?: number | null;
          hora_fin_original?: string | null;
          hora_inicio_decimal?: number | null;
          hora_inicio_original?: string | null;
          horas_descanso?: number | null;
          horas_descanso_original?: string | null;
          horas_extras?: number | null;
          horas_extras_original?: string | null;
          horas_jornada_original?: string | null;
          horas_trabajadas?: number | null;
          id?: number;
          jornada_completa?: boolean | null;
          periodo_original?: string | null;
          tiene_extras?: boolean | null;
          timestamp_procesamiento?: string | null;
          tipo_dia?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          // Mobile app columns (added 2025-10-11)
          foto_url?: string | null;
          observaciones?: string | null;
          latitud?: number | null;
          longitud?: number | null;
          tipo_marcaje?: string | null; // 'clock_in' | 'clock_out'
          timestamp_local?: number | null;
          fuente?: string | null; // 'etl' | 'mobile'
        };
        Update: {
          cedula?: string;
          centro_trabajo?: string | null;
          cif?: string | null;
          created_at?: string | null;
          created_by?: string | null;
          empleado?: string;
          empresa?: string | null;
          fecha?: string;
          fecha_procesamiento?: string | null;
          hora_fin_decimal?: number | null;
          hora_fin_original?: string | null;
          hora_inicio_decimal?: number | null;
          hora_inicio_original?: string | null;
          horas_descanso?: number | null;
          horas_descanso_original?: string | null;
          horas_extras?: number | null;
          horas_extras_original?: string | null;
          horas_jornada_original?: string | null;
          horas_trabajadas?: number | null;
          id?: number;
          jornada_completa?: boolean | null;
          periodo_original?: string | null;
          tiene_extras?: boolean | null;
          timestamp_procesamiento?: string | null;
          tipo_dia?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          // Mobile app columns (added 2025-10-11)
          foto_url?: string | null;
          observaciones?: string | null;
          latitud?: number | null;
          longitud?: number | null;
          tipo_marcaje?: string | null; // 'clock_in' | 'clock_out'
          timestamp_local?: number | null;
          fuente?: string | null; // 'etl' | 'mobile'
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: 'master' | 'auxiliar' | 'administrativo' | 'operario_bodega' | 'vendedor';
    };
  };
}
