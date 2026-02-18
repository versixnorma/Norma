'use client';

import { getSupabaseClient } from '@/lib/supabase';
import { useCallback, useState } from 'react';

interface EstatisticasOcorrencias {
  total: number;
  abertas: number;
  em_andamento: number;
  resolvidas: number;
  por_categoria: Record<string, number>;
  por_prioridade: Record<string, number>;
  tempo_medio_resolucao_horas: number | null;
}

interface OcorrenciaStatsRow {
  status: string;
  categoria: string;
  prioridade: string;
  created_at: string;
  resolvido_em: string | null;
}

/**
 * Hook para cálculo de estatísticas agregadas de ocorrências.
 *
 * Computa totais por status (abertas, em andamento, resolvidas), distribuição
 * por categoria e prioridade, e tempo médio de resolução em horas. Destinado
 * a componentes de métricas — usa fetch avulso sem manter lista completa.
 *
 * @example
 * const { getStats } = useOcorrenciasStats();
 * const stats = await getStats(condominioId);
 * console.log(stats?.tempo_medio_resolucao_horas);
 */
export function useOcorrenciasStats() {
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStats = useCallback(
    async (condominioId: string): Promise<EstatisticasOcorrencias | null> => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('ocorrencias')
          .select('status, categoria, prioridade, created_at, resolvido_em')
          .eq('condominio_id', condominioId)
          .is('deleted_at', null);
        if (!data) return null;
        const ocorrenciasData = data as OcorrenciaStatsRow[];
        const stats: EstatisticasOcorrencias = {
          total: ocorrenciasData.length,
          abertas: ocorrenciasData.filter((o) => o.status === 'aberta').length,
          em_andamento: ocorrenciasData.filter((o) =>
            ['em_analise', 'em_andamento'].includes(o.status)
          ).length,
          resolvidas: ocorrenciasData.filter((o) => o.status === 'resolvida').length,
          por_categoria: {},
          por_prioridade: {},
          tempo_medio_resolucao_horas: null,
        };
        ocorrenciasData.forEach((o) => {
          stats.por_categoria[o.categoria] = (stats.por_categoria[o.categoria] || 0) + 1;
          stats.por_prioridade[o.prioridade] = (stats.por_prioridade[o.prioridade] || 0) + 1;
        });
        const resolvidas = ocorrenciasData.filter((o) => o.resolvido_em);
        if (resolvidas.length > 0) {
          const tempos = resolvidas.map(
            (o) =>
              (new Date(o.resolvido_em!).getTime() - new Date(o.created_at).getTime()) / 3600000
          );
          stats.tempo_medio_resolucao_horas = tempos.reduce((a, b) => a + b, 0) / tempos.length;
        }
        return stats;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erro ao buscar estatísticas de ocorrências';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return { loading, error, getStats };
}

export type { EstatisticasOcorrencias };
