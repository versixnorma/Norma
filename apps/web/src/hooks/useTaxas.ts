'use client';

import { getErrorMessage } from '@/lib/errors';
import { getSupabaseClient } from '@/lib/supabase';
import type { CobrancaStatus, TaxaTipo } from '@versix/shared';
import { Database } from '@versix/shared';
import { useCallback, useState } from 'react';

// Tipos do banco
type TaxaUnidade = Database['public']['Tables']['taxas_unidades']['Row'];

interface TaxaFilters {
  page?: number;
  pageSize?: number;
  unidade_id?: string;
  mes_referencia?: string;
  status?: CobrancaStatus;
  tipo?: TaxaTipo;
}

interface CreateTaxaInput {
  unidade_id: string;
  mes_referencia: string;
  tipo: TaxaTipo;
  descricao?: string;
  valor_base: number;
  data_vencimento: string;
  desconto?: number;
  acrescimo?: number;
}

interface UpdateTaxaInput {
  id: string;
  descricao?: string;
  valor_base?: number;
  data_vencimento?: string;
  multa?: number;
  juros?: number;
  desconto?: number;
  acrescimo?: number;
}

export function useTaxas() {
  const supabase = getSupabaseClient();
  const [taxas, setTaxas] = useState<TaxaUnidade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });

  const fetchTaxas = useCallback(
    async (condominioId: string, filters?: TaxaFilters) => {
      setLoading(true);
      try {
        const page = filters?.page || 1;
        const pageSize = filters?.pageSize || 20;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase
          .from('taxas_unidades')
          .select(`*, unidade:unidade_id (identificador, bloco:bloco_id (nome))`, {
            count: 'exact',
          })
          .eq('condominio_id', condominioId)
          .order('mes_referencia', { ascending: false })
          .order('data_vencimento')
          .range(from, to);

        if (filters?.unidade_id) query = query.eq('unidade_id', filters.unidade_id);
        if (filters?.mes_referencia) query = query.eq('mes_referencia', filters.mes_referencia);
        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.tipo) query = query.eq('tipo', filters.tipo);

        const { data, error: fetchError, count } = await query;
        if (fetchError) throw fetchError;

        setTaxas(data || []);
        setPagination({ page, pageSize, total: count || 0 });
        return { data: data || [], total: count || 0 };
      } catch (err) {
        setError(getErrorMessage(err));
        return { data: [], total: 0 };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const getMinhasTaxas = useCallback(
    async (userId: string, condominioId: string): Promise<TaxaUnidade[]> => {
      try {
        const { data: unidadesUser } = await supabase
          .from('usuarios_unidades')
          .select('unidade_id')
          .eq('usuario_id', userId)
          .eq('ativo', true);
        if (!unidadesUser || unidadesUser.length === 0) return [];

        const unidadeIds = unidadesUser.map((u: { unidade_id: string }) => u.unidade_id);

        const { data, error: fetchError } = await supabase
          .from('taxas_unidades')
          .select(`*, unidade:unidade_id (identificador, bloco:bloco_id (nome))`)
          .eq('condominio_id', condominioId)
          .in('unidade_id', unidadeIds)
          .order('mes_referencia', { ascending: false })
          .order('data_vencimento');

        if (fetchError) throw fetchError;
        return data || [];
      } catch (err) {
        setError(getErrorMessage(err));
        return [];
      }
    },
    [supabase]
  );

  const createTaxa = useCallback(
    async (condominioId: string, input: CreateTaxaInput): Promise<TaxaUnidade | null> => {
      setLoading(true);
      try {
        const valor_final = input.valor_base - (input.desconto || 0) + (input.acrescimo || 0);
        const { data, error: insertError } = await supabase
          .from('taxas_unidades')
          .insert({ condominio_id: condominioId, ...input, valor_final })
          .select()
          .single();
        if (insertError) throw insertError;
        setTaxas((prev) => [data, ...prev]);
        return data;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const updateTaxa = useCallback(
    async (input: UpdateTaxaInput): Promise<TaxaUnidade | null> => {
      setLoading(true);
      try {
        const { id, ...updates } = input;
        const taxa = taxas.find((t) => t.id === id);
        type TaxaUpdate = Database['public']['Tables']['taxas_unidades']['Update'];
        const updateData: Partial<TaxaUpdate> = { ...updates };
        if (taxa && (updates.desconto !== undefined || updates.acrescimo !== undefined)) {
          const desconto = updates.desconto ?? taxa.desconto ?? 0;
          const acrescimo = updates.acrescimo ?? taxa.acrescimo ?? 0;
          updateData.valor_final = taxa.valor_base - desconto + acrescimo;
        }
        const { data, error: updateError } = await supabase
          .from('taxas_unidades')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        if (updateError) throw updateError;
        setTaxas((prev) => prev.map((t) => (t.id === id ? data : t)));
        return data;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase, taxas]
  );

  const registrarPagamento = useCallback(
    async (id: string, valorPago: number, dataPagamento?: string): Promise<boolean> => {
      try {
        const { error: updateError } = await supabase
          .from('taxas_unidades')
          .update({
            status: 'pago',
            valor_pago: valorPago,
            data_pagamento: dataPagamento || new Date().toISOString().slice(0, 10),
          })
          .eq('id', id);
        if (updateError) throw updateError;
        setTaxas((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, status: 'pago' as CobrancaStatus, valor_pago: valorPago } : t
          )
        );
        return true;
      } catch (err) {
        setError(getErrorMessage(err));
        return false;
      }
    },
    [supabase]
  );

  const gerarTaxasMes = useCallback(
    async (condominioId: string, mesReferencia: string): Promise<number> => {
      setLoading(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('gerar_taxas_mes', {
          p_condominio_id: condominioId,
          p_mes_referencia: mesReferencia,
        });
        if (rpcError) throw rpcError;
        return data || 0;
      } catch (err) {
        setError(getErrorMessage(err));
        return 0;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const atualizarTaxasAtrasadas = useCallback(async (): Promise<number> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('atualizar_taxas_atrasadas');
      if (rpcError) throw rpcError;
      return data || 0;
    } catch {
      return 0;
    }
  }, [supabase]);

  const getResumoInadimplencia = useCallback(
    async (condominioId: string) => {
      try {
        const { data } = await supabase
          .from('taxas_unidades')
          .select(
            `id, valor_final, status, data_vencimento, unidade:unidade_id (identificador, bloco:bloco_id (nome))`
          )
          .eq('condominio_id', condominioId)
          .in('status', ['pendente', 'atrasado'])
          .order('data_vencimento');

        const atrasadas = (data || []).filter((t: TaxaUnidade) => t.status === 'atrasado');
        const pendentes = (data || []).filter((t: TaxaUnidade) => t.status === 'pendente');

        return {
          total_em_aberto: (data || []).reduce(
            (sum: number, t: TaxaUnidade) => sum + (t.valor_final ?? 0),
            0
          ),
          total_atrasado: atrasadas.reduce(
            (sum: number, t: TaxaUnidade) => sum + (t.valor_final ?? 0),
            0
          ),
          qtd_atrasadas: atrasadas.length,
          qtd_pendentes: pendentes.length,
          taxas_atrasadas: atrasadas,
        };
      } catch {
        return null;
      }
    },
    [supabase]
  );

  return {
    taxas,
    loading,
    error,
    pagination,
    fetchTaxas,
    getMinhasTaxas,
    createTaxa,
    updateTaxa,
    registrarPagamento,
    gerarTaxasMes,
    atualizarTaxasAtrasadas,
    getResumoInadimplencia,
  };
}

export type {
  CobrancaStatus,
  CreateTaxaInput,
  TaxaFilters,
  TaxaTipo,
  TaxaUnidade,
  UpdateTaxaInput,
};
