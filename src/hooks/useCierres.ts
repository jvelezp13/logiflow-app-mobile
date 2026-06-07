/**
 * useCierres Hook
 *
 * Hook for reading employee weekly closures.
 */

import { useState, useEffect, useCallback } from "react";
import NetInfo from "@react-native-community/netinfo";
import cierresService from "@/services/cierresService";
import type {
	CierreResumen,
	CierreSemanal,
	EstadisticasCierres,
} from "@/types/cierres.types";

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
				(err.message.includes("network") ||
					err.message.includes("Network") ||
					err.message.includes("fetch"));

			if (!isNetworkError) {
				console.error("[useCierres] Error cargando cierres:", err);
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
				(err.message.includes("network") ||
					err.message.includes("Network") ||
					err.message.includes("fetch"));

			if (!isNetworkError) {
				console.error("[useCierres] Error cargando estadísticas:", err);
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
		[],
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
	};
};

export default useCierres;
