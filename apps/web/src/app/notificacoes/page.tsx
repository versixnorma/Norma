'use client';

import { NotificacaoCard } from '@/components/notificacoes/NotificacaoCard';
import { PreferenciasCanais } from '@/components/notificacoes/PreferenciasCanais';
import { AccessibleButton } from '@/components/ui/AccessibleButton';
import { useAuth } from '@/hooks/useAuth';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import { usePreferenciasCanais } from '@/hooks/usePreferenciasCanais';
import type { UsuarioCanaisPreferencias } from '@versix/shared/types/comunicacao';
import { Bell, CheckCheck, Settings } from 'lucide-react';
import { useState } from 'react';

export default function NotificacoesPage() {
  const { user } = useAuth();
  const {
    notificacoes,
    loading: loadingNotificacoes,
    marcarComoLida,
    marcarTodasComoLidas,
  } = useNotificacoes();
  const {
    preferencias,
    loading: loadingPreferencias,
    updatePreferencias,
  } = usePreferenciasCanais();
  const [tab, setTab] = useState<'lista' | 'config'>('lista');

  // Loading state combinado
  const isLoading = loadingNotificacoes || loadingPreferencias;

  if (!user) return null;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
          <Bell className="h-6 w-6" />
          Notificações
        </h1>
        {tab === 'lista' && (
          <div className="flex gap-2">
            <AccessibleButton
              onClick={() => marcarTodasComoLidas()}
              disabled={notificacoes.every((n) => n.status === 'lido')}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </AccessibleButton>
          </div>
        )}
      </div>

      {/* Tabs UI Simples (se não tiver componente Radix) */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setTab('lista')}
            className={`${
              tab === 'lista'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
          >
            <Bell className="h-4 w-4" />
            Minhas Notificações
            {notificacoes.filter((n) => n.status !== 'lido').length > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                {notificacoes.filter((n) => n.status !== 'lido').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('config')}
            className={`${
              tab === 'config'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } flex items-center gap-2 whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium`}
          >
            <Settings className="h-4 w-4" />
            Preferências
          </button>
        </nav>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-24 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-24 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      ) : (
        <>
          {tab === 'lista' ? (
            <div className="space-y-4">
              {notificacoes.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Bell className="mx-auto mb-3 h-12 w-12 opacity-20" />
                  <p>Nenhuma notificação encontrada.</p>
                </div>
              ) : (
                notificacoes.map((notificacao) => (
                  <NotificacaoCard
                    key={notificacao.notificacao_id}
                    notificacao={notificacao}
                    onClick={() => marcarComoLida(notificacao.notificacao_id)}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="p-4">
              {/* CORREÇÃO: O erro ocorria aqui. O objeto 'preferencias' vindo do hook
                   poderia estar incompleto. Fazemos um cast ou garantimos valores padrão
                   para satisfazer a interface UsuarioCanaisPreferencias exigida pelo componente.
                */}
              {preferencias && (
                <PreferenciasCanais
                  preferencias={preferencias as unknown as UsuarioCanaisPreferencias}
                  onSave={updatePreferencias}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
