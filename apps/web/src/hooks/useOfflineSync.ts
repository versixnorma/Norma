'use client';

import {
  cacheNotifications,
  getLastSyncTime,
  getPendingActions,
  incrementActionRetry,
  removePendingAction,
  saveCondominioInfo,
  saveUserProfile,
  type CachedCondominioInfo,
  type CachedUserProfile,
  type PendingAction,
} from '@/lib/offline-db';
import { requestBackgroundSync, useOnlineStatus } from '@/lib/pwa';
import { getSupabaseClient } from '@/lib/supabase';
import { useCallback, useEffect, useState } from 'react';

const MAX_RETRIES = 5;

// Whitelist de URLs permitidas para prevenir SSRF
const ALLOWED_URL_ORIGINS = [
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_APP_URL || '',
  'https://*.supabase.co',
];

/**
 * Valida se uma URL está na whitelist permitida
 * Previne ataques SSRF (Server-Side Request Forgery)
 */
function isAllowedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Verificar se a origem está na whitelist
    return ALLOWED_URL_ORIGINS.some((allowed) => {
      if (allowed.includes('*')) {
        // Suporte para wildcards simples
        const pattern = allowed.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        return regex.test(urlObj.origin);
      }
      return urlObj.origin === allowed || urlObj.href.startsWith(allowed);
    });
  } catch {
    // URL inválida
    return false;
  }
}

export function useOfflineSync() {
  const supabase = getSupabaseClient();
  const isOnline = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Atualizar contagem de ações pendentes
  const updatePendingCount = useCallback(async () => {
    const actions = await getPendingActions();
    setPendingCount(actions.length);
  }, []);

  // Sincronizar dados críticos do servidor
  const syncCriticalData = useCallback(
    async (condominioId: string) => {
      if (!isOnline) return false;
      setSyncing(true);

      try {
        // 1. Info do condomínio
        const { data: condo } = await supabase
          .from('condominios')
          .select('id, nome, endereco, telefone')
          .eq('id', condominioId)
          .single();

        if (condo) {
          await saveCondominioInfo({
            id: condo.id,
            nome: condo.nome,
            endereco: condo.endereco || '',
            telefone_portaria: condo.telefone || '',
            telefone_sindico: condo.telefone || '',
            cached_at: Date.now(),
          });
        }

        // 2. Últimas notificações
        const { data: notifs } = await supabase
          .from('notificacoes')
          .select('id, titulo, corpo, tipo, prioridade, created_at, status')
          .eq('condominio_id', condominioId)
          .order('created_at', { ascending: false })
          .limit(30);

        if (notifs) {
          await cacheNotifications(
            notifs.map((n) => ({
              id: n.id,
              titulo: n.titulo || '',
              corpo: n.corpo || '',
              tipo: n.tipo,
              prioridade: n.prioridade || 'media',
              created_at: new Date(n.created_at).getTime(),
              lido: n.status === 'enviado',
            }))
          );
        }

        setLastSync(new Date());
        return true;
      } catch (error) {
        console.error('Erro ao sincronizar dados críticos:', error);
        return false;
      } finally {
        setSyncing(false);
      }
    },
    [supabase, isOnline]
  );

  // Sincronizar perfil do usuário
  const syncUserProfile = useCallback(
    async (userId: string) => {
      if (!isOnline) return false;

      try {
        const { data } = await supabase
          .from('usuarios')
          .select('id, nome, email, telefone, role, avatar_url, unidade_id')
          .eq('id', userId)
          .single();

        if (data) {
          // Buscar info da unidade se houver
          const unidadeInfo = { identificador: '', bloco: '' };
          if (data.unidade_id) {
            const { data: unidade } = await supabase
              .from('unidades_habitacionais')
              .select('numero, bloco_id')
              .eq('id', data.unidade_id)
              .single();

            if (unidade) {
              unidadeInfo.identificador = unidade.numero || '';
              // Buscar nome do bloco se houver
              if (unidade.bloco_id) {
                const { data: bloco } = await supabase
                  .from('blocos')
                  .select('nome')
                  .eq('id', unidade.bloco_id)
                  .single();
                if (bloco) unidadeInfo.bloco = bloco.nome;
              }
            }
          }

          await saveUserProfile({
            id: data.id,
            nome: data.nome,
            email: data.email,
            telefone: data.telefone || '',
            unidade: unidadeInfo.identificador,
            bloco: unidadeInfo.bloco,
            role: data.role,
            avatar_url: data.avatar_url || '',
            cached_at: Date.now(),
          });
        }

        return true;
      } catch (error) {
        console.error('Erro ao sincronizar perfil:', error);
        return false;
      }
    },
    [supabase, isOnline]
  );

  // Processar ações pendentes (offline queue)
  const processPendingActions = useCallback(async () => {
    if (!isOnline) return { processed: 0, failed: 0 };

    const actions = await getPendingActions();
    let processed = 0;
    let failed = 0;

    for (const action of actions) {
      if (action.retries >= MAX_RETRIES) {
        await removePendingAction(action.id);
        failed++;
        continue;
      }

      // Validar URL para prevenir SSRF
      if (!isAllowedUrl(action.url)) {
        console.warn('URL não permitida:', action.url);
        await removePendingAction(action.id);
        failed++;
        continue;
      }

      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.body),
        });

        if (response.ok) {
          await removePendingAction(action.id);
          processed++;
        } else {
          await incrementActionRetry(action.id);
          failed++;
        }
      } catch {
        await incrementActionRetry(action.id);
        failed++;
      }
    }

    await updatePendingCount();
    return { processed, failed };
  }, [isOnline, updatePendingCount]);

  // Solicitar background sync
  const requestSync = useCallback(async () => {
    const success = await requestBackgroundSync('sync-critical-data');
    if (!success && isOnline) {
      // Fallback: sincronizar diretamente
      // Precisa do condominioId - seria obtido do contexto
    }
    return success;
  }, [isOnline]);

  // Verificar última sincronização
  useEffect(() => {
    getLastSyncTime('critical-data').then(setLastSync);
    updatePendingCount();
  }, [updatePendingCount]);

  // Auto-sync quando voltar online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      processPendingActions();
    }
  }, [isOnline, pendingCount, processPendingActions]);

  return {
    isOnline,
    syncing,
    lastSync,
    pendingCount,
    syncCriticalData,
    syncUserProfile,
    processPendingActions,
    requestSync,
    updatePendingCount,
  };
}

export type { CachedCondominioInfo, CachedUserProfile, PendingAction };
