'use client';

/**
 * @deprecated Este hook está deprecated e será removido em versão futura.
 * Use `useFinanceiro` de './useFinanceiro.ts' em vez deste.
 *
 * Migração necessária:
 * - apps/web/src/app/home/page.tsx
 * - apps/web/src/components/pages/TransparencyPage.tsx
 */

import { getSupabaseClient } from '@/lib/supabase';
import type {
  ContaBancaria,
  LancamentoFinanceiro,
  LancamentoStatus,
  LancamentoTipo,
} from '@versix/shared';
import { useCallback, useEffect, useState } from 'react';

// ============================================
// TYPES
// ============================================
export interface DashboardFinanceiro {
  saldo_total: number;
  receitas_mes: number;
  despesas_mes: number;
  inadimplencia_percent: number;
  fundo_reserva: number;
}

export interface ContaBancariaResumo {
  id: string;
  nome: string;
  banco: string;
  saldo_atual: number;
  principal: boolean;
}

export interface LancamentoComDetalhes extends LancamentoFinanceiro {
  categoria_nome?: string;
  conta_nome?: string;
  unidade_identificador?: string;
  data_exibicao?: string;
}

interface UseFinancialOptions {
  condominioId: string | null;
  mesReferencia?: Date;
}

interface UseFinancialReturn {
  // Data
  dashboard: DashboardFinanceiro | null;
  contas: ContaBancariaResumo[];
  lancamentos: LancamentoComDetalhes[];
  inadimplentes: {
    unidade_id: string;
    identificador: string;
    valor_devido: number;
    meses_atraso: number;
  }[];

  // State
  loading: boolean;
  error: Error | null;

  // Methods
  refresh: () => Promise<void>;
  createLancamento: (data: CreateLancamentoInput) => Promise<{ success: boolean; error?: Error }>;
  updateLancamento: (
    id: string,
    data: Partial<LancamentoFinanceiro>
  ) => Promise<{ success: boolean; error?: Error }>;
  registrarPagamento: (
    lancamentoId: string,
    dataPagamento?: Date
  ) => Promise<{ success: boolean; error?: Error }>;
}

interface CreateLancamentoInput {
  tipo: LancamentoTipo;
  descricao: string;
  valor: number;
  data_competencia: string;
  data_lancamento?: string;
  data_pagamento?: string;
  categoria_id?: string | null;
  conta_bancaria_id?: string | null;
  status?: LancamentoStatus;
}

// ============================================
// HOOK
// ============================================
export function useFinancial({
  condominioId,
  mesReferencia,
}: UseFinancialOptions): UseFinancialReturn {
  const supabase = getSupabaseClient();

  const [dashboard, setDashboard] = useState<DashboardFinanceiro | null>(null);
  const [contas, setContas] = useState<ContaBancariaResumo[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoComDetalhes[]>([]);
  const [inadimplentes, setInadimplentes] = useState<UseFinancialReturn['inadimplentes']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const mes = mesReferencia || new Date();
  const inicioMes = new Date(mes.getFullYear(), mes.getMonth(), 1).toISOString();
  const fimMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).toISOString();

  // ============================================
  // FETCH DATA
  // ============================================
  const fetchDashboard = useCallback(async () => {
    if (!condominioId) return;

    try {
      const { data: contasData } = await supabase
        .from('contas_bancarias')
        .select('saldo_atual')
        .eq('condominio_id', condominioId)
        .is('deleted_at', null);

      const saldoTotal = contasData?.reduce((sum, c) => sum + (c.saldo_atual || 0), 0) || 0;

      const { data: receitas } = await supabase
        .from('lancamentos_financeiros')
        .select('valor')
        .eq('condominio_id', condominioId)
        .eq('tipo', 'receita')
        .eq('status', 'confirmado')
        .gte('data_competencia', inicioMes)
        .lte('data_competencia', fimMes);

      const receitasMes = receitas?.reduce((sum, l) => sum + (l.valor || 0), 0) || 0;

      const { data: despesas } = await supabase
        .from('lancamentos_financeiros')
        .select('valor')
        .eq('condominio_id', condominioId)
        .eq('tipo', 'despesa')
        .eq('status', 'confirmado')
        .gte('data_competencia', inicioMes)
        .lte('data_competencia', fimMes);

      const despesasMes = despesas?.reduce((sum, l) => sum + Math.abs(l.valor || 0), 0) || 0;

      setDashboard({
        saldo_total: saldoTotal,
        receitas_mes: receitasMes,
        despesas_mes: despesasMes,
        inadimplencia_percent: 0,
        fundo_reserva: 0,
      });
    } catch (err) {
      console.error('Erro ao buscar dashboard:', err);
    }
  }, [condominioId, supabase, inicioMes, fimMes]);

  const fetchContas = useCallback(async () => {
    if (!condominioId) return;

    const { data, error } = await supabase
      .from('contas_bancarias')
      .select('id, nome_exibicao, banco_nome, saldo_atual, principal')
      .eq('condominio_id', condominioId)
      .is('deleted_at', null)
      .order('principal', { ascending: false });

    if (!error && data) {
      setContas(
        data.map((c: ContaBancaria) => ({
          id: c.id,
          nome: c.nome_exibicao,
          banco: c.banco_nome,
          saldo_atual: c.saldo_atual,
          principal: c.principal,
        }))
      );
    }
  }, [condominioId, supabase]);

  const fetchLancamentos = useCallback(async () => {
    if (!condominioId) return;

    const { data, error } = await supabase
      .from('lancamentos_financeiros')
      .select(
        `
        *,
        categoria:categorias_financeiras!lancamentos_financeiros_categoria_id_fkey (nome, codigo),
        conta:contas_bancarias!lancamentos_financeiros_conta_bancaria_id_fkey (nome_exibicao)
      `
      )
      .eq('condominio_id', condominioId)
      .gte('data_competencia', inicioMes)
      .lte('data_competencia', fimMes)
      .order('data_competencia', { ascending: false })
      .limit(50);

    if (!error && data) {
      setLancamentos(
        (
          data as (LancamentoFinanceiro & {
            categoria?: { nome?: string };
            conta?: { nome_exibicao?: string };
          })[]
        ).map((l) => ({
          ...l,
          categoria_nome: l.categoria?.nome,
          conta_nome: l.conta?.nome_exibicao,
          unidade_identificador: undefined,
          data_exibicao: l.data_competencia || l.data_lancamento,
        }))
      );
    }
  }, [condominioId, supabase, inicioMes, fimMes]);

  const fetchInadimplentes = useCallback(async () => {
    // Sem base de boletos/lancamentos atrasados no schema atual
    setInadimplentes([]);
  }, []);

  // ============================================
  // REFRESH ALL
  // ============================================
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchDashboard(),
        fetchContas(),
        fetchLancamentos(),
        fetchInadimplentes(),
      ]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard, fetchContas, fetchLancamentos, fetchInadimplentes]);

  // Initial load
  useEffect(() => {
    const checkAndLoad = async () => {
      if (!condominioId) {
        setLoading(false);
        return;
      }

      // Verificar se há sessão válida
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setLoading(false);
        return;
      }

      refresh();
    };

    checkAndLoad();
  }, [condominioId, refresh, supabase.auth]);

  // ============================================
  // MUTATIONS
  // ============================================
  const createLancamento = async (data: CreateLancamentoInput) => {
    if (!condominioId) return { success: false, error: new Error('Condomínio não selecionado') };

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id || null;
      const { error } = await supabase.from('lancamentos_financeiros').insert({
        condominio_id: condominioId,
        ...data,
        data_lancamento: data.data_lancamento || new Date().toISOString(),
        status: data.status || 'pendente',
        criado_por: userId,
      });

      if (error) throw error;

      await refresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  };

  const updateLancamento = async (id: string, data: Partial<LancamentoFinanceiro>) => {
    try {
      const { error } = await supabase.from('lancamentos_financeiros').update(data).eq('id', id);

      if (error) throw error;

      await refresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  };

  const registrarPagamento = async (lancamentoId: string, dataPagamento?: Date) => {
    try {
      const { error } = await supabase
        .from('lancamentos_financeiros')
        .update({
          status: 'confirmado' as LancamentoStatus,
          data_pagamento: (dataPagamento || new Date()).toISOString(),
        })
        .eq('id', lancamentoId);

      if (error) throw error;

      await refresh();
      return { success: true };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  };

  return {
    dashboard,
    contas,
    lancamentos,
    inadimplentes,
    loading,
    error,
    refresh,
    createLancamento,
    updateLancamento,
    registrarPagamento,
  };
}
