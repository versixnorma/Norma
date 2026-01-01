'use client';

import { getSupabaseClient } from '@/lib/supabase';
import type { ApiLog, ApiLogsFilters, WebhookEntrega } from '@versix/shared';
import { useCallback, useState } from 'react';

export function useWebhooksLog() {
  const supabase = getSupabaseClient();
  const [entregas, setEntregas] = useState<WebhookEntrega[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar entregas de webhook
  const fetchEntregas = useCallback(async (integracaoId: string, limit = 50): Promise<WebhookEntrega[]> => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('webhooks_entregas')
        .select('*, webhook_config:webhooks_config!inner(integracao_id)')
        .eq('webhook_config.integracao_id', integracaoId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (fetchError) throw fetchError;
      setEntregas(data || []);
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Buscar logs de API
  const fetchApiLogs = useCallback(async (integracaoId: string, filters?: ApiLogsFilters): Promise<ApiLog[]> => {
    setLoading(true);
    try {
      let query = supabase.from('api_logs').select('*').eq('integracao_id', integracaoId);
      if (filters?.method) query = query.eq('method', filters.method);
      if (filters?.erro !== undefined) query = query.eq('erro', filters.erro);
      if (filters?.data_inicio) query = query.gte('created_at', filters.data_inicio);
      if (filters?.data_fim) query = query.lte('created_at', filters.data_fim);

      const { data, error: fetchError } = await query.order('created_at', { ascending: false }).limit(100);
      if (fetchError) throw fetchError;
      setApiLogs(data || []);
      return data || [];
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Retentar webhook
  const retentarWebhook = useCallback(async (entregaId: string): Promise<string | null> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('retentar_webhook', { p_entrega_id: entregaId });
      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      return null;
    }
  }, [supabase]);

  // Estatísticas
  const getEstatisticas = useCallback(async (integracaoId: string): Promise<{ total: number; sucesso: number; falha: number; pendente: number }> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('webhooks_entregas')
        .select('sucesso, webhook_config!inner(integracao_id)')
        .eq('webhook_config.integracao_id', integracaoId);
      if (fetchError) throw fetchError;

      const total = data?.length || 0;
      const sucesso = data?.filter(e => e.sucesso === true).length || 0;
      const falha = data?.filter(e => e.sucesso === false).length || 0;
      const pendente = data?.filter(e => e.sucesso === null).length || 0;

      return { total, sucesso, falha, pendente };
    } catch {
      return { total: 0, sucesso: 0, falha: 0, pendente: 0 };
    }
  }, [supabase]);

  return {
    entregas, apiLogs, loading, error,
    fetchEntregas, fetchApiLogs, retentarWebhook, getEstatisticas
  };
}

export type { ApiLog, ApiLogsFilters, WebhookEntrega };

