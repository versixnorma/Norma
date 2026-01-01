'use client';

import type { LancamentoFinanceiro } from '@/hooks/useFinanceiro';

interface LancamentoCardProps {
  lancamento: LancamentoFinanceiro;
  onClick?: () => void;
  onConfirmar?: () => void;
  showActions?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  confirmado: { label: 'Confirmado', color: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-600' }
};

export function LancamentoCard({ lancamento, onClick, onConfirmar, showActions }: LancamentoCardProps) {
  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');
  const status = STATUS_CONFIG[lancamento.status];

  return (
    <div onClick={onClick} className={`bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-all ${onClick ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${lancamento.tipo === 'receita' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
            <span className="material-symbols-outlined">{lancamento.tipo === 'receita' ? 'arrow_upward' : 'arrow_downward'}</span>
          </div>
          <div>
            <p className="font-medium text-gray-800 dark:text-white line-clamp-1">{lancamento.descricao}</p>
            <p className="text-xs text-gray-500">{lancamento.categoria?.nome || 'Sem categoria'}</p>
            {lancamento.fornecedor_nome && <p className="text-xs text-gray-400 mt-1">{lancamento.fornecedor_nome}</p>}
          </div>
        </div>
        <div className="text-right">
          <p className={`font-bold ${lancamento.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
            {lancamento.tipo === 'receita' ? '+' : '-'}{formatCurrency(lancamento.valor)}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            {formatDate(lancamento.data_competencia)}
          </span>
          {lancamento.data_pagamento && (
            <span className="flex items-center gap-1 text-green-600">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Pago {formatDate(lancamento.data_pagamento)}
            </span>
          )}
          {lancamento.comprovantes.length > 0 && (
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">attach_file</span>
              {lancamento.comprovantes.length}
            </span>
          )}
        </div>
        {showActions && lancamento.status === 'pendente' && onConfirmar && (
          <button onClick={e => { e.stopPropagation(); onConfirmar(); }} className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
            Confirmar
          </button>
        )}
      </div>
    </div>
  );
}
