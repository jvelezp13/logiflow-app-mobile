/**
 * DetalleCierreScreen
 *
 * Read-only detail screen for a weekly closure.
 */

import React, { useState, useCallback, memo } from "react";
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
	useRoute,
	useFocusEffect,
	type RouteProp,
} from "@react-navigation/native";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import CierreStatusBadge from "@/components/cierres/CierreStatusBadge";
import useCierres from "@/hooks/useCierres";
import { supabase } from "@/services/supabase/client";
import type { CierreSemanal, DiaCierre } from "@/types/cierres.types";
import type { CierresStackParamList } from "@/types/navigation.types";
import { COLORS, SPACING, BORDER_RADIUS, FONT_SIZES } from "@/constants/theme";

type RouteParams = RouteProp<CierresStackParamList, "DetalleCierre">;

const formatHoras = (horas: number): string => {
	const h = Math.floor(horas);
	const m = Math.round((horas - h) * 60);
	if (h === 0 && m > 0) return `${m}m`;
	if (h > 0 && m > 0) return `${h}h ${m}m`;
	return `${h}h`;
};

const formatTime = (decimalTime: number | null): string => {
	if (decimalTime === null) return "--:--";
	const hours = Math.floor(decimalTime);
	const minutes = Math.round((decimalTime - hours) * 60);
	const ampm = hours >= 12 ? "PM" : "AM";
	const hour12 = hours % 12 || 12;
	return `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
};

const getModificacionInfo = (observaciones: string[] | undefined) => {
	if (!observaciones) return null;
	if (observaciones.includes("manual")) {
		return { icon: "pencil-plus" as const, color: "#D97706" };
	}
	if (observaciones.includes("editado")) {
		return { icon: "pencil" as const, color: "#6B7280" };
	}
	if (observaciones.includes("ajustado")) {
		return { icon: "clock-edit-outline" as const, color: "#2563EB" };
	}
	return null;
};

const AprobacionRow = memo(
	({
		tipo,
		aprobadas,
		rechazadas,
	}: {
		tipo: string;
		aprobadas: number;
		rechazadas: number;
	}) => (
		<View style={styles.aprobacionRow}>
			<Text style={styles.aprobacionTipo}>{tipo}</Text>
			<View style={styles.aprobacionBadges}>
				{aprobadas > 0 && (
					<View style={[styles.badge, styles.badgeAprobada]}>
						<Text style={styles.badgeTextAprobada}>
							✓ {formatHoras(aprobadas)}
						</Text>
					</View>
				)}
				{rechazadas > 0 && (
					<View style={[styles.badge, styles.badgeRechazada]}>
						<Text style={styles.badgeTextRechazada}>
							✗ {formatHoras(rechazadas)}
						</Text>
					</View>
				)}
			</View>
		</View>
	),
);

const DiaCierreRow = memo(
	({ dia, index }: { dia: DiaCierre; index: number }) => {
		const fechaDate = parseISO(dia.fecha);
		const isDescanso =
			dia.observaciones?.includes("ausente") || dia.horas_netas === 0;
		const modificacion = getModificacionInfo(dia.observaciones);

		return (
			<View
				style={[
					styles.diaRow,
					index % 2 === 0 && styles.diaRowAlt,
					isDescanso && styles.diaDescanso,
				]}
			>
				<View style={styles.diaInfo}>
					<View style={styles.diaNombreRow}>
						<Text
							style={[styles.diaNombre, isDescanso && styles.diaDescansoText]}
						>
							{dia.dia_semana}
						</Text>
						{modificacion && (
							<View
								style={[
									styles.modificacionBadge,
									{ backgroundColor: modificacion.color + "20" },
								]}
							>
								<MaterialCommunityIcons
									name={modificacion.icon}
									size={12}
									color={modificacion.color}
								/>
							</View>
						)}
					</View>
					<Text style={styles.diaFecha}>
						{format(fechaDate, "d MMM", { locale: es })}
					</Text>
				</View>
				<View style={styles.diaHoraContainer}>
					<Text style={[styles.diaHora, isDescanso && styles.diaDescansoText]}>
						{formatTime(dia.entrada)}
					</Text>
					{dia.jornadas && dia.jornadas > 1 && (
						<Text style={styles.jornadasIndicator}>
							({dia.jornadas} jornadas)
						</Text>
					)}
				</View>
				<View style={styles.diaHoraContainer}>
					<Text style={[styles.diaHora, isDescanso && styles.diaDescansoText]}>
						{formatTime(dia.salida)}
					</Text>
				</View>
				<Text style={[styles.diaTotal, isDescanso && styles.diaDescansoText]}>
					{formatHoras(dia.horas_netas)}
				</Text>
			</View>
		);
	},
);

export const DetalleCierreScreen: React.FC = () => {
	const route = useRoute<RouteParams>();
	const { obtenerCierrePorId } = useCierres(null);

	const [cierre, setCierre] = useState<CierreSemanal | null>(null);
	const [loading, setLoading] = useState(true);
	const [comentariosRechazo, setComentariosRechazo] = useState<string[]>([]);

	const traducirTipo = useCallback((tipo: string): string => {
		const traducciones: Record<string, string> = {
			horas_extra_semanal: "Extra semanales",
			exceso_tope_diario: "Exceso de tope diario",
		};
		return traducciones[tipo] || tipo;
	}, []);

	const cargarComentariosRechazo = useCallback(
		async (cierreData: CierreSemanal) => {
			const totales = cierreData.datos_semana.totales;
			if ((totales.horas_extra_semanal_rechazadas ?? 0) === 0) {
				setComentariosRechazo([]);
				return;
			}

			try {
				const { data } = (await supabase
					.from("horarios_novedades")
					.select("tipo_novedad, comentarios_revision")
					.eq("cedula", cierreData.cedula)
					.gte("fecha", cierreData.semana_inicio)
					.lte("fecha", cierreData.semana_fin)
					.eq("estado", "rechazada")
					.not("comentarios_revision", "is", null)) as {
					data: { tipo_novedad: string; comentarios_revision: string }[] | null;
				};

				if (data && data.length > 0) {
					setComentariosRechazo(
						data.map(
							(n) =>
								`${traducirTipo(n.tipo_novedad)}: ${n.comentarios_revision}`,
						),
					);
				} else {
					setComentariosRechazo([]);
				}
			} catch (error) {
				console.error("Error cargando comentarios de rechazo:", error);
				setComentariosRechazo([]);
			}
		},
		[traducirTipo],
	);

	const cargarCierre = useCallback(async () => {
		try {
			setLoading(true);
			const data = await obtenerCierrePorId(route.params.cierreId);
			setCierre(data);
			if (data) {
				cargarComentariosRechazo(data);
			}
		} catch (error) {
			console.error("Error cargando cierre:", error);
		} finally {
			setLoading(false);
		}
	}, [route.params.cierreId, obtenerCierrePorId, cargarComentariosRechazo]);

	useFocusEffect(
		useCallback(() => {
			cargarCierre();
		}, [cargarCierre]),
	);

	if (loading) {
		return (
			<SafeAreaView style={styles.container} edges={["bottom"]}>
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={COLORS.primary} />
					<Text style={styles.loadingText}>Cargando detalle...</Text>
				</View>
			</SafeAreaView>
		);
	}

	if (!cierre) {
		return (
			<SafeAreaView style={styles.container} edges={["bottom"]}>
				<View style={styles.errorContainer}>
					<MaterialCommunityIcons
						name="alert-circle"
						size={64}
						color={COLORS.error}
					/>
					<Text style={styles.errorText}>No se pudo cargar el cierre</Text>
					<TouchableOpacity style={styles.retryButton} onPress={cargarCierre}>
						<Text style={styles.retryText}>Reintentar</Text>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	const { datos_semana } = cierre;
	const tieneHorasEspeciales =
		(datos_semana.totales.horas_extra_semanal_aprobadas ?? 0) > 0 ||
		(datos_semana.totales.horas_extra_semanal_rechazadas ?? 0) > 0;
	const tieneHorasRechazadas =
		(datos_semana.totales.horas_extra_semanal_rechazadas ?? 0) > 0;

	return (
		<SafeAreaView style={styles.container} edges={["bottom"]}>
			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.header}>
					<CierreStatusBadge estado={cierre.estado} size="large" />
					<Text style={styles.semana}>
						{format(parseISO(cierre.semana_inicio), "d MMM", { locale: es })} -{" "}
						{format(parseISO(cierre.semana_fin), "d MMM yyyy", { locale: es })}
					</Text>
					<Text style={styles.headerHint}>Resumen semanal publicado</Text>
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Resumen de la semana</Text>
					<View style={styles.horasRegistradasContainer}>
						<Text style={styles.horasRegistradasValue}>
							{formatHoras(datos_semana.totales.horas_trabajadas)}
						</Text>
						<Text style={styles.horasRegistradasLabel}>Registradas</Text>
					</View>

					{tieneHorasEspeciales && (
						<View style={styles.horasEspecialesCompacto}>
							<AprobacionRow
								tipo="Extra semanales"
								aprobadas={
									datos_semana.totales.horas_extra_semanal_aprobadas ?? 0
								}
								rechazadas={
									datos_semana.totales.horas_extra_semanal_rechazadas ?? 0
								}
							/>

							{tieneHorasRechazadas && comentariosRechazo.length > 0 && (
								<View style={styles.comentariosRechazo}>
									<Text style={styles.comentariosTitle}>
										Motivo del rechazo:
									</Text>
									{comentariosRechazo.map((comentario, idx) => (
										<Text key={idx} style={styles.comentarioRechazoText}>
											• {comentario}
										</Text>
									))}
								</View>
							)}
						</View>
					)}
				</View>

				<View style={styles.section}>
					<Text style={styles.sectionTitle}>Detalle por dia</Text>
					<View style={styles.tableHeader}>
						<Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Dia</Text>
						<Text style={[styles.tableHeaderText, { flex: 1 }]}>Entrada</Text>
						<Text style={[styles.tableHeaderText, { flex: 1 }]}>Salida</Text>
						<Text style={[styles.tableHeaderText, { flex: 1 }]}>Horas</Text>
					</View>
					{datos_semana.dias.map((dia, index) => (
						<DiaCierreRow key={dia.fecha} dia={dia} index={index} />
					))}
				</View>

				<View style={{ height: 32 }} />
			</ScrollView>
		</SafeAreaView>
	);
};

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: COLORS.background },
	scrollView: { flex: 1 },
	loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
	loadingText: {
		marginTop: SPACING.md,
		color: COLORS.textSecondary,
		fontSize: FONT_SIZES.md,
	},
	errorContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		padding: SPACING.lg,
	},
	errorText: {
		marginTop: SPACING.md,
		marginBottom: SPACING.lg,
		color: COLORS.textSecondary,
		fontSize: FONT_SIZES.lg,
		textAlign: "center",
	},
	retryButton: {
		backgroundColor: COLORS.primary,
		paddingHorizontal: SPACING.lg,
		paddingVertical: SPACING.sm,
		borderRadius: BORDER_RADIUS.md,
	},
	retryText: { color: COLORS.textInverse, fontWeight: "600" },
	header: {
		backgroundColor: COLORS.surface,
		padding: SPACING.lg,
		alignItems: "center",
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	semana: {
		marginTop: SPACING.sm,
		fontSize: FONT_SIZES.xl,
		fontWeight: "700",
		color: COLORS.text,
	},
	headerHint: {
		marginTop: SPACING.sm,
		fontSize: FONT_SIZES.sm,
		color: COLORS.textSecondary,
		textAlign: "center",
	},
	section: {
		backgroundColor: COLORS.surface,
		margin: SPACING.md,
		padding: SPACING.md,
		borderRadius: BORDER_RADIUS.lg,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	sectionTitle: {
		fontSize: FONT_SIZES.lg,
		fontWeight: "700",
		color: COLORS.text,
		marginBottom: SPACING.md,
	},
	horasRegistradasContainer: {
		alignItems: "center",
		paddingVertical: SPACING.md,
	},
	horasRegistradasValue: {
		fontSize: 36,
		fontWeight: "700",
		color: COLORS.primary,
	},
	horasRegistradasLabel: {
		fontSize: FONT_SIZES.sm,
		color: COLORS.textSecondary,
		marginTop: 4,
	},
	horasEspecialesCompacto: { marginTop: SPACING.md, gap: SPACING.sm },
	aprobacionRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: SPACING.sm,
	},
	aprobacionTipo: { flex: 1, fontSize: FONT_SIZES.md, color: COLORS.text },
	aprobacionBadges: { flexDirection: "row", gap: SPACING.xs },
	badge: {
		paddingHorizontal: SPACING.sm,
		paddingVertical: 4,
		borderRadius: BORDER_RADIUS.sm,
	},
	badgeAprobada: { backgroundColor: "#D1FAE5" },
	badgeRechazada: { backgroundColor: "#FEE2E2" },
	badgeTextAprobada: {
		color: "#065F46",
		fontWeight: "600",
		fontSize: FONT_SIZES.sm,
	},
	badgeTextRechazada: {
		color: "#991B1B",
		fontWeight: "600",
		fontSize: FONT_SIZES.sm,
	},
	comentariosRechazo: {
		marginTop: SPACING.sm,
		padding: SPACING.sm,
		backgroundColor: "#FEF2F2",
		borderRadius: BORDER_RADIUS.md,
	},
	comentariosTitle: { fontWeight: "600", color: COLORS.error, marginBottom: 4 },
	comentarioRechazoText: { color: COLORS.text, fontSize: FONT_SIZES.sm },
	tableHeader: {
		flexDirection: "row",
		paddingBottom: SPACING.sm,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	tableHeaderText: {
		fontSize: FONT_SIZES.sm,
		fontWeight: "700",
		color: COLORS.textSecondary,
	},
	diaRow: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: SPACING.sm,
		borderBottomWidth: 1,
		borderBottomColor: COLORS.border,
	},
	diaRowAlt: { backgroundColor: COLORS.background },
	diaDescanso: { opacity: 0.65 },
	diaDescansoText: { color: COLORS.textSecondary },
	diaInfo: { flex: 1.5 },
	diaNombreRow: { flexDirection: "row", alignItems: "center", gap: 4 },
	diaNombre: { fontSize: FONT_SIZES.md, fontWeight: "600", color: COLORS.text },
	diaFecha: {
		fontSize: FONT_SIZES.sm,
		color: COLORS.textSecondary,
		marginTop: 2,
	},
	modificacionBadge: { padding: 2, borderRadius: BORDER_RADIUS.sm },
	diaHoraContainer: { flex: 1 },
	diaHora: { fontSize: FONT_SIZES.sm, color: COLORS.text },
	jornadasIndicator: { fontSize: 10, color: COLORS.textSecondary },
	diaTotal: {
		flex: 1,
		fontSize: FONT_SIZES.sm,
		fontWeight: "600",
		color: COLORS.text,
	},
});

export default DetalleCierreScreen;
