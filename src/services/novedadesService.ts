import { supabase } from "./supabase/client";
import * as Location from "expo-location";
import { obtenerTenantIdRequerido } from "../utils/tenant.utils";
import { startOfWeek, format, parseISO } from "date-fns";

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

export type TipoNovedad =
	| "ajuste_marcaje"
	| "exceso_tope_diario"
	| "marcaje_faltante";

export type AjusteEstado = "pendiente" | "aprobada" | "rechazada";
export type EstadoNovedad = AjusteEstado;

export interface NovedadInfo {
	id: string;
	estado: AjusteEstado;
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
	// Solo para tipo_novedad='marcaje_faltante': qué marca falta crear.
	tipo_marcaje: "clock_in" | "clock_out" | null;
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

export interface MarcajeFaltanteData {
	/** Día del marcaje olvidado (YYYY-MM-DD, debe ser <= hoy) */
	fecha: string;
	/** Qué marca falta: entrada o salida */
	tipo_marcaje: "clock_in" | "clock_out";
	/** Hora propuesta (HH:MM) */
	hora_nueva: string;
	motivo: string;
}

export interface AjusteMarcajeResult {
	success: boolean;
	novedad?: Novedad;
	error?: string;
}

export const TIPOS_NOVEDAD_LABELS: Record<TipoNovedad, string> = {
	ajuste_marcaje: "Ajuste de marcaje",
	exceso_tope_diario: "Exceso de tope diario",
	marcaje_faltante: "Marcaje faltante",
};

/**
 * Carga cédula y nombre completo (nombre + apellido) del perfil. Único lookup
 * para evitar duplicar la construcción del string en cada caller.
 */
const loadEmpleadoProfile = async (
	userId: string,
): Promise<{ cedula: string; empleado: string } | null> => {
	const { data: profile } = (await supabase
		.from("profiles")
		.select("cedula, nombre, apellido")
		.eq("user_id", userId)
		.single()) as {
		data: { cedula: string; nombre: string; apellido: string | null } | null;
	};

	if (!profile) return null;
	return {
		cedula: profile.cedula,
		empleado: `${profile.nombre}${profile.apellido ? " " + profile.apellido : ""}`,
	};
};

// =====================================================
// SERVICIO DE NOVEDADES
// =====================================================

class NovedadesService {
	/**
	 * Obtiene la ubicación actual del dispositivo
	 */
	async obtenerUbicacionActual(): Promise<{
		latitud: number;
		longitud: number;
	} | null> {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync();

			if (status !== "granted") {
				console.warn("Permiso de ubicación denegado");
				return null;
			}

			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced,
			});

			return {
				latitud: location.coords.latitude,
				longitud: location.coords.longitude,
			};
		} catch (error) {
			console.error("Error obteniendo ubicación:", error);
			return null;
		}
	}

	/**
	 * Crea una solicitud de ajuste de marcaje
	 * Si no se proporciona marcaje_id, busca el marcaje por timestamp_local
	 * Valida que la semana no tenga un cierre semanal publicado
	 */
	async crearAjusteMarcaje(
		data: AjusteMarcajeData,
	): Promise<AjusteMarcajeResult> {
		try {
			// Obtener usuario actual
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();

			if (authError || !user) {
				return { success: false, error: "Usuario no autenticado" };
			}

			const profileResult = await loadEmpleadoProfile(user.id);
			if (!profileResult) {
				return {
					success: false,
					error: "No se pudo obtener información del perfil",
				};
			}
			const { cedula, empleado: empleadoNombre } = profileResult;

			// Obtener tenant_id (requerido por RLS)
			const tenantId = obtenerTenantIdRequerido();

			// Determinar marcaje_id (lookup solo si no viene en data)
			let marcajeId = data.marcaje_id;
			if (!marcajeId && data.timestamp_local) {
				const { data: marcaje } = (await supabase
					.from("horarios_registros_diarios")
					.select("id")
					.eq("cedula", cedula)
					.eq("timestamp_local", data.timestamp_local)
					.single()) as { data: { id: number } | null; error: unknown };

				if (!marcaje) {
					console.warn(
						"No se encontró el marcaje por timestamp, continuando sin marcaje_id",
					);
				} else {
					marcajeId = marcaje.id;
				}
			}

			// Validaciones independientes en paralelo:
			// - cierre semanal publicado bloquea el ajuste
			// - ajuste aprobado existente bloquea (defensa en profundidad — HistoryScreen ya lo previene)
			const fechaMarcaje = parseISO(data.fecha);
			const semanaInicioStr = format(
				startOfWeek(fechaMarcaje, { weekStartsOn: 1 }),
				"yyyy-MM-dd",
			);

			const cierreQuery = supabase
				.from("cierres_semanales")
				.select("estado")
				.eq("cedula", cedula)
				.eq("semana_inicio", semanaInicioStr)
				.eq("estado", "publicado")
				.maybeSingle();

			const ajusteAprobadoQuery = marcajeId
				? supabase
						.from("horarios_novedades")
						.select("id")
						.eq("marcaje_id", marcajeId)
						.eq("tipo_novedad", "ajuste_marcaje")
						.eq("estado", "aprobada")
						.is("deleted_at", null)
						.maybeSingle()
				: Promise.resolve({ data: null });

			const [cierreResult, ajusteAprobadoResult] = await Promise.all([
				cierreQuery,
				ajusteAprobadoQuery,
			]);

			if (cierreResult.data) {
				return {
					success: false,
					error:
						"No puedes solicitar ajustes para esta semana porque el cierre semanal ya está publicado.",
				};
			}

			if (ajusteAprobadoResult.data) {
				return {
					success: false,
					error:
						"Este marcaje ya tiene un ajuste aprobado. Para corregirlo de nuevo, contactá al administrador para que primero revierta el ajuste anterior.",
				};
			}

			// Preparar datos para insertar
			const novedadData = {
				user_id: user.id,
				cedula,
				empleado: empleadoNombre,
				fecha: data.fecha,
				tipo_novedad: "ajuste_marcaje" as TipoNovedad,
				motivo: data.motivo,
				marcaje_id: marcajeId || null,
				hora_nueva: data.hora_nueva,
				hora_real: data.hora_real,
				tenant_id: tenantId,
			};

			// Insertar en la base de datos
			const { data: novedad, error } = await supabase
				.from("horarios_novedades")
				.insert(novedadData as never)
				.select()
				.single();

			if (error) {
				console.error("Error creando ajuste de marcaje:", error);
				// 23505 = unique_violation. La DB tiene un UNIQUE INDEX parcial sobre
				// (marcaje_id, tipo_novedad) WHERE estado='pendiente' que previene
				// duplicados. Traducimos a un mensaje legible para el empleado.
				if (error.code === "23505") {
					return {
						success: false,
						error:
							"Ya tenés una solicitud pendiente para este marcaje. Esperá a que tu supervisor la revise antes de pedir otra.",
					};
				}
				return { success: false, error: "Error al crear la solicitud" };
			}

			return { success: true, novedad: novedad as Novedad };
		} catch (error) {
			console.error("Error en crearAjusteMarcaje:", error);
			return {
				success: false,
				error: "Error inesperado al crear la solicitud",
			};
		}
	}

	/**
	 * Crea una solicitud de "marcaje faltante": un marcaje (entrada o salida) que el
	 * empleado olvidó registrar por completo y que por lo tanto NO existe en
	 * horarios_registros_diarios. A diferencia de ajuste_marcaje (que edita un marcaje
	 * existente vía marcaje_id), acá el admin INSERTA el marcaje al aprobar.
	 *
	 * Contrato backend (CHECK constraints en horarios_novedades):
	 *   - tipo_marcaje y hora_nueva obligatorios; marcaje_id y hora_real van NULL
	 *   - motivo entre 10 y 500 caracteres; fecha <= hoy
	 * Validamos en cliente para dar mensajes claros antes de pegarle a la DB.
	 */
	async crearMarcajeFaltante(
		data: MarcajeFaltanteData,
	): Promise<AjusteMarcajeResult> {
		try {
			if (
				data.tipo_marcaje !== "clock_in" &&
				data.tipo_marcaje !== "clock_out"
			) {
				return { success: false, error: "Tipo de marcaje inválido" };
			}
			if (!data.hora_nueva) {
				return { success: false, error: "La hora del marcaje es obligatoria" };
			}
			const motivo = data.motivo.trim();
			if (motivo.length < 10 || motivo.length > 500) {
				return {
					success: false,
					error: "El motivo debe tener entre 10 y 500 caracteres",
				};
			}
			// Comparación lexicográfica válida sobre el formato YYYY-MM-DD.
			const hoy = format(new Date(), "yyyy-MM-dd");
			if (data.fecha > hoy) {
				return { success: false, error: "La fecha no puede ser futura" };
			}

			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();
			if (authError || !user) {
				return { success: false, error: "Usuario no autenticado" };
			}

			const profileResult = await loadEmpleadoProfile(user.id);
			if (!profileResult) {
				return {
					success: false,
					error: "No se pudo obtener información del perfil",
				};
			}
			const { cedula, empleado: empleadoNombre } = profileResult;
			const tenantId = obtenerTenantIdRequerido();

			// No se puede reportar un marcaje faltante en una semana cuyo cierre ya
			// fue publicado (mismo invariante que crearAjusteMarcaje): al aprobar se
			// insertaría un marcaje en una semana bloqueada.
			const semanaInicioStr = format(
				startOfWeek(parseISO(data.fecha), { weekStartsOn: 1 }),
				"yyyy-MM-dd",
			);
			const { data: cierre } = await supabase
				.from("cierres_semanales")
				.select("estado")
				.eq("cedula", cedula)
				.eq("semana_inicio", semanaInicioStr)
				.eq("estado", "publicado")
				.maybeSingle();
			if (cierre) {
				return {
					success: false,
					error:
						"No puedes reportar marcajes de esta semana porque el cierre semanal ya está publicado.",
				};
			}

			const novedadData = {
				user_id: user.id,
				cedula,
				empleado: empleadoNombre,
				fecha: data.fecha,
				tipo_novedad: "marcaje_faltante" as TipoNovedad,
				tipo_marcaje: data.tipo_marcaje,
				hora_nueva: data.hora_nueva,
				hora_real: null,
				marcaje_id: null,
				motivo,
				estado: "pendiente" as EstadoNovedad,
				tenant_id: tenantId,
			};

			const { data: novedad, error } = await supabase
				.from("horarios_novedades")
				.insert(novedadData as never)
				.select()
				.single();

			if (error) {
				console.error("Error creando marcaje faltante:", error);
				// 23505 = unique_violation: ya hay una solicitud pendiente equivalente.
				if (error.code === "23505") {
					return {
						success: false,
						error:
							"Ya tenés una solicitud pendiente para ese marcaje. Esperá a que tu supervisor la revise.",
					};
				}
				return { success: false, error: "Error al crear la solicitud" };
			}

			return { success: true, novedad: novedad as Novedad };
		} catch (error) {
			console.error("Error en crearMarcajeFaltante:", error);
			return {
				success: false,
				error: "Error inesperado al crear la solicitud",
			};
		}
	}

	/**
	 * Crea una nueva novedad genérica (usado por el FAB de Solicitudes).
	 * No incluye marcaje_id ni horas; solo fecha + tipo + motivo + ubicación opcional.
	 */
	async crearNovedad(
		data: Omit<NovedadData, "user_id" | "cedula" | "empleado">,
	): Promise<Novedad | null> {
		try {
			// Obtener usuario actual
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();

			if (authError || !user) {
				throw new Error("Usuario no autenticado");
			}

			const profileResult = await loadEmpleadoProfile(user.id);
			if (!profileResult) {
				throw new Error("No se pudo obtener información del perfil");
			}

			// Obtener tenant_id (requerido por RLS — sin esto el INSERT falla silenciosamente)
			const tenantId = obtenerTenantIdRequerido();

			// Preparar datos completos
			const novedadCompleta: NovedadData & { tenant_id: string } = {
				user_id: user.id,
				cedula: profileResult.cedula,
				empleado: profileResult.empleado,
				...data,
				tenant_id: tenantId,
			};

			// Insertar en la base de datos
			const { data: novedad, error } = await supabase
				.from("horarios_novedades")
				.insert(novedadCompleta as never)
				.select()
				.single();

			if (error) {
				console.error("Error creando novedad:", error);
				throw error;
			}

			return novedad as Novedad;
		} catch (error) {
			console.error("Error en crearNovedad:", error);
			return null;
		}
	}

	async obtenerNovedades(filtroEstado?: EstadoNovedad): Promise<Novedad[]> {
		try {
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();

			if (authError || !user) {
				throw new Error("Usuario no autenticado");
			}

			let query = supabase
				.from("horarios_novedades")
				.select("*")
				.eq("user_id", user.id)
				.in("tipo_novedad", ["ajuste_marcaje", "marcaje_faltante"])
				.order("created_at", { ascending: false });

			if (filtroEstado) {
				query = query.eq("estado", filtroEstado);
			}

			const { data, error } = await query;

			if (error) {
				console.error("Error obteniendo novedades:", error);
				throw error;
			}

			return (data as Novedad[]) || [];
		} catch (error) {
			console.error("Error en obtenerNovedades:", error);
			return [];
		}
	}

	/**
	 * Obtiene una novedad por ID
	 */
	async obtenerNovedadPorId(id: string): Promise<Novedad | null> {
		try {
			const { data, error } = await supabase
				.from("horarios_novedades")
				.select("*")
				.eq("id", id)
				.single();

			if (error) {
				console.error("Error obteniendo novedad:", error);
				return null;
			}

			return data as Novedad;
		} catch (error) {
			console.error("Error en obtenerNovedadPorId:", error);
			return null;
		}
	}

	async obtenerEstadisticas(): Promise<{
		pendientes: number;
		aprobadas: number;
		rechazadas: number;
		total: number;
	}> {
		try {
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();

			if (authError || !user) {
				throw new Error("Usuario no autenticado");
			}

			const { data, error } = await supabase
				.from("horarios_novedades")
				.select("estado")
				.eq("user_id", user.id)
				.in("tipo_novedad", ["ajuste_marcaje", "marcaje_faltante"]);

			if (error) {
				console.error("Error obteniendo estadísticas:", error);
				return { pendientes: 0, aprobadas: 0, rechazadas: 0, total: 0 };
			}

			const rows = (data ?? []) as { estado: EstadoNovedad }[];
			return {
				pendientes: rows.filter((n) => n.estado === "pendiente").length,
				aprobadas: rows.filter((n) => n.estado === "aprobada").length,
				rechazadas: rows.filter((n) => n.estado === "rechazada").length,
				total: rows.length,
			};
		} catch (error) {
			console.error("Error en obtenerEstadisticas:", error);
			return { pendientes: 0, aprobadas: 0, rechazadas: 0, total: 0 };
		}
	}

	/**
	 * Suscripción a cambios en tiempo real de las novedades del usuario
	 */
	suscribirACambios(userId: string, callback: (novedad: Novedad) => void) {
		// Canal por usuario: evita que dos pantallas con useNovedades montadas a la
		// vez (o el mismo canal compartido) dupliquen handlers y disparen el Alert
		// de actualización dos veces.
		const channel = supabase
			.channel(`novedades_changes_${userId}`)
			.on(
				"postgres_changes",
				{
					event: "UPDATE",
					schema: "public",
					table: "horarios_novedades",
					filter: `user_id=eq.${userId}`,
				},
				(payload) => {
					const nuevaNovedad = payload.new as Novedad;
					if (
						nuevaNovedad.tipo_novedad !== "ajuste_marcaje" &&
						nuevaNovedad.tipo_novedad !== "marcaje_faltante"
					)
						return;
					callback(nuevaNovedad);
				},
			)
			.subscribe();

		return () => {
			channel.unsubscribe();
		};
	}

	async obtenerUsuarioActual() {
		return await supabase.auth.getUser();
	}

	async obtenerAjustesPorTimestamp(): Promise<Map<number, NovedadInfo>> {
		try {
			const {
				data: { user },
				error: authError,
			} = await supabase.auth.getUser();

			if (authError || !user) {
				return new Map();
			}

			// ORDER BY created_at DESC + skip si ya hay entry para ese timestamp:
			// si un marcaje tiene varias novedades historicas (por ejemplo aprobadas y
			// luego una rechazada nueva), nos quedamos con la mas reciente. Sin orden
			// explicito Postgrest puede devolverlas en cualquier orden y el badge mostrar
			// un estado obsoleto.
			const { data, error } = (await supabase
				.from("horarios_novedades")
				.select(`
          id,
          estado,
          marcaje_id,
          horarios_registros_diarios!horarios_novedades_marcaje_id_fkey(timestamp_local)
        `)
				.eq("user_id", user.id)
				.eq("tipo_novedad", "ajuste_marcaje")
				.not("marcaje_id", "is", null)
				.order("created_at", { ascending: false })) as {
				data: Array<{
					id: string;
					estado: string;
					marcaje_id: number;
					horarios_registros_diarios: { timestamp_local: number };
				}> | null;
				error: unknown;
			};

			if (error) {
				console.error("Error obteniendo ajustes por timestamp:", error);
				return new Map();
			}

			const map = new Map<number, NovedadInfo>();
			for (const item of data || []) {
				const ts = item.horarios_registros_diarios?.timestamp_local;
				if (ts && !map.has(ts)) {
					map.set(ts, {
						id: item.id,
						estado: item.estado as AjusteEstado,
					});
				}
			}

			return map;
		} catch (error) {
			console.error("Error en obtenerAjustesPorTimestamp:", error);
			return new Map();
		}
	}
}

export default new NovedadesService();
