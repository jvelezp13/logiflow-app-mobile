import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@services/supabase/client';

export interface ProgresoSemanal {
  horasTrabajadas: number;
  maxHorasSemana: number;
  horasExtraSemanal: number;
  horasRestantes: number;
}

interface RpcRow {
  horas_trabajadas: number | string | null;
  max_horas_semana: number | string | null;
  horas_extra_semanal: number | string | null;
}

const toNumber = (v: number | string | null | undefined): number => {
  if (v === null || v === undefined) return 0;
  return typeof v === 'number' ? v : Number(v) || 0;
};

export const useProgresoSemanal = (cedula: string | null | undefined) => {
  const [progreso, setProgreso] = useState<ProgresoSemanal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Guard contra setState tras unmount mientras la RPC está en vuelo.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!cedula) {
      if (!isMountedRef.current) return;
      setProgreso(null);
      return;
    }

    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error: rpcError } = await (supabase.rpc as any)(
      'calcular_extras_semana_actual',
      {
        p_cedula: cedula,
        p_fecha: format(new Date(), 'yyyy-MM-dd'),
      },
    );

    if (!isMountedRef.current) return;

    if (rpcError) {
      console.error('[useProgresoSemanal] RPC error:', rpcError);
      setError(rpcError.message);
      setProgreso(null);
      setLoading(false);
      return;
    }

    const row: RpcRow | null = Array.isArray(data)
      ? ((data[0] as RpcRow | undefined) ?? null)
      : ((data as RpcRow | null) ?? null);

    if (!row) {
      setProgreso(null);
      setLoading(false);
      return;
    }

    const horasTrabajadas = toNumber(row.horas_trabajadas);
    const maxHorasSemana = toNumber(row.max_horas_semana);
    const horasExtraSemanal = toNumber(row.horas_extra_semanal);

    setProgreso({
      horasTrabajadas,
      maxHorasSemana,
      horasExtraSemanal,
      horasRestantes: Math.max(0, maxHorasSemana - horasTrabajadas),
    });
    setLoading(false);
  }, [cedula]);

  // El consumidor (HomeScreen) dispara la carga inicial vía useFocusEffect.
  // Evitamos el fetch duplicado de un useEffect interno + el del foco.

  return { progreso, error, loading, refrescar: cargar };
};
