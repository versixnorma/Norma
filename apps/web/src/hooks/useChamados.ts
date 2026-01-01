'use client';

import { getErrorMessage } from '@/lib/errors';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { getSupabaseClient } from '@/lib/supabase';
import { parseAnexos, serializeAnexos } from '@/lib/type-helpers';
import type {
  // Input types dos validators
  AvaliarChamadoInput,
  ChamadoComJoins,
  ChamadoFilters,
  ChamadoStats,
  CreateChamadoInput,
  CreateMensagemInput,
  PaginatedResponse,
  UpdateChamadoInput,
} from '@versix/shared';
import { Database } from '@versix/shared';
import { useCallback, useEffect, useState } from 'react';

export function useChamados(options?: {
  condominioId?: string | null;
  userId?: string | null;
  apenasMinhaUnidade?: boolean;
}) {
  const supabase = getSupabaseClient();
  const [chamados, setChamados] = useState<ChamadoComJoins[]>([]);
  const [meusChamados, setMeusChamados] = useState<ChamadoComJoins[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  type ChamadoRow = Database['public']['Tables']['chamados']['Row'];
  type ChamadoMensagemRow = Database['public']['Tables']['chamados_mensagens']['Row'];

  interface ChamadoQueryResult extends ChamadoRow {
    solicitante?: { nome: string; avatar_url: string | null; email: string } | null;
    atendente?: { nome: string; avatar_url: string | null } | null;
  }

  interface ChamadoMensagemQueryResult extends ChamadoMensagemRow {
    autor?: { nome: string; avatar_url: string | null } | null;
  }

  const toChamado = (data: ChamadoQueryResult): ChamadoComJoins => ({
    ...data,
    anexos: parseAnexos(data.anexos),
    solicitante: data.solicitante ?? undefined,
    atendente: data.atendente ?? undefined,
  });

  const fetchChamados = useCallback(
    async (
      condominioId: string,
      filters?: ChamadoFilters
    ): Promise<PaginatedResponse<ChamadoComJoins>> => {
      setLoading(true);
      setError(null);
      try {
        const page = filters?.page || 1;
        const pageSize = filters?.pageSize || 20;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('chamados')
          .select(
            `*, solicitante:usuarios!chamados_solicitante_id_fkey (nome, avatar_url, email), atendente:usuarios!chamados_atendente_id_fkey (nome, avatar_url)`,
            { count: 'exact' }
          )
          .eq('condominio_id', condominioId)
          .is('deleted_at', null)
          .order(filters?.orderBy || 'created_at', { ascending: filters?.orderDir === 'asc' })
          .range(from, to);

        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.categoria) query = query.eq('categoria', filters.categoria);
        if (filters?.prioridade) query = query.eq('prioridade', filters.prioridade);
        if (filters?.atendente_id) query = query.eq('atendente_id', filters.atendente_id);
        if (filters?.solicitante_id) query = query.eq('solicitante_id', filters.solicitante_id);
        if (filters?.busca) {
          const buscaSanitizada = sanitizeSearchQuery(filters.busca);
          if (buscaSanitizada)
            query = query.or(
              `titulo.ilike.%${buscaSanitizada}%,descricao.ilike.%${buscaSanitizada}%`
            );
        }

        const { data, error: fetchError, count } = await query;
        if (fetchError) throw fetchError;

        // Transformar dados para garantir tipos corretos
        const transformedData = (data || []).map((chamado: ChamadoQueryResult) =>
          toChamado(chamado)
        );

        const total = count || 0;
        const result: PaginatedResponse<ChamadoComJoins> = {
          data: transformedData,
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
            hasMore: to < total - 1,
          },
        };
        setChamados(result.data);
        setPagination(result.pagination);
        return result;
      } catch (err) {
        setError(getErrorMessage(err) || 'Erro ao carregar chamados');
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

  useEffect(() => {
    if (options?.condominioId && options?.userId) {
      const filters: ChamadoFilters = {};
      if (options.apenasMinhaUnidade) {
        filters.solicitante_id = options.userId;
      }
      fetchChamados(options.condominioId, filters).then((result) => {
        setMeusChamados(result.data);
      });
    }
  }, [options, fetchChamados]);

  const getChamado = useCallback(
    async (id: string): Promise<ChamadoComJoins | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('chamados')
          .select(
            `*, solicitante:usuarios!chamados_solicitante_id_fkey (nome, avatar_url, email), atendente:usuarios!chamados_atendente_id_fkey (nome, avatar_url)`
          )
          .eq('id', id)
          .single();
        if (fetchError) throw fetchError;

        // Buscar mensagens
        const { data: mensagens } = await supabase
          .from('chamados_mensagens')
          .select(`*, autor:usuarios!chamados_mensagens_autor_id_fkey (nome, avatar_url)`)
          .eq('chamado_id', id)
          .order('created_at', { ascending: true });

        const mensagensComAutor = (mensagens || []).map((msg: ChamadoMensagemQueryResult) => ({
          ...msg,
          anexos: parseAnexos(msg.anexos),
          autor: msg.autor ?? undefined,
        }));

        return {
          ...(data as ChamadoRow),
          anexos: parseAnexos(data.anexos),
          solicitante: (data as ChamadoQueryResult).solicitante ?? undefined,
          atendente: (data as ChamadoQueryResult).atendente ?? undefined,
          mensagens: mensagensComAutor,
          total_mensagens: mensagens?.length || 0,
        };
      } catch (err) {
        console.error('Erro ao buscar chamado:', err);
        return null;
      }
    },
    [supabase]
  );

  const createChamado = useCallback(
    async (
      condominioId: string,
      solicitanteId: string,
      input: CreateChamadoInput
    ): Promise<ChamadoComJoins | null> => {
      setLoading(true);
      try {
        const insertData = { ...input, anexos: serializeAnexos(input.anexos) };
        const { data, error: insertError } = await supabase
          .from('chamados')
          .insert({ condominio_id: condominioId, solicitante_id: solicitanteId, ...insertData })
          .select()
          .single();
        if (insertError) throw insertError;
        const chamado = toChamado(data as ChamadoQueryResult);
        setChamados((prev) => [chamado, ...prev]);
        return chamado;
      } catch (err) {
        setError(getErrorMessage(err) || 'Erro ao criar chamado');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const updateChamado = useCallback(
    async (input: UpdateChamadoInput): Promise<ChamadoComJoins | null> => {
      setLoading(true);
      try {
        const { id, ...updates } = input;
        type ChamadoUpdate = Database['public']['Tables']['chamados']['Update'];
        const updateData: Partial<ChamadoUpdate> = { ...updates };
        if (updates.status === 'resolvido') updateData.resolvido_em = new Date().toISOString();
        const { data, error: updateError } = await supabase
          .from('chamados')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (updateError) throw updateError;
        const chamado = toChamado(data as ChamadoQueryResult);
        setChamados((prev) => prev.map((c) => (c.id === id ? chamado : c)));
        return chamado;
      } catch (err) {
        setError(getErrorMessage(err) || 'Erro ao atualizar chamado');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const deleteChamado = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { error: deleteError } = await supabase
          .from('chamados')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (deleteError) throw deleteError;
        setChamados((prev) => prev.filter((c) => c.id !== id));
        return true;
      } catch (err) {
        setError(getErrorMessage(err) || 'Erro ao excluir chamado');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const addMensagem = useCallback(
    async (
      autorId: string,
      input: CreateMensagemInput
    ): Promise<ChamadoMensagemQueryResult | null> => {
      try {
        const mensagemData = { ...input, anexos: serializeAnexos(input.anexos) };
        const { data, error: insertError } = await supabase
          .from('chamados_mensagens')
          .insert({ autor_id: autorId, ...mensagemData })
          .select(`*, autor:usuarios!chamados_mensagens_autor_id_fkey (nome, avatar_url)`)
          .single();
        if (insertError) throw insertError;
        return data as ChamadoMensagemQueryResult;
      } catch (err) {
        setError(getErrorMessage(err) || 'Erro ao enviar mensagem');
        return null;
      }
    },
    [supabase]
  );

  const avaliarChamado = useCallback(
    async (input: AvaliarChamadoInput): Promise<boolean> => {
      try {
        const { id, ...avaliacaoData } = input;
        const { error: updateError } = await supabase
          .from('chamados')
          .update({ ...avaliacaoData, avaliado_em: new Date().toISOString() })
          .eq('id', id);
        if (updateError) throw updateError;
        setChamados((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, ...avaliacaoData, avaliado_em: new Date().toISOString() } : c
          )
        );
        return true;
      } catch (err) {
        setError(getErrorMessage(err) || 'Erro ao avaliar chamado');
        return false;
      }
    },
    [supabase]
  );

  const getStats = useCallback(
    async (condominioId: string): Promise<ChamadoStats | null> => {
      try {
        const { data } = await supabase
          .from('chamados')
          .select('status, categoria, avaliacao_nota, created_at, resolvido_em')
          .eq('condominio_id', condominioId)
          .is('deleted_at', null);
        if (!data) return null;
        type EstatisticasChamados = {
          por_categoria: Record<string, number>;
          avaliacao_media: number | null;
          tempo_medio_resolucao_horas: number | null;
          total: number;
          novos: number;
          em_atendimento: number;
          resolvidos: number;
        };
        const stats: EstatisticasChamados = {
          total: data.length,
          novos: data.filter((c: ChamadoComJoins) => c.status === 'novo').length,
          em_atendimento: data.filter((c: ChamadoComJoins) => c.status === 'em_atendimento').length,
          resolvidos: data.filter((c: ChamadoComJoins) =>
            ['resolvido', 'fechado'].includes(c.status)
          ).length,
          por_categoria: {},
          avaliacao_media: null,
          tempo_medio_resolucao_horas: null,
        };
        data.forEach((c: ChamadoComJoins) => {
          stats.por_categoria[c.categoria] = (stats.por_categoria[c.categoria] || 0) + 1;
        });
        const comNota = data.filter((c: ChamadoComJoins) => c.avaliacao_nota);
        if (comNota.length > 0)
          stats.avaliacao_media =
            comNota.reduce((a: number, c: ChamadoComJoins) => a + c.avaliacao_nota!, 0) /
            comNota.length;
        const resolvidos = data.filter((c: ChamadoComJoins) => c.resolvido_em);
        if (resolvidos.length > 0) {
          const tempos = resolvidos.map(
            (c: ChamadoComJoins) =>
              (new Date(c.resolvido_em!).getTime() - new Date(c.created_at).getTime()) / 3600000
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
    chamados,
    meusChamados,
    loading,
    error,
    pagination,
    fetchChamados,
    getChamado,
    createChamado,
    updateChamado,
    deleteChamado,
    addMensagem,
    avaliarChamado,
    getStats,
  };
}

// Re-export apenas os tipos de input/filtros
export type {
  AvaliarChamadoInput,
  ChamadoFilters,
  CreateChamadoInput,
  CreateMensagemInput,
  UpdateChamadoInput,
};
