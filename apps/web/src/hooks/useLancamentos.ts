'use client';

import { sanitizeSearchQuery } from '@/lib/sanitize';
import { getSupabaseClient } from '@/lib/supabase';
import type { Database } from '@/types/database';
import type {
  CreateLancamentoInput,
  LancamentoFilters,
  LancamentoFinanceiro,
  LancamentoStatus,
  UpdateLancamentoInput,
} from '@versix/shared';
import { useCallback, useState } from 'react';

type JsonLike = string | number | boolean | null | { [key: string]: JsonLike } | JsonLike[];

/**
 * Hook para CRUD de lançamentos financeiros com paginação servidor-side.
 *
 * Gerencia estado local dos lançamentos e expõe operações de consulta, criação,
 * atualização, exclusão (soft-delete via `deleted_at`) e confirmação de pagamento.
 *
 * @example
 * const { lancamentos, fetchLancamentos, createLancamento } = useLancamentos();
 * await fetchLancamentos(condominioId, { page: 1, tipo: 'despesa', busca: 'água' });
 */
export function useLancamentos() {
  const supabase = getSupabaseClient();
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchLancamentos = useCallback(
    async (condominioId: string, filters?: LancamentoFilters) => {
      setLoading(true);
      try {
        const page = filters?.page || 1;
        const pageSize = filters?.pageSize || 20;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('lancamentos_financeiros')
          .select(
            `*, categoria:categoria_id (codigo, nome), conta_bancaria:conta_bancaria_id (nome_exibicao), criador:criado_por (nome)`,
            { count: 'exact' }
          )
          .eq('condominio_id', condominioId)
          .is('deleted_at', null)
          .order('data_competencia', { ascending: false })
          .range(from, to);

        if (filters?.tipo) query = query.eq('tipo', filters.tipo);
        if (filters?.categoria_id) query = query.eq('categoria_id', filters.categoria_id);
        if (filters?.conta_bancaria_id)
          query = query.eq('conta_bancaria_id', filters.conta_bancaria_id);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.data_inicio) query = query.gte('data_competencia', filters.data_inicio);
        if (filters?.data_fim) query = query.lte('data_competencia', filters.data_fim);
        if (filters?.busca) {
          const buscaSanitizada = sanitizeSearchQuery(filters.busca);
          if (buscaSanitizada)
            query = query.or(
              `descricao.ilike.%${buscaSanitizada}%,fornecedor_nome.ilike.%${buscaSanitizada}%`
            );
        }

        const { data, error: fetchError, count } = await query;
        if (fetchError) throw fetchError;

        setLancamentos((data || []) as unknown as LancamentoFinanceiro[]);
        setPagination({ page, pageSize, total: count || 0 });
        return { data: (data || []) as unknown as LancamentoFinanceiro[], total: count || 0 };
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao buscar lançamentos';
        setError(errorMessage);
        return { data: [], total: 0 };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const createLancamento = useCallback(
    async (
      condominioId: string,
      criadoPor: string,
      input: CreateLancamentoInput
    ): Promise<LancamentoFinanceiro | null> => {
      setLoading(true);
      try {
        const payload: Database['public']['Tables']['lancamentos_financeiros']['Insert'] = {
          condominio_id: condominioId,
          criado_por: criadoPor,
          data_lancamento: new Date().toISOString(),
          tipo: input.tipo,
          categoria_id: input.categoria_id,
          conta_bancaria_id: input.conta_bancaria_id || null,
          valor: input.valor,
          data_competencia: input.data_competencia,
          data_pagamento: input.data_pagamento || null,
          descricao: input.descricao,
          observacoes: input.observacoes || null,
          fornecedor: input.fornecedor_nome || null,
          numero_documento: input.numero_documento || null,
          comprovantes: input.comprovantes ? (input.comprovantes as unknown as JsonLike) : null,
          status: input.status || 'pendente',
        };

        const { data, error: insertError } = await supabase
          .from('lancamentos_financeiros')
          .insert(payload)
          .select()
          .single();
        if (insertError) throw insertError;
        setLancamentos((prev) => [data as unknown as LancamentoFinanceiro, ...prev]);
        return data as unknown as LancamentoFinanceiro;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao criar lançamento';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const updateLancamento = useCallback(
    async (input: UpdateLancamentoInput): Promise<LancamentoFinanceiro | null> => {
      setLoading(true);
      try {
        const { id, ...updates } = input;

        const payload: Database['public']['Tables']['lancamentos_financeiros']['Update'] = {};
        if (updates.tipo) payload.tipo = updates.tipo;
        if (updates.categoria_id) payload.categoria_id = updates.categoria_id;
        if (updates.conta_bancaria_id !== undefined)
          payload.conta_bancaria_id = updates.conta_bancaria_id;
        if (updates.valor) payload.valor = updates.valor;
        if (updates.data_competencia) payload.data_competencia = updates.data_competencia;
        if (updates.data_pagamento !== undefined) payload.data_pagamento = updates.data_pagamento;
        if (updates.descricao) payload.descricao = updates.descricao;
        if (updates.observacoes !== undefined) payload.observacoes = updates.observacoes;
        if (updates.fornecedor_nome !== undefined) payload.fornecedor = updates.fornecedor_nome;
        if (updates.numero_documento !== undefined)
          payload.numero_documento = updates.numero_documento;
        if (updates.comprovantes !== undefined)
          payload.comprovantes = updates.comprovantes as unknown as JsonLike;
        if (updates.status) payload.status = updates.status;

        const { data, error: updateError } = await supabase
          .from('lancamentos_financeiros')
          .update(payload)
          .eq('id', id)
          .select()
          .single();
        if (updateError) throw updateError;
        setLancamentos((prev) =>
          prev.map((l) => (l.id === id ? (data as unknown as LancamentoFinanceiro) : l))
        );
        return data as unknown as LancamentoFinanceiro;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao atualizar lançamento';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const deleteLancamento = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      try {
        const { error: deleteError } = await supabase
          .from('lancamentos_financeiros')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id);
        if (deleteError) throw deleteError;
        setLancamentos((prev) => prev.filter((l) => l.id !== id));
        return true;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao excluir lançamento';
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const confirmarLancamento = useCallback(
    async (id: string, aprovadoPor: string): Promise<boolean> => {
      try {
        const { error: updateError } = await supabase
          .from('lancamentos_financeiros')
          .update({
            status: 'confirmado',
            aprovado_por: aprovadoPor,
            aprovado_em: new Date().toISOString(),
          })
          .eq('id', id);
        if (updateError) throw updateError;
        setLancamentos((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: 'confirmado' as LancamentoStatus } : l))
        );
        return true;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao confirmar lançamento';
        setError(errorMessage);
        return false;
      }
    },
    [supabase]
  );

  return {
    lancamentos,
    loading,
    error,
    pagination,
    fetchLancamentos,
    createLancamento,
    updateLancamento,
    deleteLancamento,
    confirmarLancamento,
  };
}
