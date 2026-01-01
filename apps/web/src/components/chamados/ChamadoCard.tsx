'use client';

import type { ChamadoComJoins } from '@versix/shared';

interface ChamadoCardProps {
  chamado: ChamadoComJoins;
  onClick?: () => void;
  isSindico?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  novo: { label: 'Novo', color: 'bg-blue-100 text-blue-700', icon: 'fiber_new' },
  em_atendimento: { label: 'Em Atendimento', color: 'bg-purple-100 text-purple-700', icon: 'support_agent' },
  aguardando_resposta: { label: 'Aguardando', color: 'bg-amber-100 text-amber-700', icon: 'hourglass_top' },
  resolvido: { label: 'Resolvido', color: 'bg-green-100 text-green-700', icon: 'check_circle' },
  fechado: { label: 'Fechado', color: 'bg-gray-100 text-gray-600', icon: 'lock' }
};

const CATEGORIA_LABELS: Record<string, string> = {
  segunda_via_boleto: '2ª Via Boleto', atualizacao_cadastro: 'Atualização Cadastro', reserva_espaco: 'Reserva Espaço',
  autorizacao_obra: 'Autorização Obra', mudanca: 'Mudança', reclamacao: 'Reclamação', sugestao: 'Sugestão', duvida: 'Dúvida', outros: 'Outros'
};

export function ChamadoCard({ chamado, onClick, isSindico = false }: ChamadoCardProps) {
  const status = chamado.status ? STATUS_CONFIG[chamado.status] : STATUS_CONFIG['novo'];
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <div onClick={onClick} className={`bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-all ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${status.color}`}>
            <span className="material-symbols-outlined text-sm">{status.icon}</span>
            {status.label}
          </span>
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">{chamado.categoria ? CATEGORIA_LABELS[chamado.categoria] : 'Outros'}</span>
        </div>
        {chamado.avaliacao_nota && (
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map(star => (
              <span key={star} className={`material-symbols-outlined text-sm ${star <= chamado.avaliacao_nota! ? 'text-amber-400' : 'text-gray-300'}`}>star</span>
            ))}
          </div>
        )}
      </div>
      <h3 className="font-semibold text-gray-800 dark:text-white mb-2 line-clamp-1">{chamado.titulo}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{chamado.descricao}</p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            {formatDate(chamado.created_at)}
          </span>
          {isSindico && chamado.solicitante && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">person</span>
              {chamado.solicitante.nome}
            </span>
          )}
          {chamado.total_mensagens && chamado.total_mensagens > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">chat</span>
              {chamado.total_mensagens}
            </span>
          )}
        </div>
        {chamado.atendente && (
          <span className="flex items-center gap-1 text-primary">
            <span className="material-symbols-outlined text-sm">support_agent</span>
            {chamado.atendente.nome}
          </span>
        )}
      </div>
    </div>
  );
}
