/**
 * CierresService
 *
 * Service for reading employee weekly closures.
 */

import { supabase } from "./supabase/client";
import type {
	CierreSemanal,
	CierreResumen,
	EstadoCierre,
	EstadisticasCierres,
	DatosSemana,
} from "@/types/cierres.types";

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
	created_at: string;
	updated_at: string;
}

// =====================================================
// SERVICIO DE CIERRES
// =====================================================

class CierresService {
	/**
	 * Obtiene todos los cierres del empleado
	 */
	async obtenerCierres(cedula: string): Promise<CierreResumen[]> {
		// Use type assertion since table is not in generated types
		const { data, error } = await (supabase
			.from("cierres_semanales" as never)
			.select(`
        id,
        semana_inicio,
        semana_fin,
        estado,
        datos_semana,
        publicado_at
      `)
			.eq("cedula", cedula)
			.order("semana_inicio", { ascending: false })
			.limit(4) as unknown as Promise<{
			data: CierreRow[] | null;
			error: Error | null;
		}>);

		if (error) {
			console.error("[CierresService] Error obteniendo cierres:", error);
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
	 * Obtiene un cierre por ID con todos los detalles vivos para móvil.
	 */
	async obtenerCierrePorId(id: string): Promise<CierreSemanal | null> {
		const { data, error } = await (supabase
			.from("cierres_semanales" as never)
			.select(`
        id,
        cedula,
        semana_inicio,
        semana_fin,
        estado,
        datos_semana,
        publicado_at,
        created_at,
        updated_at
      `)
			.eq("id", id)
			.single() as unknown as Promise<{
			data: CierreRow | null;
			error: Error | null;
		}>);

		if (error) {
			console.error("[CierresService] Error obteniendo cierre:", error);
			return null;
		}

		return data as CierreSemanal;
	}

	/**
	 * Obtiene estadísticas de cierres del empleado
	 */
	async obtenerEstadisticas(cedula: string): Promise<EstadisticasCierres> {
		const { data, error } = await (supabase
			.from("cierres_semanales" as never)
			.select("estado")
			.eq("cedula", cedula) as unknown as Promise<{
			data: { estado: string }[] | null;
			error: Error | null;
		}>);

		if (error) {
			console.error("[CierresService] Error obteniendo estadísticas:", error);
			return { pendientes: 0 };
		}

		const cierres = (data || []) as { estado: EstadoCierre }[];
		return {
			pendientes: cierres.filter((c) => c.estado === "publicado").length,
		};
	}
}

export const cierresService = new CierresService();
export default cierresService;
