'use client';

import { getErrorMessage } from '@/lib/errors';
import { getSupabaseClient } from '@/lib/supabase';
import type { Integracao } from '@versix/shared';
import type { CreateIntegracaoApiInput, CreateWebhookInput, IntegracaoDashboard, IntegracoesFilters, WebhookEvento } from '@versix/shared/src/validators/integracoes';
import { useCallback, useState } from 'react';

export function useIntegracoes() {
  const supabase = getSupabaseClient();
  const [integracoes, setIntegracoes] = useState<IntegracaoDashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar integrações do condomínio
  const fetchIntegracoes = useCallback(async (condominioId: string, filters?: IntegracoesFilters): Promise<IntegracaoDashboard[]> => {
    setLoading(true);
    try {
      let query = supabase.from('v_integracoes_resumo').select('*').eq('condominio_id', condominioId);
      if (filters?.tipo) query = query.eq('tipo', filters.tipo);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setIntegracoes(data || []);
      return data || [];
    } catch (err) {
      setError(getErrorMessage(err));
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Buscar integração específica
  const getIntegracao = useCallback(async (id: string): Promise<Integracao | null> => {
    try {
      const { data, error: fetchError } = await supabase.from('integracoes').select('*, webhook_config:webhooks_config(*), conector_config:conectores_config(*)').eq('id', id).single();
      if (fetchError) throw fetchError;
      return data;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    }
  }, [supabase]);

  // Criar integração API
  const criarIntegracaoApi = useCallback(async (condominioId: string, input: CreateIntegracaoApiInput): Promise<{ id: string; api_key: string; secret_key: string } | null> => {
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('criar_integracao_api', {
        p_condominio_id: condominioId,
        p_nome: input.nome,
        p_descricao: input.descricao || null,
        p_scopes: input.scopes || []
      });
      if (rpcError) throw rpcError;
      return data?.[0] || null;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Criar webhook
  const criarWebhook = useCallback(async (condominioId: string, input: CreateWebhookInput): Promise<{ id: string; secret_key: string } | null> => {
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('criar_webhook', {
        p_condominio_id: condominioId,
        p_nome: input.nome,
        p_url: input.url_destino,
        p_eventos: input.eventos,
        p_headers_custom: input.headers_custom || {}
      });
      if (rpcError) throw rpcError;
      return data?.[0] || null;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Atualizar status da integração
  const atualizarStatus = useCallback(async (id: string, status: 'ativa' | 'pausada' | 'desativada'): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase.from('integracoes').update({ status }).eq('id', id);
      if (updateError) throw updateError;
      setIntegracoes(prev => prev.map(i => i.id === id ? { ...i, status } : i));
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    }
  }, [supabase]);

  // Regenerar API key
  const regenerarApiKey = useCallback(async (id: string): Promise<string | null> => {
    try {
      const { data: newKey } = await supabase.rpc('gerar_api_key');
      const { error: updateError } = await supabase.from('integracoes').update({ api_key: newKey }).eq('id', id);
      if (updateError) throw updateError;
      return newKey;
    } catch (err) {
      setError(getErrorMessage(err));
      return null;
    }
  }, [supabase]);

  // Deletar integração
  const deletarIntegracao = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.from('integracoes').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setIntegracoes(prev => prev.filter(i => i.id !== id));
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    }
  }, [supabase]);

  return {
    integracoes, loading, error,
    fetchIntegracoes, getIntegracao,
    criarIntegracaoApi, criarWebhook,
    atualizarStatus, regenerarApiKey, deletarIntegracao
  };
}

export type { CreateIntegracaoApiInput, CreateWebhookInput, Integracao, IntegracaoDashboard, WebhookEvento };

