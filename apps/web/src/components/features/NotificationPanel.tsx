'use client';

import { useAuthContext } from '@/contexts/AuthContext';
import { useComunicados } from '@/hooks/useComunicados';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const { profile } = useAuthContext();
  const { comunicados, naoLidos, marcarComoLido, marcarTodosComoLidos, loading } = useComunicados({
    condominioId: profile?.condominio_atual?.id || null,
    userId: profile?.id || null,
  });

  if (!isOpen) return null;

  const getIconForType = (tipo: string) => {
    const icons: Record<string, { icon: string; color: string }> = {
      pagamento: { icon: 'check_circle', color: 'text-green-500 bg-green-50' },
      assembleia: { icon: 'groups', color: 'text-blue-500 bg-blue-50' },
      manutencao: { icon: 'engineering', color: 'text-orange-500 bg-orange-50' },
      aviso: { icon: 'campaign', color: 'text-purple-500 bg-purple-50' },
      urgente: { icon: 'warning', color: 'text-red-500 bg-red-50' },
    };
    return icons[tipo] || { icon: 'notifications', color: 'text-gray-500 bg-gray-50' };
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute top-16 right-4 z-50 w-80 bg-white dark:bg-card-dark rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-slide-down">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-800 dark:text-white">Notificações</h3>
            {naoLidos > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {naoLidos}
              </span>
            )}
          </div>
          {naoLidos > 0 && (
            <button
              onClick={marcarTodosComoLidos}
              className="text-xs text-secondary font-bold hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="p-8 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && comunicados.length === 0 && (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">
              notifications_off
            </span>
            <p className="text-sm text-gray-500">Nenhuma notificação</p>
          </div>
        )}

        {/* Notifications List */}
        {!loading && comunicados.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {comunicados.slice(0, 10).map((notif) => {
              const { icon, color } = getIconForType(notif.categoria);
              return (
                <div
                  key={notif.id}
                  onClick={() => !notif.lido && marcarComoLido(notif.id)}
                  className={`p-4 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                    !notif.lido ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center shrink-0`}>
                      <span className="material-symbols-outlined text-xl">{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-bold text-sm text-gray-800 dark:text-white truncate ${!notif.lido ? 'font-extrabold' : ''}`}>
                          {notif.titulo}
                        </h4>
                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-text-sub dark:text-text-sub-dark mt-0.5 line-clamp-2">
                        {notif.conteudo.replace(/<[^>]*>/g, '').substring(0, 100)}
                      </p>
                      {!notif.lido && (
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-1" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700">
          <button className="w-full py-2 text-xs font-bold text-primary hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Ver todas as notificações
          </button>
        </div>
      </div>
    </>
  );
}
