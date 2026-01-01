'use client';

import { getSupabaseClient } from '@/lib/supabase';
import type {
  CreateNotificacaoInput,
  NotificacaoDashboard,
  NotificacaoUsuario,
} from '@versix/shared/types/comunicacao';
import { useCallback, useState } from 'react';

type SupabaseError = {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
};

export function useNotificacoes() {
  const supabase = getSupabaseClient();
  const [notificacoes, setNotificacoes] = useState<NotificacaoUsuario[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar notificações do usuário
  const fetchMinhasNotificacoes = useCallback(async (): Promise<NotificacaoUsuario[]> => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('v_usuario_notificacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      const notificacoesData = data || [];
      setNotificacoes(notificacoesData);
      setNaoLidas(notificacoesData.filter((n: any) => n.status !== 'lido').length);
      return notificacoesData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar notificações';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Buscar contagem de não lidas
  const fetchContagemNaoLidas = useCallback(async (): Promise<number> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) return 0;

      const { data, error: rpcError } = (await supabase.rpc('get_contagem_nao_lidas', {
        p_usuario_id: userId,
      })) as { data: number | null; error: SupabaseError | null };

      if (rpcError) throw rpcError;

      const count = data || 0;
      setNaoLidas(count);
      return count;
    } catch {
      return 0;
    }
  }, [supabase]);

  // Marcar como lida
  const marcarComoLida = useCallback(
    async (notificacaoId: string): Promise<boolean> => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) return false;

        const { data, error: rpcError } = (await supabase.rpc('confirmar_leitura', {
          p_notificacao_id: notificacaoId,
          p_usuario_id: userId,
        })) as { data: boolean; error: SupabaseError | null };

        if (rpcError) throw rpcError;

        setNotificacoes((prev) =>
          prev.map((n) =>
            n.notificacao_id === notificacaoId
              ? { ...n, status: 'lido' as const, lido_em: new Date().toISOString() }
              : n
          )
        );
        setNaoLidas((prev) => Math.max(0, prev - 1));
        return data;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao marcar notificação como lida';
        setError(errorMessage);
        return false;
      }
    },
    [supabase]
  );

  // Marcar todas como lidas
  const marcarTodasComoLidas = useCallback(async (): Promise<number> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (!userId) return 0;

      const { data, error: rpcError } = (await supabase.rpc('marcar_todas_lidas', {
        p_usuario_id: userId,
      })) as { data: number | null; error: SupabaseError | null };

      if (rpcError) throw rpcError;

      setNotificacoes((prev) =>
        prev.map((n) => ({ ...n, status: 'lido' as const, lido_em: new Date().toISOString() }))
      );
      setNaoLidas(0);
      return data || 0;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Erro ao marcar notificações como lidas';
      setError(errorMessage);
      return 0;
    }
  }, [supabase]);

  // Enviar notificação (síndico)
  const enviarNotificacao = useCallback(
    async (condominioId: string, input: CreateNotificacaoInput): Promise<string | null> => {
      setLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) throw new Error('Usuário não autenticado');

        const { data, error: rpcError } = (await supabase.rpc('enviar_notificacao', {
          p_condominio_id: condominioId,
          p_tipo: input.tipo,
          p_titulo: input.titulo,
          p_corpo: input.corpo,
          p_prioridade: input.prioridade || 'normal',
          p_destinatarios_tipo: input.destinatarios_tipo || 'todos',
          p_destinatarios_filtro: input.destinatarios_filtro || null,
          p_referencia_tipo: input.referencia_tipo || null,
          p_referencia_id: input.referencia_id || null,
          p_gerar_mural: input.gerar_mural || false,
          p_criado_por: userId,
        })) as { data: string | null; error: SupabaseError | null };

        if (rpcError) throw rpcError;
        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar notificação';
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // Dashboard (síndico)
  const fetchDashboard = useCallback(
    async (condominioId: string): Promise<NotificacaoDashboard[]> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('v_notificacoes_dashboard')
          .select('*')
          .eq('condominio_id', condominioId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (fetchError) throw fetchError;
        return data || [];
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao buscar dashboard de notificações';
        setError(errorMessage);
        return [];
      }
    },
    [supabase]
  );

  // Realtime subscription
  const subscribeToNotificacoes = useCallback(
    (userId: string, onNew: (notif: NotificacaoUsuario) => void) => {
      const channel = supabase
        .channel(`notifs-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notificacoes_entregas',
            filter: `usuario_id=eq.${userId}`,
          },
          async (payload: any) => {
            try {
              const { data } = await supabase
                .from('v_usuario_notificacoes')
                .select('*')
                .eq('entrega_id', payload.new.id)
                .single();

              if (data) {
                onNew(data);
                setNotificacoes((prev) => [data, ...prev]);
                setNaoLidas((prev) => prev + 1);
              }
            } catch (err) {
              console.error('Erro ao processar nova notificação:', err);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
    [supabase]
  );

  return {
    notificacoes,
    naoLidas,
    loading,
    error,
    fetchMinhasNotificacoes,
    fetchContagemNaoLidas,
    marcarComoLida,
    marcarTodasComoLidas,
    enviarNotificacao,
    fetchDashboard,
    subscribeToNotificacoes,
  };
}

export type { CreateNotificacaoInput, NotificacaoDashboard, NotificacaoUsuario };
