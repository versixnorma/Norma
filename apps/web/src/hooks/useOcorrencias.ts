'use client';

import { getErrorMessage } from '@/lib/errors';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { getSupabaseClient } from '@/lib/supabase';
import { parseAnexos } from '@/lib/type-helpers';
import type {
  CreateOcorrenciaInput,
  OcorrenciaComJoins,
  OcorrenciaFilters,
  PaginatedResponse,
  UpdateOcorrenciaInput,
} from '@versix/shared';
import { Database } from '@versix/shared';
import { useCallback, useState } from 'react';

type OcorrenciaRow = Database['public']['Tables']['ocorrencias']['Row'];
type OcorrenciaHistoricoRow = Database['public']['Tables']['ocorrencias_historico']['Row'];

interface OcorrenciaQueryResult extends OcorrenciaRow {
  reportado_por_usuario?: { nome: string; avatar_url: string | null } | null;
  responsavel?: { nome: string; avatar_url: string | null } | null;
  unidade?: { identificador: string; bloco?: { nome: string } | null } | null;
}

interface OcorrenciaHistoricoQueryResult extends OcorrenciaHistoricoRow {
  usuario?: { nome: string } | null;
}

interface EstatisticasOcorrencias {
  total: number;
  abertas: number;
  em_andamento: number;
  resolvidas: number;
  por_categoria: Record<string, number>;
  por_prioridade: Record<string, number>;
  tempo_medio_resolucao_horas: number | null;
}

const toOcorrencia = (data: OcorrenciaQueryResult): OcorrenciaComJoins => ({
  ...data,
  anexos: parseAnexos(data.anexos),
  reportado_por_info: data.reportado_por_usuario ?? undefined,
  responsavel: data.responsavel ?? undefined,
  unidade_relacionada: data.unidade ? { numero: data.unidade.identificador } : undefined,
});

export function useOcorrencias() {
  const supabase = getSupabaseClient();
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaComJoins[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  const fetchOcorrencias = useCallback(
    async (
      condominioId: string,
      filters?: OcorrenciaFilters
    ): Promise<PaginatedResponse<OcorrenciaComJoins>> => {
      setLoading(true);
      setError(null);
      try {
        const page = filters?.page || 1;
        const pageSize = filters?.pageSize || 20;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('ocorrencias')
          .select(
            `*, reportado_por_usuario:usuarios!ocorrencias_reportado_por_fkey (nome, avatar_url), responsavel:usuarios!ocorrencias_responsavel_id_fkey (nome, avatar_url), unidade:unidades_habitacionais!ocorrencias_unidade_relacionada_id_fkey (identificador, bloco:blocos!unidades_habitacionais_bloco_id_fkey (nome))`,
            { count: 'exact' }
          )
          .eq('condominio_id', condominioId)
          .is('deleted_at', null)
          .order(filters?.orderBy || 'created_at', { ascending: filters?.orderDir === 'asc' })
          .range(from, to);

        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.categoria) query = query.eq('categoria', filters.categoria);
        if (filters?.prioridade) query = query.eq('prioridade', filters.prioridade);
        if (filters?.responsavel_id) query = query.eq('responsavel_id', filters.responsavel_id);
        if (filters?.reportado_por) query = query.eq('reportado_por', filters.reportado_por);
        if (filters?.busca) {
          const buscaSanitizada = sanitizeSearchQuery(filters.busca);
          if (buscaSanitizada)
            query = query.or(
              `titulo.ilike.%${buscaSanitizada}%,descricao.ilike.%${buscaSanitizada}%`
            );
        }

        const { data, error: fetchError, count } = await query;
        if (fetchError) throw fetchError;

        const transformedData = (data || []).map((item: OcorrenciaQueryResult) =>
          toOcorrencia(item)
        );

        const total = count || 0;
        const result: PaginatedResponse<OcorrenciaComJoins> = {
          data: transformedData,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
            hasMore: to < total - 1,
          },
        };
        setOcorrencias(result.data);
        setPagination(result.pagination);
        return result;
      } catch (err) {
        setError(getErrorMessage(err) || 'Erro ao carregar ocorrências');
        return {
          data: [],
          pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0, hasMore: false },
        };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const getOcorrencia = useCallback(
    async (id: string): Promise<OcorrenciaComJoins | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('ocorrencias')
          .select(
            `*, reportado_por_usuario:usuarios!ocorrencias_reportado_por_fkey (nome, avatar_url), responsavel:usuarios!ocorrencias_responsavel_id_fkey (nome, avatar_url), unidade:unidades_habitacionais!ocorrencias_unidade_relacionada_id_fkey (identificador, bloco:blocos!unidades_habitacionais_bloco_id_fkey (nome))`
          )
          .eq('id', id)
          .single();
        if (fetchError) throw fetchError;
        // Buscar histórico
        const { data: historico } = await supabase
          .from('ocorrencias_historico')
          .select(`*, usuario:usuarios!ocorrencias_historico_usuario_id_fkey (nome)`)
          .eq('ocorrencia_id', id)
          .order('created_at', { ascending: true });

        return toOcorrencia(data as OcorrenciaQueryResult);
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      }
    },
    [supabase]
  );

  const createOcorrencia = useCallback(
    async (
      condominioId: string,
      reportadoPor: string,
      input: CreateOcorrenciaInput
    ): Promise<OcorrenciaComJoins | null> => {
      setLoading(true);
      try {
        const { data, error: insertError } = await supabase
          .from('ocorrencias')
          .insert({ condominio_id: condominioId, reportado_por: reportadoPor, ...input })
          .select()
          .single();
        if (insertError) throw insertError;
        const ocorrencia = toOcorrencia(data as OcorrenciaQueryResult);
        setOcorrencias((prev) => [ocorrencia, ...prev]);
        return ocorrencia;
      } catch (err) {
        setError(getErrorMessage(err) || 'Erro ao criar ocorrência');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const updateOcorrencia = useCallback(
    async (input: UpdateOcorrenciaInput, userId?: string): Promise<OcorrenciaComJoins | null> => {
      setLoading(true);
      try {
        // Setar user_id para o trigger de histórico
        if (userId) await supabase.rpc('set_app_user_id', { user_id: userId }).catch(() => {});

        const { id, ...updates } = input;
        // Se resolvendo, definir campos de resolução
        if (updates.status === 'resolvida' && !updates.resolucao) updates.resolucao = 'Resolvida';
        type OcorrenciaUpdate = Database['public']['Tables']['ocorrencias']['Update'];
        const updateData: Partial<OcorrenciaUpdate> = { ...updates };
        if (updates.status === 'resolvida') {
          updateData.resolvido_em = new Date().toISOString();
          updateData.resolvido_por = userId;
        }
        const { data, error: updateError } = await supabase
          .from('ocorrencias')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (updateError) throw updateError;
        const ocorrencia = toOcorrencia(data as OcorrenciaQueryResult);
        setOcorrencias((prev) => prev.map((o) => (o.id === id ? ocorrencia : o)));
        return ocorrencia;
      } catch (err) {
        setError(getErrorMessage(err) || 'Erro ao atualizar ocorrência');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const deleteOcorrencia = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { error: deleteError } = await supabase
          .from('ocorrencias')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (deleteError) throw deleteError;
        setOcorrencias((prev) => prev.filter((o) => o.id !== id));
        return true;
      } catch (err) {
        setError(getErrorMessage(err) || 'Erro ao excluir ocorrência');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const getStats = useCallback(
    async (condominioId: string): Promise<EstatisticasOcorrencias | null> => {
      try {
        const { data } = await supabase
          .from('ocorrencias')
          .select('status, categoria, prioridade, created_at, resolvido_em')
          .eq('condominio_id', condominioId)
          .is('deleted_at', null);
        if (!data) return null;
        type EstatisticasOcorrencias = {
          total: number;
          abertas: number;
          em_andamento: number;
          resolvidas: number;
          por_categoria: Record<string, number>;
          por_prioridade: Record<string, number>;
          tempo_medio_resolucao_horas: number | null;
        };
        const stats: EstatisticasOcorrencias = {
          total: data.length,
          abertas: data.filter((o: OcorrenciaComJoins) => o.status === 'aberta').length,
          em_andamento: data.filter((o: OcorrenciaComJoins) =>
            ['em_analise', 'em_andamento'].includes(o.status)
          ).length,
          resolvidas: data.filter((o: OcorrenciaComJoins) => o.status === 'resolvida').length,
          por_categoria: {},
          por_prioridade: {},
          tempo_medio_resolucao_horas: null,
        };
        data.forEach((o: OcorrenciaComJoins) => {
          stats.por_categoria[o.categoria] = (stats.por_categoria[o.categoria] || 0) + 1;
          stats.por_prioridade[o.prioridade] = (stats.por_prioridade[o.prioridade] || 0) + 1;
        });
        const resolvidas = data.filter((o: OcorrenciaComJoins) => o.resolvido_em);
        if (resolvidas.length > 0) {
          const tempos = resolvidas.map(
            (o: OcorrenciaComJoins) =>
              (new Date(o.resolvido_em!).getTime() - new Date(o.created_at).getTime()) / 3600000
          );
          stats.tempo_medio_resolucao_horas =
            tempos.reduce((a: number, b: number) => a + b, 0) / tempos.length;
        }
        return stats;
      } catch {
        return null;
      }
    },
    [supabase]
  );

  return {
    ocorrencias,
    loading,
    error,
    pagination,
    fetchOcorrencias,
    getOcorrencia,
    createOcorrencia,
    updateOcorrencia,
    deleteOcorrencia,
    getStats,
  };
}

export type { CreateOcorrenciaInput, OcorrenciaFilters, UpdateOcorrenciaInput };
