'use client';

import { getSupabaseClient } from '@/lib/supabase';
import type {
  CategoriaFinanceira,
  ContaBancaria,
  DashboardFinanceiro,
  LancamentoFinanceiro,
  SaldoPeriodo,
} from '@versix/shared';
import { useCallback, useState } from 'react';

/**
 * Hook para consultas de suporte ao dashboard financeiro.
 *
 * Fornece acesso a categorias hierárquicas, contas bancárias ativas,
 * cálculo de saldo mensal via RPC e montagem completa do `DashboardFinanceiro`
 * (KPIs de receita/despesa, inadimplência e últimos lançamentos).
 *
 * @example
 * const { getDashboard, fetchCategorias } = useDashboardFinanceiro();
 * const dashboard = await getDashboard(condominioId);
 * const receitas = await fetchCategorias(condominioId, 'receita');
 */
export function useDashboardFinanceiro() {
  const supabase = getSupabaseClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        return (data as unknown as ContaBancaria[]) || [];
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro desconhecido ao buscar contas bancárias';
        setError(errorMessage);
        return [];
      }
    },
    [supabase]
  );

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
      setLoading(true);
      try {
        const hoje = new Date();
        const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`;

        const saldo = await calcularSaldoPeriodo(condominioId, mesAtual);
        const contas = await fetchContas(condominioId);

        const { data: ultimos } = await supabase
          .from('lancamentos_financeiros')
          .select(`*, categoria:categoria_id (codigo, nome)`)
          .eq('condominio_id', condominioId)
          .is('deleted_at', null)
          .eq('status', 'confirmado')
          .order('data_competencia', { ascending: false })
          .limit(5);

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
          contas: contas,
          ultimos_lancamentos: (ultimos || []) as unknown as LancamentoFinanceiro[],
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
      } finally {
        setLoading(false);
      }
    },
    [supabase, calcularSaldoPeriodo, fetchContas]
  );

  return {
    loading,
    error,
    fetchCategorias,
    fetchContas,
    calcularSaldoPeriodo,
    getDashboard,
  };
}
