'use client';

import type { NotificacaoUsuario } from '@/hooks/useNotificacoes';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificacaoCardProps {
  notificacao: NotificacaoUsuario;
  onClick?: () => void;
}

const PRIORIDADE_CONFIG: Record<string, { color: string; icon: string }> = {
  baixa: { color: 'bg-gray-100 text-gray-600', icon: 'info' },
  normal: { color: 'bg-blue-100 text-blue-700', icon: 'notifications' },
  alta: { color: 'bg-amber-100 text-amber-700', icon: 'priority_high' },
  critica: { color: 'bg-red-100 text-red-700', icon: 'warning' }
};

const TIPO_CONFIG: Record<string, { icon: string; label: string }> = {
  comunicado: { icon: 'campaign', label: 'Comunicado' },
  cobranca: { icon: 'payments', label: 'Cobrança' },
  assembleia: { icon: 'groups', label: 'Assembleia' },
  ocorrencia: { icon: 'report', label: 'Ocorrência' },
  chamado: { icon: 'support_agent', label: 'Chamado' },
  emergencia: { icon: 'emergency', label: 'Emergência' },
  sistema: { icon: 'settings', label: 'Sistema' }
};

export function NotificacaoCard({ notificacao, onClick }: NotificacaoCardProps) {
  const prioridade = PRIORIDADE_CONFIG[notificacao.prioridade] || PRIORIDADE_CONFIG.normal;
  const tipo = TIPO_CONFIG[notificacao.tipo] || { icon: 'notifications', label: notificacao.tipo };
  const isLida = notificacao.status === 'lido';

  const timeAgo = formatDistanceToNow(new Date(notificacao.created_at), { addSuffix: true, locale: ptBR });

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-700 transition-colors ${
        isLida ? 'bg-white dark:bg-card-dark' : 'bg-blue-50 dark:bg-blue-900/20'
      } hover:bg-gray-50 dark:hover:bg-gray-800`}
    >
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${prioridade.color}`}>
          <span className="material-symbols-outlined text-xl">{tipo.icon}</span>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${prioridade.color}`}>{tipo.label}</span>
            {!isLida && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
          </div>
          
          <h3 className={`font-medium text-gray-800 dark:text-white line-clamp-1 ${!isLida ? 'font-semibold' : ''}`}>
            {notificacao.titulo}
          </h3>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
            {notificacao.corpo_resumo || notificacao.corpo}
          </p>
          
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <span className="material-symbols-outlined text-xs">schedule</span>
            <span>{timeAgo}</span>
            {notificacao.lido_em && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs text-green-500">done_all</span>
                  Lida
                </span>
              </>
            )}
          </div>
        </div>

        {/* Seta */}
        <span className="material-symbols-outlined text-gray-300">chevron_right</span>
      </div>
    </button>
  );
}
