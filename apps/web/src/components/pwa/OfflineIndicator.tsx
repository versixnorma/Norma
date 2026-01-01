'use client';

import { useOnlineStatus } from '@/lib/pwa';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { syncing, lastSync, pendingCount } = useOfflineSync();

  // Não mostrar nada se online e sincronizado
  if (isOnline && pendingCount === 0 && !syncing) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-all ${
      !isOnline 
        ? 'bg-red-500 text-white' 
        : syncing 
          ? 'bg-amber-500 text-white' 
          : pendingCount > 0 
            ? 'bg-blue-500 text-white' 
            : ''
    }`}>
      {!isOnline ? (
        <div className="flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-lg">cloud_off</span>
          <span>Você está offline</span>
          {lastSync && (
            <span className="text-white/80">
              • Dados de {formatDistanceToNow(lastSync, { addSuffix: true, locale: ptBR })}
            </span>
          )}
        </div>
      ) : syncing ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Sincronizando...</span>
        </div>
      ) : pendingCount > 0 ? (
        <div className="flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-lg">sync</span>
          <span>{pendingCount} ações pendentes de sincronização</span>
        </div>
      ) : null}
    </div>
  );
}

// Componente simples de badge para navbar
export function OfflineBadge() {
  const isOnline = useOnlineStatus();
  const { pendingCount } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className={`w-2 h-2 rounded-full absolute -top-1 -right-1 ${
      !isOnline ? 'bg-red-500' : 'bg-amber-500'
    }`} />
  );
}
