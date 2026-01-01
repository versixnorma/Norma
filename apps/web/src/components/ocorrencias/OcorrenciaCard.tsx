'use client';

import type { OcorrenciaComJoins } from '@versix/shared';

interface OcorrenciaCardProps {
  ocorrencia: OcorrenciaComJoins;
  onClick?: () => void;
  showReporter?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  aberta: { label: 'Aberta', color: 'bg-blue-100 text-blue-700', icon: 'radio_button_unchecked' },
  em_analise: { label: 'Em Análise', color: 'bg-amber-100 text-amber-700', icon: 'pending' },
  em_andamento: { label: 'Em Andamento', color: 'bg-purple-100 text-purple-700', icon: 'sync' },
  resolvida: { label: 'Resolvida', color: 'bg-green-100 text-green-700', icon: 'check_circle' },
  arquivada: { label: 'Arquivada', color: 'bg-gray-100 text-gray-600', icon: 'inventory_2' }
};

const PRIORIDADE_CONFIG: Record<string, { label: string; color: string }> = {
  baixa: { label: 'Baixa', color: 'text-green-600' },
  media: { label: 'Média', color: 'text-amber-600' },
  alta: { label: 'Alta', color: 'text-orange-600' },
  urgente: { label: 'Urgente', color: 'text-red-600' }
};

const CATEGORIA_ICONS: Record<string, string> = {
  barulho: 'volume_up', vazamento: 'water_drop', iluminacao: 'lightbulb', limpeza: 'cleaning_services',
  seguranca: 'shield', area_comum: 'deck', elevador: 'elevator', portaria: 'door_front',
  animais: 'pets', estacionamento: 'local_parking', outros: 'report'
};

export function OcorrenciaCard({ ocorrencia, onClick, showReporter = false }: OcorrenciaCardProps) {
  const status = ocorrencia.status ? STATUS_CONFIG[ocorrencia.status] : STATUS_CONFIG['aberta'];
  const prioridade = ocorrencia.prioridade ? PRIORIDADE_CONFIG[ocorrencia.prioridade] : PRIORIDADE_CONFIG['media'];
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div onClick={onClick} className={`bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-gray-600 dark:text-gray-400">{ocorrencia.categoria ? CATEGORIA_ICONS[ocorrencia.categoria] : 'report'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-800 dark:text-white line-clamp-1">{ocorrencia.titulo}</h3>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full flex-shrink-0 ${status.color}`}>
              <span className="material-symbols-outlined text-sm">{status.icon}</span>
              {status.label}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{ocorrencia.descricao}</p>
          <div className="flex items-center flex-wrap gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              {formatDate(ocorrencia.created_at)}
            </span>
            <span className={`flex items-center gap-1 font-medium ${prioridade.color}`}>
              <span className="material-symbols-outlined text-sm">flag</span>
              {prioridade.label}
            </span>
            {ocorrencia.local_descricao && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">location_on</span>
                {ocorrencia.local_descricao}
              </span>
            )}
            {showReporter && !ocorrencia.anonimo && ocorrencia.reportado_por_info && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">person</span>
                {ocorrencia.reportado_por_info.nome}
              </span>
            )}
            {ocorrencia.anonimo && (
              <span className="flex items-center gap-1 text-gray-400 italic">
                <span className="material-symbols-outlined text-sm">visibility_off</span>
                Anônimo
              </span>
            )}
            {ocorrencia.responsavel && (
              <span className="flex items-center gap-1 text-primary">
                <span className="material-symbols-outlined text-sm">assignment_ind</span>
                {ocorrencia.responsavel.nome}
              </span>
            )}
            {Array.isArray(ocorrencia.anexos) && ocorrencia.anexos.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">image</span>
                {ocorrencia.anexos.length} foto(s)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
