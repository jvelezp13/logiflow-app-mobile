import { useCallback, useEffect, useState } from 'react';
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

  const cargar = useCallback(async () => {
    if (!cedula) {
      setProgreso(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: rpcError } = await (supabase.rpc as unknown as (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>)(
      'calcular_extras_semana_actual',
      {
        p_cedula: cedula,
        p_fecha: format(new Date(), 'yyyy-MM-dd'),
      },
    );

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

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { progreso, error, loading, refrescar: cargar };
};
