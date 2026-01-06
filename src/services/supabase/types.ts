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
          id: number;
          cedula: string;
          empleado: string;
          fecha: string;
          hora_inicio_decimal: number | null;
          hora_fin_decimal: number | null;
          timestamp_procesamiento: string | null;
          created_at: string | null;
          updated_at: string | null;
          updated_by: string | null;
          // Mobile app columns
          foto_url: string | null;
          observaciones: string | null;
          latitud: number | null;
          longitud: number | null;
          tipo_marcaje: string | null; // 'clock_in' | 'clock_out'
          timestamp_local: number | null;
          fuente: string | null; // 'mobile'
          deleted_at: string | null;
          deleted_by: string | null;
        };
        Insert: {
          id?: number;
          cedula: string;
          empleado: string;
          fecha: string;
          hora_inicio_decimal?: number | null;
          hora_fin_decimal?: number | null;
          timestamp_procesamiento?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          foto_url?: string | null;
          observaciones?: string | null;
          latitud?: number | null;
          longitud?: number | null;
          tipo_marcaje?: string | null;
          timestamp_local?: number | null;
          fuente?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
        };
        Update: {
          id?: number;
          cedula?: string;
          empleado?: string;
          fecha?: string;
          hora_inicio_decimal?: number | null;
          hora_fin_decimal?: number | null;
          timestamp_procesamiento?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          updated_by?: string | null;
          foto_url?: string | null;
          observaciones?: string | null;
          latitud?: number | null;
          longitud?: number | null;
          tipo_marcaje?: string | null;
          timestamp_local?: number | null;
          fuente?: string | null;
          deleted_at?: string | null;
          deleted_by?: string | null;
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
