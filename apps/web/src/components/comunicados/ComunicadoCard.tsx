'use client';

import type { ComunicadoComJoins } from '@versix/shared';

interface ComunicadoCardProps {
  comunicado: ComunicadoComJoins;
  onClick?: () => void;
  showStatus?: boolean;
}

const CATEGORIA_ICONS: Record<string, string> = {
  urgente: 'warning', geral: 'campaign', manutencao: 'build', financeiro: 'payments',
  assembleia: 'groups', seguranca: 'shield', evento: 'celebration', obras: 'construction'
};

const CATEGORIA_COLORS: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700', geral: 'bg-blue-100 text-blue-700',
  manutencao: 'bg-orange-100 text-orange-700', financeiro: 'bg-green-100 text-green-700',
  assembleia: 'bg-purple-100 text-purple-700', seguranca: 'bg-rose-100 text-rose-700',
  evento: 'bg-pink-100 text-pink-700', obras: 'bg-amber-100 text-amber-700'
};

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600' },
  publicado: { label: 'Publicado', color: 'bg-green-100 text-green-700' },
  arquivado: { label: 'Arquivado', color: 'bg-amber-100 text-amber-700' }
};

export function ComunicadoCard({ comunicado, onClick, showStatus }: ComunicadoCardProps) {
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <div onClick={onClick} className={`bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all ${onClick ? 'cursor-pointer' : ''} ${comunicado.destaque ? 'ring-2 ring-primary/30' : ''}`}>
      <div className="flex items-start gap-4">
        {comunicado.fixado && (
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-sm">push_pin</span>
          </div>
        )}
        <div className={`w-12 h-12 rounded-xl ${comunicado.categoria ? CATEGORIA_COLORS[comunicado.categoria] : 'bg-gray-100 text-gray-700'} flex items-center justify-center flex-shrink-0`}>
          <span className="material-symbols-outlined">{comunicado.categoria ? CATEGORIA_ICONS[comunicado.categoria] : 'info'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-800 dark:text-white line-clamp-2">{comunicado.titulo}</h3>
            {showStatus && comunicado.status && (
              <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BADGES[comunicado.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                {STATUS_BADGES[comunicado.status]?.label || comunicado.status}
              </span>
            )}
          </div>
          {comunicado.resumo && <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{comunicado.resumo}</p>}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              {formatDate(comunicado.published_at || comunicado.created_at)}
            </span>
            {comunicado.autor && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">person</span>
                {comunicado.autor.nome}
              </span>
            )}
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">visibility</span>
              {comunicado.visualizacoes}
            </span>
            {Array.isArray(comunicado.anexos) && comunicado.anexos.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">attach_file</span>
                {comunicado.anexos.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
