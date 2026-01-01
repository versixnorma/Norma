'use client';

import { getErrorMessage } from '@/lib/errors';
import { getSupabaseClient } from '@/lib/supabase';
import { Database } from '@versix/shared';
import type {
  UpdateNotificacoesConfigInput,
  UpdatePreferenciasInput,
  UsuarioCanaisPreferencias,
} from '@versix/shared/types/comunicacao';
import { useCallback, useState } from 'react';

// Tipos do banco
type NotificacoesConfig = Database['public']['Tables']['notificacoes_config']['Row'];

/**
 * Normaliza dados do banco para o tipo UsuarioCanaisPreferencias
 * Trata conversão de tipos JSON do Supabase
 */
function normalizePreferencias(
  data: Database['public']['Tables']['usuarios_canais_preferencias']['Row']
): UsuarioCanaisPreferencias {
  return {
    ...data,
    push_tokens: Array.isArray(data.push_tokens)
      ? (data.push_tokens as any)
      : data.push_tokens
        ? JSON.parse(data.push_tokens as string)
        : null,
  };
}

export function usePreferenciasCanais() {
  const supabase = getSupabaseClient();
  const [preferencias, setPreferencias] = useState<UsuarioCanaisPreferencias | null>(null);
  const [config, setConfig] = useState<NotificacoesConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar preferências do usuário
  const fetchMinhasPreferencias =
    useCallback(async (): Promise<UsuarioCanaisPreferencias | null> => {
      setLoading(true);
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) return null;

        const { data, error: fetchError } = await supabase
          .from('usuarios_canais_preferencias')
          .select('*')
          .eq('usuario_id', userId)
          .single();

        if (fetchError && fetchError.code === 'PGRST116') {
          // Não existe, criar padrão
          const { data: newData, error: insertError } = await supabase
            .from('usuarios_canais_preferencias')
            .insert({ usuario_id: userId })
            .select()
            .single();
          if (insertError) throw insertError;
          const normalizedData = normalizePreferencias(newData);
          setPreferencias(normalizedData);
          return normalizedData;
        }
        if (fetchError) throw fetchError;
        const normalizedData = normalizePreferencias(data);
        setPreferencias(normalizedData);
        return normalizedData;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      } finally {
        setLoading(false);
      }
    }, [supabase]);

  // Atualizar preferências
  const updatePreferencias = useCallback(
    async (input: UpdatePreferenciasInput): Promise<boolean> => {
      setLoading(true);
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) throw new Error('Usuário não autenticado');

        const { data, error: updateError } = await supabase
          .from('usuarios_canais_preferencias')
          .update(input)
          .eq('usuario_id', userId)
          .select()
          .single();
        if (updateError) throw updateError;
        const normalizedData = normalizePreferencias(data);
        setPreferencias(normalizedData);
        return true;
      } catch (err) {
        setError(getErrorMessage(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // Registrar push token
  const registrarPushToken = useCallback(
    async (token: string, deviceInfo?: { type?: string; name?: string }): Promise<boolean> => {
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) return false;

        // Buscar preferências atuais
        const { data: current } = await supabase
          .from('usuarios_canais_preferencias')
          .select('push_tokens')
          .eq('usuario_id', userId)
          .single();

        if (!current) return false;

        // Adicionar novo token (evitar duplicatas)
        const currentTokens = (current.push_tokens as any) || [];
        const tokenExists = currentTokens.some((t: any) => t.token === token);

        if (tokenExists) return true;

        const newToken = {
          token,
          device_type: deviceInfo?.type,
          device_name: deviceInfo?.name,
          last_used: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('usuarios_canais_preferencias')
          .update({ push_tokens: [...currentTokens, newToken] })
          .eq('usuario_id', userId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        setError(getErrorMessage(err));
        return false;
      }
    },
    [supabase]
  );

  // Remover push token
  const removerPushToken = useCallback(
    async (token: string): Promise<boolean> => {
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) return false;

        const { data: current } = await supabase
          .from('usuarios_canais_preferencias')
          .select('push_tokens')
          .eq('usuario_id', userId)
          .single();

        if (!current) return false;

        const updatedTokens = ((current.push_tokens as any) || []).filter(
          (t: any) => t.token !== token
        );

        const { error: updateError } = await supabase
          .from('usuarios_canais_preferencias')
          .update({ push_tokens: updatedTokens })
          .eq('usuario_id', userId);

        if (updateError) throw updateError;
        return true;
      } catch (err) {
        setError(getErrorMessage(err));
        return false;
      }
    },
    [supabase]
  );

  // Buscar config do condomínio (síndico)
  const fetchConfigCondominio = useCallback(
    async (condominioId: string): Promise<NotificacoesConfig | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('notificacoes_config')
          .select('*')
          .eq('condominio_id', condominioId)
          .single();
        if (fetchError) throw fetchError;
        setConfig(data);
        return data;
      } catch (err) {
        setError(getErrorMessage(err));
        return null;
      }
    },
    [supabase]
  );

  // Atualizar config (síndico)
  const updateConfig = useCallback(
    async (condominioId: string, input: UpdateNotificacoesConfigInput): Promise<boolean> => {
      setLoading(true);
      try {
        const { data, error: updateError } = await supabase
          .from('notificacoes_config')
          .update(input)
          .eq('condominio_id', condominioId)
          .select()
          .single();
        if (updateError) throw updateError;
        setConfig(data);
        return true;
      } catch (err) {
        setError(getErrorMessage(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return {
    preferencias,
    config,
    loading,
    error,
    fetchMinhasPreferencias,
    updatePreferencias,
    registrarPushToken,
    removerPushToken,
    fetchConfigCondominio,
    updateConfig,
  };
}

export type {
  NotificacoesConfig,
  UpdateNotificacoesConfigInput,
  UpdatePreferenciasInput,
  UsuarioCanaisPreferencias,
};
