'use client';

import { getErrorMessage } from '@/lib/errors';
import { getSupabaseClient } from '@/lib/supabase';
import { Database } from '@versix/shared';
import type { CreatePrestacaoInput, PrestacaoContas, PrestacaoStatus, RelatorioMensal, UpdatePrestacaoInput } from '@versix/shared/types/financial';
import { useCallback, useState } from 'react';

type LancamentoRow = Database['public']['Tables']['lancamentos_financeiros']['Row'];
type LancamentoWithCategoria = LancamentoRow & {
  categoria: { nome: string } | null;
};

export function usePrestacaoContas() {
  const supabase = getSupabaseClient();
  const [prestacoes, setPrestacoes] = useState<PrestacaoContas[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrestacoes = useCallback(async (condominioId: string): Promise<PrestacaoContas[]> => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase.from('prestacao_contas').select('*').eq('condominio_id', condominioId).order('mes_referencia', { ascending: false });
      if (fetchError) throw fetchError;
      setPrestacoes(data || []);
      return data || [];
    } catch (err) {
      setError(getErrorMessage(err));
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const getPrestacao = useCallback(async (id: string): Promise<PrestacaoContas | null> => {
    try {
      const { data, error: fetchError } = await supabase.from('prestacao_contas').select('*').eq('id', id).single();
      if (fetchError) throw fetchError;

      // Buscar lançamentos do período
      const mesInicio = data.mes_referencia;
      const mesFim = new Date(data.mes_referencia);
      mesFim.setMonth(mesFim.getMonth() + 1);

      const { data: lancamentos } = await supabase.from('lancamentos_financeiros').select(`*, categoria:categoria_id (codigo, nome)`)
        .eq('condominio_id', data.condominio_id).gte('data_competencia', mesInicio).lt('data_competencia', mesFim.toISOString().slice(0, 10))
        .is('deleted_at', null).eq('status', 'confirmado').order('data_competencia');

      // Agrupar por categoria
      const porCategoria: Record<string, { receitas: number; despesas: number }> = {};
  type LancamentoRow = Database['public']['Tables']['lancamentos_financeiros']['Row'];
  type LancamentoWithCategoria = LancamentoRow & {
    categoria: { nome: string } | null;
  };
      (lancamentos || []).forEach((l: LancamentoWithCategoria) => {
        const cat = l.categoria?.nome || 'Outros';
        if (!porCategoria[cat]) porCategoria[cat] = { receitas: 0, despesas: 0 };
        if (l.tipo === 'receita') porCategoria[cat].receitas += l.valor;
        else if (l.tipo === 'despesa') porCategoria[cat].despesas += l.valor;
      });

      return { ...data, lancamentos: lancamentos || [], lancamentos_por_categoria: porCategoria };
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    }
  }, [supabase]);

  const createPrestacao = useCallback(async (condominioId: string, criadoPor: string, input: CreatePrestacaoInput): Promise<PrestacaoContas | null> => {
    setLoading(true);
    try {
      // Calcular saldo do período
      const { data: saldoData } = await supabase.rpc('calcular_saldo_periodo', { p_condominio_id: condominioId, p_mes_referencia: input.mes_referencia });
      const saldo = saldoData?.[0];

      const { data, error: insertError } = await supabase.from('prestacao_contas').insert({
        condominio_id: condominioId, criado_por: criadoPor, ...input,
        saldo_anterior: saldo?.saldo_anterior || 0,
        total_receitas: saldo?.total_receitas || 0,
        total_despesas: saldo?.total_despesas || 0,
        saldo_atual: saldo?.saldo_atual || 0
      }).select().single();
      if (insertError) throw insertError;
      setPrestacoes(prev => [data, ...prev]);
      return data;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const updatePrestacao = useCallback(async (input: UpdatePrestacaoInput, userId?: string): Promise<PrestacaoContas | null> => {
    setLoading(true);
    try {
      const { id, ...updates } = input;
      type PrestacaoUpdate = Database['public']['Tables']['prestacao_contas']['Update'];
      const updateData: Partial<PrestacaoUpdate> = { ...updates };

      // Campos automáticos baseados no status
      if (updates.status === 'em_revisao') {
        // Recalcular saldo antes de enviar para revisão
        const prestacao = prestacoes.find(p => p.id === id);
        if (prestacao) {
          const { data: saldoData } = await supabase.rpc('calcular_saldo_periodo', { p_condominio_id: prestacao.condominio_id, p_mes_referencia: prestacao.mes_referencia });
          const saldo = saldoData?.[0];
          if (saldo) {
            updateData.saldo_anterior = saldo.saldo_anterior;
            updateData.total_receitas = saldo.total_receitas;
            updateData.total_despesas = saldo.total_despesas;
            updateData.saldo_atual = saldo.saldo_atual;
          }
        }
      } else if (updates.status === 'aprovado' || updates.status === 'rejeitado') {
        updateData.revisado_por = userId;
        updateData.revisado_em = new Date().toISOString();
      } else if (updates.status === 'publicado') {
        updateData.publicado_por = userId;
        updateData.publicado_em = new Date().toISOString();
      }

      const { data, error: updateError } = await supabase.from('prestacao_contas').update(updateData).eq('id', id).select().single();
      if (updateError) throw updateError;
      setPrestacoes(prev => prev.map(p => p.id === id ? data : p));
      return data;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase, prestacoes]);

  const getRelatorioMensal = useCallback(async (condominioId: string, mesReferencia: string): Promise<RelatorioMensal | null> => {
    try {
      // Calcular saldo (use calcular_saldo_periodo instead of _otimizado version)
      const { data: saldoData } = await supabase.rpc('calcular_saldo_periodo', { p_condominio_id: condominioId, p_mes_referencia: mesReferencia });
      const saldo = saldoData?.[0];

      const mesFim = new Date(mesReferencia);
      mesFim.setMonth(mesFim.getMonth() + 1);

      // Buscar lançamentos
      const { data: lancamentos } = await supabase.from('lancamentos_financeiros').select(`valor, tipo, categoria:categoria_id (nome)`)
        .eq('condominio_id', condominioId).gte('data_competencia', mesReferencia).lt('data_competencia', mesFim.toISOString().slice(0, 10))
        .is('deleted_at', null).eq('status', 'confirmado');

      const receitas: Record<string, number> = {};
      const despesas: Record<string, number> = {};

      (lancamentos || []).forEach((l: LancamentoWithCategoria) => {
        const cat = l.categoria?.nome || 'Outros';
        if (l.tipo === 'receita') receitas[cat] = (receitas[cat] || 0) + l.valor;
        else if (l.tipo === 'despesa') despesas[cat] = (despesas[cat] || 0) + l.valor;
      });

      return {
        mes_referencia: mesReferencia,
        saldo_anterior: saldo?.saldo_anterior || 0,
        receitas: Object.entries(receitas).map(([categoria, valor]) => ({ categoria, valor })),
        despesas: Object.entries(despesas).map(([categoria, valor]) => ({ categoria, valor })),
        total_receitas: saldo?.total_receitas || 0,
        total_despesas: saldo?.total_despesas || 0,
        saldo_final: saldo?.saldo_atual || 0
      };
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    }
  }, [supabase]);

  return { prestacoes, loading, error, fetchPrestacoes, getPrestacao, createPrestacao, updatePrestacao, getRelatorioMensal };
}

export type { CreatePrestacaoInput, PrestacaoContas, PrestacaoStatus, RelatorioMensal, UpdatePrestacaoInput };

