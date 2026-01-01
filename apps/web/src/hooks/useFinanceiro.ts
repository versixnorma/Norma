'use client';

import { sanitizeSearchQuery } from '@/lib/sanitize';
import { getSupabaseClient } from '@/lib/supabase';
import type {
  CategoriaFinanceira,
  Comprovante,
  ContaBancaria,
  CreateLancamentoInput,
  DashboardFinanceiro,
  LancamentoFilters,
  LancamentoFinanceiro,
  LancamentoStatus,
  LancamentoTipo,
  SaldoPeriodo,
  UpdateLancamentoInput,
} from '@versix/shared';
import { useCallback, useState } from 'react';

/**
 * Hook para gerenciamento de lançamentos financeiros
 * Inclui métodos para buscar categorias, contas, lançamentos e dashboard financeiro.
 * @returns Métodos e estados financeiros
 */
export function useFinanceiro() {
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================
  // CATEGORIAS
  // ============================================
  const fetchCategorias = useCallback(
    async (condominioId: string, tipo?: 'receita' | 'despesa'): Promise<CategoriaFinanceira[]> => {
      try {
        let query = supabase
          .from('categorias_financeiras')
          .select('*')
          .eq('condominio_id', condominioId)
          .is('deleted_at', null)
          .eq('ativo', true)
          .order('codigo');
        if (tipo) query = query.eq('tipo', tipo);
        const { data, error: fetchError } = await query;
        if (fetchError) throw fetchError;
        // Montar hierarquia
        const rootCats = (data || []).filter((c: CategoriaFinanceira) => !c.parent_id);
        return rootCats.map((cat: CategoriaFinanceira) => ({
          ...cat,
          children: (data || []).filter((c: CategoriaFinanceira) => c.parent_id === cat.id),
        }));
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao buscar categorias';
        setError(errorMessage);
        return [];
      }
    },
    [supabase]
  );

  // ============================================
  // CONTAS BANCÁRIAS
  // ============================================
  const fetchContas = useCallback(
    async (condominioId: string): Promise<ContaBancaria[]> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('contas_bancarias')
          .select('*')
          .eq('condominio_id', condominioId)
          .is('deleted_at', null)
          .eq('ativo', true)
          .order('principal', { ascending: false });
        if (fetchError) throw fetchError;
        return data || [];
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao buscar contas bancárias';
        setError(errorMessage);
        return [];
      }
    },
    [supabase]
  );

  // ============================================
  // LANÇAMENTOS
  // ============================================
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
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

        setLancamentos(data || []);
        setPagination({ page, pageSize, total: count || 0 });
        return { data: data || [], total: count || 0 };
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
        const { data, error: insertError } = await supabase
          .from('lancamentos_financeiros')
          .insert({ condominio_id: condominioId, criado_por: criadoPor, ...input })
          .select()
          .single();
        if (insertError) throw insertError;
        setLancamentos((prev) => [data, ...prev]);
        return data;
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
        const { data, error: updateError } = await supabase
          .from('lancamentos_financeiros')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (updateError) throw updateError;
        setLancamentos((prev) => prev.map((l) => (l.id === id ? data : l)));
        return data;
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

  // ============================================
  // SALDO E DASHBOARD
  // ============================================
  const calcularSaldoPeriodo = useCallback(
    async (condominioId: string, mesReferencia: string): Promise<SaldoPeriodo | null> => {
      try {
        const { data, error: rpcError } = await supabase.rpc('calcular_saldo_periodo', {
          p_condominio_id: condominioId,
          p_mes_referencia: mesReferencia,
        });
        if (rpcError) throw rpcError;
        return data?.[0] || null;
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao calcular saldo do período';
        setError(errorMessage);
        return null;
      }
    },
    [supabase]
  );

  const getDashboard = useCallback(
    async (condominioId: string): Promise<DashboardFinanceiro | null> => {
      try {
        const hoje = new Date();
        const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;

        // Buscar saldo do período
        const saldo = await calcularSaldoPeriodo(condominioId, mesAtual);

        // Buscar contas
        const contas = await fetchContas(condominioId);

        // Buscar últimos lançamentos
        const { data: ultimos } = await supabase
          .from('lancamentos_financeiros')
          .select(`*, categoria:categoria_id (codigo, nome)`)
          .eq('condominio_id', condominioId)
          .is('deleted_at', null)
          .eq('status', 'confirmado')
          .order('data_competencia', { ascending: false })
          .limit(5);

        // Buscar inadimplência
        const { data: taxas } = await supabase
          .from('taxas_unidades')
          .select('status, valor_final')
          .eq('condominio_id', condominioId)
          .in('status', ['pendente', 'atrasado']);

        const inadimplentes =
          taxas?.filter((t: { status: string }) => t.status === 'atrasado') || [];
        const { count: totalUnidades } = await supabase
          .from('unidades_habitacionais')
          .select('*', { count: 'exact', head: true })
          .eq('condominio_id', condominioId)
          .eq('ativo', true);

        // Despesas por categoria
        const { data: despesasCat } = await supabase
          .from('lancamentos_financeiros')
          .select(`valor, categoria:categoria_id (nome)`)
          .eq('condominio_id', condominioId)
          .eq('tipo', 'despesa')
          .eq('status', 'confirmado')
          .gte('data_competencia', mesAtual)
          .lt(
            'data_competencia',
            `${hoje.getFullYear()}-${String(hoje.getMonth() + 2).padStart(2, '0')}-01`
          );

        interface DespesaCategoria {
          valor: number;
          categoria: { nome: string } | null;
        }

        const despesasPorCategoria: Record<string, number> = {};
        (despesasCat || []).forEach((d: DespesaCategoria) => {
          const cat = d.categoria?.nome || 'Outros';
          despesasPorCategoria[cat] = (despesasPorCategoria[cat] || 0) + d.valor;
        });

        const totalDespesas = Object.values(despesasPorCategoria).reduce((a, b) => a + b, 0);

        return {
          saldo_atual: saldo?.saldo_atual || contas.reduce((sum, c) => sum + c.saldo_atual, 0),
          receitas_mes: saldo?.total_receitas || 0,
          despesas_mes: saldo?.total_despesas || 0,
          inadimplencia: {
            total_unidades: totalUnidades || 0,
            unidades_inadimplentes: inadimplentes.length,
            valor_em_aberto: inadimplentes.reduce(
              (sum: number, t: { valor_final: number | null }) => sum + (t.valor_final ?? 0),
              0
            ),
            percentual: totalUnidades ? (inadimplentes.length / totalUnidades) * 100 : 0,
          },
          contas,
          ultimos_lancamentos: ultimos || [],
          despesas_por_categoria: Object.entries(despesasPorCategoria).map(
            ([categoria, valor]) => ({
              categoria,
              valor,
              percentual: totalDespesas ? (valor / totalDespesas) * 100 : 0,
            })
          ),
        };
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao buscar dashboard financeiro';
        setError(errorMessage);
        return null;
      }
    },
    [supabase, calcularSaldoPeriodo, fetchContas]
  );

  return {
    loading,
    error,
    lancamentos,
    pagination,
    fetchCategorias,
    fetchContas,
    fetchLancamentos,
    createLancamento,
    updateLancamento,
    deleteLancamento,
    confirmarLancamento,
    calcularSaldoPeriodo,
    getDashboard,
  };
}

export type {
  CategoriaFinanceira,
  Comprovante,
  ContaBancaria,
  CreateLancamentoInput,
  DashboardFinanceiro,
  LancamentoFilters,
  LancamentoFinanceiro,
  LancamentoStatus,
  LancamentoTipo,
};
