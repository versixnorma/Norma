'use client';

import { useImpersonate } from '@/hooks/useImpersonate';

export function ImpersonateBanner() {
  const { isImpersonating, impersonateSession, stopImpersonate, loading } = useImpersonate();

  if (!isImpersonating || !impersonateSession) return null;

  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl animate-pulse">admin_panel_settings</span>
            <div className="text-sm">
              <span className="font-medium">Modo Impersonate Ativo</span>
              <span className="mx-2">•</span>
              <span>Visualizando como: <strong>{impersonateSession.alvo.nome}</strong> <span className="opacity-75 ml-1">({impersonateSession.alvo.email})</span></span>
              <span className="mx-2">•</span>
              <span className="opacity-75">Iniciado às {formatTime(impersonateSession.started_at)}</span>
            </div>
          </div>
          <button onClick={stopImpersonate} disabled={loading} className="flex items-center gap-2 px-4 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saindo...</> : <><span className="material-symbols-outlined text-lg">logout</span>Encerrar Impersonate</>}
          </button>
        </div>
      </div>
    </div>
  );
}
